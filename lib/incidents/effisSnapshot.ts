export type EffisBurnedAreaSnapshot = {
  incidentId: string;
  countryCode: string | null;
  sourceLayer: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  areaHectares: number | null;
  fireDate: string | null;
  finalDate: string | null;
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  sourceUrl: string;
};

export type EffisSnapshotRow = {
  incident_id: string;
  country_code: string | null;
  source_layer: string;
  geometry_geojson: unknown;
  area_hectares: number | null;
  fire_date: string | null;
  final_date: string | null;
  source_updated_at: string | null;
  fetched_at: string;
  source_url: string;
  metadata?: Record<string, unknown> | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLngLat(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1]) &&
    value[0] >= -180 &&
    value[0] <= 180 &&
    value[1] >= -90 &&
    value[1] <= 90
  );
}

function isPositionRing(value: unknown): value is [number, number][] {
  if (!Array.isArray(value) || value.length < 4) return false;
  if (!value.every(isLngLat)) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

export function isValidPolygonOrMultiPolygon(
  value: unknown,
): value is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (!value || typeof value !== "object") return false;
  const geometry = value as { type?: unknown; coordinates?: unknown };

  if (geometry.type === "Polygon") {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 1) {
      return false;
    }
    return geometry.coordinates.every(isPositionRing);
  }

  if (geometry.type === "MultiPolygon") {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 1) {
      return false;
    }
    return geometry.coordinates.every(
      (polygon) =>
        Array.isArray(polygon) &&
        polygon.length >= 1 &&
        polygon.every(isPositionRing),
    );
  }

  return false;
}

export function parseIsoDateOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

export function parseAreaHectaresOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

export function validateEffisBurnedAreaSnapshot(
  value: unknown,
): EffisBurnedAreaSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.incidentId !== "string" || !candidate.incidentId.trim()) {
    return null;
  }
  if (typeof candidate.sourceLayer !== "string" || !candidate.sourceLayer.trim()) {
    return null;
  }
  if (typeof candidate.sourceUrl !== "string" || !candidate.sourceUrl.startsWith("https://")) {
    return null;
  }
  if (typeof candidate.fetchedAt !== "string" || !parseIsoDateOrNull(candidate.fetchedAt)) {
    return null;
  }
  if (!isValidPolygonOrMultiPolygon(candidate.geometry)) {
    return null;
  }

  const countryCode =
    candidate.countryCode === null
      ? null
      : typeof candidate.countryCode === "string"
        ? candidate.countryCode
        : null;

  const areaHectares = parseAreaHectaresOrNull(candidate.areaHectares);
  if (
    candidate.areaHectares !== null &&
    candidate.areaHectares !== undefined &&
    areaHectares === null
  ) {
    return null;
  }

  return {
    incidentId: candidate.incidentId.trim(),
    countryCode,
    sourceLayer: candidate.sourceLayer.trim(),
    geometry: candidate.geometry,
    areaHectares,
    fireDate: parseIsoDateOrNull(candidate.fireDate),
    finalDate: parseIsoDateOrNull(candidate.finalDate),
    sourceUpdatedAt: parseIsoDateOrNull(candidate.sourceUpdatedAt),
    fetchedAt: parseIsoDateOrNull(candidate.fetchedAt) as string,
    sourceUrl: candidate.sourceUrl,
  };
}

export function rowToEffisBurnedAreaSnapshot(
  row: EffisSnapshotRow,
): EffisBurnedAreaSnapshot | null {
  return validateEffisBurnedAreaSnapshot({
    incidentId: row.incident_id,
    countryCode: row.country_code,
    sourceLayer: row.source_layer,
    geometry: row.geometry_geojson,
    areaHectares: row.area_hectares,
    fireDate: row.fire_date,
    finalDate: row.final_date,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
    sourceUrl: row.source_url,
  });
}

export function snapshotToRow(
  snapshot: EffisBurnedAreaSnapshot,
  metadata: Record<string, unknown> = {},
): EffisSnapshotRow {
  return {
    incident_id: snapshot.incidentId,
    country_code: snapshot.countryCode,
    source_layer: snapshot.sourceLayer,
    geometry_geojson: snapshot.geometry,
    area_hectares: snapshot.areaHectares,
    fire_date: snapshot.fireDate,
    final_date: snapshot.finalDate,
    source_updated_at: snapshot.sourceUpdatedAt,
    fetched_at: snapshot.fetchedAt,
    source_url: snapshot.sourceUrl,
    metadata,
  };
}

/**
 * Replace only when there is no previous snapshot, or the incoming
 * EFFIS LASTUPDATE is strictly newer, or previous date is missing
 * while the new one is valid.
 */
export function shouldReplaceSnapshot(
  previous: EffisBurnedAreaSnapshot | null,
  next: EffisBurnedAreaSnapshot,
): boolean {
  if (!previous) return true;

  const previousUpdated = previous.sourceUpdatedAt
    ? Date.parse(previous.sourceUpdatedAt)
    : Number.NaN;
  const nextUpdated = next.sourceUpdatedAt
    ? Date.parse(next.sourceUpdatedAt)
    : Number.NaN;

  if (Number.isNaN(previousUpdated) && !Number.isNaN(nextUpdated)) {
    return true;
  }

  if (!Number.isNaN(previousUpdated) && !Number.isNaN(nextUpdated)) {
    return nextUpdated > previousUpdated;
  }

  return false;
}

export function isValidIncidentId(incidentId: string): boolean {
  return /^[A-Za-z0-9._:-]{1,128}$/.test(incidentId);
}
