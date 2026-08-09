import {
  EUIM_COUNTRY_CODES,
  EUIM_MAP_BOUNDS,
  isCountryInEUIMScope,
} from "@/lib/geography/euimCoverage";
import {
  pointInPolygon,
  type LngLat,
} from "@/lib/geo/pointInPolygon";

/** Align with MapContainer country source bounds. */
export const UNESCO_EUROPE_MAP_BOUNDS = EUIM_MAP_BOUNDS;

/**
 * Operational UNESCO / tourism map countries = EUIM scope
 * (EU members + official candidates only).
 * Greece = EL (GISCO / Eurostat).
 * @deprecated Prefer EUIM_COUNTRY_CODES from euimCoverage.
 */
export const UNESCO_MAP_COUNTRY_CODES = EUIM_COUNTRY_CODES;

/**
 * GISCO country geometries at 10M — same family as the map's CNTR_RG source,
 * higher detail than 20M so microstates do not swallow neighboring capitals.
 */
export const GISCO_COUNTRIES_10M_URL =
  "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_10M_2024_4326.geojson";

/** Explicitly excluded (never keep a site resolving here). */
export const UNESCO_FORBIDDEN_COUNTRY_CODES = [
  "RU",
  "MA", "DZ", "TN", "LY", "EG", "EH",
  "IL", "PS", "JO", "LB", "SY", "IQ", "IR", "SA", "YE", "OM", "AE", "QA", "BH", "KW",
  "XJL",
] as const;

/**
 * Low-resolution microstate polygons often spill over neighbors (esp. VA).
 * Resolve those points via the surrounding EU member instead.
 */
const SKIP_MICROSTATE_GEOMETRIES = new Set(["VA", "SM", "AD", "MC"]);

const ALLOWED = new Set<string>(UNESCO_MAP_COUNTRY_CODES);
const FORBIDDEN = new Set<string>(UNESCO_FORBIDDEN_COUNTRY_CODES);

/** Max distance (degrees) for coastal / island snap onto an allowed European polygon. */
const NEAREST_SNAP_DEGREES = 0.4;

export type EuropeanTerritoryEntry = {
  code: string;
  polygons: LngLat[][][];
};

export type WorldCountryEntry = {
  code: string;
  polygons: LngLat[][][];
};

export type GiscoCountryFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    properties: { CNTR_ID?: string; NAME_ENGL?: string };
    geometry: {
      type: string;
      coordinates: number[][][] | number[][][][];
    };
  }>;
};

function ringCentroid(ring: LngLat[] | number[][]): [number, number] {
  let sx = 0;
  let sy = 0;
  const n = Math.max(ring.length - 1, 1);
  for (let i = 0; i < n; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
  }
  return [sx / n, sy / n];
}

function geometryToPolygons(
  geometry: GiscoCountryFeatureCollection["features"][number]["geometry"],
): LngLat[][][] {
  if (geometry.type === "Polygon") {
    return [geometry.coordinates as LngLat[][]];
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates as LngLat[][][];
  }
  return [];
}

/**
 * Keep only polygon parts that belong to the European coverage of the map.
 * Overseas departments / colonies of FR, ES, PT, NL, DK, UK fall outside
 * these bounds. Turkey keeps only the European Thrace side.
 * Spanish North-African enclaves (Ceuta / Melilla) are excluded.
 */
export function isEuropeanTerritoryPolygonPart(
  countryCode: string,
  polygon: LngLat[][] | number[][][],
): boolean {
  if (!polygon.length || !polygon[0]?.length) return false;
  const [lon, lat] = ringCentroid(polygon[0]);

  if (
    lon < UNESCO_EUROPE_MAP_BOUNDS.minLongitude ||
    lon > UNESCO_EUROPE_MAP_BOUNDS.maxLongitude ||
    lat < UNESCO_EUROPE_MAP_BOUNDS.minLatitude ||
    lat > UNESCO_EUROPE_MAP_BOUNDS.maxLatitude
  ) {
    return false;
  }

  // Ceuta / Melilla (Spanish territories in North Africa).
  if (
    countryCode === "ES" &&
    lat < 36.2 &&
    lon > -6.5 &&
    lon < 0
  ) {
    return false;
  }

  // European Turkey = Thrace / European Istanbul only (not Anatolia / Troy).
  if (countryCode === "TR" && (lon > 29.2 || lat < 40.5)) {
    return false;
  }

  return true;
}

