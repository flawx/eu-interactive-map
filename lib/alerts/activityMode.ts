import type {
  AlertActivityMode,
  NormalizedAlert,
} from "@/lib/alerts/types";

export function filterAlertsByActivityMode(
  alerts: readonly NormalizedAlert[],
  mode: AlertActivityMode,
  now = new Date(),
): NormalizedAlert[] {
  if (mode === "active") {
    return alerts.filter(
      (alert) => alert.status === "active" || alert.status === "upcoming",
    );
  }
  const hours = mode === "24h" ? 24 : 72;
  const cutoff = now.getTime() - hours * 60 * 60 * 1000;
  return alerts.filter((alert) => {
    if (alert.status === "active" || alert.status === "upcoming") return true;
    const timestamps = [
      alert.expiresAt,
      alert.updatedAt,
      alert.onsetAt,
    ]
      .filter((value): value is string => Boolean(value))
      .map(Date.parse)
      .filter(Number.isFinite);
    return timestamps.some((timestamp) => timestamp >= cutoff);
  });
}

export function countActiveAlerts(
  alerts: readonly NormalizedAlert[],
): number {
  return alerts.filter((alert) => alert.status === "active").length;
}
