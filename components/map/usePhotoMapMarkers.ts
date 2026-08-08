"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap, GeoJSONSource, PointLike } from "maplibre-gl";
import type { Locale } from "@/lib/i18n/config";
import { EU_CAPITALS } from "@/lib/europe/euCapitals";
import {
  isPhotoMarkerAbortError,
  sharedPhotoMarkerRegistry,
} from "@/lib/map/photoMarkers";
import { isNetworkFetchError } from "@/lib/map/fetchMapThumbnail";
import {
  markerThumbnailKey,
  photoMarkerImageId,
  type MapMarkerThumbnail,
  type MarkerThumbnailRequest,
  type PhotoMarkerCategory,
} from "@/lib/map/mapMarkerThumbnail";
import { safeQueryRenderedFeatures } from "@/lib/map/safeQueryRenderedFeatures";

type LayerConfig = {
  category: PhotoMarkerCategory;
  enabled: boolean;
  sourceId: string;
  symbolLayerId: string;
  apiIdProperty: string;
  locationIdProperty?: string;
  loadAllApiIds?: readonly string[];
  fallbackIconExpression: unknown;
};

type ThumbnailResult = {
  category: PhotoMarkerCategory;
  id: string;
  locationId?: string | null;
  thumbnail: { url: string | null };
};

type CategoryStats = {
  eligible: number;
  resolved: number;
  loaded: number;
  added: number;
  fallback: number;
};

/** Session-level metadata cache — survives remounts within the same tab. */
const sessionThumbnailCache = new Map<string, MapMarkerThumbnail | null>();
let sessionCatalogVersion: number | null = null;

function isAbortError(error: unknown): boolean {
  return isPhotoMarkerAbortError(error);
}

function requestKey(item: MarkerThumbnailRequest): string {
  return markerThumbnailKey(item.category, item.id, item.locationId);
}

function buildSignature(
  enabledCategories: string[],
  pendingKeys: string[],
  styleGeneration: number,
): string {
  return [
    `style:${styleGeneration}`,
    `layers:${enabledCategories.slice().sort().join(",")}`,
    `pending:${pendingKeys.slice().sort().join(",")}`,
  ].join("|");
}

function readSessionCache(key: string): MapMarkerThumbnail | null | undefined {
  if (!sessionThumbnailCache.has(key)) return undefined;
  return sessionThumbnailCache.get(key) ?? null;
}

function writeSessionCache(key: string, value: MapMarkerThumbnail | null) {
  sessionThumbnailCache.set(key, value);
}

async function fetchThumbnails(
  items: MarkerThumbnailRequest[],
  locale: Locale,
  signal: AbortSignal,
): Promise<ThumbnailResult[]> {
  if (items.length === 0) return [];

  const cachedResults: ThumbnailResult[] = [];
  const missing: MarkerThumbnailRequest[] = [];
  for (const item of items) {
    const key = requestKey(item);
    const cached = readSessionCache(key);
    if (cached !== undefined) {
      cachedResults.push({
        ...item,
        thumbnail: { url: cached?.url ?? null },
      });
    } else {
      missing.push(item);
    }
  }

  if (missing.length === 0) return cachedResults;

  try {
    const response = await fetch("/api/map/marker-thumbnails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale, items: missing }),
      signal,
    });
    if (!response.ok) {
      return cachedResults;
    }
    const payload = (await response.json()) as {
      results?: ThumbnailResult[];
      catalogVersion?: number;
    };
    if (
      typeof payload.catalogVersion === "number" &&
      sessionCatalogVersion != null &&
      payload.catalogVersion !== sessionCatalogVersion
    ) {
      sessionThumbnailCache.clear();
    }
    if (typeof payload.catalogVersion === "number") {
      sessionCatalogVersion = payload.catalogVersion;
    }
    for (const result of payload.results ?? []) {
      writeSessionCache(requestKey(result), {
        url: result.thumbnail.url,
        source: null,
        width: null,
        height: null,
      });
      cachedResults.push(result);
    }
    // Mark requested-but-absent entries as known-missing for this session.
    for (const item of missing) {
      const key = requestKey(item);
      if (!sessionThumbnailCache.has(key)) {
        writeSessionCache(key, null);
        cachedResults.push({ ...item, thumbnail: { url: null } });
      }
    }
    return cachedResults;
  } catch (error) {
    if (isAbortError(error)) return cachedResults;
    // Transient network rejections must not become unhandled / console errors.
    if (isNetworkFetchError(error)) return cachedResults;
    throw error;
  }
}

