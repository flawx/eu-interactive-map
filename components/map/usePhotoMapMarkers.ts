"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Locale } from "@/lib/i18n/config";
import { EU_CAPITALS } from "@/lib/europe/euCapitals";
import { sharedPhotoMarkerRegistry } from "@/lib/map/photoMarkers";
import type { PhotoMarkerCategory, MarkerThumbnailRequest } from "@/lib/map/mapMarkerThumbnail";

type LayerConfig = {
  category: PhotoMarkerCategory;
  enabled: boolean;
  sourceId: string;
  symbolLayerId: string;
  /** Feature id used by MapLibre promoteId / setFeatureState. */
  featureStateIdProperty: string;
  /** Entity id sent to the thumbnail API. */
  apiIdProperty: string;
  locationIdProperty?: string;
  loadAllApiIds?: string[];
  fallbackIconExpression: unknown;
};

async function fetchThumbnails(
  items: MarkerThumbnailRequest[],
  locale: Locale,
  signal: AbortSignal,
) {
  if (items.length === 0) return [];
  const response = await fetch("/api/map/marker-thumbnails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale, items }),
    signal,
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as {
    results?: Array<{
      category: PhotoMarkerCategory;
      id: string;
      locationId?: string | null;
      thumbnail: { url: string | null };
    }>;
  };
  return payload.results ?? [];
}

function collectVisibleRequests(
  map: MapLibreMap,
  config: LayerConfig,
): MarkerThumbnailRequest[] {
  if (!map.getLayer(config.symbolLayerId)) return [];
  const features = map.queryRenderedFeatures({
    layers: [config.symbolLayerId],
  });
  const seen = new Set<string>();
  const items: MarkerThumbnailRequest[] = [];
  for (const feature of features) {
    const apiId = feature.properties?.[config.apiIdProperty];
    if (typeof apiId !== "string" || !apiId) continue;
    const locationId = config.locationIdProperty
      ? feature.properties?.[config.locationIdProperty]
      : null;
    const key =
      typeof locationId === "string" && locationId
        ? `${config.category}:${apiId}:${locationId}`
        : `${config.category}:${apiId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      category: config.category,
      id: apiId,
      locationId: typeof locationId === "string" ? locationId : null,
    });
  }
  return items;
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
  const loadedKeysRef = useRef(new Set<string>());

  useEffect(() => {
    const map = options.mapRef.current;
    if (!map || options.mapReadyVersion === 0) return;

    const configs: LayerConfig[] = [
      {
        category: "capital",
        enabled: options.showEuCapitals,
        sourceId: "eu-capitals",
        symbolLayerId: "eu-capitals-symbol",
        featureStateIdProperty: "capitalId",
        apiIdProperty: "capitalId",
        loadAllApiIds: EU_CAPITALS.map((item) => item.id),
        fallbackIconExpression: "eu-capital-icon",
      },
      {
        category: "tourist",
        enabled: options.showMajorTouristPlaces,
        sourceId: "major-tourist-places",
        symbolLayerId: "tourist-places-symbol",
        featureStateIdProperty: "placeId",
        apiIdProperty: "placeId",
        fallbackIconExpression: ["get", "iconImageId"],
      },
      {
        category: "unesco",
        enabled: options.showUnescoWorldHeritage,
        sourceId: "unesco-world-heritage-sites",
        symbolLayerId: "unesco-world-heritage-symbol",
        featureStateIdProperty: "siteId",
        apiIdProperty: "siteId",
        fallbackIconExpression: ["get", "iconImageId"],
      },
      {
        category: "ehl",
        enabled: options.showEuropeanHeritageLabel,
        sourceId: "european-heritage-label-sites",
        symbolLayerId: "ehl-sites-symbol",
        featureStateIdProperty: "locationId",
        apiIdProperty: "siteId",
        locationIdProperty: "locationId",
        fallbackIconExpression: ["get", "iconImageId"],
      },
      {
        category: "civil",
        enabled: options.showMajorCivilEngineeringWorks,
        sourceId: "major-civil-engineering-works",
        symbolLayerId: "civil-engineering-symbol",
        featureStateIdProperty: "workId",
        apiIdProperty: "workId",
        fallbackIconExpression: ["get", "iconImageId"],
      },
    ];

    for (const config of configs) {
      if (!map.getLayer(config.symbolLayerId)) continue;
      const photoExpression = [
        "coalesce",
        ["feature-state", "photoIconId"],
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
      } catch {
        // Layer may not accept the expression yet.
      }
    }

    const run = async () => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      const requests: MarkerThumbnailRequest[] = [];
      for (const config of configs) {
        if (!config.enabled) continue;
        if (config.loadAllApiIds) {
          for (const id of config.loadAllApiIds) {
            requests.push({ category: config.category, id });
          }
        } else {
          requests.push(...collectVisibleRequests(map, config));
        }
      }

      const pending = requests.filter((item) => {
        const cacheKey = item.locationId
          ? `${item.category}:${item.id}:${item.locationId}`
          : `${item.category}:${item.id}`;
        return !loadedKeysRef.current.has(cacheKey);
      });
      if (pending.length === 0) return;

      const results = await fetchThumbnails(
        pending,
        options.locale,
        controller.signal,
      );

      for (const result of results) {
        const cacheKey = result.locationId
          ? `${result.category}:${result.id}:${result.locationId}`
          : `${result.category}:${result.id}`;
        loadedKeysRef.current.add(cacheKey);

        const config = configs.find((item) => item.category === result.category);
        if (!config || !result.thumbnail.url) continue;

        const imageEntityId = result.locationId ?? result.id;
        const imageId = await sharedPhotoMarkerRegistry.ensure(map, {
          category: result.category,
          entityId: imageEntityId,
          remoteUrl: result.thumbnail.url,
          signal: controller.signal,
        });
        if (!imageId) continue;

        const featureId =
          config.featureStateIdProperty === "locationId"
            ? result.locationId ?? result.id
            : result.id;

        try {
          map.setFeatureState(
            { source: config.sourceId, id: featureId },
            { photoIconId: imageId },
          );
        } catch {
          // Feature may be clustered or not yet in source.
        }
      }
    };

    let timeoutId: number | null = null;
    const schedule = () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void run();
      }, 400);
    };

    schedule();
    map.on("moveend", schedule);
    map.on("zoomend", schedule);

    return () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
      controllerRef.current?.abort();
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
