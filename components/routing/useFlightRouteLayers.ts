"use client";

import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";
import { ensureEUIMLayerOrder } from "@/lib/map/ensureEUIMLayerOrder";
import type {
  FlightJourney,
  FlightLegSegment,
  GroundTransitSegment,
  MultimodalJourney,
} from "@/lib/routing/flights/types";
import type { TransitJourney, TransitMode } from "@/lib/routing/transit/types";
import {
  FLIGHT_AIRPORTS_SOURCE_ID,
  FLIGHT_LAYER_AIRPORT_LABELS,
  FLIGHT_LAYER_AIRPORTS,
  FLIGHT_LAYER_HALO,
  FLIGHT_LAYER_MAIN,
  FLIGHT_ROUTE_COLOR,
  FLIGHT_ROUTE_SOURCE_ID,
  type FlightMapAirportPoint,
} from "@/lib/routing/flightMapLayers";

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

const LAYER_ORDER = [
  FLIGHT_LAYER_HALO,
  FLIGHT_LAYER_MAIN,
  FLIGHT_LAYER_AIRPORTS,
  FLIGHT_LAYER_AIRPORT_LABELS,
] as const;

const WIDTH_MAIN: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  2,
  2.5,
  6,
  3.5,
  10,
  4.5,
];

const WIDTH_HALO: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  2,
  6,
  6,
  8,
  10,
  10,
];

/**
 * Builds the map-facing data for a multimodal journey: the flight arc(s) +
 * airport points, plus a synthetic TransitJourney merging ground access and
 * egress legs so the existing transit map layers can render them alongside
 * the flight arc (see useTransitRouteLayers.ts / syncTransitRouteLayers).
 */
export function buildMapDataFromMultimodalJourney(
  journey: MultimodalJourney | null,
): {
  flightCollection: GeoJSON.FeatureCollection;
  airportPoints: FlightMapAirportPoint[];
  transitJourneyForMap: TransitJourney | null;
} {
  if (!journey) {
    return {
      flightCollection: emptyCollection(),
      airportPoints: [],
      transitJourneyForMap: null,
    };
  }

  const flightSegments = journey.segments.filter(
    (segment): segment is FlightLegSegment => segment.kind === "flight",
  );
  const groundSegments = journey.segments.filter(
    (segment): segment is GroundTransitSegment => segment.kind === "ground_transit",
  );

  const flightFeatures: GeoJSON.Feature[] = flightSegments.map(
    (segment): GeoJSON.Feature => ({
      type: "Feature",
      properties: {
        id: segment.id,
        flightId: segment.journey.id,
        color: FLIGHT_ROUTE_COLOR,
      },
      geometry: segment.arcGeometry as GeoJSON.Geometry,
    }),
  );

  const airportPoints: FlightMapAirportPoint[] = [];
  flightSegments.forEach((segment) => {
    collectAirportPoints(segment.journey, airportPoints);
  });

  const access = groundSegments.find((segment) => segment.role === "access")?.journey ?? null;
  const egress = groundSegments.find((segment) => segment.role === "egress")?.journey ?? null;
  const transitJourneyForMap = mergeGroundJourneysForMap(journey.id, access, egress);

  return {
    flightCollection: { type: "FeatureCollection", features: flightFeatures },
    airportPoints,
    transitJourneyForMap,
  };
}

function collectAirportPoints(
  flight: FlightJourney,
  out: FlightMapAirportPoint[],
) {
  const seen = new Set(out.map((point) => point.id));
  const addPoint = (
    id: string,
    role: FlightMapAirportPoint["role"],
    place: FlightJourney["segments"][number]["departure"]["place"],
  ) => {
    if (seen.has(id)) return;
    if (place.longitude == null || place.latitude == null) return;
    seen.add(id);
    out.push({
      id,
      role,
      longitude: place.longitude,
      latitude: place.latitude,
      iataCode: place.iataCode,
      label: place.iataCode,
      subtitle: place.name,
    });
  };

  const firstSegment = flight.segments[0];
  const lastSegment = flight.segments[flight.segments.length - 1];
  if (firstSegment) {
    addPoint(`departure-${firstSegment.departure.place.iataCode}`, "departure", firstSegment.departure.place);
  }
  for (const layover of flight.layovers) {
    addPoint(`layover-${layover.airport.iataCode}`, "layover", layover.airport);
  }
  if (lastSegment) {
    addPoint(`arrival-${lastSegment.arrival.place.iataCode}`, "arrival", lastSegment.arrival.place);
  }
}

