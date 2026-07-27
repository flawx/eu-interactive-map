/**
 * Lightweight point-in-polygon for GeoJSON Polygon / MultiPolygon rings.
 * Ray-casting; holes are treated as exterior exclusions.
 */

export type LngLat = [longitude: number, latitude: number];

function pointInRing(
  longitude: number,
  latitude: number,
  ring: LngLat[] | number[][],
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Polygon coordinates: [outer, ...holes] */
export function pointInPolygon(
  longitude: number,
  latitude: number,
  polygon: LngLat[][] | number[][][],
): boolean {
  if (!polygon.length || !pointInRing(longitude, latitude, polygon[0])) {
    return false;
  }
  for (let h = 1; h < polygon.length; h++) {
    if (pointInRing(longitude, latitude, polygon[h])) {
      return false;
    }
  }
  return true;
}

export function pointInMultiPolygon(
  longitude: number,
  latitude: number,
  multiPolygon: LngLat[][][] | number[][][][],
): boolean {
  return multiPolygon.some((polygon) =>
    pointInPolygon(longitude, latitude, polygon),
  );
}

export function pointInGeoJsonGeometry(
  longitude: number,
  latitude: number,
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  },
): boolean {
  if (geometry.type === "Polygon") {
    return pointInPolygon(
      longitude,
      latitude,
      geometry.coordinates as number[][][],
    );
  }
  if (geometry.type === "MultiPolygon") {
    return pointInMultiPolygon(
      longitude,
      latitude,
      geometry.coordinates as number[][][][],
    );
  }
  return false;
}
