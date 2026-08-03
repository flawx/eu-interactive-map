import type { NormalizedAlert } from "@/lib/alerts/types";

function roundCoord(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

function geometrySignature(geometry: GeoJSON.Geometry | null): string {
  if (!geometry) return "null";
  if (geometry.type === "GeometryCollection") {
    return `GeometryCollection:${geometry.geometries
      .map((item) => geometrySignature(item))
      .join("|")}`;
  }
  const coords = JSON.stringify(geometry.coordinates, (_key, value) =>
    typeof value === "number" ? roundCoord(value) : value,
  );
  return `${geometry.type}:${coords}`;
}

function centroidSignature(
  centroid: NormalizedAlert["centroid"],
): string {
  if (!centroid) return "null";
  return `${roundCoord(centroid.latitude)},${roundCoord(centroid.longitude)}`;
}

/** Compact deterministic signature for a single traffic alert. */
export function trafficAlertSignature(alert: NormalizedAlert): string {
  const metadata = alert.metadata ?? {};
  return [
    alert.id,
    alert.updatedAt,
    alert.status,
    alert.severity,
    alert.hazard,
    alert.title,
    String(metadata.status ?? ""),
    String(metadata.delaySeconds ?? ""),
    String(metadata.magnitudeOfDelay ?? ""),
    String(metadata.roadClosed ?? ""),
    String(metadata.lengthMeters ?? ""),
    String(metadata.startAt ?? ""),
    String(metadata.endAt ?? ""),
    centroidSignature(alert.centroid),
    geometrySignature(alert.geometry),
  ].join("\u001f");
}

export function trafficAlertsSignature(
  alerts: readonly NormalizedAlert[],
): string {
  return alerts
    .map((alert) => trafficAlertSignature(alert))
    .sort()
    .join("\n");
}

export function dedupeTrafficAlertsById(
  alerts: readonly NormalizedAlert[],
): NormalizedAlert[] {
  const byId = new Map<string, NormalizedAlert>();
  for (const alert of alerts) {
    if (alert.category !== "road_traffic") continue;
    const existing = byId.get(alert.id);
    if (!existing) {
      byId.set(alert.id, alert);
      continue;
    }
    // Keep the freshest update when duplicates collide.
    if (Date.parse(alert.updatedAt) >= Date.parse(existing.updatedAt)) {
      byId.set(alert.id, alert);
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function areTrafficAlertsEqual(
  left: readonly NormalizedAlert[],
  right: readonly NormalizedAlert[],
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return trafficAlertsSignature(left) === trafficAlertsSignature(right);
}