/** Extra guard for representative points attributed to Türkiye. */
export function isEuropeanTurkeyPoint(
  longitude: number,
  latitude: number,
): boolean {
  return longitude <= 29.2 && latitude >= 40.5;
}

export function buildWorldCountryIndex(
  collection: GiscoCountryFeatureCollection,
): WorldCountryEntry[] {
  const entries: WorldCountryEntry[] = [];
  for (const feature of collection.features) {
    const code = feature.properties.CNTR_ID?.toUpperCase();
    if (!code || SKIP_MICROSTATE_GEOMETRIES.has(code)) continue;
    const polygons = geometryToPolygons(feature.geometry);
    if (polygons.length > 0) {
      entries.push({ code, polygons });
    }
  }
  return entries;
}

export function buildEuropeanTerritoryIndex(
  collection: GiscoCountryFeatureCollection,
): EuropeanTerritoryEntry[] {
  const entries: EuropeanTerritoryEntry[] = [];

  for (const feature of collection.features) {
    const code = feature.properties.CNTR_ID?.toUpperCase();
    if (!code || SKIP_MICROSTATE_GEOMETRIES.has(code)) continue;
    if (!ALLOWED.has(code)) continue;

    const polygons = geometryToPolygons(feature.geometry).filter((poly) =>
      isEuropeanTerritoryPolygonPart(code, poly),
    );

    if (polygons.length > 0) {
      entries.push({ code, polygons });
    }
  }

  return entries;
}

/** Exact containment against full (uncut) country geometries — no snap. */
export function resolveWorldCountry(
  longitude: number,
  latitude: number,
  index: readonly WorldCountryEntry[],
): string | null {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }
  for (const entry of index) {
    if (
      entry.polygons.some((polygon) =>
        pointInPolygon(longitude, latitude, polygon),
      )
    ) {
      return entry.code;
    }
  }
  return null;
}

function snapToEuropeanTerritory(
  longitude: number,
  latitude: number,
  index: readonly EuropeanTerritoryEntry[],
): string | null {
  let best: { code: string; distance: number } | null = null;
  for (const entry of index) {
    for (const polygon of entry.polygons) {
      for (const ring of polygon) {
        for (const [px, py] of ring) {
          const distance = Math.hypot(px - longitude, py - latitude);
          if (!best || distance < best.distance) {
            best = { code: entry.code, distance };
          }
        }
      }
    }
  }
  if (best && best.distance <= NEAREST_SNAP_DEGREES) {
    return best.code;
  }
  return null;
}

/**
 * Resolve a representative UNESCO point to an allowed European map territory.
 * Rejects points that fall inside a non-allowed / forbidden country (e.g. MA),
 * even if a coastal snap would otherwise reach Spain across the Strait.
 */
export function resolveEuropeanTerritory(
  longitude: number,
  latitude: number,
  europeanIndex: readonly EuropeanTerritoryEntry[],
  worldIndex?: readonly WorldCountryEntry[],
): string | null {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  if (worldIndex) {
    const world = resolveWorldCountry(longitude, latitude, worldIndex);
    if (world) {
      if (FORBIDDEN.has(world) || !ALLOWED.has(world)) {
        return null;
      }
    }
  }

  let resolved: string | null = null;

  for (const entry of europeanIndex) {
    if (
      entry.polygons.some((polygon) =>
        pointInPolygon(longitude, latitude, polygon),
      )
    ) {
      resolved = entry.code;
      break;
    }
  }

  if (!resolved) {
    resolved = snapToEuropeanTerritory(longitude, latitude, europeanIndex);
  }

  if (
    resolved === "TR" &&
    !isEuropeanTurkeyPoint(longitude, latitude)
  ) {
    return null;
  }

  // Ceuta / Melilla points attributed to ES.
  if (
    resolved === "ES" &&
    latitude < 36.2 &&
    longitude > -6.5 &&
    longitude < 0
  ) {
    return null;
  }

  return resolved;
}

export function isAllowedUnescoMapCountry(code: string): boolean {
  return isCountryInEUIMScope(code);
}

export function isForbiddenUnescoCountry(code: string): boolean {
  return FORBIDDEN.has(code.toUpperCase());
}
