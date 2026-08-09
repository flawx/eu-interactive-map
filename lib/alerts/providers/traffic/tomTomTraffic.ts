import {
  boundsIntersectProjectEurope,
  type GeographicBounds,
} from "@/lib/alerts/geography";
import {
  tileBounds4326,
  tileIntersectsProjectEurope,
  validateTileCoordinates,
} from "@/lib/alerts/providers/copernicusFloodTiles";
import { tileMayIntersectEuimCoverage } from "@/lib/geography/euimCoverageMask";
import { normalizeTomTomResponse } from "./normalization";
import type {
  TrafficProvider,
  TrafficProviderResponse,
  TrafficProviderState,
  TrafficTileKind,
  TrafficTileResponse,
  TrafficViewportRequest,
} from "./types";

const TOMTOM_BASE_URL = "https://api.tomtom.com/maps/orbis/traffic";
const API_VERSION = "2";
const TIMEOUT_MS = 8_000;
const MODEL_TTL_MS = 110_000;
const DETAILS_CACHE_MS = 60_000;
const TILE_CACHE_MS = 60_000;
const DETAILS_ATTRIBUTES =
  "incidents(type,geometry(type,coordinates),properties(id,iconCategory,magnitudeOfDelay,events(code,description,iconCategory),startTime,endTime,from,to,lengthInMeters,delayInSeconds,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime))";
const INCIDENT_TILE_ATTRIBUTES =
  "tags(id,road_category,road_subcategory,icon_category,magnitude_of_delay,delay_in_seconds,description,display_class,start_time,end_time,time_validity,probability_of_occurrence,last_report_time,average_speed_kmph),roadCategories(motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link,street),timeValidity(present,future)";
const FLOW_TILE_ATTRIBUTES =
  "tags(road_category,road_subcategory,relative_speed,absolute_speed,road_closure,display_class),roadCategories(motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link,street)";

type CachedValue<T> = { expiresAt: number; value: T };

const pending = new Map<string, Promise<Response>>();
const detailsCache = new Map<string, CachedValue<TrafficProviderResponse>>();
const tileCache = new Map<string, CachedValue<TrafficTileResponse>>();
let trafficModel:
  | { id: string; updatedAt: string; expiresAt: number }
  | null = null;
let providerFailure:
  | {
      status: number;
      at: number;
      retryAfter: string | null;
      retryAt: number;
    }
  | null = null;

function apiKey(): string | null {
  const value = process.env.TOMTOM_API_KEY?.trim();
  return value || null;
}

function emptyResponse(
  status: TrafficProviderState["connectorStatus"],
  warning: string,
): TrafficProviderResponse {
  return {
    alerts: [],
    connectorStatus: status,
    trafficModelId: trafficModel?.id ?? null,
    fetchedAt: new Date().toISOString(),
    warnings: [warning],
  };
}

function estimatedAreaSquareKilometers(bounds: GeographicBounds): number {
  const centerLatitude = (bounds.north + bounds.south) / 2;
  const width =
    Math.abs(bounds.east - bounds.west) *
    111.32 *
    Math.max(0.1, Math.cos((centerLatitude * Math.PI) / 180));
  const height = Math.abs(bounds.north - bounds.south) * 110.57;
  return width * height;
}

export function validateTrafficBounds(bounds: GeographicBounds): string | null {
  if (
    ![bounds.west, bounds.south, bounds.east, bounds.north].every(Number.isFinite)
  ) {
    return "invalid_bbox";
  }
  if (
    bounds.west >= bounds.east ||
    bounds.south >= bounds.north ||
    bounds.west < -180 ||
    bounds.east > 180 ||
    bounds.south < -90 ||
    bounds.north > 90
  ) {
    return "invalid_bbox";
  }
  if (!boundsIntersectProjectEurope(bounds)) return "outside_project_europe";
  if (estimatedAreaSquareKilometers(bounds) > 10_000) return "bbox_too_large";
  return null;
}

function modelIdFrom(response: Response): string | null {
  return (
    response.headers.get("Traffic-Model-ID") ??
    response.headers.get("TomTom-Traffic-Model-ID") ??
    response.headers.get("TrafficModelID")
  );
}

function rememberModel(response: Response): string | null {
  const id = modelIdFrom(response);
  if (!id) return trafficModel?.id ?? null;
  const updatedAt = response.headers.get("Date")
    ? new Date(response.headers.get("Date")!).toISOString()
    : new Date().toISOString();
  trafficModel = { id, updatedAt, expiresAt: Date.now() + MODEL_TTL_MS };
  return id;
}

