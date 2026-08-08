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

/** TomTom expects ISO alpha-2; project uses EL for Greece and UK for GB. */
function tomTomCountrySet(): string {
  return UNESCO_MAP_COUNTRY_CODES.map((code) => {
    if (code === "EL") return "GR";
    if (code === "UK") return "GB";
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

function parseResults(payload: TomTomSearchResponse): ExternalLocationSearchResult[] {
  const out: ExternalLocationSearchResult[] = [];
  for (const item of payload.results ?? []) {
    const normalized = normalizeTomTomSearchResult(item);
    if (normalized) out.push(normalized);
  }
  return out;
}

async function fetchTomTomJson(
  url: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<ExternalLocationSearchResult[] | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal,
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) return [];
  const payload = (await response.json()) as TomTomSearchResponse;
  return parseResults(payload);
}

export async function searchTomTomLocations(
  options: TomTomSearchOptions,
): Promise<ExternalLocationSearchResult[]> {
  const key = apiKey();
  if (!key) return [];

  const q = options.query.trim();
  if (q.length < 2) return [];

  const limit = String(Math.min(12, Math.max(1, options.limit ?? 8)));
  const countrySet = tomTomCountrySet();
  const language = options.locale ?? "en-GB";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  const shared = new URLSearchParams();
  shared.set("limit", limit);
  shared.set("typeahead", "true");
  shared.set("countrySet", countrySet);
  shared.set("language", language);
  shared.set("idxSet", "Addr,Geo,PAD,POI,Str,Xstr");
  if (
    Number.isFinite(options.latitude) &&
    Number.isFinite(options.longitude)
  ) {
    shared.set("lat", String(options.latitude));
    shared.set("lon", String(options.longitude));
    shared.set(
      "geobias",
      `point:${options.latitude},${options.longitude}`,
    );
  }

  try {
    // Prefer Orbis Places (same product family as Orbis Traffic), then classic Search v2.
    const orbisParams = new URLSearchParams(shared);
    orbisParams.set("apiVersion", "1");
    const orbisUrl = `https://api.tomtom.com/maps/orbis/places/search/${encodeURIComponent(q)}.json?${orbisParams.toString()}`;
    const orbis = await fetchTomTomJson(
      orbisUrl,
      {
        "TomTom-Api-Key": key,
        "TomTom-Api-Version": "1",
      },
      controller.signal,
    );
    if (orbis && orbis.length > 0) return orbis;

    const classicParams = new URLSearchParams(shared);
    classicParams.set("key", key);
    const classicUrl = `https://api.tomtom.com/search/2/search/${encodeURIComponent(q)}.json?${classicParams.toString()}`;
    const classic = await fetchTomTomJson(classicUrl, {}, controller.signal);
    if (classic) return classic;
    return orbis ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
