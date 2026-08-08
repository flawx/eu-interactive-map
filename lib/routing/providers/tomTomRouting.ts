import {
  normalizeTomTomRoutes,
  tomTomTravelMode,
  type TomTomCalculateRouteResponse,
} from "@/lib/routing/normalizeTomTomRoute";
import type { RoutingProvider } from "@/lib/routing/providers/types";
import {
  MAX_ROUTE_ALTERNATIVES_UI,
  RoutingError,
  type RouteAvoidOptions,
  type RouteMode,
  type RoutingProviderStatus,
  type RoutingRequest,
  type RoutingResult,
} from "@/lib/routing/types";
import type { Locale } from "@/lib/i18n/config";

const BASE_URL = "https://api.tomtom.com/routing/1/calculateRoute";
const TIMEOUT_MS = 20_000;

const LOCALE_TO_TOMTOM: Partial<Record<Locale, string>> & Record<string, string> =
  {
    bg: "bg-BG",
    hr: "hr-HR",
    cs: "cs-CZ",
    da: "da-DK",
    nl: "nl-NL",
    en: "en-GB",
    et: "et-EE",
    fi: "fi-FI",
    fr: "fr-FR",
    de: "de-DE",
    el: "el-GR",
    hu: "hu-HU",
    ga: "en-GB",
    it: "it-IT",
    lv: "lv-LV",
    lt: "lt-LT",
    mt: "en-GB",
    pl: "pl-PL",
    pt: "pt-PT",
    ro: "ro-RO",
    sk: "sk-SK",
    sl: "sl-SI",
    es: "es-ES",
    sv: "sv-SE",
  };

function apiKey(): string | null {
  const value = process.env.TOMTOM_API_KEY?.trim();
  return value || null;
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

function formatLocation(lat: number, lon: number): string {
  return `${lat},${lon}`;
}

function buildAvoidParams(
  mode: RouteMode,
  avoid: RouteAvoidOptions,
): string[] {
  if (mode !== "car") {
    // Pedestrian/bicycle: only ferries/unpaved when meaningful
    const values: string[] = [];
    if (avoid.ferries) values.push("ferries");
    if (avoid.unpavedRoads) values.push("unpavedRoads");
    return values;
  }
  const values: string[] = [];
  if (avoid.tollRoads) values.push("tollRoads");
  if (avoid.motorways) values.push("motorways");
  if (avoid.ferries) values.push("ferries");
  if (avoid.unpavedRoads) values.push("unpavedRoads");
  if (avoid.tunnels) values.push("tunnels");
  if (avoid.lowEmissionZones) values.push("lowEmissionZones");
  return values;
}

function sectionTypesForMode(mode: RouteMode): string[] {
  const base = [
    "traffic",
    "tollRoad",
    "ferry",
    "tunnel",
    "motorway",
    "unpaved",
    "lowEmissionZone",
    "country",
  ];
  if (mode === "pedestrian") base.push("pedestrian");
  return base;
}

export function buildTomTomRouteUrl(
  request: RoutingRequest,
  key: string,
): string {
  const points = [
    request.origin,
    ...request.waypoints,
    request.destination,
  ];
  const locations = points
    .map((p) => formatLocation(p.latitude, p.longitude))
    .join(":");

  const params = new URLSearchParams();
  params.set("key", key);
  params.set("travelMode", tomTomTravelMode(request.mode));
  params.set("routeType", request.preference);
  params.set(
    "maxAlternatives",
    String(
      Math.max(
        0,
        Math.min(MAX_ROUTE_ALTERNATIVES_UI, request.alternatives ?? 2),
      ),
    ),
  );
  params.set("instructionsType", "text");
  params.set(
    "language",
    LOCALE_TO_TOMTOM[request.locale ?? "en"] ?? "en-GB",
  );
  params.set("computeBestOrder", "false");
  params.set("routeRepresentation", "polyline");
  params.set("computeTravelTimeFor", "all");

  if (request.mode === "car") {
    params.set("traffic", "true");
  } else {
    params.set("traffic", "false");
  }

  const timing = request.timing;
  if (timing?.kind === "depart_at") {
    params.set("departAt", timing.at);
  } else if (timing?.kind === "arrive_at" && request.mode === "car") {
    params.set("arriveAt", timing.at);
  } else if (
    request.departureTime &&
    request.departureTime !== "now" &&
    request.mode === "car"
  ) {
    params.set("departAt", request.departureTime);
  } else if (request.mode === "car") {
    params.set("departAt", "now");
  }

  for (const avoid of buildAvoidParams(request.mode, request.avoid)) {
    params.append("avoid", avoid);
  }
  for (const sectionType of sectionTypesForMode(request.mode)) {
    params.append("sectionType", sectionType);
  }

  return `${BASE_URL}/${locations}/json?${params.toString()}`;
}

export class TomTomRoutingProvider implements RoutingProvider {
  readonly id = "tomtom" as const;

  async getStatus(): Promise<RoutingProviderStatus> {
    if (!apiKey()) return "misconfigured";
    return "operational";
  }

  async calculateRoute(
    request: RoutingRequest,
    signal?: AbortSignal,
  ): Promise<RoutingResult> {
    const key = apiKey();
    if (!key) {
      throw new RoutingError(
        "provider_misconfigured",
        "TOMTOM_API_KEY is missing",
        503,
      );
    }

    const url = buildTomTomRouteUrl(request, key);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        throw new RoutingError(
          "provider_misconfigured",
          "TomTom rejected the API key",
          503,
        );
      }
      if (response.status === 404 || response.status === 400) {
        throw new RoutingError(
          "no_route_found",
          "No route found for the given points",
          404,
        );
      }
      if (response.status === 429 || response.status >= 500) {
        throw new RoutingError(
          "provider_unavailable",
          "TomTom routing temporarily unavailable",
          503,
        );
      }
      if (!response.ok) {
        throw new RoutingError(
          "provider_unavailable",
          `TomTom routing failed (${response.status})`,
          503,
        );
      }

      const payload =
        (await response.json()) as TomTomCalculateRouteResponse;
      if (!payload.routes?.length) {
        throw new RoutingError(
          "no_route_found",
          "No route found for the given points",
          404,
        );
      }

      const routes = normalizeTomTomRoutes(payload, request);
      return {
        routes,
        provider: "tomtom",
        calculatedAt: new Date().toISOString(),
      };
    } catch (error) {
      if (isAbortError(error)) {
        throw new RoutingError("aborted", "Route calculation aborted", 499);
      }
      if (error instanceof RoutingError) throw error;
      throw new RoutingError(
        "provider_unavailable",
        "TomTom routing request failed",
        503,
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
    }
  }
}

export const tomTomRoutingProvider = new TomTomRoutingProvider();
