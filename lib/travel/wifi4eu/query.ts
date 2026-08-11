/**
 * WiFi4EU query layer — delegates to multi-source provider aggregator.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { WIFI4EU_FIXTURE_HOTSPOTS } from "./fixtureHotspots";
import { WIFI4EU_DLR_HOTSPOTS } from "./municipalDlrHotspots";
import {
  getWifi4EuGlobalCounts,
  queryWifi4EuRecords,
} from "./providers/index";
import type { Wifi4EuRecord } from "./types";

export { queryWifi4EuRecords, getWifi4EuGlobalCounts };

export type Wifi4EuQueryFilters = {
  bbox?: [number, number, number, number];
  limit?: number;
  cursor?: number;
  includeOsm?: boolean;
};

export async function queryWifi4EuHotspots(filters: Wifi4EuQueryFilters = {}) {
  const { records, metadata } = await queryWifi4EuRecords(filters);
  return {
    hotspots: records,
    meta: {
      fetchedAt: metadata.fetchedAt,
      totalMatched: metadata.totalMatched,
      nextCursor: metadata.nextCursor,
      coverageType: metadata.coverageType,
      sources: metadata.sources,
      exactHotspotCount: metadata.exactHotspotCount,
      municipalityCount: metadata.municipalityCount,
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
  exactHotspotCount: number;
  municipalityCount: number;
};

const ALL_EMBEDDED_HOTSPOTS: readonly Wifi4EuRecord[] = [
  ...WIFI4EU_FIXTURE_HOTSPOTS,
  ...WIFI4EU_DLR_HOTSPOTS,
];

export function auditWifi4EuHotspots(): Wifi4EuAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const ukEntries: string[] = [];

  for (const hotspot of ALL_EMBEDDED_HOTSPOTS) {
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

  const hasPasswordField = ALL_EMBEDDED_HOTSPOTS.some((hotspot) =>
    Object.prototype.hasOwnProperty.call(hotspot, "password"),
  );

  const global = getWifi4EuGlobalCounts();

  return {
    total: ALL_EMBEDDED_HOTSPOTS.length,
    inScope: ALL_EMBEDDED_HOTSPOTS.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    ukEntries,
    hasPasswordField,
    exactHotspotCount: global.exactHotspotCount,
    municipalityCount: global.municipalityCount,
  };
}

/** @deprecated synchronous in-memory query — use queryWifi4EuHotspots instead. */
export const WIFI4EU_HOTSPOTS_IN_SCOPE: readonly Wifi4EuRecord[] =
  ALL_EMBEDDED_HOTSPOTS.filter((hotspot) =>
    isCountryInEUIMScope(hotspot.countryCode),
  );
