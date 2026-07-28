import type {
  EarthquakeTimeMode,
  NormalizedAlert,
  VolcanoTimeMode,
} from "@/lib/alerts/types";

export type EarthquakeMagnitudeBand = "minor" | "moderate" | "strong" | "major";

export function earthquakeMagnitudeBand(
  magnitude: number | null,
): EarthquakeMagnitudeBand | null {
  if (magnitude == null || !Number.isFinite(magnitude) || magnitude < 2.5) {
    return null;
  }
  if (magnitude < 4) return "minor";
  if (magnitude < 5) return "moderate";
  if (magnitude < 6) return "strong";
  return "major";
}

function eventTime(alert: NormalizedAlert): number {
  return Date.parse(alert.onsetAt ?? alert.effectiveAt ?? alert.updatedAt);
}

export function filterEarthquakesByTimeMode(
  alerts: readonly NormalizedAlert[],
  mode: EarthquakeTimeMode,
  now = new Date(),
): NormalizedAlert[] {
  const maximumAge =
    mode === "1h" ? 60 * 60 * 1000 : mode === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const cutoff = now.getTime() - maximumAge;
  return alerts.filter((alert) => {
    if (alert.category !== "earthquake") return false;
    const magnitude =
      typeof alert.metadata.magnitude === "number"
        ? alert.metadata.magnitude
        : null;
    const felt =
      typeof alert.metadata.feltReports === "number"
        ? alert.metadata.feltReports
        : 0;
    const gdacs = typeof alert.metadata.gdacsEventId === "string";
    if (eventTime(alert) < cutoff) return false;
    if (mode === "7d") return (magnitude ?? -Infinity) >= 4 || felt > 0 || gdacs;
    return (magnitude ?? -Infinity) >= 2.5 || felt > 0 || gdacs;
  });
}

export function filterVolcanoesByTimeMode(
  alerts: readonly NormalizedAlert[],
  mode: VolcanoTimeMode,
  now = new Date(),
): NormalizedAlert[] {
  return alerts.filter((alert) => {
    if (alert.category !== "volcano") return false;
    if (mode === "ongoing") return alert.status === "active";
    const age = now.getTime() - Date.parse(alert.updatedAt);
    const maximumAge =
      mode === "72h" ? 72 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    return age >= 0 && age <= maximumAge;
  });
}

export function earthquakeFilterVisible(
  magnitude: number | null,
  filters: Record<EarthquakeMagnitudeBand, boolean>,
): boolean {
  const band = earthquakeMagnitudeBand(magnitude);
  return band ? filters[band] : false;
}
