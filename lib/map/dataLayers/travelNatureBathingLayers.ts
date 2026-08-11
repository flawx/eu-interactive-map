/**
 * MapLibre layer wiring for the "Tourism Travel V2" commit-2 nature /
 * bathing / beaches datasets:
 *   - Natura 2000: raster WMS overlay from the EEA `Natura2000_Dyna_WM`
 *     service (the service's own scale-dependent renderer decides what's
 *     visible at low/medium zoom). High-zoom click/identify is handled
 *     separately by the caller via `/api/travel/natura2000` (raster layers
 *     aren't natively clickable in MapLibre) — see `MapContainer.tsx`.
 *   - European Bathing Waters: clustered, viewport-loaded from
 *     `/api/travel/bathing-waters` (~22k EEA sites, never bundled whole).
 *   - Major Beaches & Seaside Resorts: small curated dataset, not clustered.
 *
 * Mirrors `travelVisitorServicesLayers.ts`.
 */

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";

import { toFeatureCollection as buildMajorBeachesCollection } from "@/lib/travel/majorBeaches";
import { BATHING_WATER_CLASSIFICATION_COLORS } from "@/lib/travel/bathingWaters/types";
import {
  createViewportDataLoader,
  type ViewportBbox,
  type ViewportDataLoader,
} from "@/lib/map/dataLayers/viewportDataLoader";

export const NATURA2000_RASTER_SOURCE_ID = "natura2000-raster-source";
export const NATURA2000_RASTER_LAYER_ID = "natura2000-raster";
export const BATHING_WATERS_SOURCE_ID = "european-bathing-waters";
export const MAJOR_BEACHES_SOURCE_ID = "major-beaches-seaside-resorts";

export const BATHING_WATERS_LAYER_IDS = [
  "bathing-waters-clusters",
  "bathing-waters-cluster-count",
  "bathing-waters-halo",
  "bathing-waters-symbol",
] as const;

export const MAJOR_BEACHES_LAYER_IDS = [
  "major-beaches-halo",
  "major-beaches-symbol",
  "major-beaches-label",
] as const;

/**
 * EEA `Natura2000_Dyna_WM` WMS endpoint. Layer numbers `4,8` are a
 * best-effort selection targeting the service's habitat-directive (SAC/SCI)
 * and bird-directive (SPA) sublayer groups at raster-appropriate zoom —
 * documented as an approximation since the service's exact layer indices
 * were not independently re-verified for this release.
 */
const NATURA2000_WMS_BASE_URL =
  "https://bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/Natura2000_Dyna_WM/MapServer/WMSServer";
const NATURA2000_WMS_LAYERS = "4,8";

function buildNatura2000WmsTileUrl(): string {
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    layers: NATURA2000_WMS_LAYERS,
    styles: "",
    format: "image/png",
    transparent: "true",
    srs: "EPSG:3857",
    width: "256",
    height: "256",
  });
  return `${NATURA2000_WMS_BASE_URL}?${params.toString()}&bbox={bbox-epsg-3857}`;
}

const EMPTY_COLLECTION: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

function entitySelectionRadiusExpression(
  selectedId: string | null,
  selectedRadius: number,
  defaultRadius: number,
): ["case", ["==", ["get", "id"], string], number, number] {
  return [
    "case",
    ["==", ["get", "id"], selectedId ?? ""],
    selectedRadius,
    defaultRadius,
  ];
}

export type TravelNatureBathingLayerOptions = {
  showNatura2000: boolean;
  showEuropeanBathingWaters: boolean;
  showMajorBeachesSeasideResorts: boolean;
  selectedBathingWaterSiteId: string | null;
  selectedBeachId: string | null;
};

/**
 * Adds sources/layers for the commit-2 nature/bathing/beaches datasets if
 * they don't already exist. Safe to call repeatedly (e.g. on every
 * `style.load`). The bathing waters source starts empty — populated
 * client-side by `createBathingWaterViewportLoader` once switched on.
 */
