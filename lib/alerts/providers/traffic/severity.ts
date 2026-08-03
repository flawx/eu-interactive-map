import type { AlertSeverity } from "@/lib/alerts/types";

const DELAY_MAGNITUDE: Record<string, number | null> = {
  unknown: null,
  undefined: null,
  minor: 1,
  moderate: 2,
  major: 3,
};

export function delayMagnitudeValue(value: unknown): number | null {
  return DELAY_MAGNITUDE[String(value ?? "").trim()] ?? null;
}

export function trafficSeverity(
  magnitude: unknown,
  delaySeconds: number | null,
): AlertSeverity {
  const level = delayMagnitudeValue(magnitude);
  if (level === 3 || (delaySeconds != null && delaySeconds >= 30 * 60)) {
    return "severe";
  }
  if (level === 2 || (delaySeconds != null && delaySeconds >= 10 * 60)) {
    return "moderate";
  }
  if (level === 1 || (delaySeconds != null && delaySeconds > 0)) return "minor";
  return "unknown";
}

export function flowCongestionColor(relativeSpeed: number | null): string {
  if (relativeSpeed == null) return "#64748b";
  if (relativeSpeed < 0.15) return "#7f1d1d";
  if (relativeSpeed < 0.35) return "#dc2626";
  if (relativeSpeed < 0.75) return "#f59e0b";
  return "#22c55e";
}
