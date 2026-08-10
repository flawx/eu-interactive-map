/**
 * Client-side viewport loader for the `/api/eu-projects` endpoint.
 *
 * Responsibilities (kept as small pure/testable pieces where possible):
 * - `resolveZoomStrategy`: low zoom → majorOnly + larger radius bbox padding,
 *   high zoom → full local detail with a tighter limit.
 * - `buildRequestKey`: stable cache/dedupe key from bbox + filters.
 * - `EuProjectsViewportCache`: short TTL (default 45s) in-memory cache keyed
 *   by request key, with an injectable clock for tests.
 * - `createEuProjectsViewportLoader`: ties together AbortController-based
 *   cancellation of superseded requests, in-flight request dedupe, the
 *   cache, and a debounce wrapper meant to be called on `moveend` (not on
 *   every pixel of pan/zoom).
 */

import type { EntityStatus } from "@/lib/map/dataLayers/entityStatus";
import type { EuProjectCategory } from "./types";

export type ViewportBbox = [number, number, number, number];

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

export type CachedEntry<T> = {
  data: T;
  expiresAt: number;
};

/** Small TTL cache with an injectable clock for deterministic tests. */
export class EuProjectsViewportCache<T> {
  private readonly store = new Map<string, CachedEntry<T>>();

  constructor(
    private readonly ttlMs: number = 45_000,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: this.now() + this.ttlMs });
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/** Debounce helper — only the trailing call within `waitMs` fires. */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): { call: (...args: Args) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    call: (...args: Args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, waitMs);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}

export type EuProjectsFeatureCollection = GeoJSON.FeatureCollection & {
  meta?: { fetchedAt: string; totalMatched: number; nextCursor: number | null };
};

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

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
  /** Debounced entry point — call on `moveend`. */
  requestViewport: (
    bbox: ViewportBbox,
    zoom: number,
    filters?: EuProjectsViewportFilters,
  ) => void;
  /** Cancels any pending debounce/in-flight request without firing a new one. */
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
  const fetchImpl: FetchLike = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const cache = new EuProjectsViewportCache<EuProjectsFeatureCollection>(
    options.cacheTtlMs ?? 45_000,
    options.now,
  );

  let currentController: AbortController | null = null;
  let inFlightKey: string | null = null;
  let inFlightPromise: Promise<void> | null = null;

  const runRequest = async (
    bbox: ViewportBbox,
    strategy: ZoomStrategy,
    filters: EuProjectsViewportFilters,
    key: string,
  ): Promise<void> => {
    const cached = cache.get(key);
    if (cached) {
      options.onData(cached, key);
      return;
    }

    if (inFlightKey === key && inFlightPromise) {
      return inFlightPromise;
    }

    currentController?.abort();
    const controller = new AbortController();
    currentController = controller;
    inFlightKey = key;

    const promise = (async () => {
      try {
        const response = await fetchImpl(buildApiUrl(bbox, strategy, filters), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`eu-projects request failed: ${response.status}`);
        }
        const data = (await response.json()) as EuProjectsFeatureCollection;
        cache.set(key, data);
        options.onData(data, key);
      } catch (error) {
        if (controller.signal.aborted) return;
        options.onError?.(error, key);
      } finally {
        if (inFlightKey === key) {
          inFlightKey = null;
          inFlightPromise = null;
        }
      }
    })();

    inFlightPromise = promise;
    return promise;
  };

  const debounced = debounce(
    (
      bbox: ViewportBbox,
      zoom: number,
      filters: EuProjectsViewportFilters,
    ) => {
      const strategy = resolveZoomStrategy(zoom);
      const key = buildRequestKey(bbox, strategy, filters);
      void runRequest(bbox, strategy, filters, key);
    },
    options.debounceMs ?? 300,
  );

  return {
    requestViewport: (bbox, zoom, filters = {}) => {
      debounced.call(bbox, zoom, filters);
    },
    cancel: () => {
      debounced.cancel();
      currentController?.abort();
    },
    destroy: () => {
      debounced.cancel();
      currentController?.abort();
      cache.clear();
    },
  };
}
