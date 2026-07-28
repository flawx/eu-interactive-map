import type { NormalizedAlert } from "@/lib/alerts/types";

export function stableAlertId(
  source: string,
  sourceEventId: string,
  episode: string | number | null = null,
): string {
  const clean = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-");
  return [clean(source), clean(sourceEventId), episode == null ? null : clean(String(episode))]
    .filter(Boolean)
    .join(":");
}
/**
 * Keeps different hazards and validity periods separate. A newer official
 * update only replaces the same stable source/event/episode identity.
 */
export function deduplicateAlerts(
  alerts: readonly NormalizedAlert[],
): NormalizedAlert[] {
  const latest = new Map<string, NormalizedAlert>();
  for (const alert of alerts) {
    const previous = latest.get(alert.id);
    if (!previous || Date.parse(alert.updatedAt) >= Date.parse(previous.updatedAt)) {
      latest.set(alert.id, alert);
    }
  }
  return [...latest.values()];
}