function mergeGroundJourneysForMap(
  journeyId: string,
  access: TransitJourney | null,
  egress: TransitJourney | null,
): TransitJourney | null {
  if (!access && !egress) return null;
  if (access && !egress) return access;
  if (!access && egress) return egress;

  const first = access!;
  const second = egress!;
  const legs = [...first.legs, ...second.legs];
  const modeSummary = Array.from(
    new Set<TransitMode>([...first.modeSummary, ...second.modeSummary]),
  );
  const geometryParts: [number, number][][] = [];
  for (const part of [first.geometry, second.geometry]) {
    if (part.type === "LineString") geometryParts.push(part.coordinates as [number, number][]);
    else geometryParts.push(...(part.coordinates as [number, number][][]));
  }

  return {
    id: `${journeyId}-ground`,
    provider: first.provider,
    departureAt: first.departureAt,
    arrivalAt: second.arrivalAt,
    durationSeconds: first.durationSeconds + second.durationSeconds,
    distanceMeters:
      first.distanceMeters != null || second.distanceMeters != null
        ? (first.distanceMeters ?? 0) + (second.distanceMeters ?? 0)
        : null,
    transfers: first.transfers + second.transfers,
    walkingDurationSeconds: first.walkingDurationSeconds + second.walkingDurationSeconds,
    waitingDurationSeconds: first.waitingDurationSeconds + second.waitingDurationSeconds,
    transitDurationSeconds: first.transitDurationSeconds + second.transitDurationSeconds,
    fare: null,
    legs,
    geometry: { type: "MultiLineString", coordinates: geometryParts },
    warnings: [...first.warnings, ...second.warnings],
    modeSummary,
  };
}

export function buildFlightAirportsCollection(
  points: FlightMapAirportPoint[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      properties: {
        id: point.id,
        role: point.role,
        label: point.label,
        subtitle: point.subtitle ?? "",
        iataCode: point.iataCode,
      },
      geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
    })),
  };
}

export function bringFlightLayersToFront(map: MapLibreMap) {
  try {
    ensureEUIMLayerOrder(map);
  } catch {
    // Layer may briefly be missing during style transitions.
  }
}

function setData(map: MapLibreMap, sourceId: string, data: GeoJSON.FeatureCollection) {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined;
  if (!source || typeof source.setData !== "function") return;
  source.setData(data);
}

export function ensureFlightRoutingLayers(map: MapLibreMap) {
  if (!map.getSource(FLIGHT_ROUTE_SOURCE_ID)) {
    map.addSource(FLIGHT_ROUTE_SOURCE_ID, { type: "geojson", data: emptyCollection() });
  }
  if (!map.getSource(FLIGHT_AIRPORTS_SOURCE_ID)) {
    map.addSource(FLIGHT_AIRPORTS_SOURCE_ID, { type: "geojson", data: emptyCollection() });
  }

  if (!map.getLayer(FLIGHT_LAYER_HALO)) {
    map.addLayer({
      id: FLIGHT_LAYER_HALO,
      type: "line",
      source: FLIGHT_ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#0c4a6e",
        "line-width": WIDTH_HALO,
        "line-opacity": 0.55,
      },
    });
  }
  if (!map.getLayer(FLIGHT_LAYER_MAIN)) {
    map.addLayer({
      id: FLIGHT_LAYER_MAIN,
      type: "line",
      source: FLIGHT_ROUTE_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": ["coalesce", ["get", "color"], FLIGHT_ROUTE_COLOR],
        "line-width": WIDTH_MAIN,
        "line-opacity": 0.95,
        "line-dasharray": [2, 1.5],
      },
    });
  }
  if (!map.getLayer(FLIGHT_LAYER_AIRPORTS)) {
    map.addLayer({
      id: FLIGHT_LAYER_AIRPORTS,
      type: "circle",
      source: FLIGHT_AIRPORTS_SOURCE_ID,
      paint: {
        "circle-radius": [
          "match",
          ["get", "role"],
          "departure",
          8,
          "arrival",
          8,
          "layover",
          6,
          6,
        ],
        "circle-color": [
          "match",
          ["get", "role"],
          "layover",
          "#f59e0b",
          FLIGHT_ROUTE_COLOR,
        ],
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#ffffff",
      },
    });
  }
  if (!map.getLayer(FLIGHT_LAYER_AIRPORT_LABELS)) {
    map.addLayer({
      id: FLIGHT_LAYER_AIRPORT_LABELS,
      type: "symbol",
      source: FLIGHT_AIRPORTS_SOURCE_ID,
      minzoom: 2,
      layout: {
        "text-field": ["get", "label"],
        "text-size": 11,
        "text-offset": [0, 1.25],
        "text-anchor": "top",
        "text-optional": true,
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#0c4a6e",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.75,
      },
    });
  }

  bringFlightLayersToFront(map);
}

export function clearFlightRouteLayers(map: MapLibreMap | null) {
  if (!map) return;
  for (const sourceId of [FLIGHT_ROUTE_SOURCE_ID, FLIGHT_AIRPORTS_SOURCE_ID]) {
    if (map.getSource(sourceId)) setData(map, sourceId, emptyCollection());
  }
}

export function syncFlightRouteLayers(
  map: MapLibreMap | null,
  options: { active: boolean; journey: MultimodalJourney | null },
) {
  if (!map) return;
  if (!map.getStyle()?.layers) return;

  if (!options.active || !options.journey) {
    clearFlightRouteLayers(map);
    return;
  }

  try {
    ensureFlightRoutingLayers(map);
    const { flightCollection, airportPoints } = buildMapDataFromMultimodalJourney(
      options.journey,
    );
    setData(map, FLIGHT_ROUTE_SOURCE_ID, flightCollection);
    setData(map, FLIGHT_AIRPORTS_SOURCE_ID, buildFlightAirportsCollection(airportPoints));
    bringFlightLayersToFront(map);
  } catch {
    // Style may be mid-swap (base/relief/3D); caller retries on idle/style.load.
  }
}