function readSourceFeatureCollection(
  map: MapLibreMap,
  sourceId: string,
): GeoJSON.FeatureCollection | null {
  const source = map.getSource(sourceId) as
    | (GeoJSONSource & {
        _data?:
          | GeoJSON.FeatureCollection
          | { geojson?: GeoJSON.FeatureCollection };
        serialize?: () => { data?: GeoJSON.FeatureCollection | string };
      })
    | undefined;
  if (!source) return null;

  const raw = source._data;
  if (raw && "type" in raw && raw.type === "FeatureCollection") {
    return raw;
  }
  if (raw && "geojson" in raw && raw.geojson?.type === "FeatureCollection") {
    return raw.geojson;
  }
  if (typeof source.serialize === "function") {
    const serialized = source.serialize();
    if (
      serialized.data &&
      typeof serialized.data !== "string" &&
      serialized.data.type === "FeatureCollection"
    ) {
      return serialized.data;
    }
  }
  return null;
}

function collectViewportRequests(
  map: MapLibreMap,
  config: LayerConfig,
): MarkerThumbnailRequest[] {
  if (!map.getLayer(config.symbolLayerId) && !map.getSource(config.sourceId)) {
    return [];
  }

  // Expand bounds ~25% so tiny pans do not thrash the loader.
  const bounds = map.getBounds();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const south = bounds.getSouth();
  const north = bounds.getNorth();
  const lngPad = Math.max(0.01, (east - west) * 0.25);
  const latPad = Math.max(0.01, (north - south) * 0.25);
  const minLng = west - lngPad;
  const maxLng = east + lngPad;
  const minLat = south - latPad;
  const maxLat = north + latPad;

  const seen = new Set<string>();
  const items: MarkerThumbnailRequest[] = [];

  const pushFeatureProps = (props: GeoJSON.GeoJsonProperties | null) => {
    if (!props) return;
    const apiId = props[config.apiIdProperty];
    if (typeof apiId !== "string" || !apiId) return;
    const locationId = config.locationIdProperty
      ? props[config.locationIdProperty]
      : null;
    const item: MarkerThumbnailRequest = {
      category: config.category,
      id: apiId,
      locationId: typeof locationId === "string" ? locationId : null,
    };
    const key = requestKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  // Prefer source GeoJSON (works even when points are clustered).
  const data = readSourceFeatureCollection(map, config.sourceId);

  if (data) {
    for (const feature of data.features) {
      if (feature.geometry?.type !== "Point") continue;
      const [lng, lat] = feature.geometry.coordinates;
      if (
        typeof lng !== "number" ||
        typeof lat !== "number" ||
        lng < minLng ||
        lng > maxLng ||
        lat < minLat ||
        lat > maxLat
      ) {
        continue;
      }
      pushFeatureProps(feature.properties);
    }
    return items;
  }

  // Fallback: rendered (unclustered) symbols only.
  const sw = map.project([minLng, minLat]);
  const ne = map.project([maxLng, maxLat]);
  const bbox: [PointLike, PointLike] = [
    [Math.min(sw.x, ne.x), Math.min(sw.y, ne.y)],
    [Math.max(sw.x, ne.x), Math.max(sw.y, ne.y)],
  ];
  if (!map.getLayer(config.symbolLayerId)) return items;
  const features = safeQueryRenderedFeatures(map, bbox, {
    layers: [config.symbolLayerId],
  });
  for (const feature of features) {
    pushFeatureProps(feature.properties);
  }
  return items;
}

function applyPhotoBindings(
  map: MapLibreMap,
  config: LayerConfig,
  bindings: Array<{ result: ThumbnailResult; imageId: string }>,
) {
  if (bindings.length === 0) return;

  // Always update GeoJSON properties — layout icon-image reads ["get","photoIconId"].
  const source = map.getSource(config.sourceId) as GeoJSONSource | undefined;
  if (!source) return;

  const data = readSourceFeatureCollection(map, config.sourceId);
  if (!data) return;

  const imageByKey = new Map<string, string>();
  for (const { result, imageId } of bindings) {
    imageByKey.set(requestKey(result), imageId);
  }

  let changed = false;
  const features = data.features.map((feature) => {
    const props = feature.properties ?? {};
    const apiId = props[config.apiIdProperty];
    if (typeof apiId !== "string") return feature;
    const locationId = config.locationIdProperty
      ? props[config.locationIdProperty]
      : null;
    const key = markerThumbnailKey(
      config.category,
      apiId,
      typeof locationId === "string" ? locationId : null,
    );
    const imageId = imageByKey.get(key);
    if (!imageId || props.photoIconId === imageId) return feature;
    changed = true;
    return {
      ...feature,
      properties: { ...props, photoIconId: imageId },
    };
  });
  if (changed) {
    source.setData({ type: "FeatureCollection", features });
  }
}

function emptyStats(): CategoryStats {
  return { eligible: 0, resolved: 0, loaded: 0, added: 0, fallback: 0 };
}

export function usePhotoMapMarkers(options: {
  mapRef: React.MutableRefObject<MapLibreMap | null>;
  mapReadyVersion: number;
  locale: Locale;
  showEuCapitals: boolean;
  showMajorTouristPlaces: boolean;
  showUnescoWorldHeritage: boolean;
  showEuropeanHeritageLabel: boolean;
  showMajorCivilEngineeringWorks: boolean;
}) {
  const controllerRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const runningSignatureRef = useRef<string | null>(null);
  const lastScheduledSignatureRef = useRef<string | null>(null);
  /** Keys with a successful MapLibre image + feature binding. */
  const completedKeysRef = useRef(new Set<string>());
  /** Keys known to have no thumbnail URL (do not hammer the API). */
  const missingUrlKeysRef = useRef(new Set<string>());
  const statsRef = useRef<Record<PhotoMarkerCategory, CategoryStats>>({
    capital: emptyStats(),
    tourist: emptyStats(),
    unesco: emptyStats(),
    ehl: emptyStats(),
    civil: emptyStats(),
  });
  const countersRef = useRef({
    abortedRuns: 0,
    completedRuns: 0,
    failedImages: 0,
  });
  const loggedSummaryRef = useRef(false);
  const retryAttemptsRef = useRef(0);

  // Keep latest flags in refs so moveend does not need effect rebind.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const map = options.mapRef.current;
    if (!map || options.mapReadyVersion === 0) return;

    // Style / mount refresh: MapLibre images may be gone; rebind from cache.
    completedKeysRef.current.clear();
    missingUrlKeysRef.current.clear();
    loggedSummaryRef.current = false;
    retryAttemptsRef.current = 0;
    lastScheduledSignatureRef.current = null;
    runningSignatureRef.current = null;
    sharedPhotoMarkerRegistry.clearFailures();
    sharedPhotoMarkerRegistry.clearMapBindings();

    const capitalIds = EU_CAPITALS.map((item) => item.id);

    const getConfigs = (): LayerConfig[] => {
      const current = optionsRef.current;
      return [
        {
          category: "capital",
          enabled: current.showEuCapitals,
          sourceId: "eu-capitals",
          symbolLayerId: "eu-capitals-symbol",
          apiIdProperty: "capitalId",
          loadAllApiIds: capitalIds,
          fallbackIconExpression: "eu-capital-icon",
        },
        {
          category: "tourist",
          enabled: current.showMajorTouristPlaces,
          sourceId: "major-tourist-places",
          symbolLayerId: "tourist-places-symbol",
          apiIdProperty: "placeId",
          fallbackIconExpression: ["get", "iconImageId"],
        },
        {
          category: "unesco",
          enabled: current.showUnescoWorldHeritage,
          sourceId: "unesco-world-heritage-sites",
          symbolLayerId: "unesco-world-heritage-symbol",
          apiIdProperty: "siteId",
          fallbackIconExpression: ["get", "iconImageId"],
        },
        {
          category: "ehl",
          enabled: current.showEuropeanHeritageLabel,
          sourceId: "european-heritage-label-sites",
          symbolLayerId: "ehl-sites-symbol",
          apiIdProperty: "siteId",
          locationIdProperty: "locationId",
          fallbackIconExpression: ["get", "iconImageId"],
        },
        {
          category: "civil",
          enabled: current.showMajorCivilEngineeringWorks,
          sourceId: "major-civil-engineering-works",
          symbolLayerId: "civil-engineering-symbol",
          apiIdProperty: "workId",
          fallbackIconExpression: ["get", "iconImageId"],
        },
      ];
    };

    const applyIconExpressions = (configs: LayerConfig[]) => {
      for (const config of configs) {
        if (!map.getLayer(config.symbolLayerId)) continue;
        // Layout icon-image cannot reliably use feature-state in MapLibre;
        // bind photos via GeoJSON property photoIconId only.
        const photoExpression = [
          "coalesce",
          ["get", "photoIconId"],
          config.fallbackIconExpression,
        ];
        try {
          map.setLayoutProperty(
            config.symbolLayerId,
            "icon-image",
            photoExpression as never,
          );
          map.setLayoutProperty(
            config.symbolLayerId,
            "icon-pitch-alignment",
            "viewport",
          );
          map.setLayoutProperty(
            config.symbolLayerId,
            "icon-rotation-alignment",
            "viewport",
          );
        } catch (error) {
          console.warn("photo_markers_icon_expression_failed", {
            layer: config.symbolLayerId,
            error,
          });
        }
      }
    };

    const collectPending = (configs: LayerConfig[]) => {
      const byCategory = new Map<PhotoMarkerCategory, MarkerThumbnailRequest[]>();
      for (const config of configs) {
        if (!config.enabled) continue;
        const requests: MarkerThumbnailRequest[] = [];
        if (config.loadAllApiIds) {
          for (const id of config.loadAllApiIds) {
            requests.push({ category: config.category, id });
          }
          statsRef.current[config.category].eligible = config.loadAllApiIds.length;
        } else {
          const visible = collectViewportRequests(map, config);
          statsRef.current[config.category].eligible = Math.max(
            statsRef.current[config.category].eligible,
            visible.length,
          );
          requests.push(...visible);
        }
        const pending = requests.filter((item) => {
          const key = requestKey(item);
          if (completedKeysRef.current.has(key)) return false;
          if (missingUrlKeysRef.current.has(key)) return false;
          return true;
        });
        if (pending.length > 0) {
          byCategory.set(config.category, pending);
        }
      }

      // Fair share across categories so capitals do not starve UNESCO/EHL/etc.
      const selected: MarkerThumbnailRequest[] = [];
      const queues = [...byCategory.values()].map((items) => [...items]);
      while (selected.length < 100 && queues.some((q) => q.length > 0)) {
        for (const queue of queues) {
          if (selected.length >= 100) break;
          const next = queue.shift();
          if (next) selected.push(next);
        }
      }
      return selected;
    };

    const logSummaryOnce = () => {
      if (loggedSummaryRef.current) return;
      if (process.env.NODE_ENV === "production") return;
      loggedSummaryRef.current = true;
      const stats = statsRef.current;
      const counters = countersRef.current;
      // Single compact development summary (not per-image).
      console.info(
        [
          "PHOTO MARKERS",
          `capital: eligible=${stats.capital.eligible} resolved=${stats.capital.resolved} loaded=${stats.capital.loaded} added=${stats.capital.added} fallback=${stats.capital.fallback}`,
          `tourism: eligible=${stats.tourist.eligible} resolved=${stats.tourist.resolved} loaded=${stats.tourist.loaded} added=${stats.tourist.added} fallback=${stats.tourist.fallback}`,
          `unesco: eligible=${stats.unesco.eligible} resolved=${stats.unesco.resolved} loaded=${stats.unesco.loaded} added=${stats.unesco.added} fallback=${stats.unesco.fallback}`,
          `ehl: eligible=${stats.ehl.eligible} resolved=${stats.ehl.resolved} loaded=${stats.ehl.loaded} added=${stats.ehl.added} fallback=${stats.ehl.fallback}`,
          `engineering: eligible=${stats.civil.eligible} resolved=${stats.civil.resolved} loaded=${stats.civil.loaded} added=${stats.civil.added} fallback=${stats.civil.fallback}`,
          `abortedRuns=${counters.abortedRuns} completedRuns=${counters.completedRuns} failedImages=${counters.failedImages}`,
        ].join("\n"),
      );
    };

    const scheduleIdlePrefetch = (configs: LayerConfig[]) => {
      const capitalConfig = configs.find(
        (config) => config.category === "capital" && config.enabled,
      );
      if (!capitalConfig?.loadAllApiIds?.length) return;

      const prefetchKeys = capitalConfig.loadAllApiIds
        .map((id) => ({ category: "capital" as const, id }))
        .filter((item) => {
          const key = requestKey(item);
          return (
            !completedKeysRef.current.has(key) &&
            !missingUrlKeysRef.current.has(key)
          );
        })
        .slice(0, 27);

      if (prefetchKeys.length === 0) return;

      const runPrefetch = () => {
        void (async () => {
          try {
            const results = await fetchThumbnails(
              prefetchKeys,
              optionsRef.current.locale,
              new AbortController().signal,
            );
            await Promise.allSettled(
              results.map(async (result) => {
                if (!result.thumbnail.url) {
                  missingUrlKeysRef.current.add(requestKey(result));
                  return;
                }
                await sharedPhotoMarkerRegistry.ensure(map, {
                  category: result.category,
                  entityId: result.id,
                  remoteUrl: result.thumbnail.url,
                  priority: "prefetch",
                });
              }),
            );
          } catch (error) {
            if (isAbortError(error) || isNetworkFetchError(error)) return;
            console.error("photo_markers_prefetch_failed", error);
          }
        })();
      };

      const ric = (
        window as Window & {
          requestIdleCallback?: (
            cb: () => void,
            opts?: { timeout: number },
          ) => number;
        }
      ).requestIdleCallback;
      if (typeof ric === "function") {
        ric(runPrefetch, { timeout: 2500 });
      } else {
        window.setTimeout(runPrefetch, 600);
      }
    };

    const run = async (signature: string) => {
      if (runningSignatureRef.current === signature) {
        return;
      }

      const generation = ++generationRef.current;
      const previous = controllerRef.current;
      if (previous && !previous.signal.aborted) {
        countersRef.current.abortedRuns += 1;
        previous.abort();
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      runningSignatureRef.current = signature;

      try {
        const configs = getConfigs();
        applyIconExpressions(configs);
        sharedPhotoMarkerRegistry.rebindReadyImages(map);
        const pending = collectPending(configs);
        if (pending.length === 0) {
          countersRef.current.completedRuns += 1;
          logSummaryOnce();
          return;
        }

        const results = await fetchThumbnails(
          pending,
          optionsRef.current.locale,
          controller.signal,
        );

        if (
          controller.signal.aborted ||
          generation !== generationRef.current
        ) {
          return;
        }

        const bindingsByCategory = new Map<
          PhotoMarkerCategory,
          Array<{ result: ThumbnailResult; imageId: string }>
        >();

        const loadSettled = await Promise.allSettled(
          results.map(async (result) => {
            const key = requestKey(result);
            const stats = statsRef.current[result.category];

            if (!result.thumbnail.url) {
              missingUrlKeysRef.current.add(key);
              stats.fallback += 1;
              return null;
            }

            stats.resolved += 1;

            const imageEntityId = result.locationId ?? result.id;
            const imageId = await sharedPhotoMarkerRegistry.ensure(map, {
              category: result.category,
              entityId: imageEntityId,
              remoteUrl: result.thumbnail.url,
              signal: controller.signal,
              priority: "visible",
            });

            if (!imageId) {
              if (!controller.signal.aborted) {
                countersRef.current.failedImages += 1;
                // Soft failure: registry keeps a short negative cache.
              }
              return null;
            }

            stats.loaded += 1;
            return { result, imageId, key };
          }),
        );

        if (
          controller.signal.aborted ||
          generation !== generationRef.current
        ) {
          return;
        }

        for (const settled of loadSettled) {
          if (settled.status !== "fulfilled" || !settled.value) continue;
          const { result, imageId, key } = settled.value;
          const list = bindingsByCategory.get(result.category) ?? [];
          list.push({ result, imageId });
          bindingsByCategory.set(result.category, list);
          completedKeysRef.current.add(key);
          statsRef.current[result.category].added += 1;
        }

        for (const config of configs) {
          const bindings = bindingsByCategory.get(config.category);
          if (!bindings?.length) continue;
          applyPhotoBindings(map, config, bindings);
        }

        countersRef.current.completedRuns += 1;

        const stillPending = collectPending(configs);
        if (stillPending.length > 0 && retryAttemptsRef.current < 5) {
          retryAttemptsRef.current += 1;
          sharedPhotoMarkerRegistry.clearFailures();
          lastScheduledSignatureRef.current = null;
          if (retryTimeoutId != null) window.clearTimeout(retryTimeoutId);
          retryTimeoutId = window.setTimeout(() => {
            schedule();
          }, 800 * retryAttemptsRef.current);
        } else {
          if (stillPending.length > 0) {
            for (const item of stillPending) {
              missingUrlKeysRef.current.add(requestKey(item));
              statsRef.current[item.category].fallback += 1;
            }
          }
          logSummaryOnce();
          scheduleIdlePrefetch(configs);
        }
      } catch (error) {
        if (isAbortError(error)) {
          countersRef.current.abortedRuns += 1;
          return;
        }
        if (isNetworkFetchError(error)) {
          // Degrade silently — markers keep fallback icons until next schedule.
          return;
        }
        console.error("photo_markers_run_failed", error);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        if (runningSignatureRef.current === signature) {
          runningSignatureRef.current = null;
        }
      }
    };

    let timeoutId: number | null = null;
    let retryTimeoutId: number | null = null;
    const schedule = () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const configs = getConfigs();
        const enabled = configs
          .filter((item) => item.enabled)
          .map((item) => item.category);
        if (enabled.length === 0) return;

        applyIconExpressions(configs);
        sharedPhotoMarkerRegistry.rebindReadyImages(map);
        const pending = collectPending(configs);
        const pendingKeys = pending.map(requestKey);
        const styleGeneration =
          typeof (map as { _styleGeneration?: number })._styleGeneration ===
          "number"
            ? (map as { _styleGeneration?: number })._styleGeneration!
            : options.mapReadyVersion;
        const signature = buildSignature(
          enabled,
          pendingKeys,
          styleGeneration,
        );

        if (
          signature === lastScheduledSignatureRef.current &&
          runningSignatureRef.current === signature
        ) {
          return;
        }
        if (
          signature === lastScheduledSignatureRef.current &&
          pendingKeys.length === 0
        ) {
          return;
        }

        lastScheduledSignatureRef.current = signature;
        void run(signature);
      }, 450);
    };

    schedule();
    map.on("moveend", schedule);
    map.on("zoomend", schedule);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      if (retryTimeoutId != null) window.clearTimeout(retryTimeoutId);
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
      generationRef.current += 1;
      const active = controllerRef.current;
      if (active && !active.signal.aborted) {
        countersRef.current.abortedRuns += 1;
        active.abort();
      }
      controllerRef.current = null;
      runningSignatureRef.current = null;
    };
  }, [
    options.mapRef,
    options.mapReadyVersion,
    options.locale,
    options.showEuCapitals,
    options.showMajorTouristPlaces,
    options.showUnescoWorldHeritage,
    options.showEuropeanHeritageLabel,
    options.showMajorCivilEngineeringWorks,
  ]);
}

export { photoMarkerImageId, isAbortError };
