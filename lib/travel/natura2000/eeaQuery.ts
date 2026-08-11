/**
 * Server-side proxy helpers for the EEA Natura 2000 ArcGIS MapServer.
 * https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000_Dyna_WM/MapServer
 *
 * Layer 0 ("Query Sites") is used for point/bbox identify — never the full
 * dataset. URL-building and response-normalization are kept as pure
 * functions so they're unit-testable without a live network call; only
 * `fetchNatura2000Site` performs the actual `fetch`.
 */

import { isCountryInEUIMScope, normalizeEUIMCountryCode } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import { normalizeDesignationType, type Natura2000Site } from "./types";

export const NATURA2000_MAPSERVER_BASE =
  "https://bio.discomap.eea.europa.eu/arcgis/rest/services/ProtectedSites/Natura2000_Dyna_WM/MapServer";

/** Layer 0 = "Query Sites" per the EEA service's published layer list. */
export const NATURA2000_QUERY_SITES_LAYER = 0;

const NATURA2000_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.EEA_NATURA2000,
  DATA_LAYER_SOURCE_IDS.EUROPEAN_COMMISSION_NATURA2000,
];

const REQUEST_TIMEOUT_MS = 8_000;
/** Identify tolerance around the clicked point, in degrees (~1.1km at the equator). */
const IDENTIFY_BUFFER_DEGREES = 0.01;

export function buildNatura2000IdentifyUrl(
  longitude: number,
  latitude: number,
  bufferDegrees: number = IDENTIFY_BUFFER_DEGREES,
): string {
  const envelope = {
    xmin: longitude - bufferDegrees,
    ymin: latitude - bufferDegrees,
    xmax: longitude + bufferDegrees,
    ymax: latitude + bufferDegrees,
    spatialReference: { wkid: 4326 },
  };
  const params = new URLSearchParams({
    f: "json",
    geometry: JSON.stringify(envelope),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: "true",
    resultRecordCount: "1",
  });
  return `${NATURA2000_MAPSERVER_BASE}/${NATURA2000_QUERY_SITES_LAYER}/query?${params.toString()}`;
}

type ArcGisQueryFeature = {
  attributes?: Record<string, unknown>;
  geometry?: { x?: number; y?: number };
};

type ArcGisQueryResponse = {
  features?: ArcGisQueryFeature[];
  error?: { message?: string; code?: number };
};

/** Best-effort attribute name resolution — the EEA service's field names vary by layer/version. */
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

export function parseNatura2000QueryResponse(
  raw: unknown,
): Natura2000Site | null {
  const response = raw as ArcGisQueryResponse;
  const feature = response?.features?.[0];
  if (!feature) return null;

  const attributes = feature.attributes ?? {};
  const longitude = feature.geometry?.x;
  const latitude = feature.geometry?.y;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;

  const siteCode = String(
    firstDefined(attributes, ["SITECODE", "SITE_CODE", "sitecode"]) ?? "",
  ).trim();
  if (!siteCode) return null;

  const siteName = String(
    firstDefined(attributes, ["SITENAME", "SITE_NAME", "sitename"]) ?? siteCode,
  ).trim();

  const countryRaw = firstDefined(attributes, ["COUNTRY_CODE", "COUNTRY", "MS"]);
  const countryCode = countryRaw ? normalizeEUIMCountryCode(countryRaw) : null;

  const areaRaw = firstDefined(attributes, ["AREAHA", "AREA_HA", "SHAPE_Area"]);
  const areaHectares =
    typeof areaRaw === "number" && Number.isFinite(areaRaw) ? areaRaw : null;

  return {
    siteCode,
    siteName,
    countryCode,
    designationType: normalizeDesignationType(
      firstDefined(attributes, ["SITETYPE", "SITE_TYPE"]),
    ),
    areaHectares,
    longitude: longitude as number,
    latitude: latitude as number,
    sourceIds: [...NATURA2000_SOURCE_IDS],
  };
}

export type Natura2000IdentifyResult =
  | { ok: true; site: Natura2000Site | null }
  | { ok: false; error: "timeout" | "upstream_error" | "invalid_response" };

/**
 * Identifies the nearest Natura 2000 site to a clicked point via the EEA
 * ArcGIS `/query` endpoint. Filters out results outside EUIM operational
 * scope. Only ever called when the Natura 2000 layer is switched ON.
 */
export async function fetchNatura2000Site(
  longitude: number,
  latitude: number,
): Promise<Natura2000IdentifyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      buildNatura2000IdentifyUrl(longitude, latitude),
      { signal: controller.signal },
    );
    if (!response.ok) {
      return { ok: false, error: "upstream_error" };
    }
    const json: unknown = await response.json();
    const site = parseNatura2000QueryResponse(json);
    if (site && site.countryCode && !isCountryInEUIMScope(site.countryCode)) {
      return { ok: true, site: null };
    }
    return { ok: true, site };
  } catch (error) {
    if (controller.signal.aborted) {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "invalid_response" };
  } finally {
    clearTimeout(timeout);
  }
}
