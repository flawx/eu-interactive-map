import { NextResponse } from "next/server";
import { APP_DISPLAY_NAME } from "@/lib/branding/appName";
import { supportedLocales, type Locale } from "@/lib/i18n/config";
import type { MapSearchResult } from "@/lib/search/mapSearch";

export const runtime = "nodejs";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 1000;
const REQUEST_TIMEOUT_MS = 10_000;

/** Broad European region including outermost regions commonly relevant to the map. */
const EUROPE_BBOX = {
  minLon: -31.5,
  maxLon: 45.5,
  minLat: 27.5,
  maxLat: 72.5,
} as const;

type NominatimItem = {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  type?: string;
  class?: string;
  boundingbox?: string[];
  address?: Record<string, string>;
};

type CacheEntry = {
  expiresAt: number;
  results: MapSearchResult[];
};

const geocodeCache = new Map<string, CacheEntry>();
let lastUpstreamAt = 0;
let upstreamQueue: Promise<void> = Promise.resolve();

function isLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
}

function isInEurope(lon: number, lat: number): boolean {
  return (
    lon >= EUROPE_BBOX.minLon &&
    lon <= EUROPE_BBOX.maxLon &&
    lat >= EUROPE_BBOX.minLat &&
    lat <= EUROPE_BBOX.maxLat
  );
}

function parseBbox(
  boundingbox: string[] | undefined,
): [number, number, number, number] | undefined {
  if (!boundingbox || boundingbox.length !== 4) return undefined;
  const south = Number(boundingbox[0]);
  const north = Number(boundingbox[1]);
  const west = Number(boundingbox[2]);
  const east = Number(boundingbox[3]);
  if (![south, north, west, east].every(Number.isFinite)) return undefined;
  return [west, south, east, north];
}

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

function normalizeResult(item: NominatimItem): MapSearchResult | null {
  const longitude = Number(item.lon);
  const latitude = Number(item.lat);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (!isInEurope(longitude, latitude)) return null;

  const title =
    (typeof item.name === "string" && item.name.trim()) ||
    (typeof item.display_name === "string"
      ? item.display_name.split(",")[0]?.trim()
      : "") ||
    "Place";

  const address =
    typeof item.display_name === "string" ? item.display_name : title;
  const placeType = [item.class, item.type].filter(Boolean).join(" · ") || "place";
  const countryCode = item.address?.country_code?.toUpperCase();

  return {
    id: `external:${item.place_id ?? `${longitude},${latitude}`}`,
    type: "external_place",
    category: "external",
    title,
    subtitle: placeType,
    longitude,
    latitude,
    bbox: parseBbox(item.boundingbox),
    icon: "external",
    countryCode,
    source: "nominatim",
    metadata: {
      address,
      placeType,
      osmPlaceId: item.place_id ?? null,
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const langParam = (searchParams.get("lang") ?? "en").toLowerCase();
  const lang: Locale = isLocale(langParam) ? langParam : "en";

  if (q.length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters.", results: [] },
      { status: 400 },
    );
  }

  if (q.length > 120) {
    return NextResponse.json(
      { error: "Query is too long.", results: [] },
      { status: 400 },
    );
  }

  const cacheKey = `${lang}:${q.toLowerCase()}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      results: cached.results,
      attribution: "OpenStreetMap",
      cached: true,
    });
  }

  try {
    await throttleUpstream();

    const upstream = new URL(NOMINATIM_URL);
    upstream.searchParams.set("q", q);
    upstream.searchParams.set("format", "jsonv2");
    upstream.searchParams.set("addressdetails", "1");
    upstream.searchParams.set("limit", "5");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(upstream, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": `${APP_DISPLAY_NAME}/1.0 (eu-interactive-map; contact: local-dev)`,
        Accept: "application/json",
        "Accept-Language": lang,
      },
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Upstream search unavailable.", results: [] },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { error: "Unexpected upstream response.", results: [] },
        { status: 502 },
      );
    }

    const results = payload
      .map((item) => normalizeResult(item as NominatimItem))
      .filter((item): item is MapSearchResult => item !== null);

    geocodeCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      results,
    });

    return NextResponse.json({
      results,
      attribution: "OpenStreetMap",
      cached: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Search service temporarily unavailable.", results: [] },
      { status: 503 },
    );
  }
}