async function fetchDeduped(url: string, init: RequestInit): Promise<Response> {
  const normalizedHeaders = [...new Headers(init.headers).entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}:${value}`)
    .join("|");
  const key = `${url}|${normalizedHeaders}`;
  const existing = pending.get(key);
  if (existing) return (await existing).clone();
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => pending.delete(key));
  pending.set(key, request);
  return (await request).clone();
}

function headers(accept: string, locale?: string): HeadersInit {
  const key = apiKey();
  if (!key) return {};
  const result: Record<string, string> = {
    "TomTom-Api-Key": key,
    "TomTom-Api-Version": API_VERSION,
    Accept: accept,
  };
  if (locale) result["Accept-Language"] = locale;
  if (trafficModel && trafficModel.expiresAt > Date.now()) {
    result.TrafficModelID = trafficModel.id;
  }
  return result;
}

function connectorForHttp(status: number): TrafficProviderState["connectorStatus"] {
  if (status === 401 || status === 403) return "misconfigured";
  if (status === 429 || status >= 500) return "unavailable";
  return "unavailable";
}

function retryAtFromHeader(value: string | null, now = Date.now()): number {
  if (!value) return now;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return now + seconds * 1_000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(now, date) : now;
}

function rememberFailure(response: Response): void {
  const retryAfter = response.headers.get("Retry-After");
  providerFailure = {
    status: response.status,
    at: Date.now(),
    retryAfter,
    retryAt: retryAtFromHeader(retryAfter),
  };
}

function retryIsBlocked(): boolean {
  return Boolean(
    providerFailure &&
      providerFailure.status !== 401 &&
      providerFailure.status !== 403 &&
      providerFailure.retryAt > Date.now(),
  );
}

function delayedResponse(
  cached: CachedValue<TrafficProviderResponse> | undefined,
  warning: string,
): TrafficProviderResponse {
  return cached
    ? {
        ...cached.value,
        connectorStatus: "delayed",
        warnings: [...new Set([...cached.value.warnings, warning])],
      }
    : emptyResponse("unavailable", warning);
}

function emptyTile(
  status: TrafficProviderState["connectorStatus"],
  dataState: string,
  retryAfter: string | null = null,
): TrafficTileResponse {
  return {
    body: new ArrayBuffer(0),
    contentType: "application/vnd.mapbox-vector-tile",
    connectorStatus: status,
    trafficModelId: trafficModel?.id ?? null,
    dataState,
    retryAfter,
  };
}

export class TomTomTrafficProvider implements TrafficProvider {
  readonly id = "tomtom-traffic";

  async getStatus(): Promise<TrafficProviderState> {
    if (!apiKey()) {
      return {
        connectorStatus: "misconfigured",
        configured: false,
        trafficModelId: null,
        updatedAt: null,
        warning: "tomtom_api_key_missing",
      };
    }
    const recentFailure =
      providerFailure && Date.now() - providerFailure.at < 2 * 60 * 1000
        ? providerFailure
        : null;
    return {
      connectorStatus: recentFailure
        ? recentFailure.status === 401 || recentFailure.status === 403
          ? "misconfigured"
          : trafficModel
            ? "delayed"
            : "unavailable"
        : "operational",
      configured: true,
      trafficModelId: trafficModel?.id ?? null,
      updatedAt: trafficModel?.updatedAt ?? null,
      warning: recentFailure
        ? recentFailure.status === 429
          ? "tomtom_quota_exceeded"
          : "tomtom_provider_unavailable"
        : null,
    };
  }

  async getIncidents(
    request: TrafficViewportRequest,
  ): Promise<TrafficProviderResponse> {
    if (!apiKey()) return emptyResponse("misconfigured", "tomtom_api_key_missing");
    const invalid = validateTrafficBounds(request.bounds);
    if (invalid) return emptyResponse("operational", invalid);
    if (request.timeMode === "recent") {
      return emptyResponse("operational", "recent_incidents_not_available");
    }
    const bbox = [
      request.bounds.west,
      request.bounds.south,
      request.bounds.east,
      request.bounds.north,
    ].join(",");
    const validity = request.timeMode === "planned" ? "future" : "present";
    const cacheKey = `${bbox}|${validity}|${request.locale}|${trafficModel?.id ?? "current"}`;
    const cached = detailsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (retryIsBlocked()) {
      return delayedResponse(cached, "tomtom_retry_after_active");
    }
    const url = new URL(`${TOMTOM_BASE_URL}/incidents/details`);
    url.searchParams.set("apiVersion", API_VERSION);
    url.searchParams.set("bbox", bbox);
    url.searchParams.set("timeValidity", validity);
    const fetchedAt = new Date().toISOString();
    try {
      const response = await fetchDeduped(url.toString(), {
        headers: {
          ...headers("application/json", request.locale),
          Attributes: DETAILS_ATTRIBUTES,
        },
      });
      if (!response.ok) {
        rememberFailure(response);
        return cached && response.status !== 401 && response.status !== 403
          ? delayedResponse(cached, `tomtom_http_${response.status}`)
          : emptyResponse(
          connectorForHttp(response.status),
          response.status === 429
            ? "tomtom_quota_exceeded"
            : `tomtom_http_${response.status}`,
          );
      }
      providerFailure = null;
      const trafficModelId = rememberModel(response);
      const payload: unknown = await response.json();
      const value: TrafficProviderResponse = {
        alerts: normalizeTomTomResponse(payload, {
          fetchedAt,
          trafficModelId,
        }),
        connectorStatus: "operational",
        trafficModelId,
        fetchedAt,
        warnings: [],
      };
      detailsCache.set(cacheKey, {
        expiresAt: Date.now() + DETAILS_CACHE_MS,
        value,
      });
      return value;
    } catch {
      providerFailure = {
        status: 503,
        at: Date.now(),
        retryAfter: null,
        retryAt: Date.now(),
      };
      return delayedResponse(cached, "tomtom_provider_unavailable");
    }
  }

  async getIncidentById(
    incidentId: string,
    locale: string,
  ): Promise<TrafficProviderResponse> {
    if (!apiKey()) return emptyResponse("misconfigured", "tomtom_api_key_missing");
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(incidentId)) {
      return emptyResponse("operational", "invalid_incident_id");
    }
    const cacheKey = `id:${incidentId}|${locale}`;
    const cached = detailsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (retryIsBlocked()) {
      return delayedResponse(cached, "tomtom_retry_after_active");
    }
    const url = new URL(`${TOMTOM_BASE_URL}/incidents/details`);
    url.searchParams.set("apiVersion", API_VERSION);
    url.searchParams.set("ids", incidentId);
    url.searchParams.set("timeValidity", "present,future");
    const fetchedAt = new Date().toISOString();
    try {
      const response = await fetchDeduped(url.toString(), {
        headers: {
          ...headers("application/json", locale),
          Attributes: DETAILS_ATTRIBUTES,
        },
      });
      if (!response.ok) {
        rememberFailure(response);
        return emptyResponse(
          connectorForHttp(response.status),
          `tomtom_http_${response.status}`,
        );
      }
      const trafficModelId = rememberModel(response);
      const value: TrafficProviderResponse = {
        alerts: normalizeTomTomResponse(await response.json(), {
          fetchedAt,
          trafficModelId,
        }),
        connectorStatus: "operational",
        trafficModelId,
        fetchedAt,
        warnings: [],
      };
      detailsCache.set(cacheKey, {
        expiresAt: Date.now() + DETAILS_CACHE_MS,
        value,
      });
      return value;
    } catch {
      return delayedResponse(cached, "tomtom_provider_unavailable");
    }
  }

  async getTile(
    kind: TrafficTileKind,
    z: number,
    x: number,
    y: number,
  ): Promise<TrafficTileResponse> {
    if (!validateTileCoordinates(z, x, y)) {
      return emptyTile("unavailable", "invalid_tile_coordinates");
    }
    if (!tileIntersectsProjectEurope(z, x, y)) {
      return emptyTile("operational", "outside-project-europe");
    }
    if (!tileMayIntersectEuimCoverage(tileBounds4326(z, x, y))) {
      return emptyTile("operational", "outside-euim-coverage");
    }
    if (!apiKey()) return emptyTile("misconfigured", "configuration-required");
    const cacheKey = `${kind}/${z}/${x}/${y}/${trafficModel?.id ?? "current"}`;
    const cached = tileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (retryIsBlocked()) {
      return cached
        ? {
            ...cached.value,
            connectorStatus: "delayed",
            dataState: "stale-retry-after",
            retryAfter: providerFailure?.retryAfter ?? null,
          }
        : emptyTile(
            "unavailable",
            "retry-after-active",
            providerFailure?.retryAfter ?? null,
          );
    }
    const segment = kind === "flow" ? "flow/vector/tile" : "incidents/vector/tile";
    const url = new URL(`${TOMTOM_BASE_URL}/${segment}/${z}/${x}/${y}`);
    url.searchParams.set("apiVersion", API_VERSION);
    url.searchParams.set(
      "attributes",
      kind === "flow" ? FLOW_TILE_ATTRIBUTES : INCIDENT_TILE_ATTRIBUTES,
    );
    try {
      const response = await fetchDeduped(url.toString(), {
        headers: headers("application/vnd.mapbox-vector-tile"),
      });
      if (!response.ok) {
        rememberFailure(response);
        const value = emptyTile(
          connectorForHttp(response.status),
          response.status === 429
            ? "quota-exceeded"
            : `provider-http-${response.status}`,
          response.headers.get("Retry-After"),
        );
        return cached && response.status !== 401 && response.status !== 403
          ? {
              ...cached.value,
              connectorStatus: "delayed",
              dataState: `stale-provider-http-${response.status}`,
              retryAfter: value.retryAfter,
            }
          : value;
      }
      providerFailure = null;
      const value: TrafficTileResponse = {
        body: await response.arrayBuffer(),
        contentType:
          response.headers.get("Content-Type") ??
          "application/vnd.mapbox-vector-tile",
        connectorStatus: "operational",
        trafficModelId: rememberModel(response),
        dataState: "tomtom-orbis-v2",
        retryAfter: null,
      };
      tileCache.set(cacheKey, {
        expiresAt: Date.now() + TILE_CACHE_MS,
        value,
      });
      return value;
    } catch {
      return emptyTile("unavailable", "provider-unavailable");
    }
  }
}
