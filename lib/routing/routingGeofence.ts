import {
  assertRouteEndpointsInEUIMScope,
  isRoutingEndpointInEUIMScope,
} from "@/lib/geography/euimCoverage";
import type { RoutePoint } from "@/lib/routing/types";

export function isRoutingPointAllowed(point: {
  latitude: number;
  longitude: number;
  countryCode?: string | null;
}): boolean {
  return isRoutingEndpointInEUIMScope(point);
}

export function assertRoutingPointsAllowed(
  points: Array<RoutePoint | null | undefined>,
): void {
  assertRouteEndpointsInEUIMScope(points);
}

/**
 * Route geometries may briefly cross out-of-scope third countries
 * (e.g. FR→IT via CH). Do not reject continuous EU→EU paths.
 * @deprecated Always returns [] — endpoints are the coverage gate.
 */
export function getDisallowedRouteSegments(_geometry: {
  type: "LineString";
  coordinates: [number, number][];
}): Array<{ index: number; longitude: number; latitude: number }> {
  return [];
}

/** Endpoints are validated separately; geometry through third countries is OK. */
export function isRouteGeometryAllowed(_geometry: {
  type: "LineString";
  coordinates: [number, number][];
}): boolean {
  return true;
}

/**
 * Traversed countries on a calculated route may include third states (CH, …).
 * Coverage is enforced on route endpoints only — always allow provider paths.
 */
export function areCountriesAllowed(
  _countryCodes: Array<string | null | undefined>,
): boolean {
  return true;
}
