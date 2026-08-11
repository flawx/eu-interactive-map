/**
 * WiFi4EU hotspots — types.
 *
 * DATA ACCESS REALITY (see fixtureHotspots.ts header for the full note):
 * there is no officially redistributable pan-EU WiFi4EU hotspot API from the
 * European Commission for third-party apps — official discovery only happens
 * through the WiFi4EU mobile app / portal. This module therefore models a
 * small curated fixture built from redistributable *municipal* open data
 * (currently Dublin City Council, CC-BY) rather than a live EU feed.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type WifiHotspotIndoorOutdoor = "indoor" | "outdoor" | "indoor_outdoor";

export type WifiHotspot = {
  id: string;
  name: string;
  address: string | null;
  municipality: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  indoorOutdoor: WifiHotspotIndoorOutdoor;
  /** Free-text venue category from the source municipal dataset (e.g. "Park", "Square"). */
  locationType: string | null;
  programme: "WiFi4EU";
  sourceIds: string[];
};

export const WIFI4EU_HOTSPOT_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.WIFI4EU,
  DATA_LAYER_SOURCE_IDS.WIFI4EU_MUNICIPAL_OPEN_DATA,
];

export function wifiHotspotToEntity(hotspot: WifiHotspot): EUIMMapEntity {
  return {
    id: hotspot.id,
    category: "travel",
    subcategory: "wifi4eu",
    layerId: "wifi4eu",
    name: hotspot.name,
    countryCode: hotspot.countryCode,
    geometry: {
      type: "Point",
      coordinates: [hotspot.longitude, hotspot.latitude],
    },
    icon: "wifi",
    color: "#0891b2",
    sourceIds: hotspot.sourceIds,
    properties: {
      address: hotspot.address,
      municipality: hotspot.municipality,
      indoorOutdoor: hotspot.indoorOutdoor,
      locationType: hotspot.locationType,
      programme: hotspot.programme,
      // WiFi4EU hotspots never expose a password field — free public Wi-Fi only.
    },
  };
}

export function wifiHotspotsToFeatureCollection(
  hotspots: readonly WifiHotspot[],
): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(hotspots.map(wifiHotspotToEntity));
}

export type WifiHotspotQueryMeta = {
  fetchedAt: string;
  totalMatched: number;
  nextCursor: number | null;
};
