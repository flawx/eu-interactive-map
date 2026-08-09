import {
  normalizeGoogleTransitRoutes,
  type GoogleComputeRoutesResponse,
} from "@/lib/routing/transit/normalizeGoogleTransit";
import type { TransitRoutingProvider } from "@/lib/routing/transit/providers/types";
import {
  TransitError,
  type TransitProviderStatus,
  type TransitRoutingRequest,
  type TransitRoutingResult,
} from "@/lib/routing/transit/types";

/** Server-only provider — import from API routes / Node scripts, never from client components. */

const GOOGLE_ROUTES_ENDPOINT =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

export const GOOGLE_TRANSIT_FIELD_MASK = [
  "routes.duration",
  "routes.distanceMeters",
  "routes.polyline.encodedPolyline",
  "routes.polyline.geoJsonLinestring",
  "routes.legs.duration",
  "routes.legs.distanceMeters",
  "routes.legs.polyline.encodedPolyline",
  "routes.legs.polyline.geoJsonLinestring",
  "routes.legs.steps.travelMode",
  "routes.legs.steps.staticDuration",
  "routes.legs.steps.distanceMeters",
  "routes.legs.steps.polyline.encodedPolyline",
  "routes.legs.steps.polyline.geoJsonLinestring",
  "routes.legs.steps.startLocation",
  "routes.legs.steps.endLocation",
  "routes.legs.steps.navigationInstruction",
  "routes.legs.steps.transitDetails.stopDetails.departureStop",
  "routes.legs.steps.transitDetails.stopDetails.arrivalStop",
  "routes.legs.steps.transitDetails.stopDetails.departureTime",
  "routes.legs.steps.transitDetails.stopDetails.arrivalTime",
  "routes.legs.steps.transitDetails.localizedValues",
  "routes.legs.steps.transitDetails.headsign",
  "routes.legs.steps.transitDetails.stopCount",
  "routes.legs.steps.transitDetails.transitLine",
  "routes.travelAdvisory.transitFare",
  "routes.localizedValues.transitFare",
  "routes.warnings",
].join(",");

function getApiKey(): string | null {
  const key = process.env.GOOGLE_ROUTES_API_KEY?.trim();
  return key || null;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError")
  );
}

function classifyHttpStatus(status: number): TransitError {
  if (status === 401 || status === 403) {
    return new TransitError(
      "provider_not_entitled",
      "Google Routes transit not entitled",
      403,
    );
  }
  if (status === 429) {
    return new TransitError(
      "provider_rate_limited",
      "Google Routes rate limited",
      429,
    );
  }
  if (status === 400) {
    return new TransitError(
      "invalid_request",
      "Google Routes rejected the transit request",
      400,
    );
  }
  return new TransitError(
    "provider_unavailable",
    "Google Routes temporarily unavailable",
    503,
  );
}

function buildRequestBody(request: TransitRoutingRequest) {
  const body: Record<string, unknown> = {
    origin: {
      location: {
        latLng: {
          latitude: request.origin.latitude,
          longitude: request.origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: request.destination.latitude,
          longitude: request.destination.longitude,
        },
      },
    },
    travelMode: "TRANSIT",
    computeAlternativeRoutes: request.alternatives,
    languageCode: request.locale ?? "en",
    units: "METRIC",
    polylineQuality: "HIGH_QUALITY",
    polylineEncoding: "GEO_JSON_LINESTRING",
  };

  if (request.timing.kind === "depart_at") {
    body.departureTime = request.timing.at;
  } else if (request.timing.kind === "arrive_at") {
    body.arrivalTime = request.timing.at;
  }

  const transitPreferences: Record<string, unknown> = {};
  if (request.allowedModes && request.allowedModes.length > 0) {
    transitPreferences.allowedTravelModes = request.allowedModes;
  }
  if (request.routingPreference === "fewer_transfers") {
    transitPreferences.routingPreference = "FEWER_TRANSFERS";
  } else if (request.routingPreference === "less_walking") {
    transitPreferences.routingPreference = "LESS_WALKING";
  }
  if (Object.keys(transitPreferences).length > 0) {
    body.transitPreferences = transitPreferences;
  }

  return body;
}

export class GoogleTransitRoutingProvider implements TransitRoutingProvider {
  readonly id = "google_routes" as const;

  async getStatus(): Promise<TransitProviderStatus> {
    if (!getApiKey()) return "misconfigured";
    return "operational";
  }

  async calculateJourney(
    request: TransitRoutingRequest,
    signal?: AbortSignal,
  ): Promise<TransitRoutingResult> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new TransitError(
        "provider_misconfigured",
        "GOOGLE_ROUTES_API_KEY is not configured",
        503,
      );
    }

    try {
      const response = await fetch(GOOGLE_ROUTES_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": GOOGLE_TRANSIT_FIELD_MASK,
        },
        body: JSON.stringify(buildRequestBody(request)),
        signal,
      });

      const payload = (await response
        .json()
        .catch(() => ({}))) as GoogleComputeRoutesResponse;

      if (!response.ok) {
        const message = payload.error?.message ?? "";
        if (
          /out of range|outside.*window|INVALID_ARGUMENT.*time|departureTime|arrivalTime/i.test(
            message,
          )
        ) {
          throw new TransitError(
            "transit_date_out_of_range",
            "Transit schedules are not available for this date",
            400,
          );
        }
        throw classifyHttpStatus(response.status);
      }

      const journeys = normalizeGoogleTransitRoutes(payload);
      if (journeys.length === 0) {
        throw new TransitError(
          "no_route_found",
          "No transit journey found",
          404,
        );
      }

      return {
        journeys,
        provider: "google_routes",
        status: "operational",
        calculatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof TransitError) throw error;
      if (isAbortError(error) || signal?.aborted) {
        throw new TransitError("aborted", "Transit calculation aborted", 499);
      }
      throw new TransitError(
        "provider_unavailable",
        "Google Routes temporarily unavailable",
        503,
      );
    }
  }
}

export const googleTransitRoutingProvider = new GoogleTransitRoutingProvider();
