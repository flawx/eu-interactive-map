"use client";

import { useEffect } from "react";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import type { NormalizedRoute } from "@/lib/routing/types";
import { trafficSectionColor } from "@/lib/routing/formatRoute";
import { ensureEUIMLayerOrder } from "@/lib/map/ensureEUIMLayerOrder";
import {
  ROUTE_PLANNER_ALT_SOURCE_ID,
  ROUTE_PLANNER_LAYER_ALT,
  ROUTE_PLANNER_LAYER_HALO,
  ROUTE_PLANNER_LAYER_MAIN,
  ROUTE_PLANNER_LAYER_POINT_LABELS,
  ROUTE_PLANNER_LAYER_POINTS,
  ROUTE_PLANNER_LAYER_TRAFFIC,
  ROUTE_PLANNER_POINTS_SOURCE_ID,
  ROUTE_PLANNER_SOURCE_ID,
  ROUTE_PLANNER_TRAFFIC_SOURCE_ID,
  type RoutePlannerMapPoint,
} from "@/lib/routing/routeMapLayers";

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

const ROUTE_LAYER_ORDER = [
  ROUTE_PLANNER_LAYER_ALT,
  ROUTE_PLANNER_LAYER_HALO,
  ROUTE_PLANNER_LAYER_MAIN,
  ROUTE_PLANNER_LAYER_TRAFFIC,
  ROUTE_PLANNER_LAYER_POINTS,
  ROUTE_PLANNER_LAYER_POINT_LABELS,
] as const;

const LINE_WIDTH_MAIN: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  3,
  8,
  5,
  12,
  7,
  16,
  10,
];

const LINE_WIDTH_HALO: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  6,
  8,
  9,
  12,
  12,
  16,
  16,
];

const LINE_WIDTH_ALT: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  2.5,
  8,
  4,
  12,
  5.5,
  16,
  7,
];

/** Pure helpers — testable without MapLibre. */
export function buildSelectedRouteCollection(
  selected: NormalizedRoute | null,
): GeoJSON.FeatureCollection {
  if (!selected || selected.geometry.coordinates.length < 2) {
    return emptyCollection();
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          id: selected.id,
          routeIndex: 0,
          selected: true,
        },
        geometry: {
          type: "LineString",
          coordinates: selected.geometry.coordinates,
        },
      },
    ],
  };
}

export function buildAlternativeRouteCollection(
  routes: NormalizedRoute[],
  selectedId: string | null,
): GeoJSON.FeatureCollection {
  const selected =
    routes.find((route) => route.id === selectedId) ?? routes[0] ?? null;
  return {
    type: "FeatureCollection",
    features: routes
      .filter((route) => route.id !== selected?.id)
      .filter((route) => route.geometry.coordinates.length >= 2)
      .map((route, index) => ({
        type: "Feature" as const,
        properties: {
          id: route.id,
          routeIndex: index + 1,
          selected: false,
        },
        geometry: {
          type: "LineString" as const,
          coordinates: route.geometry.coordinates,
        },
      })),
  };
}

export function buildRoutePointsCollection(
  points: RoutePlannerMapPoint[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      properties: {
        id: point.id,
        label: point.label,
        color: point.color,
        role: point.role,
      },
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
    })),
  };
}

export function logRoutingGeometryDev(routes: NormalizedRoute[]) {
  if (process.env.NODE_ENV === "production") return;
  const first = routes[0];
  const coords = first?.geometry.coordinates ?? [];
  console.info("[routing geometry]", {
    routes: routes.length,
    "route[0].points": coords.length,
    "route[0].geometryType": first?.geometry.type ?? null,
    firstCoordinate: coords[0] ?? null,
    lastCoordinate: coords[coords.length - 1] ?? null,
  });
}

function bringRouteLayersToFront(map: MapLibreMap) {
  try {
    ensureEUIMLayerOrder(map);
  } catch {
    // Layer may briefly be missing during style transitions.
  }
}

