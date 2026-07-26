import { isValidIncidentId } from "@/lib/incidents/effisSnapshot";
import {
  refreshEffisSnapshotForIncident,
  SupabaseConfigError,
} from "@/lib/incidents/refreshEffisSnapshot";

const REQUEST_TIMEOUT_MS = 35_000;

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

  try {
    const result = await refreshEffisSnapshotForIncident(
      {
        incidentId,
        longitude: body.longitude,
        latitude: body.latitude,
        countryCode: body.countryCode,
      },
      { timeoutMs: REQUEST_TIMEOUT_MS },
    );

    if (result.error === "Invalid incident id" || result.error === "Invalid coordinates") {
      return Response.json(
        {
          snapshot: null,
          updated: false,
          preservedPrevious: false,
          error: result.error,
        },
        { status: 400 },
      );
    }

    if (result.snapshot === null && !result.preservedPrevious) {
      return Response.json(
        {
          snapshot: null,
          updated: false,
          preservedPrevious: false,
          error: result.error ?? "No EFFIS snapshot is currently available",
        },
        { status: 502 },
      );
    }

    return Response.json({
      snapshot: result.snapshot,
      updated: result.updated,
      preservedPrevious: result.preservedPrevious,
      ...(result.warning ? { warning: result.warning } : {}),
    });
  } catch (error) {
    if (error instanceof SupabaseConfigError) {
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
}
