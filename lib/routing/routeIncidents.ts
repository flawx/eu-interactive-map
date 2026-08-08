import type { GeographicBounds } from "@/lib/alerts/geography";
import type { NormalizedAlert } from "@/lib/alerts/types";
import { getTrafficProvider } from "@/lib/alerts/providers/traffic/provider";

const CORRIDOR_METERS = 250;
const MAX_BBOX_PAD_DEG = 0.35;

function haversineMeters(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function distancePointToSegmentMeters(
  lon: number,
  lat: number,
  a: [number, number],
  b: [number, number],
): number {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const dx = lon2 - lon1;
  const dy = lat2 - lat1;
  if (dx === 0 && dy === 0) {
    return haversineMeters(lon, lat, lon1, lat1);
  }
  const t = Math.max(
    0,
    Math.min(1, ((lon - lon1) * dx + (lat - lat1) * dy) / (dx * dx + dy * dy)),
  );
  const projLon = lon1 + t * dx;
  const projLat = lat1 + t * dy;
  return haversineMeters(lon, lat, projLon, projLat);
}

export function distanceToLineStringMeters(
  lon: number,
  lat: number,
  coordinates: [number, number][],
): number {
  if (coordinates.length === 0) return Number.POSITIVE_INFINITY;
  if (coordinates.length === 1) {
    const only = coordinates[0]!;
    return haversineMeters(lon, lat, only[0], only[1]);
  }
  let min = Number.POSITIVE_INFINITY;
  for (let i = 1; i < coordinates.length; i += 1) {
    const d = distancePointToSegmentMeters(
      lon,
      lat,
      coordinates[i - 1]!,
      coordinates[i]!,
    );
    if (d < min) min = d;
  }
  return min;
}

export function boundsFromRouteGeometry(
  coordinates: [number, number][],
  padDegrees = 0.08,
): GeographicBounds | null {
  if (!coordinates.length) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lon, lat] of coordinates) {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  const pad = Math.min(MAX_BBOX_PAD_DEG, Math.max(0.02, padDegrees));
  return {
    west: west - pad,
    south: south - pad,
    east: east + pad,
    north: north + pad,
  };
}

function alertCentroid(
  alert: NormalizedAlert,
): { longitude: number; latitude: number } | null {
  const g = alert.geometry;
  if (!g) return null;
  if (g.type === "Point") {
    const [lon, lat] = g.coordinates as [number, number];
    return { longitude: lon, latitude: lat };
  }
  const coords: [number, number][] = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      coords.push([value[0], value[1]]);
      return;
    }
    for (const child of value) visit(child);
  };
  visit(
    "coordinates" in g
      ? (g as { coordinates: unknown }).coordinates
      : (g as GeoJSON.GeometryCollection).geometries,
  );
  if (!coords.length) return null;
  const lon =
    coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
  const lat =
    coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  return { longitude: lon, latitude: lat };
}

export function filterIncidentsAlongRoute(
  alerts: NormalizedAlert[],
  coordinates: [number, number][],
  corridorMeters = CORRIDOR_METERS,
): NormalizedAlert[] {
  return alerts.filter((alert) => {
    const centroid = alertCentroid(alert);
    if (!centroid) return false;
    return (
      distanceToLineStringMeters(
        centroid.longitude,
        centroid.latitude,
        coordinates,
      ) <= corridorMeters
    );
  });
}

export async function fetchIncidentsAlongRoute(
  coordinates: [number, number][],
  locale: string,
): Promise<NormalizedAlert[]> {
  const bounds = boundsFromRouteGeometry(coordinates);
  if (!bounds) return [];
  const response = await getTrafficProvider().getIncidents({
    bounds,
    locale,
    timeMode: "current",
  });
  return filterIncidentsAlongRoute(response.alerts, coordinates);
}
