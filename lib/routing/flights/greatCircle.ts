/**
 * Pure great-circle geometry helpers for drawing flight arcs on a map.
 * No MapLibre / DOM imports — safe to use from server or client code.
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function toRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

function toDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

/**
 * Interpolates `steps + 1` points along the great-circle path between two
 * lon/lat points using spherical linear interpolation (slerp). Longitudes
 * are unwrapped to be continuous (no ±180° jump) so the raw result can be
 * split for the antimeridian afterwards if needed.
 */
export function greatCircleLine(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  steps = 64,
): [number, number][] {
  if (steps < 1) steps = 1;

  const phi1 = toRad(lat1);
  const lambda1 = toRad(lon1);
  const phi2 = toRad(lat2);
  const lambda2 = toRad(lon2);

  const x1 = Math.cos(phi1) * Math.cos(lambda1);
  const y1 = Math.cos(phi1) * Math.sin(lambda1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(lambda2);
  const y2 = Math.cos(phi2) * Math.sin(lambda2);
  const z2 = Math.sin(phi2);

  let dot = x1 * x2 + y1 * y2 + z1 * z2;
  dot = Math.min(1, Math.max(-1, dot));
  const angularDistance = Math.acos(dot);

  const points: [number, number][] = [];

  if (angularDistance < 1e-10) {
    return [
      [lon1, lat1],
      [lon2, lat2],
    ];
  }

  const sinDistance = Math.sin(angularDistance);
  let previousLon: number | null = null;

  for (let i = 0; i <= steps; i += 1) {
    const fraction = i / steps;
    const a = Math.sin((1 - fraction) * angularDistance) / sinDistance;
    const b = Math.sin(fraction * angularDistance) / sinDistance;

    const x = a * x1 + b * x2;
    const y = a * y1 + b * y2;
    const z = a * z1 + b * z2;

    const lat = toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)));
    let lon = toDeg(Math.atan2(y, x));

    if (previousLon !== null) {
      // Unwrap so consecutive points never jump by more than 180°.
      while (lon - previousLon > 180) lon -= 360;
      while (lon - previousLon < -180) lon += 360;
    }
    previousLon = lon;

    points.push([lon, lat]);
  }

  return points;
}

function wrapLongitude(lon: number): number {
  let wrapped = lon;
  while (wrapped > 180) wrapped -= 360;
  while (wrapped <= -180) wrapped += 360;
  return wrapped;
}

/**
 * Splits a coordinate list into MultiLineString parts every time it crosses
 * ±180°, inserting an interpolated crossing point on each side so every
 * emitted longitude stays within [-180, 180] (safe for strict GeoJSON
 * consumers that reject out-of-range coordinates).
 */
export function splitAtAntimeridian(
  coordinates: [number, number][],
): [number, number][][] {
  if (coordinates.length === 0) return [];

  const wrapped: [number, number][] = coordinates.map(([lon, lat]) => [
    wrapLongitude(lon),
    lat,
  ]);

  const parts: [number, number][][] = [];
  let current: [number, number][] = [wrapped[0]!];

  for (let i = 1; i < wrapped.length; i += 1) {
    const [prevLon, prevLat] = wrapped[i - 1]!;
    const [lon, lat] = wrapped[i]!;
    const delta = lon - prevLon;

    if (Math.abs(delta) > 180) {
      // The short way around from prevLon to lon actually crosses ±180.
      const crossingLon = prevLon > 0 ? 180 : -180;
      // Represent `lon` on the same (unwrapped) side as prevLon to interpolate.
      const lonSameSide = prevLon > 0 ? lon + 360 : lon - 360;
      const t = (crossingLon - prevLon) / (lonSameSide - prevLon);
      const crossingLat = prevLat + t * (lat - prevLat);

      current.push([crossingLon, crossingLat]);
      parts.push(current);
      current = [[-crossingLon, crossingLat]];
    }

    current.push([lon, lat]);
  }

  parts.push(current);
  return parts.filter((part) => part.length >= 2);
}

/**
 * Great-circle geometry ready for MapLibre: a plain LineString when the arc
 * never crosses the antimeridian, otherwise a MultiLineString split at the
 * crossing so each part stays within [-180, 180].
 */
export function greatCircleGeometry(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  steps = 64,
): { type: "LineString"; coordinates: [number, number][] } | {
  type: "MultiLineString";
  coordinates: [number, number][][];
} {
  const raw = greatCircleLine(lon1, lat1, lon2, lat2, steps);
  const minLon = Math.min(...raw.map((p) => p[0]));
  const maxLon = Math.max(...raw.map((p) => p[0]));

  if (maxLon - minLon <= 180) {
    return { type: "LineString", coordinates: raw };
  }

  const parts = splitAtAntimeridian(raw);
  if (parts.length <= 1) {
    return { type: "LineString", coordinates: raw };
  }
  return { type: "MultiLineString", coordinates: parts };
}
