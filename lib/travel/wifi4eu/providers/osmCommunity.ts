/**
 * OpenStreetMap community WiFi4EU provider.
 *
 * Queries Overpass for nodes/ways explicitly tagged as WiFi4EU — never all
 * internet_access=wlan. Results are labelled community-mapped in the UI.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import type { Wifi4EuRecord } from "../types";
import { makeHotspotRecord, type Wifi4EuProvider, type Wifi4EuProviderResult, type Wifi4EuQueryContext } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 10 * 60_000;

type CacheEntry = { expiresAt: number; records: Wifi4EuRecord[] };
const bboxCache = new Map<string, CacheEntry>();

function cacheKey(bbox: [number, number, number, number]): string {
  return bbox.map((v) => v.toFixed(3)).join(",");
}

function normalizeIndoorOutdoor(
  raw: string | undefined,
): Wifi4EuRecord["indoorOutdoor"] {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes("indoor") && v.includes("outdoor")) return "indoor_outdoor";
  if (v.includes("indoor")) return "indoor";
  if (v.includes("outdoor")) return "outdoor";
  return null;
}

function buildOverpassQuery(bbox: [number, number, number, number]): string {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return `[out:json][timeout:25];
(
  node["name"~"WiFi4EU",i](${minLat},${minLng},${maxLat},${maxLng});
  node["network"~"WiFi4EU",i](${minLat},${minLng},${maxLat},${maxLng});
  node["operator"~"WiFi4EU",i](${minLat},${minLng},${maxLat},${maxLng});
  node["ssid"~"WiFi4EU",i](${minLat},${minLng},${maxLat},${maxLng});
  way["name"~"WiFi4EU",i](${minLat},${minLng},${maxLat},${maxLng});
);
out center 100;`;
}

function parseOverpassResponse(raw: unknown): Wifi4EuRecord[] {
  const response = raw as {
    elements?: Array<{
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };
  const records: Wifi4EuRecord[] = [];
  const seen = new Set<string>();

  for (const element of response.elements ?? []) {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const tags = element.tags ?? {};
    const name =
      tags.name ??
      tags["addr:street"] ??
      tags.operator ??
      "WiFi4EU (OpenStreetMap)";
    const dedupeKey = `${Math.round(lon! * 1e5)},${Math.round(lat! * 1e5)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    records.push(
      makeHotspotRecord({
        id: `wifi4eu-osm-${element.type}-${element.id}`,
        name,
        municipality: tags["addr:city"] ?? tags["addr:town"] ?? "Unknown",
        countryCode: (tags["addr:country"] ?? "").slice(0, 2).toUpperCase() || "EU",
        longitude: lon!,
        latitude: lat!,
        sourceType: "community",
        sourceIds: [DATA_LAYER_SOURCE_IDS.WIFI4EU_OSM_COMMUNITY],
        address: tags["addr:full"] ?? null,
        indoorOutdoor: normalizeIndoorOutdoor(tags.indoor ?? tags.location),
        locationType: tags.network ?? tags.ssid ?? null,
      }),
    );
  }

  return records;
}

async function fetchOsmRecords(
  bbox: [number, number, number, number],
): Promise<Wifi4EuRecord[]> {
  const key = cacheKey(bbox);
  const cached = bboxCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.records;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(buildOverpassQuery(bbox))}`,
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const json: unknown = await response.json();
    const records = parseOverpassResponse(json);
    bboxCache.set(key, { records, expiresAt: Date.now() + CACHE_TTL_MS });
    return records;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function paginate(
  records: Wifi4EuRecord[],
  context: Wifi4EuQueryContext,
): Wifi4EuProviderResult {
  const totalMatched = records.length;
  const page = records.slice(context.cursor, context.cursor + context.limit);
  const nextCursor =
    context.cursor + context.limit < totalMatched
      ? context.cursor + context.limit
      : null;
  return { records: page, totalMatched, nextCursor };
}

export const osmCommunityProvider: Wifi4EuProvider = {
  meta: {
    id: "osm-community",
    name: "OpenStreetMap (explicit WiFi4EU tags)",
    sourceType: "community",
    official: false,
    license: "ODbL (OpenStreetMap contributors)",
    officialUrl: "https://www.openstreetmap.org/copyright",
  },
  async queryAsync(context) {
    if (!context.bbox) {
      return { records: [], totalMatched: 0, nextCursor: null };
    }
    const records = await fetchOsmRecords(context.bbox);
    return paginate(records, context);
  },
};

export function clearOsmCommunityCache(): void {
  bboxCache.clear();
}
