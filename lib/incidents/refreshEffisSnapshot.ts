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
  fetchEffisFeatureById,
  findEffisFeatureIdAtPoint,
  formatEffisTimeRange,
  normalizeArea,
  parsePositiveNumber,
  pointInPolygons,
  polygonsToGeoJsonGeometry,
  selectNearbyEffisFeature,
  toIsoDateString,
  type ParsedEffisFeature,
} from "@/lib/incidents/effisWfs";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export type RefreshEffisSnapshotInput = {
  incidentId: string;
  longitude: number;
  latitude: number;
  countryCode: string | null;
};

export type RefreshEffisSnapshotResult = {
  snapshot: EffisBurnedAreaSnapshot | null;
  updated: boolean;
  preservedPrevious: boolean;
  warning?: string;
  error?: string;
  /** True when EFFIS itself failed/timed out (not a config/app error). */
  effisUnavailable?: boolean;
};

export class SupabaseConfigError extends Error {
  constructor(message = "Supabase server configuration is incomplete") {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

async function readExistingSnapshot(
  incidentId: string,
): Promise<EffisBurnedAreaSnapshot | null> {
  const supabase = createSupabaseServiceClient();
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

function preservedResult(
  previous: EffisBurnedAreaSnapshot,
  effisUnavailable = true,
): RefreshEffisSnapshotResult {
  return {
    snapshot: previous,
    updated: false,
    preservedPrevious: true,
    warning: "EFFIS refresh unavailable; last valid snapshot preserved",
    effisUnavailable,
  };
}

function unavailableResult(
  effisUnavailable = true,
): RefreshEffisSnapshotResult {
  return {
    snapshot: null,
    updated: false,
    preservedPrevious: false,
    error: "No EFFIS snapshot is currently available",
    effisUnavailable,
  };
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError")
  );
}

async function selectFeatureForPoint(
  featureIds: string[],
  longitude: number,
  latitude: number,
  signal: AbortSignal,
): Promise<ParsedEffisFeature | null> {
  const loaded: ParsedEffisFeature[] = [];

  for (const featureId of featureIds) {
    if (signal.aborted) break;
    const feature = await fetchEffisFeatureById(featureId, signal);
    if (feature && feature.polygons.length > 0) {
      loaded.push(feature);
    }
  }

  if (loaded.length === 0) return null;

  const containing = loaded.filter((feature) =>
    pointInPolygons([longitude, latitude], feature.polygons),
  );

  if (containing.length === 1) return containing[0];

  if (containing.length > 1) {
    return (
      containing
        .map((feature) => {
          const attributeArea = parsePositiveNumber(
            feature.properties.AREA_HA,
          );
          const area =
            attributeArea !== null
              ? attributeArea
              : feature.polygons.reduce((sum, ring) => sum + ring.length, 0);
          return { feature, area };
        })
        .sort((a, b) => a.area - b.area)[0]?.feature ?? containing[0]
    );
  }

  return selectNearbyEffisFeature(loaded, longitude, latitude);
}

/**
 * Refresh one GDACS incident burned-area snapshot from EFFIS.
 * Uses GetFeatureInfo then a targeted WFS GetFeature by id.
 */
export async function refreshEffisSnapshotForIncident(
  input: RefreshEffisSnapshotInput,
  options?: { timeoutMs?: number },
): Promise<RefreshEffisSnapshotResult> {
  const incidentId = input.incidentId.trim();
  if (!isValidIncidentId(incidentId)) {
    return {
      snapshot: null,
      updated: false,
      preservedPrevious: false,
      error: "Invalid incident id",
      effisUnavailable: false,
    };
  }

  if (
    !Number.isFinite(input.longitude) ||
    !Number.isFinite(input.latitude) ||
    input.longitude < -180 ||
    input.longitude > 180 ||
    input.latitude < -90 ||
    input.latitude > 90
  ) {
    return {
      snapshot: null,
      updated: false,
      preservedPrevious: false,
      error: "Invalid coordinates",
      effisUnavailable: false,
    };
  }

  let previousSnapshot: EffisBurnedAreaSnapshot | null = null;
  try {
    previousSnapshot = await readExistingSnapshot(incidentId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Supabase server configuration is incomplete")
    ) {
      throw new SupabaseConfigError();
    }
    throw error;
  }

  const timeoutMs = options?.timeoutMs ?? 35_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const time = formatEffisTimeRange(7);
    let featureIds: string[] = [];

    try {
      featureIds = await findEffisFeatureIdAtPoint(
        input.longitude,
        input.latitude,
        time,
        controller.signal,
      );
    } catch (error) {
      if (isAbortError(error)) {
        if (previousSnapshot) return preservedResult(previousSnapshot);
        return unavailableResult();
      }
      if (previousSnapshot) return preservedResult(previousSnapshot);
      return unavailableResult();
    }

    if (featureIds.length === 0) {
      if (previousSnapshot) return preservedResult(previousSnapshot);
      return unavailableResult();
    }

    let selected: ParsedEffisFeature | null = null;
    try {
      selected = await selectFeatureForPoint(
        featureIds,
        input.longitude,
        input.latitude,
        controller.signal,
      );
    } catch (error) {
      if (isAbortError(error)) {
        if (previousSnapshot) return preservedResult(previousSnapshot);
        return unavailableResult();
      }
      if (previousSnapshot) return preservedResult(previousSnapshot);
      return unavailableResult();
    }

    if (!selected) {
      if (previousSnapshot) return preservedResult(previousSnapshot);
      return unavailableResult();
    }

    const geometry = polygonsToGeoJsonGeometry(selected.polygons);
    if (!geometry) {
      if (previousSnapshot) return preservedResult(previousSnapshot);
      return unavailableResult();
    }

    const area = normalizeArea(selected);
    const candidate = validateEffisBurnedAreaSnapshot({
      incidentId,
      countryCode: input.countryCode,
      sourceLayer: EFFIS_BURNED_AREA_TYPENAME,
      geometry,
      areaHectares: area.areaHectares,
      fireDate: toIsoDateString(selected.properties.FIREDATE),
      finalDate: toIsoDateString(selected.properties.FINALDATE),
      sourceUpdatedAt: toIsoDateString(selected.properties.LASTUPDATE),
      fetchedAt: new Date().toISOString(),
      sourceUrl: EFFIS_SOURCE_URL,
    });

    if (!candidate) {
      if (previousSnapshot) return preservedResult(previousSnapshot);
      return unavailableResult();
    }

    if (!shouldReplaceSnapshot(previousSnapshot, candidate)) {
      return {
        snapshot: previousSnapshot,
        updated: false,
        preservedPrevious: true,
        effisUnavailable: false,
      };
    }

    const metadata = {
      effisFeatureId: selected.id,
      countryName: selected.properties.COUNTRY?.trim() || null,
      provinceName: selected.properties.PROVINCE?.trim() || null,
      communeName: selected.properties.COMMUNE?.trim() || null,
    };

    const row = snapshotToRow(candidate, metadata);
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("effis_burned_area_snapshots")
      .upsert(row, { onConflict: "incident_id" })
      .select(
        "incident_id, country_code, source_layer, geometry_geojson, area_hectares, fire_date, final_date, source_updated_at, fetched_at, source_url, metadata",
      )
      .single();

    if (error || !data) {
      if (previousSnapshot) return preservedResult(previousSnapshot, false);
      return unavailableResult(false);
    }

    const saved = rowToEffisBurnedAreaSnapshot(data as EffisSnapshotRow);
    if (!saved) {
      if (previousSnapshot) return preservedResult(previousSnapshot, false);
      return unavailableResult(false);
    }

    return {
      snapshot: saved,
      updated: true,
      preservedPrevious: false,
      effisUnavailable: false,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Supabase server configuration is incomplete")
    ) {
      throw new SupabaseConfigError();
    }
    if (previousSnapshot) return preservedResult(previousSnapshot);
    return unavailableResult();
  } finally {
    clearTimeout(timeoutId);
  }
}
