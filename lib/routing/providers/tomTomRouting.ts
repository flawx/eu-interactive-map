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

/** Cached entitlement after a confirmed 401/403 with correct query-key auth. */
let cachedStatus: RoutingProviderStatus | null = null;
let cachedStatusAt = 0;
const STATUS_CACHE_MS = 10 * 60_000;

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

function rememberStatus(status: RoutingProviderStatus) {
  cachedStatus = status;
  cachedStatusAt = Date.now();
}

function logUpstream(details: {
  endpoint: string;
  product: string;
  method: string;
  auth: string;
  status: number;
  contentType: string | null;
  errorBody: string | null;
}) {
  if (process.env.NODE_ENV === "production") return;
  console.info("[tomtom-routing]", {
    endpoint: details.endpoint,
    product: details.product,
    method: details.method,
    auth: details.auth,
    upstreamStatus: details.status,
    contentType: details.contentType,
    errorBody: details.errorBody,
  });
}

/**
 * Build Routing API v1 URL.
 * Auth: query param `key` only (NOT TomTom-Api-Key header — that is Orbis Traffic).
 * Never return this URL to the browser.
 */
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

  const url = new URL(`${BASE_URL}/${locations}/json`);
  url.searchParams.set("key", key);
  url.searchParams.set("travelMode", tomTomTravelMode(request.mode));
  url.searchParams.set("routeType", request.preference);
  url.searchParams.set(
    "maxAlternatives",
    String(
      Math.max(
        0,
        Math.min(MAX_ROUTE_ALTERNATIVES_UI, request.alternatives ?? 2),
      ),
    ),
  );
  url.searchParams.set("instructionsType", "text");
  url.searchParams.set(
    "language",
    LOCALE_TO_TOMTOM[request.locale ?? "en"] ?? "en-GB",
  );
  url.searchParams.set("computeBestOrder", "false");
  url.searchParams.set("routeRepresentation", "polyline");
  url.searchParams.set("computeTravelTimeFor", "all");

  if (request.mode === "car") {
    url.searchParams.set("traffic", "true");
  } else {
    url.searchParams.set("traffic", "false");
  }

  const timing = request.timing;
  if (timing?.kind === "depart_at") {
    url.searchParams.set("departAt", timing.at);
  } else if (timing?.kind === "arrive_at" && request.mode === "car") {
    url.searchParams.set("arriveAt", timing.at);
  } else if (
    request.departureTime &&
    request.departureTime !== "now" &&
    request.mode === "car"
  ) {
    url.searchParams.set("departAt", request.departureTime);
  } else if (request.mode === "car") {
    url.searchParams.set("departAt", "now");
  }

  for (const avoid of buildAvoidParams(request.mode, request.avoid)) {
    url.searchParams.append("avoid", avoid);
  }
  for (const sectionType of sectionTypesForMode(request.mode)) {
    url.searchParams.append("sectionType", sectionType);
  }

  return url.toString();
}

export function redactTomTomUrl(url: string, key: string): string {
  return url.split(key).join("***");
}

export class TomTomRoutingProvider implements RoutingProvider {
  readonly id = "tomtom" as const;

  async getStatus(): Promise<RoutingProviderStatus> {
    if (!apiKey()) return "misconfigured";
    if (
      cachedStatus &&
      Date.now() - cachedStatusAt < STATUS_CACHE_MS
    ) {
      return cachedStatus;
    }
    return "operational";
  }

  async calculateRoute(
    request: RoutingRequest,
    signal?: AbortSignal,
  ): Promise<RoutingResult> {
    const key = apiKey();
    if (!key) {
      rememberStatus("misconfigured");
      throw new RoutingError(
        "provider_misconfigured",
        "TOMTOM_API_KEY is missing",
        503,
      );
    }

    const url = buildTomTomRouteUrl(request, key);
    const endpointPath = `${BASE_URL}/…/json`;
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

      const contentType = response.headers.get("content-type");
      let errorBody: string | null = null;
      if (!response.ok) {
        try {
          errorBody = (await response.clone().text())
            .slice(0, 240)
            .replace(/\s+/g, " ")
            .trim();
        } catch {
          errorBody = null;
        }
        logUpstream({
          endpoint: endpointPath,
          product: "Routing API v1",
          method: "GET",
          auth: "query param key",
          status: response.status,
          contentType,
          errorBody,
        });
      }

      if (response.status === 401 || response.status === 403) {
        rememberStatus("not_entitled");
        throw new RoutingError(
          "provider_not_entitled",
          "TomTom Routing API is not enabled for this API key",
          503,
        );
      }
      if (response.status === 429) {
        rememberStatus("rate_limited");
        throw new RoutingError(
          "provider_rate_limited",
          "TomTom routing rate limited",
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
      if (response.status >= 500) {
        rememberStatus("unavailable");
        throw new RoutingError(
          "provider_unavailable",
          "TomTom routing temporarily unavailable",
          503,
        );
      }
      if (!response.ok) {
        rememberStatus("unavailable");
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

      rememberStatus("operational");
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
      rememberStatus("unavailable");
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
