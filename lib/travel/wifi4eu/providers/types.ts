/**
 * WiFi4EU multi-source provider contracts.
 *
 * No pan-EU redistributable hotspot API exists from the Commission — providers
 * combine municipal open data, official beneficiary municipalities, and
 * optional OSM community-mapped explicit WiFi4EU tags.
 */

import type {
  Wifi4EuEntityType,
  Wifi4EuLocationPrecision,
  Wifi4EuRecord,
  Wifi4EuSourceType,
} from "../types";

export type Wifi4EuProviderId =
  | "municipal-open-data"
  | "official-municipalities"
  | "osm-community";

export type Wifi4EuProviderMeta = {
  id: Wifi4EuProviderId;
  name: string;
  sourceType: Wifi4EuSourceType;
  official: boolean;
  license: string;
  officialUrl: string;
};

export type Wifi4EuQueryContext = {
  bbox?: [number, number, number, number];
  limit: number;
  cursor: number;
};

export type Wifi4EuProviderResult = {
  records: Wifi4EuRecord[];
  /** Total matched before pagination within this provider. */
  totalMatched: number;
  nextCursor: number | null;
};

export interface Wifi4EuProvider {
  meta: Wifi4EuProviderMeta;
  /** Synchronous in-memory providers (fixtures, curated lists). */
  querySync?(context: Wifi4EuQueryContext): Wifi4EuProviderResult;
  /** Async providers (OSM Overpass). */
  queryAsync?(context: Wifi4EuQueryContext): Promise<Wifi4EuProviderResult>;
}

export type MunicipalWifiDatasetDefinition = {
  id: string;
  countryCode: string;
  municipality: string;
  url: string;
  format: "ckan-datastore" | "geojson-url" | "embedded";
  license: string;
  officialUrl: string;
  /** Static embedded records when format === "embedded". */
  embeddedRecords?: readonly Wifi4EuRecord[];
};

export function makeHotspotRecord(input: {
  id: string;
  name: string;
  municipality: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  sourceType: Wifi4EuSourceType;
  sourceIds: readonly string[];
  address?: string | null;
  indoorOutdoor?: Wifi4EuRecord["indoorOutdoor"];
  locationType?: string | null;
}): Wifi4EuRecord {
  return {
    id: input.id,
    entityType: "wifi4eu_hotspot",
    name: input.name,
    municipality: input.municipality,
    countryCode: input.countryCode,
    longitude: input.longitude,
    latitude: input.latitude,
    locationPrecision: "exact",
    sourceType: input.sourceType,
    sourceIds: [...input.sourceIds],
    address: input.address ?? null,
    indoorOutdoor: input.indoorOutdoor ?? null,
    locationType: input.locationType ?? null,
    programme: "WiFi4EU",
  };
}

export function makeMunicipalityRecord(input: {
  id: string;
  municipality: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  sourceType: Wifi4EuSourceType;
  sourceIds: readonly string[];
}): Wifi4EuRecord {
  return {
    id: input.id,
    entityType: "wifi4eu_municipality",
    name: input.municipality,
    municipality: input.municipality,
    countryCode: input.countryCode,
    longitude: input.longitude,
    latitude: input.latitude,
    locationPrecision: "municipality",
    sourceType: input.sourceType,
    sourceIds: [...input.sourceIds],
    address: null,
    indoorOutdoor: null,
    locationType: null,
    programme: "WiFi4EU",
  };
}

export type Wifi4EuCoverageType =
  | "hotspots"
  | "hotspots_and_municipalities"
  | "municipalities_only";

export type Wifi4EuResponseMetadata = {
  coverageType: Wifi4EuCoverageType;
  sources: Wifi4EuProviderMeta[];
  exactHotspotCount: number;
  municipalityCount: number;
  fetchedAt: string;
  totalMatched: number;
  nextCursor: number | null;
};
