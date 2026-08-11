/**
 * MapLibre layer wiring for the "Tourism Travel V2" commit-3 outdoor route
 * datasets (hiking, cycling) — small curated LineString sources, each with
 * its own source/layer set so hiking/cycling can be toggled independently.
 * Mirrors `travelNatureBathingLayers.ts`.
 */

import type { Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";

import { HIKING_ROUTES } from "@/lib/travel/outdoorRoutes/hikingRoutes";
import { CYCLING_ROUTES } from "@/lib/travel/outdoorRoutes/cyclingRoutes";
import {
  OUTDOOR_ROUTE_COLORS,
  outdoorRoutesToFeatureCollection,
  type OutdoorRoute,
  type OutdoorRouteType,
} from "@/lib/travel/outdoorRoutes/types";

export const OUTDOOR_HIKING_SOURCE_ID = "outdoor-hiking-routes-line";
export const OUTDOOR_CYCLING_SOURCE_ID = "outdoor-cycling-routes-line";

type ActiveOutdoorRouteType = Extract<OutdoorRouteType, "hiking" | "cycling">;

const ROUTE_LAYER_CONFIG: Record<
  ActiveOutdoorRouteType,
  { sourceId: string; lineLayerId: string; haloLayerId: string; routes: readonly OutdoorRoute[] }
> = {
  hiking: {
    sourceId: OUTDOOR_HIKING_SOURCE_ID,
    lineLayerId: "outdoor-hiking-routes-line-layer",
    haloLayerId: "outdoor-hiking-routes-halo",
    routes: HIKING_ROUTES,
  },
  cycling: {
    sourceId: OUTDOOR_CYCLING_SOURCE_ID,
    lineLayerId: "outdoor-cycling-routes-line-layer",
    haloLayerId: "outdoor-cycling-routes-halo",
    routes: CYCLING_ROUTES,
  },
};

const ACTIVE_ROUTE_TYPES = Object.keys(
  ROUTE_LAYER_CONFIG,
) as ActiveOutdoorRouteType[];

export const ALL_OUTDOOR_ROUTES: readonly OutdoorRoute[] = [
  ...HIKING_ROUTES,
  ...CYCLING_ROUTES,
];

export function getOutdoorRouteById(id: string): OutdoorRoute | undefined {
  return ALL_OUTDOOR_ROUTES.find((route) => route.id === id);
}

export type OutdoorRoutesLayerOptions = {
  showMajorHikingRoutes: boolean;
  showMajorCyclingRoutes: boolean;
  selectedOutdoorRouteId: string | null;
};

function selectionWidthExpression(
  selectedId: string | null,
  selectedWidth: number,
  defaultWidth: number,
): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    4,
    ["case", ["==", ["get", "id"], selectedId ?? ""], selectedWidth * 0.6, defaultWidth * 0.6],
    9,
    ["case", ["==", ["get", "id"], selectedId ?? ""], selectedWidth, defaultWidth],
    14,
    ["case", ["==", ["get", "id"], selectedId ?? ""], selectedWidth * 1.6, defaultWidth * 1.6],
  ];
}

function visibilityFor(
  type: ActiveOutdoorRouteType,
  options: Pick<
    OutdoorRoutesLayerOptions,
    "showMajorHikingRoutes" | "showMajorCyclingRoutes"
  >,
): boolean {
  if (type === "hiking") return options.showMajorHikingRoutes;
  return options.showMajorCyclingRoutes;
}

/**
 * Adds sources/layers for hiking and cycling route types if they don't
 * already exist. Safe to call repeatedly (e.g. on every `style.load`).
 */
export function ensureOutdoorRoutesLayers(
  map: MapLibreMap,
  options: OutdoorRoutesLayerOptions,
): void {
  for (const type of ACTIVE_ROUTE_TYPES) {
    const config = ROUTE_LAYER_CONFIG[type];
    const visible = visibilityFor(type, options);
    const color = OUTDOOR_ROUTE_COLORS[type];

    if (!map.getSource(config.sourceId)) {
      map.addSource(config.sourceId, {
        type: "geojson",
        data: outdoorRoutesToFeatureCollection(config.routes),
        promoteId: "id",
      });
    }

    if (!map.getLayer(config.haloLayerId)) {
      map.addLayer({
        id: config.haloLayerId,
        type: "line",
        source: config.sourceId,
        layout: {
          visibility: visible ? "visible" : "none",
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-opacity": 0.55,
          "line-width": selectionWidthExpression(
            options.selectedOutdoorRouteId,
            8,
            5,
          ) as never,
        },
      });
    }

    if (!map.getLayer(config.lineLayerId)) {
      map.addLayer({
        id: config.lineLayerId,
        type: "line",
        source: config.sourceId,
        layout: {
          visibility: visible ? "visible" : "none",
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": color,
          "line-width": selectionWidthExpression(
            options.selectedOutdoorRouteId,
            4,
            2.5,
          ) as never,
        },
      });
    }
  }
}

export function setOutdoorRoutesVisibility(
  map: MapLibreMap,
  options: Pick<
    OutdoorRoutesLayerOptions,
    "showMajorHikingRoutes" | "showMajorCyclingRoutes"
  >,
): void {
  for (const type of ACTIVE_ROUTE_TYPES) {
    const config = ROUTE_LAYER_CONFIG[type];
    const visible = visibilityFor(type, options);
    for (const layerId of [config.haloLayerId, config.lineLayerId]) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    }
  }
}

export function updateOutdoorRoutesSelection(
  map: MapLibreMap,
  options: { selectedOutdoorRouteId: string | null },
): void {
  for (const type of ACTIVE_ROUTE_TYPES) {
    const config = ROUTE_LAYER_CONFIG[type];
    if (map.getLayer(config.haloLayerId)) {
      map.setPaintProperty(
        config.haloLayerId,
        "line-width",
        selectionWidthExpression(options.selectedOutdoorRouteId, 8, 5) as never,
      );
    }
    if (map.getLayer(config.lineLayerId)) {
      map.setPaintProperty(
        config.lineLayerId,
        "line-width",
        selectionWidthExpression(options.selectedOutdoorRouteId, 4, 2.5) as never,
      );
    }
  }
}

export type OutdoorRoutesClickHandlers = {
  onRouteClick: (event: MapLayerMouseEvent) => void;
};

/** Attaches click / hover listeners across route line layers; returns a cleanup function. */
export function attachOutdoorRoutesHandlers(
  map: MapLibreMap,
  handlers: OutdoorRoutesClickHandlers,
  setPointerCursor: () => void,
  resetCursor: () => void,
): () => void {
  const layerIds = Object.values(ROUTE_LAYER_CONFIG).map((config) => config.lineLayerId);

  for (const layerId of layerIds) {
    map.on("click", layerId, handlers.onRouteClick);
    map.on("mouseenter", layerId, setPointerCursor);
    map.on("mouseleave", layerId, resetCursor);
  }

  return () => {
    for (const layerId of layerIds) {
      map.off("click", layerId, handlers.onRouteClick);
      map.off("mouseenter", layerId, setPointerCursor);
      map.off("mouseleave", layerId, resetCursor);
    }
  };
}

export const OUTDOOR_ROUTES_LINE_LAYER_IDS: readonly string[] = Object.values(
  ROUTE_LAYER_CONFIG,
).flatMap((config) => [config.haloLayerId, config.lineLayerId]);
