import {
  isCountryAllowedInProject,
  isPointInsideProjectEurope,
  normalizeAlertCountryCode,
} from "@/lib/alerts/geography";
import type { RoutePoint } from "@/lib/routing/types";

const SAMPLE_STEP = 8;

export function isRoutingPointAllowed(point: {
  latitude: number;
  longitude: number;
  countryCode?: string | null;
}): boolean {
  if (
    !Number.isFinite(point.latitude) ||
    !Number.isFinite(point.longitude)
  ) {
    return false;
  }
  if (
    point.countryCode &&
    !isCountryAllowedInProject(point.countryCode)
  ) {
    return false;
  }
  return isPointInsideProjectEurope(point.longitude, point.latitude);
}

export function assertRoutingPointsAllowed(
  points: Array<RoutePoint | null | undefined>,
): void {
  for (const point of points) {
    if (!point) continue;
    if (!isRoutingPointAllowed(point)) {
      throw new Error("point_outside_coverage");
    }
  }
}

export function getDisallowedRouteSegments(geometry: {
  type: "LineString";
  coordinates: [number, number][];
}): Array<{ index: number; longitude: number; latitude: number }> {
  const out: Array<{ index: number; longitude: number; latitude: number }> =
    [];
  const coords = geometry.coordinates;
  if (!coords.length) return out;

  for (let i = 0; i < coords.length; i += SAMPLE_STEP) {
    const pair = coords[i];
    if (!pair) continue;
    const [longitude, latitude] = pair;
    if (!isPointInsideProjectEurope(longitude, latitude)) {
      out.push({ index: i, longitude, latitude });
    }
  }

  const last = coords[coords.length - 1];
  if (last) {
    const [longitude, latitude] = last;
    if (!isPointInsideProjectEurope(longitude, latitude)) {
      out.push({
        index: coords.length - 1,
        longitude,
        latitude,
      });
    }
  }

  return out;
}

export function isRouteGeometryAllowed(geometry: {
  type: "LineString";
  coordinates: [number, number][];
}): boolean {
  return getDisallowedRouteSegments(geometry).length === 0;
}

export function areCountriesAllowed(
  countryCodes: Array<string | null | undefined>,
): boolean {
  for (const code of countryCodes) {
    if (!code) continue;
    const normalized = normalizeAlertCountryCode(code);
    if (!normalized) return false;
  }
  return true;
}
