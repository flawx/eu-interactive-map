/**
 * Official WiFi4EU programme beneficiary municipalities provider.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import { WIFI4EU_OFFICIAL_MUNICIPALITIES } from "../officialMunicipalities";
import type { Wifi4EuProvider, Wifi4EuProviderResult, Wifi4EuQueryContext } from "./types";

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

function queryRecords(context: Wifi4EuQueryContext): Wifi4EuProviderResult {
  const matched = WIFI4EU_OFFICIAL_MUNICIPALITIES.filter((record) => {
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

export const officialMunicipalitiesProvider: Wifi4EuProvider = {
  meta: {
    id: "official-municipalities",
    name: "WiFi4EU programme beneficiary municipalities",
    sourceType: "official",
    official: true,
    license: "European Commission programme documentation",
    officialUrl:
      "https://digital-strategy.ec.europa.eu/en/activities/wifi4eu-municipalities",
  },
  querySync(context) {
    return queryRecords(context);
  },
};

export function getOfficialMunicipalityCount(): number {
  return WIFI4EU_OFFICIAL_MUNICIPALITIES.length;
}

export const OFFICIAL_MUNICIPALITY_SOURCE_IDS = [
  DATA_LAYER_SOURCE_IDS.WIFI4EU,
  DATA_LAYER_SOURCE_IDS.WIFI4EU_OFFICIAL_MUNICIPALITIES,
] as const;
