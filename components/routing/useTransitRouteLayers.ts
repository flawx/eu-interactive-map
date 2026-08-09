"use client";

import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import { ensureEUIMLayerOrder } from "@/lib/map/ensureEUIMLayerOrder";
import {
  journeyCoordinates,
  transitModeColor,
} from "@/lib/routing/formatTransit";
import type { TransitJourney } from "@/lib/routing/transit/types";
import {
  TRANSIT_LAYER_HALO,
  TRANSIT_LAYER_MAIN,
  TRANSIT_LAYER_POINT_LABELS,
  TRANSIT_LAYER_POINTS,
  TRANSIT_LAYER_WALK,
  TRANSIT_LAYER_WALK_HALO,
  TRANSIT_POINTS_SOURCE_ID,
  TRANSIT_ROUTE_SOURCE_ID,
  TRANSIT_ROUTE_WALK_SOURCE_ID,
  type TransitMapPoint,
} from "@/lib/routing/transitMapLayers";

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

const LAYER_ORDER = [
  TRANSIT_LAYER_WALK_HALO,
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
  4.5,
  8,
  6.5,
  12,
  8,
  15,
  10,
];

const WIDTH_HALO: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  8,
  8,
  11,
  12,
  13,
  15,
  16,
];

const WIDTH_WALK: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  4,
  2,
  10,
  3.5,
  14,
  5,
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
    const color = transitModeColor(leg.mode, leg.line?.color);
    const feature: GeoJSON.Feature = {
      type: "Feature",
      properties: {
        journeyIndex: 0,
        stepIndex: legIndex,
        mode: leg.mode,
        vehicleType: leg.vehicleType,
        lineName: leg.line?.name ?? null,
        lineShortName: leg.line?.nameShort ?? null,
        lineColor: color,
        textColor: leg.line?.textColor ?? null,
        selected: true,
        color,
      },
      geometry: {
        type: "LineString",
        coordinates: coords,
      },
    };
    if (leg.mode === "walk") walkFeatures.push(feature);
    else transitFeatures.push(feature);
  });

  if (transitFeatures.length === 0 && walkFeatures.length === 0) {
    const coords = journeyCoordinates(journey);
    if (coords.length >= 2) {
      transitFeatures.push({
        type: "Feature",
        properties: {
          journeyIndex: 0,
          stepIndex: 0,
          mode: "rail",
          selected: true,
          color: transitModeColor("rail"),
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
        subtitle: point.subtitle ?? "",
        color: point.color,
        role: point.role,
        mode: point.mode ?? "",
        lineShortName: point.lineShortName ?? "",
      },
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude],
      },
    })),
  };
}

export function bringTransitLayersToFront(map: MapLibreMap) {
  try {
    ensureEUIMLayerOrder(map);
  } catch {
    // Layer may briefly be missing during style transitions.
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

  if (!map.getLayer(TRANSIT_LAYER_WALK_HALO)) {
    map.addLayer({
      id: TRANSIT_LAYER_WALK_HALO,
      type: "line",
      source: TRANSIT_ROUTE_WALK_SOURCE_ID,
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "visible",
      },
      paint: {
        "line-color": "#0f172a",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          4,
          4,
          10,
          6,
          14,
          8,
        ],
        "line-opacity": 0.55,
        "line-dasharray": [1.2, 1.6],
      },
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
        "line-color": "#e2e8f0",
        "line-width": WIDTH_WALK,
        "line-opacity": 1,
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
        "line-color": "#0f172a",
        "line-width": WIDTH_HALO,
        "line-opacity": 0.85,
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
        "circle-radius": [
          "match",
          ["get", "role"],
          "origin",
          8,
          "destination",
          8,
          "boarding",
          7,
          "alighting",
          7,
          6,
        ],
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
  if (!map.getLayer(TRANSIT_LAYER_POINT_LABELS)) {
    map.addLayer({
      id: TRANSIT_LAYER_POINT_LABELS,
      type: "symbol",
      source: TRANSIT_POINTS_SOURCE_ID,
      minzoom: 10,
      layout: {
        "text-field": [
          "case",
          ["==", ["get", "role"], "origin"],
          "A",
          ["==", ["get", "role"], "destination"],
          "B",
          [
            "concat",
            ["get", "label"],
            [
              "case",
              [">", ["length", ["get", "lineShortName"]], 0],
              ["concat", " · ", ["get", "lineShortName"]],
              "",
            ],
          ],
        ],
        "text-size": 11,
        "text-offset": [0, 1.25],
        "text-anchor": "top",
        "text-optional": true,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#0f172a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.75,
      },
    });
  }

  bringTransitLayersToFront(map);
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
  // Do NOT gate on map.isStyleLoaded(): with live traffic/terrain tiles it can
  // remain false for long stretches and would silently skip transit geometry.
  // A present style graph is enough to add GeoJSON sources/layers.
  if (!map.getStyle()?.layers) return;

  if (!options.active || !options.journey) {
    clearTransitRouteLayers(map);
    return;
  }

  try {
    ensureTransitRoutingLayers(map);
    const collections = buildTransitLegCollections(options.journey);
    setData(map, TRANSIT_ROUTE_SOURCE_ID, collections.transit);
    setData(map, TRANSIT_ROUTE_WALK_SOURCE_ID, collections.walk);
    setData(
      map,
      TRANSIT_POINTS_SOURCE_ID,
      buildTransitPointsCollection(options.points),
    );
    bringTransitLayersToFront(map);

    if (process.env.NODE_ENV !== "production") {
      console.info("[transit map]", {
        features:
          collections.transit.features.length + collections.walk.features.length,
        walkFeatures: collections.walk.features.length,
        transitFeatures: collections.transit.features.length,
        pointFeatures: options.points.length,
        layersPresent: LAYER_ORDER.filter((id) => Boolean(map.getLayer(id))),
        styleLoaded: map.isStyleLoaded(),
        selectedJourney: options.journey.id,
      });
    }
  } catch {
    // Style may be mid-swap (base/relief/3D); caller retries on idle/style.load.
  }
}
