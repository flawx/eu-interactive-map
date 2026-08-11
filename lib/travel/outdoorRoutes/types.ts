/**
 * Major Outdoor Routes — hiking, cycling, and running/recreational routes.
 *
 * DATA HONESTY: these are curated, simplified LineString geometries built
 * from a small number of well-known waypoints along each official route
 * (e.g. GR/E-path stage towns, EuroVelo city waypoints). They are NOT
 * survey-grade or turn-by-turn trail geometry — they exist to give a
 * recognisable sense of the route's course on the map, not for navigation.
 * `distanceKm` is the official published route distance where known, which
 * will not exactly match the length of the simplified geometry.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type OutdoorRouteType = "hiking" | "cycling" | "running";

export type OutdoorRoute = {
  id: string;
  routeType: OutdoorRouteType;
  name: string;
  routeCode: string;
  /** Official published distance in kilometres, when known. */
  distanceKm: number | null;
  countries: string[];
  operator: string;
  officialWebsite: string;
  description: string;
  /** [longitude, latitude] pairs, simplified but continuous. */
  coordinates: Array<[number, number]>;
  sourceIds: string[];
};

export const OUTDOOR_ROUTE_COLORS: Record<OutdoorRouteType, string> = {
  hiking: "#92400e",
  cycling: "#2563eb",
  running: "#db2777",
};

export function outdoorRouteToEntity(route: OutdoorRoute): EUIMMapEntity {
  return {
    id: route.id,
    category: "travel",
    subcategory: route.routeType,
    layerId: `outdoor-${route.routeType}-routes`,
    name: route.name,
    countryCode: route.countries[0] ?? null,
    geometry: { type: "LineString", coordinates: route.coordinates },
    icon: route.routeType,
    color: OUTDOOR_ROUTE_COLORS[route.routeType],
    sourceIds: route.sourceIds,
    properties: {
      routeType: route.routeType,
      routeCode: route.routeCode,
      distanceKm: route.distanceKm,
      countries: route.countries,
      operator: route.operator,
      officialWebsite: route.officialWebsite,
      description: route.description,
    },
  };
}

export function outdoorRoutesToFeatureCollection(
  routes: readonly OutdoorRoute[],
): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    routes
      .filter((route) => route.countries.some((code) => isCountryInEUIMScope(code)))
      .map(outdoorRouteToEntity),
  );
}

/** Nearest point on the route's simplified polyline to a given coordinate. */
export function nearestPointOnRoute(
  route: OutdoorRoute,
  from: [number, number],
): [number, number] {
  let best: [number, number] = route.coordinates[0] ?? from;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.coordinates.length - 1; i += 1) {
    const a = route.coordinates[i];
    const b = route.coordinates[i + 1];
    const candidate = closestPointOnSegment(from, a, b);
    const dx = candidate[0] - from[0];
    const dy = candidate[1] - from[1];
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}

function closestPointOnSegment(
  point: [number, number],
  a: [number, number],
  b: [number, number],
): [number, number] {
  const [px, py] = point;
  const [ax, ay] = a;
  const [bx, by] = b;
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = abx * abx + aby * aby;
  if (lengthSquared === 0) return a;
  let t = ((px - ax) * abx + (py - ay) * aby) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return [ax + t * abx, ay + t * aby];
}

export type OutdoorRoutesAudit = {
  total: number;
  invalidGeometry: string[];
  outsideScope: string[];
  duplicateIds: string[];
  byType: Record<OutdoorRouteType, number>;
};

export function auditOutdoorRoutes(
  routes: readonly OutdoorRoute[],
): OutdoorRoutesAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const invalidGeometry: string[] = [];
  const outsideScope: string[] = [];
  const byType: Record<OutdoorRouteType, number> = {
    hiking: 0,
    cycling: 0,
    running: 0,
  };

  for (const route of routes) {
    if (ids.has(route.id)) duplicateIds.push(route.id);
    ids.add(route.id);
    byType[route.routeType] += 1;

    const validCoordinates =
      route.coordinates.length >= 2 &&
      route.coordinates.every(
        ([lng, lat]) =>
          Number.isFinite(lng) &&
          Number.isFinite(lat) &&
          lng >= -180 &&
          lng <= 180 &&
          lat >= -90 &&
          lat <= 90,
      );
    if (!validCoordinates) invalidGeometry.push(route.id);

    if (!route.countries.some((code) => isCountryInEUIMScope(code))) {
      outsideScope.push(route.id);
    }
  }

  return {
    total: routes.length,
    invalidGeometry,
    outsideScope,
    duplicateIds,
    byType,
  };
}
