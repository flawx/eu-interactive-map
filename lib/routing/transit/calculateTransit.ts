import { isRoutingPointAllowed } from "@/lib/routing/routingGeofence";
import { getTransitRoutingProvider } from "@/lib/routing/transit/providers/providerRegistry";
import {
  getCachedTransitResult,
  setCachedTransitResult,
} from "@/lib/routing/transit/transitCache";
import {
  TransitError,
  type TransitAllowedMode,
  type TransitRoutingPreference,
  type TransitRoutingRequest,
  type TransitRoutingResult,
  type TransitTiming,
} from "@/lib/routing/transit/types";

const ALLOWED_MODES: TransitAllowedMode[] = [
  "BUS",
  "SUBWAY",
  "TRAIN",
  "LIGHT_RAIL",
  "RAIL",
];

function parsePoint(
  value: unknown,
  label: string,
): TransitRoutingRequest["origin"] {
  if (!value || typeof value !== "object") {
    throw new TransitError("invalid_request", `${label} is required`);
  }
  const raw = value as Record<string, unknown>;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TransitError("invalid_request", `${label} coordinates invalid`);
  }
  return {
    latitude,
    longitude,
    name: typeof raw.name === "string" ? raw.name : null,
  };
}

function parseTiming(body: Record<string, unknown>): TransitTiming {
  const timingRaw = body.timing;
  if (timingRaw && typeof timingRaw === "object") {
    const t = timingRaw as Record<string, unknown>;
    if (t.kind === "depart_at" && typeof t.at === "string") {
      return { kind: "depart_at", at: t.at };
    }
    if (t.kind === "arrive_at" && typeof t.at === "string") {
      return { kind: "arrive_at", at: t.at };
    }
  }
  if (typeof body.departureTime === "string" && body.departureTime !== "now") {
    return { kind: "depart_at", at: body.departureTime };
  }
  if (typeof body.arrivalTime === "string") {
    return { kind: "arrive_at", at: body.arrivalTime };
  }
  return { kind: "depart_now" };
}

function parseAllowedModes(value: unknown): TransitAllowedMode[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const modes = value.filter(
    (item): item is TransitAllowedMode =>
      typeof item === "string" &&
      ALLOWED_MODES.includes(item as TransitAllowedMode),
  );
  return modes.length > 0 ? modes : null;
}

function parsePreference(value: unknown): TransitRoutingPreference {
  if (value === "fewer_transfers" || value === "less_walking") return value;
  return null;
}

export function parseTransitRequestBody(body: unknown): TransitRoutingRequest {
  if (!body || typeof body !== "object") {
    throw new TransitError("invalid_request", "Body must be a JSON object");
  }
  const raw = body as Record<string, unknown>;
  if (!raw.origin) {
    throw new TransitError("origin_required", "Origin is required");
  }
  if (!raw.destination) {
    throw new TransitError("destination_required", "Destination is required");
  }

  const origin = parsePoint(raw.origin, "origin");
  const destination = parsePoint(raw.destination, "destination");

  if (
    !isRoutingPointAllowed({
      latitude: origin.latitude,
      longitude: origin.longitude,
    }) ||
    !isRoutingPointAllowed({
      latitude: destination.latitude,
      longitude: destination.longitude,
    })
  ) {
    throw new TransitError(
      "point_outside_coverage",
      "Point outside European coverage",
      400,
    );
  }

  if (
    origin.latitude === destination.latitude &&
    origin.longitude === destination.longitude
  ) {
    throw new TransitError(
      "no_route_found",
      "Origin and destination are identical",
      404,
    );
  }

  return {
    origin,
    destination,
    timing: parseTiming(raw),
    allowedModes: parseAllowedModes(raw.allowedModes),
    routingPreference: parsePreference(raw.routingPreference),
    alternatives: raw.alternatives !== false,
    locale: typeof raw.locale === "string" ? raw.locale : "en",
  };
}

export async function calculateTransitJourneys(
  request: TransitRoutingRequest,
  signal?: AbortSignal,
): Promise<TransitRoutingResult> {
  if (signal?.aborted) {
    throw new TransitError("aborted", "Transit calculation aborted", 499);
  }
  const cached = getCachedTransitResult(request);
  if (cached) return cached;

  const provider = getTransitRoutingProvider();
  const result = await provider.calculateJourney(request, signal);
  if (!signal?.aborted) {
    setCachedTransitResult(request, result);
  }
  return result;
}
