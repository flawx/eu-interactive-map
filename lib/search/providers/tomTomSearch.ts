import { UNESCO_MAP_COUNTRY_CODES } from "@/lib/tourism/unescoEuropeCoverage";
import { isRoutingPointAllowed } from "@/lib/routing/routingGeofence";
import { normalizeAlertCountryCode } from "@/lib/alerts/geography";
import type {
  ExternalLocationSearchResult,
  ExternalLocationType,
} from "@/lib/search/externalLocation";

const TIMEOUT_MS = 8_000;

type TomTomResult = {
  type?: string;
  id?: string;
  score?: number;
  entityType?: string;
  address?: {
    freeformAddress?: string;
    streetName?: string;
    streetNumber?: string;
    municipality?: string;
    countrySecondarySubdivision?: string;
    countrySubdivision?: string;
    countryCode?: string;
    country?: string;
  };
  poi?: {
    name?: string;
    categories?: string[];
  };
  position?: {
    lat?: number;
    lon?: number;
  };
};

type TomTomSearchResponse = {
  results?: TomTomResult[];
};

function apiKey(): string | null {
  return process.env.TOMTOM_API_KEY?.trim() || null;
}

function tomTomCountrySet(): string {
  return UNESCO_MAP_COUNTRY_CODES.map((code) => {
    if (code === "EL") return "GR";
    return code;
  }).join(",");
}

function mapType(result: TomTomResult): ExternalLocationType {
  const type = (result.type ?? "").toLowerCase();
  if (type === "poi") return "poi";
  if (type === "street") return "street";
  if (type === "crossstreet") return "intersection";
  if (type === "geography") {
    const entity = result.entityType?.toLowerCase();
    if (entity === "municipality" || entity === "municipalitysubdivision") {
      return "city";
    }
    return "geography";
  }
  if (type === "point address" || type === "address range") return "address";
  return "address";
}

function normalizeCountry(code: string | undefined): string | null {
  if (!code) return null;
  return normalizeAlertCountryCode(code) ?? code.toUpperCase();
}

export function normalizeTomTomSearchResult(
  result: TomTomResult,
): ExternalLocationSearchResult | null {
  const lat = result.position?.lat;
  const lon = result.position?.lon;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const countryCode = normalizeCountry(result.address?.countryCode);
  if (
    !isRoutingPointAllowed({
      latitude: lat!,
      longitude: lon!,
      countryCode,
    })
  ) {
    return null;
  }

  const name =
    result.poi?.name?.trim() ||
    result.address?.freeformAddress?.trim() ||
    [result.address?.streetNumber, result.address?.streetName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    result.address?.municipality ||
    "Place";

  return {
    id: `tomtom:${result.id ?? `${lat},${lon}`}`,
    provider: "tomtom",
    type: mapType(result),
    name,
    addressLabel: result.address?.freeformAddress ?? null,
    latitude: lat!,
    longitude: lon!,
    countryCode,
    municipality: result.address?.municipality ?? null,
    region:
      result.address?.countrySubdivision ??
      result.address?.countrySecondarySubdivision ??
      null,
    providerId: result.id ?? null,
  };
}

export type TomTomSearchOptions = {
  query: string;
  locale?: string;
  limit?: number;
  latitude?: number | null;
  longitude?: number | null;
  signal?: AbortSignal;
};

type FetchOutcome = {
  results: ExternalLocationSearchResult[];
  status: number;
  entitled: boolean;
};

function parseResults(payload: TomTomSearchResponse): ExternalLocationSearchResult[] {
  const out: ExternalLocationSearchResult[] = [];
  for (const item of payload.results ?? []) {
    const normalized = normalizeTomTomSearchResult(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

function logSearchUpstream(details: {
  endpoint: string;
  product: string;
  method: string;
  auth: string;
  status: number;
  contentType: string | null;
  errorBody: string | null;
}) {
  if (process.env.NODE_ENV === "production") return;
  console.info("[tomtom-search]", details);
}

async function fetchClassicSearch(
  url: string,
  signal: AbortSignal,
): Promise<FetchOutcome> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type");
  if (response.status === 401 || response.status === 403) {
    let errorBody: string | null = null;
    try {
      errorBody = (await response.text()).slice(0, 240).replace(/\s+/g, " ");
    } catch {
      errorBody = null;
    }
    logSearchUpstream({
      endpoint: "https://api.tomtom.com/search/2/search/{query}.json",
      product: "Search API v2",
      method: "GET",
      auth: "query param key",
      status: response.status,
      contentType,
      errorBody,
    });
    return { results: [], status: response.status, entitled: false };
  }
  if (!response.ok) {
    return { results: [], status: response.status, entitled: true };
  }
  const payload = (await response.json()) as TomTomSearchResponse;
  return {
    results: parseResults(payload),
    status: response.status,
    entitled: true,
  };
}

/**
 * TomTom Search API v2 Fuzzy Search.
 * Auth: query param `key` (classic Search docs) — not Orbis header auth.
 */
export async function searchTomTomLocations(
  options: TomTomSearchOptions,
): Promise<ExternalLocationSearchResult[]> {
  const key = apiKey();
  if (!key) return [];

  const q = options.query.trim();
  if (q.length < 2) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  const params = new URLSearchParams();
  params.set("key", key);
  params.set("limit", String(Math.min(12, Math.max(1, options.limit ?? 8))));
  params.set("typeahead", "true");
  params.set("countrySet", tomTomCountrySet());
  params.set("language", options.locale ?? "en-GB");
  params.set("idxSet", "Addr,Geo,PAD,POI,Str,Xstr");
  if (
    Number.isFinite(options.latitude) &&
    Number.isFinite(options.longitude)
  ) {
    params.set("lat", String(options.latitude));
    params.set("lon", String(options.longitude));
  }

  const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?${params.toString()}`;

  try {
    const outcome = await fetchClassicSearch(url, controller.signal);
    return outcome.results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
