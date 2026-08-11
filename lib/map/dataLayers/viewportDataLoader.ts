/**
 * Generic client-side viewport loader shared by every "Data Layers V2"
 * dataset that streams from a bbox-scoped API endpoint (EU projects,
 * WiFi4EU hotspots, and future datasets).
 *
 * Extracted from the original `lib/europe/euProjects/viewportLoader.ts`
 * (which now wraps this module) so new datasets don't have to re-implement
 * TTL caching, in-flight dedupe and debounced `moveend` fetching.
 *
 * Responsibilities:
 * - `TtlCache`: small TTL cache with an injectable clock for deterministic tests.
 * - `debounce`: trailing-call debounce wrapper meant to be called on `moveend`.
 * - `createViewportDataLoader`: ties together AbortController-based
 *   cancellation of superseded requests, in-flight request dedupe, the TTL
 *   cache, and the debounce wrapper.
 */

export type ViewportBbox = [number, number, number, number];

/** Small TTL cache with an injectable clock for deterministic tests. */
export class TtlCache<T> {
  private readonly store = new Map<string, { data: T; expiresAt: number }>();

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

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type ViewportDataLoader<TData, TFilters> = {
  /** Debounced entry point — call on `moveend`. */
  requestViewport: (
    bbox: ViewportBbox,
    zoom: number,
    filters?: TFilters,
  ) => void;
  /** Cancels any pending debounce/in-flight request without firing a new one. */
  cancel: () => void;
  destroy: () => void;
};

export type ViewportDataLoaderOptions<TData, TFilters> = {
  /** Builds the request URL from bbox/zoom/filters (already resolved via `resolveStrategy` when provided). */
  fetchUrl: (bbox: ViewportBbox, zoom: number, filters: TFilters) => string;
  /** Stable cache/dedupe key — same viewport + filters must map to the same key. */
  buildKey: (bbox: ViewportBbox, zoom: number, filters: TFilters) => string;
  /**
   * Optional per-dataset zoom strategy hook, invoked before `buildKey` /
   * `fetchUrl` so callers can fold e.g. "majorOnly at low zoom" into the key.
   * Purely informational for this generic helper — callers typically read
   * `zoom` directly inside `buildKey`/`fetchUrl` instead.
   */
  resolveStrategy?: (zoom: number) => void;
  onData: (data: TData, key: string) => void;
  onError?: (error: unknown, key: string) => void;
  fetchImpl?: FetchLike;
  debounceMs?: number;
  ttlMs?: number;
  now?: () => number;
};

/**
 * Generic viewport loader: debounce → cache lookup → in-flight dedupe →
 * AbortController-based cancellation of superseded requests → fetch.
 */
export function createViewportDataLoader<TData, TFilters = Record<string, never>>(
  options: ViewportDataLoaderOptions<TData, TFilters>,
): ViewportDataLoader<TData, TFilters> {
  const fetchImpl: FetchLike = options.fetchImpl ?? (fetch as unknown as FetchLike);
  const cache = new TtlCache<TData>(options.ttlMs ?? 45_000, options.now);

  let currentController: AbortController | null = null;
  let inFlightKey: string | null = null;
  let inFlightPromise: Promise<void> | null = null;

  const runRequest = async (
    bbox: ViewportBbox,
    zoom: number,
    filters: TFilters,
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
        const response = await fetchImpl(options.fetchUrl(bbox, zoom, filters), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`viewport request failed: ${response.status}`);
        }
        const data = (await response.json()) as TData;
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
    (bbox: ViewportBbox, zoom: number, filters: TFilters) => {
      options.resolveStrategy?.(zoom);
      const key = options.buildKey(bbox, zoom, filters);
      void runRequest(bbox, zoom, filters, key);
    },
    options.debounceMs ?? 300,
  );

  return {
    requestViewport: (bbox, zoom, filters = {} as TFilters) => {
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
