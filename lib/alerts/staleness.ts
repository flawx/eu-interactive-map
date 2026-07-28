import type { AlertSourceDefinition, NormalizedAlert } from "@/lib/alerts/types";

export type AlertFreshness = "fresh" | "delayed" | "stale" | "expired";

export function getAlertFreshness(
  alert: Pick<NormalizedAlert, "updatedAt" | "expiresAt">,
  source: Pick<AlertSourceDefinition, "updateIntervalMs">,
  now = new Date(),
): AlertFreshness {
  const expiresAt = alert.expiresAt ? Date.parse(alert.expiresAt) : NaN;
  if (Number.isFinite(expiresAt) && expiresAt < now.getTime()) return "expired";

  const updatedAt = Date.parse(alert.updatedAt);
  if (!Number.isFinite(updatedAt)) return "stale";
  const age = now.getTime() - updatedAt;
  if (age <= source.updateIntervalMs * 2) return "fresh";
  if (age <= source.updateIntervalMs * 6) return "delayed";
  return "stale";
}
export function isBeyondExpiryGrace(
  expiresAt: string | null,
  now = new Date(),
  graceMs = 30 * 60 * 1000,
): boolean {
  if (!expiresAt) return false;
  const parsed = Date.parse(expiresAt);
  return Number.isFinite(parsed) && parsed + graceMs < now.getTime();
}
