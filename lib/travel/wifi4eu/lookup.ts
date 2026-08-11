/**
 * Synchronous WiFi4EU record lookup (embedded + official municipality fixtures).
 * Runtime OSM/community records are resolved from GeoJSON feature properties.
 */

import { WIFI4EU_FIXTURE_HOTSPOTS, getWifi4EuHotspotById } from "./fixtureHotspots";
import { WIFI4EU_DLR_HOTSPOTS } from "./municipalDlrHotspots";
import { WIFI4EU_OFFICIAL_MUNICIPALITIES } from "./officialMunicipalities";
import type { Wifi4EuRecord } from "./types";

const ALL_SYNC_RECORDS: readonly Wifi4EuRecord[] = [
  ...WIFI4EU_FIXTURE_HOTSPOTS,
  ...WIFI4EU_DLR_HOTSPOTS,
  ...WIFI4EU_OFFICIAL_MUNICIPALITIES,
];

const BY_ID = new Map<string, Wifi4EuRecord>(
  ALL_SYNC_RECORDS.map((record) => [record.id, record]),
);

export function getWifi4EuRecordById(id: string): Wifi4EuRecord | undefined {
  return BY_ID.get(id) ?? getWifi4EuHotspotById(id);
}

export function wifi4EuRecordFromFeatureProperties(
  props: Record<string, unknown>,
): Wifi4EuRecord | null {
  const id = typeof props.id === "string" ? props.id : null;
  if (!id) return null;

  const existing = getWifi4EuRecordById(id);
  if (existing) return existing;

  const longitude = Number(props.longitude ?? props.lng);
  const latitude = Number(props.latitude ?? props.lat);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const entityType =
    props.entityType === "wifi4eu_municipality"
      ? "wifi4eu_municipality"
      : "wifi4eu_hotspot";

  const sourceType =
    props.sourceType === "official" ||
    props.sourceType === "municipal_official" ||
    props.sourceType === "community"
      ? props.sourceType
      : "community";

  return {
    id,
    entityType,
    name: String(props.name ?? "WiFi4EU"),
    municipality: String(props.municipality ?? "Unknown"),
    countryCode: String(props.countryCode ?? "EU"),
    longitude,
    latitude,
    locationPrecision:
      entityType === "wifi4eu_municipality" ? "municipality" : "exact",
    sourceType,
    sourceIds: Array.isArray(props.sourceIds)
      ? (props.sourceIds as string[])
      : [],
    address: typeof props.address === "string" ? props.address : null,
    indoorOutdoor:
      props.indoorOutdoor === "indoor" ||
      props.indoorOutdoor === "outdoor" ||
      props.indoorOutdoor === "indoor_outdoor"
        ? props.indoorOutdoor
        : null,
    locationType:
      typeof props.locationType === "string" ? props.locationType : null,
    programme: "WiFi4EU",
  };
}
