import {
  EUIM_COUNTRY_CODES,
  EUIM_MAP_BOUNDS,
  isCoordinateInEUIMScope,
  isCountryInEUIMScope,
  isEuropeanTurkeyPoint,
  normalizeEUIMCountryCode,
} from "@/lib/geography/euimCoverage";

export const ALERT_EUROPE_COUNTRY_CODES = new Set<string>(EUIM_COUNTRY_CODES);

export const ISO3_TO_ALERT_COUNTRY: Record<string, string> = {
  ALB: "AL", AUT: "AT", BEL: "BE", BGR: "BG", BIH: "BA", CHE: "CH",
  CYP: "CY", CZE: "CZ", DEU: "DE", DNK: "DK", ESP: "ES", EST: "EE",
  FIN: "FI", FRA: "FR", GBR: "UK", GEO: "GE", GRC: "EL", HRV: "HR",
  HUN: "HU", IRL: "IE", ISL: "IS", ITA: "IT", LIE: "LI", LTU: "LT",
  LUX: "LU", LVA: "LV", MDA: "MD", MKD: "MK", MLT: "MT", MNE: "ME",
  NLD: "NL", NOR: "NO", POL: "PL", PRT: "PT", ROU: "RO", SRB: "RS",
  SVK: "SK", SVN: "SI", SWE: "SE", TUR: "TR", UKR: "UA", XKX: "XK",
};

export type GeographicBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export const PROJECT_EUROPE_ALERT_BOUNDS: GeographicBounds = {
  west: EUIM_MAP_BOUNDS.minLongitude,
  south: EUIM_MAP_BOUNDS.minLatitude,
  east: EUIM_MAP_BOUNDS.maxLongitude,
  north: EUIM_MAP_BOUNDS.maxLatitude,
};

export function normalizeAlertCountryCode(value: unknown): string | null {
  const normalized = normalizeEUIMCountryCode(value);
  if (!normalized) return null;
  return ALERT_EUROPE_COUNTRY_CODES.has(normalized) ? normalized : null;
}

export function isCountryAllowedInProject(value: unknown): boolean {
  return isCountryInEUIMScope(value);
}

export function isPointInsideProjectEurope(
  longitude: number,
  latitude: number,
): boolean {
  return isCoordinateInEUIMScope(longitude, latitude);
}

export function isEuropeanAlertCentroid(
  centroid: { longitude: number; latitude: number } | null,
): boolean {
  return Boolean(
    centroid &&
      isPointInsideProjectEurope(centroid.longitude, centroid.latitude),
  );
}

function visitCoordinates(
  value: unknown,
  visit: (longitude: number, latitude: number) => void,
): void {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    visit(value[0], value[1]);
    return;
  }
  value.forEach((item) => visitCoordinates(item, visit));
}

export function geometryBounds(
  geometry: GeoJSON.Geometry | null,
): GeographicBounds | null {
  if (!geometry) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  const add = (longitude: number, latitude: number) => {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
    west = Math.min(west, longitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    north = Math.max(north, latitude);
  };
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((item) => {
      const bounds = geometryBounds(item);
      if (bounds) {
        add(bounds.west, bounds.south);
        add(bounds.east, bounds.north);
      }
    });
  } else {
    visitCoordinates(geometry.coordinates, add);
  }
  return Number.isFinite(west) ? { west, south, east, north } : null;
}

export function boundsIntersectProjectEurope(bounds: GeographicBounds): boolean {
  const project = PROJECT_EUROPE_ALERT_BOUNDS;
  return !(
    bounds.east < project.west ||
    bounds.west > project.east ||
    bounds.north < project.south ||
    bounds.south > project.north
  );
}

export function geometryIntersectsProjectEurope(
  geometry: GeoJSON.Geometry | null,
): boolean {
  const bounds = geometryBounds(geometry);
  if (!bounds) return false;
  // A world-scale GDACS envelope is not evidence that the event affects Europe.
  if (bounds.east - bounds.west > 120 || bounds.north - bounds.south > 80) {
    return false;
  }
  if (!boundsIntersectProjectEurope(bounds)) return false;
  let intersects = false;
  if (geometry?.type === "GeometryCollection") {
    intersects = geometry.geometries.some(geometryIntersectsProjectEurope);
  } else if (geometry) {
    visitCoordinates(geometry.coordinates, (longitude, latitude) => {
      intersects ||= isPointInsideProjectEurope(longitude, latitude);
    });
  }
  if (intersects) return true;
  return bounds.west <= PROJECT_EUROPE_ALERT_BOUNDS.east &&
    bounds.east >= PROJECT_EUROPE_ALERT_BOUNDS.west &&
    bounds.south <= PROJECT_EUROPE_ALERT_BOUNDS.north &&
    bounds.north >= PROJECT_EUROPE_ALERT_BOUNDS.south;
}

export function isAlertInsideProjectEurope(alert: {
  countryCodes?: readonly string[];
  centroid?: { longitude: number; latitude: number } | null;
  geometry?: GeoJSON.Geometry | null;
}): boolean {
  if (alert.countryCodes?.some(isCountryAllowedInProject)) return true;
  if (isEuropeanAlertCentroid(alert.centroid ?? null)) return true;
  return geometryIntersectsProjectEurope(alert.geometry ?? null);
}

export function isEuropeanTileBounds(bounds: GeographicBounds): boolean {
  return boundsIntersectProjectEurope(bounds);
}

export function isEuropeanTurkeyAlertPoint(
  longitude: number,
  latitude: number,
): boolean {
  return isEuropeanTurkeyPoint(longitude, latitude);
}
