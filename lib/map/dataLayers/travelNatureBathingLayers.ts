/**
 * MapLibre layer wiring for the "Tourism Travel V2" commit-2 nature /
 * beaches datasets:
 *   - Natura 2000: raster WMS overlay from the EEA `Natura2000_Dyna_WM`
 *     service (the service's own scale-dependent renderer decides what's
 *     visible at low/medium zoom). High-zoom click/identify is handled
 *     separately by the caller via `/api/travel/natura2000` (raster layers
 *     aren't natively clickable in MapLibre) — see `MapContainer.tsx`.
 *   - Major Beaches & Seaside Resorts: small curated dataset, not clustered.
 *
 * Mirrors `travelVisitorServicesLayers.ts`.
 */

import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";

import { toFeatureCollection as buildMajorBeachesCollection } from "@/lib/travel/majorBeaches";

export const NATURA2000_RASTER_SOURCE_ID = "natura2000-raster-source";
export const NATURA2000_RASTER_LAYER_ID = "natura2000-raster";
export const MAJOR_BEACHES_SOURCE_ID = "major-beaches-seaside-resorts";

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
  showMajorBeachesSeasideResorts: boolean;
  selectedBeachId: string | null;
};

/**
 * Adds sources/layers for the commit-2 nature/beaches datasets if they don't
 * already exist. Safe to call repeatedly (e.g. on every `style.load`).
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
  for (const layerId of MAJOR_BEACHES_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        options.showMajorBeachesSeasideResorts ? "visible" : "none",
      );
    }
  }
}

export function updateTravelNatureBathingSelection(
  map: MapLibreMap,
  options: { selectedBeachId: string | null },
): void {
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
  onBeachClick: (event: MapLayerMouseEvent) => void;
};

/** Attaches click / hover listeners; returns a cleanup function. */
export function attachTravelNatureBathingHandlers(
  map: MapLibreMap,
  handlers: TravelNatureBathingClickHandlers,
  setPointerCursor: () => void,
  resetCursor: () => void,
): () => void {
  const interactiveLayers: Array<
    [string, (event: MapLayerMouseEvent) => void]
  > = [["major-beaches-symbol", handlers.onBeachClick]];

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
