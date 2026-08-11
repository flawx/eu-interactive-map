/**
 * WiFi4EU multi-source aggregator — merges municipal, official municipality,
 * and optional OSM community providers with deduplication.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import type { Wifi4EuRecord } from "../types";
import { municipalOpenDataProvider } from "./municipalOpenData";
import { officialMunicipalitiesProvider } from "./officialMunicipalitiesProvider";
import { osmCommunityProvider } from "./osmCommunity";
import type {
  Wifi4EuCoverageType,
  Wifi4EuProvider,
  Wifi4EuQueryContext,
  Wifi4EuResponseMetadata,
} from "./types";

export const WIFI4EU_PROVIDERS: readonly Wifi4EuProvider[] = [
  municipalOpenDataProvider,
  officialMunicipalitiesProvider,
  osmCommunityProvider,
];

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function normalizeMunicipality(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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

function haversineKm(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Suppress municipality markers when exact hotspots exist for the same municipality. */
function shouldSuppressMunicipality(
  municipality: Wifi4EuRecord,
  hotspots: readonly Wifi4EuRecord[],
): boolean {
  const norm = normalizeMunicipality(municipality.municipality);
  for (const hotspot of hotspots) {
    if (hotspot.entityType !== "wifi4eu_hotspot") continue;
    if (hotspot.countryCode !== municipality.countryCode) continue;
    if (normalizeMunicipality(hotspot.municipality) === norm) return true;
    if (
      haversineKm(
        municipality.longitude,
        municipality.latitude,
        hotspot.longitude,
        hotspot.latitude,
      ) < 2
    ) {
      return true;
    }
  }
  return false;
}

function dedupeRecords(records: Wifi4EuRecord[]): Wifi4EuRecord[] {
  const byId = new Map<string, Wifi4EuRecord>();
  for (const record of records) {
    if (!byId.has(record.id)) byId.set(record.id, record);
  }
  return [...byId.values()];
}

export type Wifi4EuAggregatedQuery = {
  bbox?: [number, number, number, number];
  limit?: number;
  cursor?: number;
  includeOsm?: boolean;
};

export async function queryWifi4EuRecords(
  filters: Wifi4EuAggregatedQuery = {},
): Promise<{ records: Wifi4EuRecord[]; metadata: Wifi4EuResponseMetadata }> {
  const limit = Math.max(1, Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const cursor = Math.max(0, filters.cursor ?? 0);
  const context: Wifi4EuQueryContext = { bbox: filters.bbox, limit: 9999, cursor: 0 };

  const allRecords: Wifi4EuRecord[] = [];

  for (const provider of WIFI4EU_PROVIDERS) {
    if (provider === osmCommunityProvider && filters.includeOsm === false) continue;
    if (provider.querySync) {
      allRecords.push(...provider.querySync(context).records);
    } else if (provider.queryAsync && filters.bbox) {
      const result = await provider.queryAsync(context);
      allRecords.push(...result.records);
    }
  }

  const inScope = allRecords.filter((record) =>
    isCountryInEUIMScope(record.countryCode),
  );

  const hotspots = inScope.filter((r) => r.entityType === "wifi4eu_hotspot");
  const municipalities = inScope.filter(
    (r) =>
      r.entityType === "wifi4eu_municipality" &&
      !shouldSuppressMunicipality(r, hotspots),
  );

  let merged = dedupeRecords([...hotspots, ...municipalities]);

  if (filters.bbox) {
    merged = merged.filter((record) =>
      pointInBbox(record.longitude, record.latitude, filters.bbox!),
    );
  }

  const exactHotspotCount = merged.filter(
    (r) => r.entityType === "wifi4eu_hotspot",
  ).length;
  const municipalityCount = merged.filter(
    (r) => r.entityType === "wifi4eu_municipality",
  ).length;

  let coverageType: Wifi4EuCoverageType = "municipalities_only";
  if (exactHotspotCount > 0 && municipalityCount > 0) {
    coverageType = "hotspots_and_municipalities";
  } else if (exactHotspotCount > 0) {
    coverageType = "hotspots";
  }

  const totalMatched = merged.length;
  const page = merged.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < totalMatched ? cursor + limit : null;

  return {
    records: page,
    metadata: {
      coverageType,
      sources: WIFI4EU_PROVIDERS.map((p) => p.meta),
      exactHotspotCount,
      municipalityCount,
      fetchedAt: new Date().toISOString(),
      totalMatched,
      nextCursor,
    },
  };
}

export function getWifi4EuGlobalCounts(): {
  exactHotspotCount: number;
  municipalityCount: number;
} {
  const context: Wifi4EuQueryContext = { limit: 99999, cursor: 0 };
  const all: Wifi4EuRecord[] = [];
  for (const provider of WIFI4EU_PROVIDERS) {
    if (provider === osmCommunityProvider) continue;
    if (provider.querySync) all.push(...provider.querySync(context).records);
  }
  const inScope = all.filter((r) => isCountryInEUIMScope(r.countryCode));
  const hotspots = inScope.filter((r) => r.entityType === "wifi4eu_hotspot");
  const municipalities = inScope.filter(
    (r) =>
      r.entityType === "wifi4eu_municipality" &&
      !shouldSuppressMunicipality(r, hotspots),
  );
  return {
    exactHotspotCount: dedupeRecords(hotspots).length,
    municipalityCount: dedupeRecords(municipalities).length,
  };
}
