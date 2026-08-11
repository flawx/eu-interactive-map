/**
 * Server-side bbox-scoped proxy over the EEA Bathing Water ArcGIS
 * MapServer. https://water.discomap.eea.europa.eu/arcgis/rest/services/BathingWater/BathingWater_Dyna_WM/MapServer
 *
 * URL-building and response normalization are pure/testable; only
 * `fetchBathingWatersInBbox` performs the live `fetch`. Mirrors
 * `lib/travel/wifi4eu/query.ts` and `lib/europe/euProjects/queryFixture.ts`.
 */

import { isCountryInEUIMScope, normalizeEUIMCountryCode } from "@/lib/geography/euimCoverage";
import {
  makeBathingWaterSourceIds,
  normalizeBathingWaterClassification,
  normalizeBathingWaterType,
  type BathingWaterQueryMeta,
  type BathingWaterSite,
} from "./types";

export const BATHING_WATER_MAPSERVER_BASE =
  "https://water.discomap.eea.europa.eu/arcgis/rest/services/BathingWater/BathingWater_Dyna_WM/MapServer";

/** Layer 0 = bathing water quality points per the EEA service's published layer list. */
export const BATHING_WATER_QUALITY_LAYER = 0;

const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 1000;
const REQUEST_TIMEOUT_MS = 8_000;

export function buildBathingWaterQueryUrl(
  bbox: [number, number, number, number] | undefined,
  limit: number,
  offset: number,
): string {
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    resultRecordCount: String(limit),
    resultOffset: String(offset),
  });
  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    params.set(
      "geometry",
      JSON.stringify({
        xmin: minLng,
        ymin: minLat,
        xmax: maxLng,
        ymax: maxLat,
        spatialReference: { wkid: 4326 },
      }),
    );
    params.set("geometryType", "esriGeometryEnvelope");
    params.set("inSR", "4326");
    params.set("spatialRel", "esriSpatialRelIntersects");
  }
  return `${BATHING_WATER_MAPSERVER_BASE}/${BATHING_WATER_QUALITY_LAYER}/query?${params.toString()}`;
}

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
};

function firstDefined(
  attributes: Record<string, unknown>,
  keys: readonly string[],
): unknown {
  for (const key of keys) {
    if (attributes[key] !== undefined && attributes[key] !== null) {
      return attributes[key];
    }
  }
  return undefined;
}

/** Parses one raw ArcGIS query response into normalized bathing water sites. Pure — unit-testable. */
export function parseBathingWaterQueryResponse(
  raw: unknown,
): BathingWaterSite[] {
  const response = raw as { features?: ArcGisFeature[] };
  const features = response?.features ?? [];
  const sites: BathingWaterSite[] = [];

  for (const feature of features) {
    const attributes = feature.attributes ?? {};
    const longitude = feature.geometry?.x;
    const latitude = feature.geometry?.y;
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) continue;

    const rawId = firstDefined(attributes, ["EU_BW_ID", "BATHING_WATER_ID", "OBJECTID"]);
    const id = rawId !== undefined ? `eea-bw-${String(rawId)}` : null;
    if (!id) continue;

    const rawCountry = firstDefined(attributes, ["COUNTRY_CODE", "COUNTRY", "MS"]);
    const countryCode = normalizeEUIMCountryCode(rawCountry) ?? "";
    if (!countryCode) continue;

    const name = String(
      firstDefined(attributes, ["BATHING_WATER_NAME", "NAME"]) ?? "Bathing water site",
    ).trim();

    const seasonYearRaw = firstDefined(attributes, ["YEAR", "SEASON_YEAR"]);
    const seasonYear =
      typeof seasonYearRaw === "number" && Number.isFinite(seasonYearRaw)
        ? seasonYearRaw
        : null;

    sites.push({
      id,
      name,
      countryCode,
      waterType: normalizeBathingWaterType(
        firstDefined(attributes, ["BATHING_WATER_TYPE", "WATER_TYPE"]),
      ),
      classification: normalizeBathingWaterClassification(
        firstDefined(attributes, ["QUALITY_CLASS", "CLASSIFICATION", "QUALITY"]),
      ),
      seasonYear,
      longitude: longitude as number,
      latitude: latitude as number,
      sourceIds: makeBathingWaterSourceIds(),
    });
  }

  return sites;
}

export type BathingWaterQueryResult =
  | { ok: true; sites: BathingWaterSite[]; meta: BathingWaterQueryMeta }
  | { ok: false; error: "timeout" | "upstream_error" | "invalid_response" };

/**
 * Fetches one bbox-scoped page from the live EEA service, applying the
 * EUIM scope filter (excludes UK) server-side. Only ever called while the
 * European Bathing Waters layer is switched ON client-side.
 */
export async function fetchBathingWatersInBbox(filters: {
  bbox?: [number, number, number, number];
  limit?: number;
  cursor?: number;
}): Promise<BathingWaterQueryResult> {
  const limit = Math.max(1, Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const cursor = Math.max(0, filters.cursor ?? 0);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      buildBathingWaterQueryUrl(filters.bbox, limit, cursor),
      { signal: controller.signal },
    );
    if (!response.ok) {
      return { ok: false, error: "upstream_error" };
    }
    const json: unknown = await response.json();
    const parsed = parseBathingWaterQueryResponse(json);
    const inScope = parsed.filter((site) => isCountryInEUIMScope(site.countryCode));

    return {
      ok: true,
      sites: inScope,
      meta: {
        fetchedAt: new Date().toISOString(),
        totalMatched: inScope.length,
        nextCursor: parsed.length === limit ? cursor + limit : null,
        isRealTime: false,
      },
    };
  } catch {
    if (controller.signal.aborted) {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "invalid_response" };
  } finally {
    clearTimeout(timeout);
  }
}
