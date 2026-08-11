/**
 * WiFi4EU — types for multi-source provider architecture.
 *
 * Two entity types:
 *   wifi4eu_hotspot      — exact access-point coordinate from municipal/OSM data
 *   wifi4eu_municipality — official beneficiary municipality (no exact AP coords)
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type Wifi4EuEntityType = "wifi4eu_hotspot" | "wifi4eu_municipality";

export type Wifi4EuSourceType = "official" | "municipal_official" | "community";

export type Wifi4EuLocationPrecision = "exact" | "municipality";

export type WifiHotspotIndoorOutdoor = "indoor" | "outdoor" | "indoor_outdoor";

export type Wifi4EuRecord = {
  id: string;
  entityType: Wifi4EuEntityType;
  name: string;
  municipality: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  locationPrecision: Wifi4EuLocationPrecision;
  sourceType: Wifi4EuSourceType;
  sourceIds: readonly string[];
  address: string | null;
  indoorOutdoor: WifiHotspotIndoorOutdoor | null;
  locationType: string | null;
  programme: "WiFi4EU";
};

/** @deprecated Use Wifi4EuRecord — kept for fixture compatibility during migration. */
export type WifiHotspot = Wifi4EuRecord & { entityType: "wifi4eu_hotspot" };

export const WIFI4EU_HOTSPOT_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.WIFI4EU,
  DATA_LAYER_SOURCE_IDS.WIFI4EU_MUNICIPAL_OPEN_DATA,
];

export const WIFI4EU_OSM_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.WIFI4EU_OSM_COMMUNITY,
];

export function wifi4EuRecordToEntity(record: Wifi4EuRecord): EUIMMapEntity {
  const isMunicipality = record.entityType === "wifi4eu_municipality";
  return {
    id: record.id,
    category: "travel",
    subcategory: "wifi4eu",
    layerId: "wifi4eu",
    name: isMunicipality ? `${record.municipality} (WiFi4EU)` : record.name,
    countryCode: record.countryCode,
    geometry: {
      type: "Point",
      coordinates: [record.longitude, record.latitude],
    },
    icon: isMunicipality ? "wifi-municipality" : "wifi",
    color: isMunicipality ? "#06b6d4" : "#0891b2",
    sourceIds: [...record.sourceIds],
    properties: {
      entityType: record.entityType,
      locationPrecision: record.locationPrecision,
      sourceType: record.sourceType,
      address: record.address,
      municipality: record.municipality,
      indoorOutdoor: record.indoorOutdoor,
      locationType: record.locationType,
      programme: record.programme,
    },
  };
}

export function wifi4EuRecordsToFeatureCollection(
  records: readonly Wifi4EuRecord[],
): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(records.map(wifi4EuRecordToEntity));
}

/** @deprecated */
export function wifiHotspotToEntity(hotspot: Wifi4EuRecord): EUIMMapEntity {
  return wifi4EuRecordToEntity(hotspot);
}

/** @deprecated */
export function wifiHotspotsToFeatureCollection(
  hotspots: readonly Wifi4EuRecord[],
): GeoJSON.FeatureCollection {
  return wifi4EuRecordsToFeatureCollection(hotspots);
}

export type WifiHotspotQueryMeta = {
  fetchedAt: string;
  totalMatched: number;
  nextCursor: number | null;
};