export function ensureRoutingLayers(map: MapLibreMap) {
  if (!map.getSource(ROUTE_PLANNER_ALT_SOURCE_ID)) {
    map.addSource(ROUTE_PLANNER_ALT_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection(),
    });
  }
  if (!map.getSource(ROUTE_PLANNER_SOURCE_ID)) {
    map.addSource(ROUTE_PLANNER_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection(),
    });
  }
  if (!map.getSource(ROUTE_PLANNER_TRAFFIC_SOURCE_ID)) {
    map.addSource(ROUTE_PLANNER_TRAFFIC_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection(),
    });
  }
  if (!map.getSource(ROUTE_PLANNER_POINTS_SOURCE_ID)) {
    map.addSource(ROUTE_PLANNER_POINTS_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection(),
    });
  }

  if (!map.getLayer(ROUTE_PLANNER_LAYER_ALT)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_ALT,
      type: "line",
      source: ROUTE_PLANNER_ALT_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
      paint: {
        "line-color": "#64748b",
        "line-width": LINE_WIDTH_ALT,
        "line-opacity": 0.55,
      },
    });
  } else {
    map.setLayoutProperty(ROUTE_PLANNER_LAYER_ALT, "visibility", "visible");
    map.setPaintProperty(ROUTE_PLANNER_LAYER_ALT, "line-width", LINE_WIDTH_ALT);
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_HALO)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_HALO,
      type: "line",
      source: ROUTE_PLANNER_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
      paint: {
        "line-color": "#ffffff",
        "line-width": LINE_WIDTH_HALO,
        "line-opacity": 0.95,
      },
    });
  } else {
    map.setLayoutProperty(ROUTE_PLANNER_LAYER_HALO, "visibility", "visible");
    map.setPaintProperty(ROUTE_PLANNER_LAYER_HALO, "line-width", LINE_WIDTH_HALO);
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_MAIN)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_MAIN,
      type: "line",
      source: ROUTE_PLANNER_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round", visibility: "visible" },
      paint: {
        "line-color": "#1a73e8",
        "line-width": LINE_WIDTH_MAIN,
        "line-opacity": 1,
      },
    });
  } else {
    map.setLayoutProperty(ROUTE_PLANNER_LAYER_MAIN, "visibility", "visible");
    map.setPaintProperty(ROUTE_PLANNER_LAYER_MAIN, "line-width", LINE_WIDTH_MAIN);
    map.setPaintProperty(ROUTE_PLANNER_LAYER_MAIN, "line-opacity", 1);
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_TRAFFIC)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_TRAFFIC,
      type: "line",
      source: ROUTE_PLANNER_TRAFFIC_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          2,
          10,
          4,
          16,
          6,
        ],
        "line-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_POINTS)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_POINTS,
      type: "circle",
      source: ROUTE_PLANNER_POINTS_SOURCE_ID,
      paint: {
        "circle-radius": 8,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_POINT_LABELS)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_POINT_LABELS,
      type: "symbol",
      source: ROUTE_PLANNER_POINTS_SOURCE_ID,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#0f172a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }

  bringRouteLayersToFront(map);
}

function setSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.FeatureCollection,
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source || typeof source.setData !== "function") return;
  source.setData(data);
}

function buildTrafficFeatures(
  route: NormalizedRoute | null,
): GeoJSON.Feature[] {
  if (!route) return [];
  const coords = route.geometry.coordinates;
  const features: GeoJSON.Feature[] = [];
  for (const section of route.sections) {
    if (section.type !== "traffic") continue;
    const start = section.startPointIndex ?? 0;
    const end = section.endPointIndex ?? start;
    if (start < 0 || end >= coords.length || end <= start) continue;
    const color = trafficSectionColor(
      section.magnitudeOfDelay,
      section.simpleCategory,
    );
    if (color === "#2563eb" && (section.magnitudeOfDelay ?? 0) <= 0) continue;
    features.push({
      type: "Feature",
      properties: { color },
      geometry: {
        type: "LineString",
        coordinates: coords.slice(start, end + 1),
      },
    });
  }
  return features;
}

