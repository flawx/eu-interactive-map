"use client";

import { useEffect } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { NormalizedRoute } from "@/lib/routing/types";
import { trafficSectionColor } from "@/lib/routing/formatRoute";
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

function ensureLayers(map: MapLibreMap) {
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
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#64748b",
        "line-width": 5,
        "line-opacity": 0.45,
      },
    });
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_HALO)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_HALO,
      type: "line",
      source: ROUTE_PLANNER_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#ffffff",
        "line-width": 10,
        "line-opacity": 0.85,
      },
    });
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_MAIN)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_MAIN,
      type: "line",
      source: ROUTE_PLANNER_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#1a73e8",
        "line-width": 5,
        "line-opacity": 0.95,
      },
    });
  }
  if (!map.getLayer(ROUTE_PLANNER_LAYER_TRAFFIC)) {
    map.addLayer({
      id: ROUTE_PLANNER_LAYER_TRAFFIC,
      type: "line",
      source: ROUTE_PLANNER_TRAFFIC_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["get", "color"],
        "line-width": 4,
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
}

function setSourceData(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.FeatureCollection,
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  source?.setData(data);
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
  if (!map.isStyleLoaded()) return;

  if (!options.active) {
    clearRoutePlannerLayers(map);
    return;
  }

  ensureLayers(map);

  const selected =
    options.routes.find((r) => r.id === options.selectedRouteId) ??
    options.routes[0] ??
    null;
  const alternatives = options.routes.filter((r) => r.id !== selected?.id);

  setSourceData(map, ROUTE_PLANNER_ALT_SOURCE_ID, {
    type: "FeatureCollection",
    features: alternatives.map((route) => ({
      type: "Feature",
      properties: { id: route.id },
      geometry: route.geometry,
    })),
  });

  setSourceData(map, ROUTE_PLANNER_SOURCE_ID, {
    type: "FeatureCollection",
    features: selected
      ? [
          {
            type: "Feature",
            properties: { id: selected.id },
            geometry: selected.geometry,
          },
        ]
      : [],
  });

  setSourceData(map, ROUTE_PLANNER_TRAFFIC_SOURCE_ID, {
    type: "FeatureCollection",
    features: buildTrafficFeatures(selected),
  });

  setSourceData(map, ROUTE_PLANNER_POINTS_SOURCE_ID, {
    type: "FeatureCollection",
    features: options.points.map((point) => ({
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
  });
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
) {
  if (!map || coordinates.length < 2) return;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lon, lat] of coordinates) {
    west = Math.min(west, lon);
    south = Math.min(south, lat);
    east = Math.max(east, lon);
    north = Math.max(north, lat);
  }
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    { padding: 80, duration: 600, maxZoom: 14 },
  );
}
