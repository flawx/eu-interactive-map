import type { RoutePoint } from "@/lib/routing/types";

export type RoutePlannerPointsState = {
  origin: RoutePoint | null;
  destination: RoutePoint | null;
  waypoints: RoutePoint[];
};

export const EMPTY_ROUTE_PLANNER_POINTS: RoutePlannerPointsState = {
  origin: null,
  destination: null,
  waypoints: [],
};

function sameCoord(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-7;
}

export function areRoutePointsEqual(
  a: RoutePoint | null | undefined,
  b: RoutePoint | null | undefined,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return (
    sameCoord(a.latitude, b.latitude) &&
    sameCoord(a.longitude, b.longitude) &&
    (a.name ?? null) === (b.name ?? null) &&
    (a.countryCode ?? null) === (b.countryCode ?? null)
  );
}

export function areRoutePlannerPointsEqual(
  a: RoutePlannerPointsState,
  b: RoutePlannerPointsState,
): boolean {
  if (!areRoutePointsEqual(a.origin, b.origin)) return false;
  if (!areRoutePointsEqual(a.destination, b.destination)) return false;
  if (a.waypoints.length !== b.waypoints.length) return false;
  for (let i = 0; i < a.waypoints.length; i += 1) {
    if (!areRoutePointsEqual(a.waypoints[i], b.waypoints[i])) return false;
  }
  return true;
}

/** Waypoints that are actually resolved and safe to send to TomTom. */
export function resolvedWaypoints(waypoints: RoutePoint[]): RoutePoint[] {
  return waypoints.filter(
    (point) =>
      Number.isFinite(point.latitude) &&
      Number.isFinite(point.longitude) &&
      !(
        Math.abs(point.latitude) < 1e-8 &&
        Math.abs(point.longitude) < 1e-8
      ),
  );
}
