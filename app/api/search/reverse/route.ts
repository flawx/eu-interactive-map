import { NextResponse } from "next/server";
import { APP_DISPLAY_NAME } from "@/lib/branding/appName";
import { supportedLocales, type Locale } from "@/lib/i18n/config";
import { isRoutingPointAllowed } from "@/lib/routing/routingGeofence";
import type { MapSearchResult } from "@/lib/search/mapSearch";

export const runtime = "nodejs";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const REQUEST_TIMEOUT_MS = 10_000;
const MIN_INTERVAL_MS = 1000;

let lastUpstreamAt = 0;
let upstreamQueue: Promise<void> = Promise.resolve();

function isLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const langRaw = (searchParams.get("lang") ?? "en").trim();
  const lang: Locale = isLocale(langRaw) ? langRaw : "en";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat and lon are required" },
      { status: 400 },
    );
  }

  if (!isRoutingPointAllowed({ latitude: lat, longitude: lon })) {
    return NextResponse.json(
      { error: "point_outside_coverage", result: null },
      { status: 422 },
    );
  }

  await throttleUpstream();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": `${APP_DISPLAY_NAME}/1.0 (routing reverse-geocode)`,
        "Accept-Language": lang,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "reverse_geocode_failed", result: null },
        { status: 502 },
      );
    }

    const item = (await response.json()) as {
      place_id?: number | string;
      display_name?: string;
      name?: string;
      address?: Record<string, string>;
      lat?: string;
      lon?: string;
    };

    const title =
      (typeof item.name === "string" && item.name.trim()) ||
      (typeof item.display_name === "string"
        ? item.display_name.split(",")[0]?.trim()
        : "") ||
      `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

    const result: MapSearchResult = {
      id: `reverse:${item.place_id ?? `${lon},${lat}`}`,
      type: "external_place",
      category: "external",
      title,
      subtitle: item.display_name ?? title,
      longitude: lon,
      latitude: lat,
      icon: "external",
      countryCode: item.address?.country_code?.toUpperCase(),
      source: "nominatim",
      metadata: {
        address: item.display_name ?? title,
        placeType: "reverse",
        osmPlaceId: item.place_id ?? null,
      },
    };

    return NextResponse.json({ result });
  } catch {
    return NextResponse.json(
      { error: "reverse_geocode_failed", result: null },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
