/**
 * In-memory spatial/attribute filtering over the curated fixture dataset.
 *
 * Production note: at real Kohesio scale this in-memory scan would be
 * replaced by a spatial index (e.g. PostGIS / R-tree) or a server-side proxy
 * to the Kohesio API with bbox pushdown. Kept pure (no I/O) so it is unit
 * testable and reusable by both the API route and the client viewport loader
 * tests.
 */

import type { EntityStatus } from "@/lib/map/dataLayers/entityStatus";
import { EU_PROJECTS_IN_SCOPE } from "./entities";
import type {
  EuProject,
  EuProjectCategory,
  EuProjectFilters,
  EuProjectQueryMeta,
} from "./types";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function toArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

function pointInBbox(
  longitude: number,
  latitude: number,
  bbox: readonly [number, number, number, number],
): boolean {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return (
    longitude >= minLng &&
    longitude <= maxLng &&
    latitude >= minLat &&
    latitude <= maxLat
  );
}

export function queryEuProjects(filters: EuProjectFilters = {}): {
  projects: EuProject[];
  meta: EuProjectQueryMeta;
} {
  const categories = toArray<EuProjectCategory>(filters.category);
  const statuses = toArray<EntityStatus>(filters.status);
  const limit = Math.max(
    1,
    Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
  );
  const cursor = Math.max(0, filters.cursor ?? 0);

  const matched = EU_PROJECTS_IN_SCOPE.filter((project) => {
    if (filters.bbox && !pointInBbox(project.longitude, project.latitude, filters.bbox)) {
      return false;
    }
    if (categories && !categories.includes(project.category)) return false;
    if (statuses && !statuses.includes(project.status)) return false;
    if (filters.minBudget !== undefined) {
      if (project.budgetEUR === null || project.budgetEUR < filters.minBudget) {
        return false;
      }
    }
    if (filters.majorOnly && !project.isMajor) return false;
    return true;
  });

  const totalMatched = matched.length;
  const page = matched.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < totalMatched ? cursor + limit : null;

  return {
    projects: page,
    meta: {
      fetchedAt: new Date().toISOString(),
      totalMatched,
      nextCursor,
    },
  };
}

export function parseBboxParam(
  raw: string | null,
): [number, number, number, number] | undefined {
  if (!raw) return undefined;
  const parts = raw.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    return undefined;
  }
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng > maxLng || minLat > maxLat) return undefined;
  return [minLng, minLat, maxLng, maxLat];
}