export function ensureTravelNatureBathingLayers(
  map: MapLibreMap,
  options: TravelNatureBathingLayerOptions,
): void {
  // --- Natura 2000 (raster WMS, below traffic — added first / lowest) ---
  if (!map.getSource(NATURA2000_RASTER_SOURCE_ID)) {
    map.addSource(NATURA2000_RASTER_SOURCE_ID, {
      type: "raster",
      tiles: [buildNatura2000WmsTileUrl()],
      tileSize: 256,
      attribution: "European Environment Agency — Natura 2000",
    });
  }

  if (!map.getLayer(NATURA2000_RASTER_LAYER_ID)) {
    map.addLayer({
      id: NATURA2000_RASTER_LAYER_ID,
      type: "raster",
      source: NATURA2000_RASTER_SOURCE_ID,
      layout: {
        visibility: options.showNatura2000 ? "visible" : "none",
      },
      paint: {
        "raster-opacity": 0.55,
      },
    });
  }

  // --- European Bathing Waters (clustered, viewport-loaded) ---
  if (!map.getSource(BATHING_WATERS_SOURCE_ID)) {
    map.addSource(BATHING_WATERS_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_COLLECTION,
      promoteId: "id",
      cluster: true,
      clusterMaxZoom: 12,
      clusterRadius: 50,
    });
  }

  if (!map.getLayer("bathing-waters-clusters")) {
    map.addLayer({
      id: "bathing-waters-clusters",
      type: "circle",
      source: BATHING_WATERS_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showEuropeanBathingWaters ? "visible" : "none",
      },
      paint: {
        "circle-color": "#0891b2",
        "circle-opacity": 0.85,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-radius": ["step", ["get", "point_count"], 14, 8, 18, 20, 22],
      },
    });
  }

  if (!map.getLayer("bathing-waters-cluster-count")) {
    map.addLayer({
      id: "bathing-waters-cluster-count",
      type: "symbol",
      source: BATHING_WATERS_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showEuropeanBathingWaters ? "visible" : "none",
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["Noto Sans Bold"],
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  if (!map.getLayer("bathing-waters-halo")) {
    map.addLayer({
      id: "bathing-waters-halo",
      type: "circle",
      source: BATHING_WATERS_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 3,
      layout: {
        visibility: options.showEuropeanBathingWaters ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedBathingWaterSiteId,
          18,
          14,
        ),
        "circle-color": ["get", "color"],
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("bathing-waters-symbol")) {
    map.addLayer({
      id: "bathing-waters-symbol",
      type: "circle",
      source: BATHING_WATERS_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 3,
      layout: {
        visibility: options.showEuropeanBathingWaters ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedBathingWaterSiteId,
          8,
          6,
        ),
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  // --- Major Beaches & Seaside Resorts (small curated dataset) ---
  if (!map.getSource(MAJOR_BEACHES_SOURCE_ID)) {
    map.addSource(MAJOR_BEACHES_SOURCE_ID, {
      type: "geojson",
      data: buildMajorBeachesCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("major-beaches-halo")) {
    map.addLayer({
      id: "major-beaches-halo",
      type: "circle",
      source: MAJOR_BEACHES_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showMajorBeachesSeasideResorts ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedBeachId,
          18,
          14,
        ),
        "circle-color": "#38bdf8",
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("major-beaches-symbol")) {
    map.addLayer({
      id: "major-beaches-symbol",
      type: "circle",
      source: MAJOR_BEACHES_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showMajorBeachesSeasideResorts ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedBeachId,
          8,
          6,
        ),
        "circle-color": "#0284c7",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer("major-beaches-label")) {
    map.addLayer({
      id: "major-beaches-label",
      type: "symbol",
      source: MAJOR_BEACHES_SOURCE_ID,
      minzoom: 6,
      layout: {
        visibility: options.showMajorBeachesSeasideResorts ? "visible" : "none",
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-optional": true,
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#0284c7",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }
}

export function setTravelNatureBathingVisibility(
  map: MapLibreMap,
  options: {
    showNatura2000: boolean;
    showEuropeanBathingWaters: boolean;
    showMajorBeachesSeasideResorts: boolean;
  },
): void {
  if (map.getLayer(NATURA2000_RASTER_LAYER_ID)) {
    map.setLayoutProperty(
      NATURA2000_RASTER_LAYER_ID,
      "visibility",
      options.showNatura2000 ? "visible" : "none",
    );
  }
  const groups: Array<[readonly string[], boolean]> = [
    [BATHING_WATERS_LAYER_IDS, options.showEuropeanBathingWaters],
    [MAJOR_BEACHES_LAYER_IDS, options.showMajorBeachesSeasideResorts],
  ];
  for (const [layerIds, visible] of groups) {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          visible ? "visible" : "none",
        );
      }
    }
  }
}

export function updateTravelNatureBathingSelection(
  map: MapLibreMap,
  options: {
    selectedBathingWaterSiteId: string | null;
    selectedBeachId: string | null;
  },
): void {
  if (map.getLayer("bathing-waters-halo")) {
    map.setPaintProperty(
      "bathing-waters-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedBathingWaterSiteId, 18, 14),
    );
  }
  if (map.getLayer("bathing-waters-symbol")) {
    map.setPaintProperty(
      "bathing-waters-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedBathingWaterSiteId, 8, 6),
    );
  }
  if (map.getLayer("major-beaches-halo")) {
    map.setPaintProperty(
      "major-beaches-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedBeachId, 18, 14),
    );
  }
  if (map.getLayer("major-beaches-symbol")) {
    map.setPaintProperty(
      "major-beaches-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedBeachId, 8, 6),
    );
  }
}

export type TravelNatureBathingClickHandlers = {
  onBathingWaterSiteClick: (event: MapLayerMouseEvent) => void;
  onBathingWaterClusterClick: (event: MapLayerMouseEvent) => void;
  onBeachClick: (event: MapLayerMouseEvent) => void;
};

function createClusterClickHandler(
  map: MapLibreMap,
  sourceId: string,
  fallback: (event: MapLayerMouseEvent) => void,
) {
  return async (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    if (
      !feature ||
      feature.geometry.type !== "Point" ||
      !source ||
      !Number.isFinite(clusterId)
    ) {
      fallback(event);
      return;
    }
    const zoom = await source.getClusterExpansionZoom(clusterId);
    map.easeTo({
      center: feature.geometry.coordinates as [number, number],
      zoom,
      duration: 650,
    });
  };
}

/** Attaches click / hover listeners; returns a cleanup function. */
export function attachTravelNatureBathingHandlers(
  map: MapLibreMap,
  handlers: TravelNatureBathingClickHandlers,
  setPointerCursor: () => void,
  resetCursor: () => void,
): () => void {
  const bathingClusterHandler = createClusterClickHandler(
    map,
    BATHING_WATERS_SOURCE_ID,
    handlers.onBathingWaterClusterClick,
  );

  const interactiveLayers: Array<
    [string, (event: MapLayerMouseEvent) => void]
  > = [
    ["bathing-waters-clusters", bathingClusterHandler],
    ["bathing-waters-symbol", handlers.onBathingWaterSiteClick],
    ["major-beaches-symbol", handlers.onBeachClick],
  ];

  for (const [layerId, handler] of interactiveLayers) {
    map.on("click", layerId, handler);
    map.on("mouseenter", layerId, setPointerCursor);
    map.on("mouseleave", layerId, resetCursor);
  }

  return () => {
    for (const [layerId, handler] of interactiveLayers) {
      map.off("click", layerId, handler);
      map.off("mouseenter", layerId, setPointerCursor);
      map.off("mouseleave", layerId, resetCursor);
    }
  };
}

export type BathingWaterViewportLoaderHandle = {
  requestViewport: (bbox: ViewportBbox, zoom: number) => void;
  cancel: () => void;
  destroy: () => void;
};

/**
 * Client-side viewport loader for European Bathing Waters — fetches
 * `/api/travel/bathing-waters` scoped to the current map bbox and pushes
 * the result into the source. Caller must only call `requestViewport`
 * while the layer is ON, and `cancel()` when it's switched off.
 */
export function createBathingWaterViewportLoader(
  map: MapLibreMap,
): BathingWaterViewportLoaderHandle {
  const loader: ViewportDataLoader<GeoJSON.FeatureCollection, Record<string, never>> =
    createViewportDataLoader<GeoJSON.FeatureCollection>({
      fetchUrl: (bbox) =>
        `/api/travel/bathing-waters?bbox=${bbox.join(",")}&limit=500`,
      buildKey: (bbox) => bbox.join(","),
      onData: (data) => {
        const source = map.getSource(BATHING_WATERS_SOURCE_ID) as
          | GeoJSONSource
          | undefined;
        source?.setData(data);
      },
      onError: (error) => {
        // eslint-disable-next-line no-console
        console.error("European Bathing Waters viewport request failed", error);
      },
      debounceMs: 300,
      ttlMs: 45_000,
    });

  return {
    requestViewport: (bbox, zoom) => loader.requestViewport(bbox, zoom),
    cancel: loader.cancel,
    destroy: loader.destroy,
  };
}

export { BATHING_WATER_CLASSIFICATION_COLORS };
