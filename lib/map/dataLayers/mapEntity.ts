import type { EntityStatus } from "./entityStatus";
import { ENTITY_STATUS_COLORS } from "./entityStatus";

export type EUIMMapGeometry =
  | GeoJSON.Point
  | GeoJSON.LineString
  | GeoJSON.MultiLineString
  | GeoJSON.Polygon
  | GeoJSON.MultiPolygon;

export type EUIMMapEntity = {
  id: string;
  category: string;
  subcategory: string;
  layerId: string;
  name: string;
  countryCode?: string | null;
  geometry: EUIMMapGeometry;
  icon?: string | null;
  color?: string | null;
  status?: EntityStatus | null;
  validFrom?: string | null;
  validUntil?: string | null;
  sourceIds: string[];
  properties: Record<string, unknown>;
};

const SUPPORTED_GEOMETRY_TYPES = new Set([
  "Point",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);

function isCoordinatePair(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function hasValidCoordinates(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (isCoordinatePair(value)) return true;
  return value.every((item) => hasValidCoordinates(item));
}

export function isValidMapGeometry(geometry: unknown): geometry is EUIMMapGeometry {
  if (!geometry || typeof geometry !== "object" || Array.isArray(geometry)) {
    return false;
  }

  const candidate = geometry as GeoJSON.Geometry;
  if (!SUPPORTED_GEOMETRY_TYPES.has(candidate.type)) return false;
  if (!("coordinates" in candidate)) return false;

  return hasValidCoordinates(
    (candidate as EUIMMapGeometry).coordinates as unknown,
  );
}

export function entityToGeoJsonFeature(entity: EUIMMapEntity): GeoJSON.Feature {
  const status = entity.status ?? null;
  const resolvedColor =
    entity.color ??
    (status ? ENTITY_STATUS_COLORS[status] : null);

  return {
    type: "Feature",
    id: entity.id,
    geometry: entity.geometry,
    properties: {
      id: entity.id,
      category: entity.category,
      subcategory: entity.subcategory,
      layerId: entity.layerId,
      name: entity.name,
      countryCode: entity.countryCode ?? null,
      icon: entity.icon ?? null,
      color: resolvedColor,
      status,
      validFrom: entity.validFrom ?? null,
      validUntil: entity.validUntil ?? null,
      sourceIds: entity.sourceIds,
      ...entity.properties,
    },
  };
}

export function entitiesToFeatureCollection(
  entities: EUIMMapEntity[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: entities.map(entityToGeoJsonFeature),
  };
}

export function getEntityPointCoordinates(
  entity: EUIMMapEntity,
): [number, number] | null {
  if (entity.geometry.type !== "Point") return null;
  const [longitude, latitude] = entity.geometry.coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return [longitude, latitude];
}
