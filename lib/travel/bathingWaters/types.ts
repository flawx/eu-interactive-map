/**
 * European Bathing Waters — types.
 *
 * DATA ACCESS REALITY: the EEA `BathingWater/BathingWater_Dyna_WM` MapServer
 * hosts ~22,000 EU bathing sites. There is no reasonable way (nor need) to
 * bundle that client-side — this module streams a bbox-scoped page via
 * `app/api/travel/bathing-waters/route.ts`, cached/clustered client-side by
 * `createViewportDataLoader` + MapLibre clustering, exactly like the WiFi4EU
 * pattern in `lib/travel/wifi4eu/`.
 *
 * The EEA classification is an ANNUAL assessment (previous bathing season),
 * never a real-time water-safety signal — every panel/label referencing it
 * must carry that disclaimer.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type BathingWaterClassification =
  | "excellent"
  | "good"
  | "sufficient"
  | "poor"
  | "notClassified";

export type BathingWaterType = "coastal" | "inland" | "unknown";

export type BathingWaterSite = {
  id: string;
  name: string;
  countryCode: string;
  waterType: BathingWaterType;
  classification: BathingWaterClassification;
  /** Assessment/reporting year for the classification, when the service reports it. */
  seasonYear: number | null;
  longitude: number;
  latitude: number;
  sourceIds: string[];
};

export const BATHING_WATER_CLASSIFICATION_COLORS: Record<
  BathingWaterClassification,
  string
> = {
  excellent: "#16a34a",
  good: "#0891b2",
  sufficient: "#eab308",
  poor: "#dc2626",
  notClassified: "#94a3b8",
};

const BATHING_WATER_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.EEA_BATHING_WATER,
];

/** Normalizes the EEA service's free-text quality classification field. */
export function normalizeBathingWaterClassification(
  raw: unknown,
): BathingWaterClassification {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value.includes("excellent")) return "excellent";
  if (value.includes("good")) return "good";
  if (value.includes("sufficient")) return "sufficient";
  if (value.includes("poor")) return "poor";
  return "notClassified";
}

/** Normalizes the EEA service's free-text coastal/inland water-type field. */
export function normalizeBathingWaterType(raw: unknown): BathingWaterType {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value.includes("coast") || value.includes("marine") || value.includes("sea")) {
    return "coastal";
  }
  if (value.includes("inland") || value.includes("river") || value.includes("lake")) {
    return "inland";
  }
  return "unknown";
}

export function bathingWaterSiteToEntity(site: BathingWaterSite): EUIMMapEntity {
  return {
    id: site.id,
    category: "travel",
    subcategory: site.classification,
    layerId: "european-bathing-waters",
    name: site.name,
    countryCode: site.countryCode,
    geometry: { type: "Point", coordinates: [site.longitude, site.latitude] },
    icon: "bathing-water",
    color: BATHING_WATER_CLASSIFICATION_COLORS[site.classification],
    sourceIds: site.sourceIds,
    properties: {
      waterType: site.waterType,
      classification: site.classification,
      seasonYear: site.seasonYear,
    },
  };
}

export function bathingWaterSitesToFeatureCollection(
  sites: readonly BathingWaterSite[],
): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(sites.map(bathingWaterSiteToEntity));
}

export function makeBathingWaterSourceIds(): string[] {
  return [...BATHING_WATER_SOURCE_IDS];
}

export type BathingWaterQueryMeta = {
  fetchedAt: string;
  totalMatched: number;
  nextCursor: number | null;
  /** Always false — classification is the previous bathing season's annual assessment. */
  isRealTime: false;
};