export function syncRoutePlannerLayers(
  map: MapLibreMap | null,
  options: {
    active: boolean;
    routes: NormalizedRoute[];
    selectedRouteId: string | null;
    points: RoutePlannerMapPoint[];
  },
) {
  if (!map) return;
  if (!map.getStyle()?.layers) return;

  if (!options.active) {
    clearRoutePlannerLayers(map);
    return;
  }

  ensureRoutingLayers(map);
  logRoutingGeometryDev(options.routes);

  const selected =
    options.routes.find((r) => r.id === options.selectedRouteId) ??
    options.routes[0] ??
    null;

  if (process.env.NODE_ENV !== "production" && selected) {
    console.info("[routing client]", {
      routes: options.routes.length,
      selectedRoute: selected.id,
      coordinates: selected.geometry.coordinates.length,
    });
  }

  setSourceData(
    map,
    ROUTE_PLANNER_ALT_SOURCE_ID,
    buildAlternativeRouteCollection(options.routes, options.selectedRouteId),
  );
  setSourceData(
    map,
    ROUTE_PLANNER_SOURCE_ID,
    buildSelectedRouteCollection(selected),
  );
  setSourceData(map, ROUTE_PLANNER_TRAFFIC_SOURCE_ID, {
    type: "FeatureCollection",
    features: buildTrafficFeatures(selected),
  });
  setSourceData(
    map,
    ROUTE_PLANNER_POINTS_SOURCE_ID,
    buildRoutePointsCollection(options.points),
  );

  bringRouteLayersToFront(map);
}

export function clearRoutePlannerLayers(map: MapLibreMap | null) {
  if (!map) return;
  for (const sourceId of [
    ROUTE_PLANNER_SOURCE_ID,
    ROUTE_PLANNER_ALT_SOURCE_ID,
    ROUTE_PLANNER_TRAFFIC_SOURCE_ID,
    ROUTE_PLANNER_POINTS_SOURCE_ID,
  ]) {
    if (map.getSource(sourceId)) {
      setSourceData(map, sourceId, emptyCollection());
    }
  }
}

/** Alias used by call sites that clear routing geometry without tearing down layers. */
export const clearRoutingGeometry = clearRoutePlannerLayers;

export function useRoutePlannerLayers(
  map: MapLibreMap | null,
  options: {
    active: boolean;
    routes: NormalizedRoute[];
    selectedRouteId: string | null;
    points: RoutePlannerMapPoint[];
  },
) {
  useEffect(() => {
    syncRoutePlannerLayers(map, options);
  }, [
    map,
    options.active,
    options.routes,
    options.selectedRouteId,
    options.points,
  ]);
}

export function fitRouteBounds(
  map: MapLibreMap | null,
  coordinates: [number, number][],
  options?: {
    plannerOpen?: boolean;
    isMobile?: boolean;
    duration?: number;
  },
) {
  if (!map || coordinates.length < 2) return;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lon, lat] of coordinates) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    west = Math.min(west, lon);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    north = Math.max(north, lat);
  }
  if (!Number.isFinite(west) || !Number.isFinite(south)) return;

  const plannerOpen = options?.plannerOpen ?? true;
  const isMobile =
    options?.isMobile ??
    (typeof window !== "undefined" ? window.innerWidth < 768 : false);

  const padding = isMobile
    ? {
        top: 72,
        right: 48,
        bottom: plannerOpen ? 320 : 80,
        left: 48,
      }
    : {
        top: 80,
        right: 80,
        bottom: 80,
        left: plannerOpen ? 420 : 80,
      };

  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    {
      padding,
      duration: options?.duration ?? 700,
      maxZoom: 14,
    },
  );
}
