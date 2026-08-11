/**
 * Client-side viewport loader for the `/api/eu-projects` endpoint.
 *
 * This is now a thin wrapper around the generic
 * `lib/map/dataLayers/viewportDataLoader.ts` helper — kept as its own module
 * (re-exporting the generic pieces under their original names) so existing
 * imports/tests keep working unchanged.
 *
 * Responsibilities specific to EU projects:
 * - `resolveZoomStrategy`: low zoom → majorOnly + larger radius bbox padding,
 *   high zoom → full local detail with a tighter limit.
 * - `buildRequestKey` / `buildApiUrl`: EU-projects-specific key/URL builders
 *   passed into the generic loader.
 */

import type { EntityStatus } from "@/lib/map/dataLayers/entityStatus";
import {
  createViewportDataLoader,
  debounce,
  TtlCache,
  type FetchLike,
  type ViewportBbox,
} from "@/lib/map/dataLayers/viewportDataLoader";
import type { EuProjectCategory } from "./types";

export type { ViewportBbox, FetchLike };
export { debounce };

export type EuProjectsViewportFilters = {
  category?: EuProjectCategory | EuProjectCategory[];
  status?: EntityStatus | EntityStatus[];
  minBudget?: number;
};

export type ZoomStrategy = {
  majorOnly: boolean;
  limit: number;
};

/** Low zoom = continental overview → major projects only, higher fan-out limit. */
export function resolveZoomStrategy(zoom: number): ZoomStrategy {
  if (zoom < 5) return { majorOnly: true, limit: 60 };
  if (zoom < 7) return { majorOnly: true, limit: 120 };
  return { majorOnly: false, limit: 300 };
}

function normalizeList<T extends string>(value: T | T[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? [...value].sort().join("|") : value;
}

/** Stable cache/dedupe key — same viewport + filters must map to the same key. */
export function buildRequestKey(
  bbox: ViewportBbox,
  strategy: ZoomStrategy,
  filters: EuProjectsViewportFilters = {},
): string {
  const roundedBbox = bbox.map((value) => Math.round(value * 1000) / 1000).join(",");
  return [
    roundedBbox,
    strategy.majorOnly ? "major" : "full",
    strategy.limit,
    normalizeList(filters.category),
    normalizeList(filters.status),
    filters.minBudget ?? "",
  ].join("::");
}

/** Backwards-compatible alias — same small TTL cache, now backed by the generic `TtlCache`. */
export class EuProjectsViewportCache<T> extends TtlCache<T> {}

export type EuProjectsFeatureCollection = GeoJSON.FeatureCollection & {
  meta?: { fetchedAt: string; totalMatched: number; nextCursor: number | null };
};

function buildApiUrl(
  bbox: ViewportBbox,
  strategy: ZoomStrategy,
  filters: EuProjectsViewportFilters,
): string {
  const params = new URLSearchParams();
  params.set("bbox", bbox.map((v) => v.toFixed(4)).join(","));
  params.set("limit", String(strategy.limit));
  if (strategy.majorOnly) params.set("majorOnly", "true");
  if (filters.category) {
    params.set(
      "category",
      Array.isArray(filters.category) ? filters.category.join(",") : filters.category,
    );
  }
  if (filters.status) {
    params.set(
      "status",
      Array.isArray(filters.status) ? filters.status.join(",") : filters.status,
    );
  }
  if (filters.minBudget !== undefined) {
    params.set("minBudget", String(filters.minBudget));
  }
  return `/api/eu-projects?${params.toString()}`;
}

export type EuProjectsViewportLoader = {
  requestViewport: (
    bbox: ViewportBbox,
    zoom: number,
    filters?: EuProjectsViewportFilters,
  ) => void;
  cancel: () => void;
  destroy: () => void;
};

export type EuProjectsViewportLoaderOptions = {
  onData: (data: EuProjectsFeatureCollection, key: string) => void;
  onError?: (error: unknown, key: string) => void;
  fetchImpl?: FetchLike;
  debounceMs?: number;
  cacheTtlMs?: number;
  now?: () => number;
};

export function createEuProjectsViewportLoader(
  options: EuProjectsViewportLoaderOptions,
): EuProjectsViewportLoader {
  const loader = createViewportDataLoader<
    EuProjectsFeatureCollection,
    EuProjectsViewportFilters
  >({
    fetchUrl: (bbox, zoom, filters) =>
      buildApiUrl(bbox, resolveZoomStrategy(zoom), filters),
    buildKey: (bbox, zoom, filters) =>
      buildRequestKey(bbox, resolveZoomStrategy(zoom), filters),
    onData: options.onData,
    onError: options.onError,
    fetchImpl: options.fetchImpl,
    debounceMs: options.debounceMs,
    ttlMs: options.cacheTtlMs,
    now: options.now,
  });

  return {
    requestViewport: (bbox, zoom, filters = {}) =>
      loader.requestViewport(bbox, zoom, filters),
    cancel: loader.cancel,
    destroy: loader.destroy,
  };
}
