import { APP_DISPLAY_NAME } from "@/lib/branding/appName";
import { isRoutingPointAllowed } from "@/lib/routing/routingGeofence";
import { normalizeAlertCountryCode } from "@/lib/alerts/geography";
import type {
  ExternalLocationSearchResult,
  ExternalLocationType,
} from "@/lib/search/externalLocation";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const TIMEOUT_MS = 10_000;
const MIN_INTERVAL_MS = 1000;

type NominatimItem = {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  type?: string;
  class?: string;
  address?: Record<string, string>;
};

let lastUpstreamAt = 0;
let upstreamQueue: Promise<void> = Promise.resolve();

async function throttleUpstream(): Promise<void> {
  const run = async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastUpstreamAt));
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastUpstreamAt = Date.now();
  };
  upstreamQueue = upstreamQueue.then(run, run);
  await upstreamQueue;
}

function mapType(item: NominatimItem): ExternalLocationType {
  const cls = (item.class ?? "").toLowerCase();
  const type = (item.type ?? "").toLowerCase();
  if (cls === "highway" || type === "residential" || type === "road") {
    return "street";
  }
  if (type === "city" || type === "town" || type === "village" || type === "municipality") {
    return "city";
  }
  if (cls === "amenity" || cls === "tourism" || cls === "shop") return "poi";
  if (type === "house" || type === "building" || cls === "place") {
    if (item.address?.house_number) return "address";
  }
  if (item.address?.house_number) return "address";
  if (cls === "place") return "geography";
  return "address";
}

export function normalizeNominatimSearchResult(
  item: NominatimItem,
): ExternalLocationSearchResult | null {
  const latitude = Number(item.lat);
  const longitude = Number(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const countryCode = item.address?.country_code
    ? normalizeAlertCountryCode(item.address.country_code) ??
      item.address.country_code.toUpperCase()
    : null;

  if (!isRoutingPointAllowed({ latitude, longitude, countryCode })) {
    return null;
  }

  const freeform =
    typeof item.display_name === "string" ? item.display_name.trim() : "";
  const rawName =
    (typeof item.name === "string" && item.name.trim()) ||
    (freeform ? freeform.split(",")[0]?.trim() : "") ||
    "Place";
  // Prefer a richer label when OSM name is only a house number.
  const name =
    /^\d+[a-zA-Z]?$/.test(rawName) && freeform
      ? freeform.split(",").slice(0, 2).join(",").trim() || freeform
      : rawName;

  return {
    id: `nominatim:${item.place_id ?? `${latitude},${longitude}`}`,
    provider: "nominatim",
    type: mapType(item),
    name,
    addressLabel: freeform || null,
    latitude,
    longitude,
    countryCode,
    municipality:
      item.address?.city ??
      item.address?.town ??
      item.address?.village ??
      item.address?.municipality ??
      null,
    region: item.address?.state ?? item.address?.county ?? null,
    providerId: item.place_id != null ? String(item.place_id) : null,
  };
}

export async function searchNominatimLocations(options: {
  query: string;
  locale?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<ExternalLocationSearchResult[]> {
  const q = options.query.trim();
  if (q.length < 2) return [];

  await throttleUpstream();

  const upstream = new URL(NOMINATIM_URL);
  upstream.searchParams.set("q", q);
  upstream.searchParams.set("format", "jsonv2");
  upstream.searchParams.set("addressdetails", "1");
  upstream.searchParams.set(
    "limit",
    String(Math.min(8, Math.max(1, options.limit ?? 5))),
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(upstream, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": `${APP_DISPLAY_NAME}/1.0 (eu-interactive-map; contact: local-dev)`,
        Accept: "application/json",
        "Accept-Language": options.locale ?? "en",
      },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) return [];
    const out: ExternalLocationSearchResult[] = [];
    for (const item of payload) {
      const normalized = normalizeNominatimSearchResult(item as NominatimItem);
      if (normalized) out.push(normalized);
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}
