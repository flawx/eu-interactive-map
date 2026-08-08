"use client";

import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import { journeyCoordinates, transitModeColor } from "@/lib/routing/formatTransit";
import type { TransitJourney } from "@/lib/routing/transit/types";
import {
  TRANSIT_LAYER_HALO,
  TRANSIT_LAYER_MAIN,
  TRANSIT_LAYER_POINT_LABELS,
  TRANSIT_LAYER_POINTS,
  TRANSIT_LAYER_WALK,
  TRANSIT_POINTS_SOURCE_ID,
  TRANSIT_ROUTE_SOURCE_ID,
  TRANSIT_ROUTE_WALK_SOURCE_ID,
  type TransitMapPoint,
} from "@/lib/routing/transitMapLayers";

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

const LAYER_ORDER = [
  TRANSIT_LAYER_WALK,
  TRANSIT_LAYER_HALO,
  TRANSIT_LAYER_MAIN,
  TRANSIT_LAYER_POINTS,
  TRANSIT_LAYER_POINT_LABELS,
] as const;

const WIDTH_MAIN: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  3,
  10,
  5,
  14,
  7,
];

const WIDTH_WALK: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  1.5,
  10,
  2.5,
  14,
  3.5,
];

export function buildTransitLegCollections(journey: TransitJourney | null): {
  transit: GeoJSON.FeatureCollection;
  walk: GeoJSON.FeatureCollection;
} {
  if (!journey) {
    return { transit: emptyCollection(), walk: emptyCollection() };
  }

  const transitFeatures: GeoJSON.Feature[] = [];
  const walkFeatures: GeoJSON.Feature[] = [];

  journey.legs.forEach((leg, legIndex) => {
    const coords = leg.geometry?.coordinates;
    if (!coords || coords.length < 2) return;
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {
        journeyIndex: 0,
        legIndex,
        mode: leg.mode,
        selected: true,
        color: transitModeColor(leg.mode, leg.line?.color),
      },
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    };
    if (leg.mode === "walk") walkFeatures.push(feature);
    else transitFeatures.push(feature);
  });

  // Fallback: if no leg geometries, draw journey geometry as one transit feature.
  if (transitFeatures.length === 0 && walkFeatures.length === 0) {
    const coords = journeyCoordinates(journey);
    if (coords.length >= 2) {
      transitFeatures.push({
        type: "Feature",
        properties: {
          journeyIndex: 0,
          legIndex: 0,
          mode: "train",
          selected: true,
          color: transitModeColor("train"),
        },
        geometry: { type: "LineString", coordinates: coords },
      });
    }
  }

  return {
    transit: { type: "FeatureCollection", features: transitFeatures },
    walk: { type: "FeatureCollection", features: walkFeatures },
  };
}

export function buildTransitPointsCollection(
  points: TransitMapPoint[],
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

function bringToFront(map: MapLibreMap) {
  for (const layerId of LAYER_ORDER) {
    if (map.getLayer(layerId)) {
      try {
        map.moveLayer(layerId);
      } catch {
        // ignore during style transitions
      }
    }
  }
}

function setData(
  map: MapLibreMap,
  sourceId: string,
  data: GeoJSON.FeatureCollection,
) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source || typeof source.setData !== "function") return;
  source.setData(data);
}

export function ensureTransitRoutingLayers(map: MapLibreMap) {
  if (!map.getSource(TRANSIT_ROUTE_WALK_SOURCE_ID)) {
    map.addSource(TRANSIT_ROUTE_WALK_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection(),
    });
  }
  if (!map.getSource(TRANSIT_ROUTE_SOURCE_ID)) {
    map.addSource(TRANSIT_ROUTE_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection(),
    });
  }
  if (!map.getSource(TRANSIT_POINTS_SOURCE_ID)) {
    map.addSource(TRANSIT_POINTS_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection(),
    });
  }

  if (!map.getLayer(TRANSIT_LAYER_WALK)) {
    map.addLayer({
      id: TRANSIT_LAYER_WALK,
      type: "line",
      source: TRANSIT_ROUTE_WALK_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "visible",
      },
      paint: {
        "line-color": "#94a3b8",
        "line-width": WIDTH_WALK,
        "line-opacity": 0.9,
        "line-dasharray": [1.2, 1.6],
      },
    });
  }
  if (!map.getLayer(TRANSIT_LAYER_HALO)) {
    map.addLayer({
      id: TRANSIT_LAYER_HALO,
      type: "line",
      source: TRANSIT_ROUTE_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "visible",
      },
      paint: {
        "line-color": "#ffffff",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          5,
          10,
          8,
          14,
          11,
        ],
        "line-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer(TRANSIT_LAYER_MAIN)) {
    map.addLayer({
      id: TRANSIT_LAYER_MAIN,
      type: "line",
      source: TRANSIT_ROUTE_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "visible",
      },
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#1d4ed8"],
        "line-width": WIDTH_MAIN,
        "line-opacity": 1,
      },
    });
  }
  if (!map.getLayer(TRANSIT_LAYER_POINTS)) {
    map.addLayer({
      id: TRANSIT_LAYER_POINTS,
      type: "circle",
      source: TRANSIT_POINTS_SOURCE_ID,
      paint: {
        "circle-radius": 7,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
  if (!map.getLayer(TRANSIT_LAYER_POINT_LABELS)) {
    map.addLayer({
      id: TRANSIT_LAYER_POINT_LABELS,
      type: "symbol",
      source: TRANSIT_POINTS_SOURCE_ID,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.15],
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

  bringToFront(map);
}

export function clearTransitRouteLayers(map: MapLibreMap | null) {
  if (!map) return;
  for (const sourceId of [
    TRANSIT_ROUTE_SOURCE_ID,
    TRANSIT_ROUTE_WALK_SOURCE_ID,
    TRANSIT_POINTS_SOURCE_ID,
  ]) {
    if (map.getSource(sourceId)) {
      setData(map, sourceId, emptyCollection());
    }
  }
}

export function syncTransitRouteLayers(
  map: MapLibreMap | null,
  options: {
    active: boolean;
    journey: TransitJourney | null;
    points: TransitMapPoint[];
  },
) {
  if (!map) return;
  if (!map.isStyleLoaded()) return;

  if (!options.active || !options.journey) {
    clearTransitRouteLayers(map);
    return;
  }

  ensureTransitRoutingLayers(map);
  const collections = buildTransitLegCollections(options.journey);
  setData(map, TRANSIT_ROUTE_SOURCE_ID, collections.transit);
  setData(map, TRANSIT_ROUTE_WALK_SOURCE_ID, collections.walk);
  setData(
    map,
    TRANSIT_POINTS_SOURCE_ID,
    buildTransitPointsCollection(options.points),
  );
  bringToFront(map);
}
