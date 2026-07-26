import {
  isValidIncidentId,
  rowToEffisBurnedAreaSnapshot,
  shouldReplaceSnapshot,
  snapshotToRow,
  validateEffisBurnedAreaSnapshot,
  type EffisBurnedAreaSnapshot,
  type EffisSnapshotRow,
} from "@/lib/incidents/effisSnapshot";
import {
  EFFIS_BURNED_AREA_TYPENAME,
  EFFIS_SOURCE_URL,
  buildPointBbox,
  fetchEffisWfsFeatures,
  normalizeArea,
  polygonsToGeoJsonGeometry,
  selectNearbyEffisFeature,
  toIsoDateString,
} from "@/lib/incidents/effisWfs";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const REQUEST_TIMEOUT_MS = 20_000;

type RouteContext = {
  params: Promise<{ incidentId: string }>;
};

type RefreshBody = {
  longitude: number;
  latitude: number;
  countryCode: string | null;
};

function parseRefreshBody(value: unknown): RefreshBody | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;

  const longitude =
    typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
  const latitude =
    typeof body.latitude === "number" ? body.latitude : Number(body.latitude);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  let countryCode: string | null = null;
  if (body.countryCode === null || body.countryCode === undefined) {
    countryCode = null;
  } else if (typeof body.countryCode === "string") {
    const trimmed = body.countryCode.trim();
    countryCode = trimmed.length > 0 ? trimmed : null;
  } else {
    return null;
  }

  return { longitude, latitude, countryCode };
}

async function readExistingSnapshot(
  incidentId: string,
): Promise<EffisBurnedAreaSnapshot | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("effis_burned_area_snapshots")
    .select(
      "incident_id, country_code, source_layer, geometry_geojson, area_hectares, fire_date, final_date, source_updated_at, fetched_at, source_url, metadata",
    )
    .eq("incident_id", incidentId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToEffisBurnedAreaSnapshot(data as EffisSnapshotRow);
}

function preservedResponse(previous: EffisBurnedAreaSnapshot) {
  return Response.json({
    snapshot: previous,
    updated: false,
    preservedPrevious: true,
    warning: "EFFIS refresh unavailable; last valid snapshot preserved",
  });
}

function unavailableResponse() {
  return Response.json(
    {
      snapshot: null,
      updated: false,
      preservedPrevious: false,
      error: "No EFFIS snapshot is currently available",
    },
    { status: 502 },
  );
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  const { incidentId: rawIncidentId } = await context.params;
  const incidentId = decodeURIComponent(rawIncidentId ?? "").trim();

  if (!isValidIncidentId(incidentId)) {
    return Response.json(
      {
        snapshot: null,
        updated: false,
        preservedPrevious: false,
        error: "Invalid incident id",
      },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json(
      {
        snapshot: null,
        updated: false,
        preservedPrevious: false,
        error: "Invalid request body",
      },
      { status: 400 },
    );
  }

  const body = parseRefreshBody(json);
  if (!body) {
    return Response.json(
      {
        snapshot: null,
        updated: false,
        preservedPrevious: false,
        error: "Invalid request body",
      },
      { status: 400 },
    );
  }

  let previousSnapshot: EffisBurnedAreaSnapshot | null = null;
  try {
    previousSnapshot = await readExistingSnapshot(incidentId);
  } catch {
    return Response.json(
      {
        snapshot: null,
        updated: false,
        preservedPrevious: false,
        error: "Snapshot storage temporarily unavailable",
      },
      { status: 502 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const bbox = buildPointBbox(body.longitude, body.latitude);
    const features = await fetchEffisWfsFeatures(
      EFFIS_BURNED_AREA_TYPENAME,
      bbox,
      controller.signal,
      10,
    );

    const selected = selectNearbyEffisFeature(
      features,
      body.longitude,
      body.latitude,
    );

    if (!selected) {
      if (previousSnapshot) {
        return preservedResponse(previousSnapshot);
      }
      return unavailableResponse();
    }

    const geometry = polygonsToGeoJsonGeometry(selected.polygons);
    if (!geometry) {
      if (previousSnapshot) {
        return preservedResponse(previousSnapshot);
      }
      return unavailableResponse();
    }

    const area = normalizeArea(selected);
    const candidate = validateEffisBurnedAreaSnapshot({
      incidentId,
      countryCode: body.countryCode,
      sourceLayer: selected.sourceLayer,
      geometry,
      areaHectares: area.areaHectares,
      fireDate: toIsoDateString(selected.properties.FIREDATE),
      finalDate: toIsoDateString(selected.properties.FINALDATE),
      sourceUpdatedAt: toIsoDateString(selected.properties.LASTUPDATE),
      fetchedAt: new Date().toISOString(),
      sourceUrl: EFFIS_SOURCE_URL,
    });

    if (!candidate) {
      if (previousSnapshot) {
        return preservedResponse(previousSnapshot);
      }
      return unavailableResponse();
    }

    if (!shouldReplaceSnapshot(previousSnapshot, candidate)) {
      return Response.json({
        snapshot: previousSnapshot,
        updated: false,
        preservedPrevious: true,
      });
    }

    const metadata = {
      effisFeatureId: selected.id,
      countryName: selected.properties.COUNTRY?.trim() || null,
      provinceName: selected.properties.PROVINCE?.trim() || null,
      communeName: selected.properties.COMMUNE?.trim() || null,
    };

    const row = snapshotToRow(candidate, metadata);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("effis_burned_area_snapshots")
      .upsert(row, { onConflict: "incident_id" })
      .select(
        "incident_id, country_code, source_layer, geometry_geojson, area_hectares, fire_date, final_date, source_updated_at, fetched_at, source_url, metadata",
      )
      .single();

    if (error || !data) {
      if (previousSnapshot) {
        return preservedResponse(previousSnapshot);
      }
      return unavailableResponse();
    }

    const saved = rowToEffisBurnedAreaSnapshot(data as EffisSnapshotRow);
    if (!saved) {
      if (previousSnapshot) {
        return preservedResponse(previousSnapshot);
      }
      return unavailableResponse();
    }

    return Response.json({
      snapshot: saved,
      updated: true,
      preservedPrevious: false,
    });
  } catch {
    if (previousSnapshot) {
      return preservedResponse(previousSnapshot);
    }
    return unavailableResponse();
  } finally {
    clearTimeout(timeoutId);
  }
}
