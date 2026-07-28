export type WildfireWind = {
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  directionDegrees: number | null;
  gustKmh: number | null;
  validAt: string | null;
  model: "ECMWF IFS";
  fetchedAt: string;
};

export function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}
/** Meteorological direction is where wind comes from; the map arrow shows flow. */
export function windOriginToFlowDirection(originDegrees: number): number {
  return normalizeDegrees(originDegrees + 180);
}

const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function windCardinal(directionDegrees: number): string {
  return CARDINALS[Math.round(normalizeDegrees(directionDegrees) / 45) % 8];
}

export function validateWindCoordinates(
  value: unknown,
  maxBatch = 20,
): Array<{ latitude: number; longitude: number }> {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxBatch) {
    throw new Error("invalid_batch_size");
  }
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("invalid_coordinate");
    const latitude = Number((item as { latitude?: unknown }).latitude);
    const longitude = Number((item as { longitude?: unknown }).longitude);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("invalid_coordinate");
    }
    return { latitude, longitude };
  });
}

export function parseOpenMeteoWind(
  value: unknown,
  fetchedAt = new Date().toISOString(),
): WildfireWind | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const hourly =
    record.hourly && typeof record.hourly === "object"
      ? (record.hourly as Record<string, unknown>)
      : {};
  const times = Array.isArray(hourly.time) ? hourly.time : [];
  const now = Date.now();
  let index = times.findIndex((item) => Date.parse(String(item)) >= now);
  if (index < 0 && times.length) index = times.length - 1;
  if (index < 0) return null;
  const at = (key: string): number | null => {
    const values = Array.isArray(hourly[key]) ? hourly[key] : [];
    const parsed = Number(values[index]);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    speedKmh: at("wind_speed_10m"),
    directionDegrees: at("wind_direction_10m"),
    gustKmh: at("wind_gusts_10m"),
    validAt: typeof times[index] === "string" ? String(times[index]) : null,
    model: "ECMWF IFS",
    fetchedAt,
  };
}
