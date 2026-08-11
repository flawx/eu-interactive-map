/**
 * In-memory bbox/zoom/limit filtering over the curated WiFi4EU fixture.
 * Mirrors `lib/europe/euProjects/queryFixture.ts` — kept pure/testable so it
 * can be shared by the API route and unit tests.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { WIFI4EU_FIXTURE_HOTSPOTS } from "./fixtureHotspots";
import type { WifiHotspot, WifiHotspotQueryMeta } from "./types";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export const WIFI4EU_HOTSPOTS_IN_SCOPE: readonly WifiHotspot[] =
  WIFI4EU_FIXTURE_HOTSPOTS.filter((hotspot) => isCountryInEUIMScope(hotspot.countryCode));

function pointInBbox(
  longitude: number,
  latitude: number,
  bbox: readonly [number, number, number, number],
): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return (
    longitude >= minLng &&
    longitude <= maxLng &&
    latitude >= minLat &&
    latitude <= maxLat
  );
}

export type Wifi4EuQueryFilters = {
  bbox?: [number, number, number, number];
  limit?: number;
  cursor?: number;
};

export function queryWifi4EuHotspots(filters: Wifi4EuQueryFilters = {}): {
  hotspots: WifiHotspot[];
  meta: WifiHotspotQueryMeta;
} {
  const limit = Math.max(1, Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const cursor = Math.max(0, filters.cursor ?? 0);

  const matched = WIFI4EU_HOTSPOTS_IN_SCOPE.filter((hotspot) => {
    if (filters.bbox && !pointInBbox(hotspot.longitude, hotspot.latitude, filters.bbox)) {
      return false;
    }
    return true;
  });

  const totalMatched = matched.length;
  const page = matched.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < totalMatched ? cursor + limit : null;

  return {
    hotspots: page,
    meta: {
      fetchedAt: new Date().toISOString(),
      totalMatched,
      nextCursor,
    },
  };
}

export function parseBboxParam(
  raw: string | null,
): [number, number, number, number] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return undefined;
  }
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng > maxLng || minLat > maxLat) return undefined;
  return [minLng, minLat, maxLng, maxLat];
}

export type Wifi4EuAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  ukEntries: string[];
  hasPasswordField: boolean;
};

export function auditWifi4EuHotspots(): Wifi4EuAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const ukEntries: string[] = [];

  for (const hotspot of WIFI4EU_FIXTURE_HOTSPOTS) {
    if (ids.has(hotspot.id)) duplicateIds.push(hotspot.id);
    ids.add(hotspot.id);

    if (!Number.isFinite(hotspot.longitude) || !Number.isFinite(hotspot.latitude)) {
      missingCoordinates.push(hotspot.id);
    }

    if (!isCountryInEUIMScope(hotspot.countryCode)) {
      outsideScope.push(hotspot.id);
    }

    if (hotspot.countryCode === "UK" || hotspot.countryCode === "GB") {
      ukEntries.push(hotspot.id);
    }
  }

  const hasPasswordField = WIFI4EU_FIXTURE_HOTSPOTS.some((hotspot) =>
    Object.prototype.hasOwnProperty.call(hotspot, "password"),
  );

  return {
    total: WIFI4EU_FIXTURE_HOTSPOTS.length,
    inScope: WIFI4EU_FIXTURE_HOTSPOTS.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    ukEntries,
    hasPasswordField,
  };
}
