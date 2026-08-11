/**
 * Municipal open-data WiFi4EU hotspot provider.
 *
 * Embedded fixtures from redistributable municipal datasets (Dublin City Council,
 * Dún Laoghaire-Rathdown County Council). Additional feeds can be registered in
 * MUNICIPAL_WIFI_DATASETS without hand-coding per-city providers.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import { WIFI4EU_FIXTURE_HOTSPOTS } from "../fixtureHotspots";
import { WIFI4EU_DLR_HOTSPOTS } from "../municipalDlrHotspots";
import type { Wifi4EuRecord } from "../types";
import {
  makeHotspotRecord,
  type MunicipalWifiDatasetDefinition,
  type Wifi4EuProvider,
  type Wifi4EuProviderResult,
  type Wifi4EuQueryContext,
} from "./types";

const MUNICIPAL_SOURCE_IDS = [
  DATA_LAYER_SOURCE_IDS.WIFI4EU_MUNICIPAL_OPEN_DATA,
] as const;

export const MUNICIPAL_WIFI_DATASETS: readonly MunicipalWifiDatasetDefinition[] =
  [
    {
      id: "dcc-dublin",
      countryCode: "IE",
      municipality: "Dublin",
      url: "https://data.smartdublin.ie/dataset/wifi4eu-access-points-dcc",
      format: "embedded",
      license: "Creative Commons Attribution (CC-BY)",
      officialUrl:
        "https://data.smartdublin.ie/dataset/wifi4eu-access-points-dcc",
      embeddedRecords: WIFI4EU_FIXTURE_HOTSPOTS,
    },
    {
      id: "dlr-dun-laoghaire-rathdown",
      countryCode: "IE",
      municipality: "Dún Laoghaire-Rathdown",
      url: "https://data.gov.ie/dataset/wifi4eu-access-points-dlr",
      format: "embedded",
      license: "Creative Commons Attribution (CC-BY)",
      officialUrl: "https://data.gov.ie/dataset/wifi4eu-access-points-dlr",
      embeddedRecords: WIFI4EU_DLR_HOTSPOTS,
    },
  ];

function collectMunicipalHotspots(): Wifi4EuRecord[] {
  const records: Wifi4EuRecord[] = [];
  for (const dataset of MUNICIPAL_WIFI_DATASETS) {
    for (const record of dataset.embeddedRecords ?? []) {
      records.push(record);
    }
  }
  return records;
}

const MUNICIPAL_HOTSPOTS = collectMunicipalHotspots();

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

function queryRecords(
  records: readonly Wifi4EuRecord[],
  context: Wifi4EuQueryContext,
): Wifi4EuProviderResult {
  const matched = records.filter((record) => {
    if (context.bbox && !pointInBbox(record.longitude, record.latitude, context.bbox)) {
      return false;
    }
    return true;
  });
  const totalMatched = matched.length;
  const page = matched.slice(context.cursor, context.cursor + context.limit);
  const nextCursor =
    context.cursor + context.limit < totalMatched
      ? context.cursor + context.limit
      : null;
  return { records: page, totalMatched, nextCursor };
}

export const municipalOpenDataProvider: Wifi4EuProvider = {
  meta: {
    id: "municipal-open-data",
    name: "Municipal open data (Dublin, DLR)",
    sourceType: "municipal_official",
    official: true,
    license: "CC-BY (per dataset)",
    officialUrl: "https://data.smartdublin.ie/dataset/wifi4eu-access-points-dcc",
  },
  querySync(context) {
    return queryRecords(MUNICIPAL_HOTSPOTS, context);
  },
};

export function getMunicipalHotspotCount(): number {
  return MUNICIPAL_HOTSPOTS.length;
}

export function getMunicipalHotspotsInScope(): readonly Wifi4EuRecord[] {
  return MUNICIPAL_HOTSPOTS;
}
