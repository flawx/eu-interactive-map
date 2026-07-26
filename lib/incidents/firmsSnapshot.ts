import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import {
  FIRMS_SOURCE,
  FIRMS_SOURCE_URL,
} from "@/lib/incidents/firmsFootprints";

export type FirmsSnapshotRow = {
  incident_id: string;
  incident_name: string;
  geometry_geojson: unknown;
  bbox: unknown;
  detection_count: number;
  sensors: string[] | null;
  approximate_area_hectares: number | null;
  source_updated_at: string | null;
  fetched_at: string;
  source: string;
  source_url: string | null;
  metadata: unknown;
};

function isValidMultiPolygon(value: unknown): value is GeoJSON.MultiPolygon {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };
  if (geometry.type !== "MultiPolygon" || !Array.isArray(geometry.coordinates)) {
    return false;
  }

  return geometry.coordinates.every(
    (polygon) =>
      Array.isArray(polygon) &&
      polygon.every(
        (ring) =>
          Array.isArray(ring) &&
          ring.length >= 4 &&
          ring.every(
            (coord) =>
              Array.isArray(coord) &&
              coord.length >= 2 &&
              typeof coord[0] === "number" &&
              typeof coord[1] === "number",
          ),
      ),
  );
}

function isValidBbox(
  value: unknown,
): value is [number, number, number, number] {
  return (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

export function validateFirmsIncidentSnapshot(
  value: unknown,
): FirmsIncidentSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<FirmsIncidentSnapshot>;

  if (
    typeof candidate.incidentId !== "string" ||
    !candidate.incidentId.trim() ||
    typeof candidate.incidentName !== "string" ||
    !candidate.incidentName.trim() ||
    !isValidMultiPolygon(candidate.geometry) ||
    !isValidBbox(candidate.bbox) ||
    typeof candidate.detectionCount !== "number" ||
    !Number.isFinite(candidate.detectionCount) ||
    candidate.detectionCount < 1 ||
    !Array.isArray(candidate.sensors) ||
    typeof candidate.fetchedAt !== "string" ||
    !candidate.fetchedAt ||
    candidate.isApproximate !== true ||
    candidate.source !== FIRMS_SOURCE
  ) {
    return null;
  }

  const approximateAreaHectares =
    candidate.approximateAreaHectares === null ||
    candidate.approximateAreaHectares === undefined
      ? null
      : typeof candidate.approximateAreaHectares === "number" &&
          Number.isFinite(candidate.approximateAreaHectares) &&
          candidate.approximateAreaHectares >= 0
        ? candidate.approximateAreaHectares
        : null;

  return {
    incidentId: candidate.incidentId.trim(),
    incidentName: candidate.incidentName.trim(),
    geometry: candidate.geometry,
    bbox: candidate.bbox,
    detectionCount: candidate.detectionCount,
    sensors: candidate.sensors
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
    sourceUpdatedAt:
      typeof candidate.sourceUpdatedAt === "string" &&
      candidate.sourceUpdatedAt.trim()
        ? candidate.sourceUpdatedAt
        : null,
    fetchedAt: candidate.fetchedAt,
    approximateAreaHectares,
    isApproximate: true,
    source: FIRMS_SOURCE,
    sourceUrl: FIRMS_SOURCE_URL,
    metadata:
      candidate.metadata && typeof candidate.metadata === "object"
        ? (candidate.metadata as Record<string, unknown>)
        : {},
  };
}

export function rowToFirmsIncidentSnapshot(
  row: FirmsSnapshotRow,
): FirmsIncidentSnapshot | null {
  return validateFirmsIncidentSnapshot({
    incidentId: row.incident_id,
    incidentName: row.incident_name,
    geometry: row.geometry_geojson,
    bbox: row.bbox,
    detectionCount: row.detection_count,
    sensors: row.sensors ?? [],
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
    approximateAreaHectares: row.approximate_area_hectares,
    isApproximate: true,
    source: row.source,
    sourceUrl: row.source_url ?? FIRMS_SOURCE_URL,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
  });
}

export function firmsSnapshotToRow(
  snapshot: FirmsIncidentSnapshot,
): FirmsSnapshotRow {
  return {
    incident_id: snapshot.incidentId,
    incident_name: snapshot.incidentName,
    geometry_geojson: snapshot.geometry,
    bbox: snapshot.bbox,
    detection_count: snapshot.detectionCount,
    sensors: snapshot.sensors,
    approximate_area_hectares: snapshot.approximateAreaHectares,
    source_updated_at: snapshot.sourceUpdatedAt,
    fetched_at: snapshot.fetchedAt,
    source: snapshot.source,
    source_url: snapshot.sourceUrl,
    metadata: snapshot.metadata,
  };
}
