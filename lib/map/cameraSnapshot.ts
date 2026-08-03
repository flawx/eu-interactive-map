export type CameraSnapshot = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

const DEFAULT_EPSILON = 0.01;

/** Normalize bearing to [0, 360). */
export function normalizeBearing(bearing: number): number {
  const value = bearing % 360;
  return value < 0 ? value + 360 : value;
}

export function angularDifference(a: number, b: number): number {
  const left = normalizeBearing(a);
  const right = normalizeBearing(b);
  const delta = Math.abs(left - right);
  return Math.min(delta, 360 - delta);
}

export function areCameraSnapshotsEqual(
  left: CameraSnapshot | null | undefined,
  right: CameraSnapshot,
  epsilon = DEFAULT_EPSILON,
): boolean {
  if (!left) return false;
  return (
    Math.abs(left.longitude - right.longitude) < epsilon &&
    Math.abs(left.latitude - right.latitude) < epsilon &&
    Math.abs(left.zoom - right.zoom) < epsilon &&
    Math.abs(left.pitch - right.pitch) < epsilon &&
    angularDifference(left.bearing, right.bearing) < epsilon
  );
}
