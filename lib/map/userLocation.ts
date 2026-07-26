export type UserLocationStatus =
  | "idle"
  | "requesting"
  | "following"
  | "passive"
  | "denied"
  | "unavailable"
  | "error";

export type UserLocation = {
  longitude: number;
  latitude: number;
  accuracyMeters: number;
  heading: number | null;
  speedMetersPerSecond: number | null;
  timestamp: number;
};

export const EMPTY_USER_LOCATION_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const PROMPT_SESSION_KEY = "eu-map-location-prompt-seen-v1";
const EARTH_RADIUS_M = 6371008.8;
const MAX_DISPLAY_ACCURACY_M = 50_000;

export function hasSeenLocationPrompt(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(PROMPT_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function markLocationPromptSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PROMPT_SESSION_KEY, "1");
  } catch {
    // ignore private mode / quota
  }
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function isGeolocationSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext;
}

export async function queryGeolocationPermission(): Promise<
  PermissionState | "unsupported"
> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }

  try {
    const result = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return result.state;
  } catch {
    return "unsupported";
  }
}

/** Approximate geodesic circle as a GeoJSON Polygon (lon/lat degrees). */
export function createAccuracyCircle(
  longitude: number,
  latitude: number,
  accuracyMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const radius = Math.min(
    Math.max(Number.isFinite(accuracyMeters) ? accuracyMeters : 0, 1),
    MAX_DISPLAY_ACCURACY_M,
  );
  const latRad = (latitude * Math.PI) / 180;
  const metersPerDegLat = (Math.PI * EARTH_RADIUS_M) / 180;
  const metersPerDegLon = metersPerDegLat * Math.cos(latRad);
  const ring: GeoJSON.Position[] = [];

  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * Math.PI * 2;
    const dx = (radius * Math.cos(theta)) / Math.max(metersPerDegLon, 1e-6);
    const dy = (radius * Math.sin(theta)) / metersPerDegLat;
    ring.push([longitude + dx, latitude + dy]);
  }

  return {
    type: "Feature",
    properties: { kind: "accuracy" },
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

export function buildUserLocationCollection(
  location: UserLocation | null,
): GeoJSON.FeatureCollection {
  if (!location) return EMPTY_USER_LOCATION_COLLECTION;

  return {
    type: "FeatureCollection",
    features: [
      createAccuracyCircle(
        location.longitude,
        location.latitude,
        location.accuracyMeters,
      ),
      {
        type: "Feature",
        properties: { kind: "position" },
        geometry: {
          type: "Point",
          coordinates: [location.longitude, location.latitude],
        },
      },
    ],
  };
}

/** Display-only accuracy label (never logs coordinates). */
export function formatAccuracyLabel(accuracyMeters: number): string {
  const meters = Math.max(0, accuracyMeters);
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function displayAccuracyMeters(accuracyMeters: number): number {
  return Math.min(
    Math.max(Number.isFinite(accuracyMeters) ? accuracyMeters : 0, 1),
    MAX_DISPLAY_ACCURACY_M,
  );
}

export function zoomForAccuracy(accuracyMeters: number): number {
  const meters = displayAccuracyMeters(accuracyMeters);
  if (meters > 20_000) return 9;
  if (meters > 10_000) return 10;
  if (meters > 5_000) return 11;
  if (meters > 2_000) return 12;
  if (meters > 1_000) return 13;
  if (meters > 500) return 14;
  if (meters > 100) return 15;
  return 16;
}
