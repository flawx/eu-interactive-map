import type { NormalizedAlert } from "@/lib/alerts/types";

export const EARTHQUAKE_MATCH_THRESHOLDS = {
  timeSeconds: 120,
  distanceKilometers: 40,
  magnitude: 0.5,
} as const;

export function haversineDistanceKilometers(
  first: { longitude: number; latitude: number },
  second: { longitude: number; latitude: number },
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function magnitude(alert: NormalizedAlert): number | null {
  const value = alert.metadata.magnitude;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function depth(alert: NormalizedAlert): number | null {
  const value = alert.metadata.depthKilometers;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function eventTime(alert: NormalizedAlert): number {
  return Date.parse(alert.onsetAt ?? alert.effectiveAt ?? alert.updatedAt);
}

export function earthquakeMatchMetrics(
  first: NormalizedAlert,
  second: NormalizedAlert,
): {
  timeSeconds: number;
  distanceKilometers: number;
  magnitudeDifference: number | null;
  depthDifference: number | null;
} | null {
  if (!first.centroid || !second.centroid) return null;
  const firstMagnitude = magnitude(first);
  const secondMagnitude = magnitude(second);
  const firstDepth = depth(first);
  const secondDepth = depth(second);
  return {
    timeSeconds: Math.abs(eventTime(first) - eventTime(second)) / 1000,
    distanceKilometers: haversineDistanceKilometers(first.centroid, second.centroid),
    magnitudeDifference:
      firstMagnitude == null || secondMagnitude == null
        ? null
        : Math.abs(firstMagnitude - secondMagnitude),
    depthDifference:
      firstDepth == null || secondDepth == null
        ? null
        : Math.abs(firstDepth - secondDepth),
  };
}

export function areEarthquakesCompatible(
  first: NormalizedAlert,
  second: NormalizedAlert,
): boolean {
  const metrics = earthquakeMatchMetrics(first, second);
  if (!metrics) return false;
  return (
    metrics.timeSeconds <= EARTHQUAKE_MATCH_THRESHOLDS.timeSeconds &&
    metrics.distanceKilometers <= EARTHQUAKE_MATCH_THRESHOLDS.distanceKilometers &&
    (metrics.magnitudeDifference == null ||
      metrics.magnitudeDifference <= EARTHQUAKE_MATCH_THRESHOLDS.magnitude) &&
    (metrics.depthDifference == null || metrics.depthDifference <= 60)
  );
}

function providerName(alert: NormalizedAlert): "usgs" | "emsc" | "gdacs" {
  return alert.source === "emsc"
    ? "emsc"
    : alert.source === "gdacs"
      ? "gdacs"
      : "usgs";
}

function mergeInto(primary: NormalizedAlert, secondary: NormalizedAlert): NormalizedAlert {
  const provider = providerName(secondary);
  const secondaryMagnitude = magnitude(secondary);
  const gdacsSeverity =
    provider === "gdacs" &&
    typeof secondary.metadata.gdacsSeverity === "string"
      ? secondary.metadata.gdacsSeverity
      : primary.metadata.gdacsSeverity ?? null;
  const secondaryPopulation =
    typeof secondary.metadata.affectedPopulation === "number"
      ? secondary.metadata.affectedPopulation
      : null;
  return {
    ...primary,
    severity: provider === "gdacs" ? secondary.severity : primary.severity,
    metadata: {
      ...primary.metadata,
      providerEventIds: {
        ...(primary.metadata.providerEventIds as Record<string, string> | undefined),
        [provider]: secondary.sourceEventId,
      },
      providerMagnitudes: {
        ...(primary.metadata.providerMagnitudes as Record<string, number> | undefined),
        ...(secondaryMagnitude == null ? {} : { [provider]: secondaryMagnitude }),
      },
      providerUpdatedAt: {
        ...(primary.metadata.providerUpdatedAt as Record<string, string> | undefined),
        [provider]: secondary.updatedAt,
      },
      providerUrls: {
        ...(primary.metadata.providerUrls as Record<string, string> | undefined),
        ...(secondary.sourceUrl ? { [provider]: secondary.sourceUrl } : {}),
      },
      emscEventId:
        provider === "emsc"
          ? secondary.sourceEventId
          : primary.metadata.emscEventId ?? null,
      gdacsEventId:
        provider === "gdacs"
          ? secondary.sourceEventId
          : primary.metadata.gdacsEventId ?? null,
      affectedPopulation:
        secondaryPopulation ?? primary.metadata.affectedPopulation ?? null,
      gdacsSeverity,
    },
  };
}

function uniqueCompatibleIndex(
  target: NormalizedAlert,
  candidates: readonly NormalizedAlert[],
  reverseCandidates: readonly NormalizedAlert[],
): number | null {
  const matches = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => areEarthquakesCompatible(target, candidate));
  if (matches.length !== 1) return null;
  const reverseMatches = reverseCandidates.filter((candidate) =>
    areEarthquakesCompatible(matches[0].candidate, candidate),
  );
  return reverseMatches.length === 1 ? matches[0].index : null;
}

export function mergeEarthquakeProviders(
  usgsAlerts: readonly NormalizedAlert[],
  emscAlerts: readonly NormalizedAlert[],
  gdacsAlerts: readonly NormalizedAlert[],
): NormalizedAlert[] {
  const merged = usgsAlerts.map((alert) => ({ ...alert }));
  const usedEmsc = new Set<number>();
  const usedGdacs = new Set<number>();
  for (let index = 0; index < merged.length; index += 1) {
    const emscIndex = uniqueCompatibleIndex(merged[index], emscAlerts, usgsAlerts);
    if (emscIndex != null && !usedEmsc.has(emscIndex)) {
      merged[index] = mergeInto(merged[index], emscAlerts[emscIndex]);
      usedEmsc.add(emscIndex);
    }
    const gdacsIndex = uniqueCompatibleIndex(merged[index], gdacsAlerts, usgsAlerts);
    if (gdacsIndex != null && !usedGdacs.has(gdacsIndex)) {
      merged[index] = mergeInto(merged[index], gdacsAlerts[gdacsIndex]);
      usedGdacs.add(gdacsIndex);
    }
  }
  return [
    ...merged,
    ...emscAlerts.filter((_, index) => !usedEmsc.has(index)),
    ...gdacsAlerts.filter((_, index) => !usedGdacs.has(index)),
  ];
}
