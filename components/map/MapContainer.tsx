"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  Map as MapLibreMap,
  Marker,
  LngLatBounds,
  setWorkerUrl,
  type ErrorEvent as MapLibreErrorEvent,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import type {
  EffisBurnedArea,
  WildfireIncident,
} from "@/lib/incidents/types";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type { Locale } from "@/lib/i18n/config";
import type {
  MapFocusRequest,
  TemporaryMapMarker,
} from "@/lib/map/focusRequest";
import "maplibre-gl/dist/maplibre-gl.css";

// Worker CDN : évite le MIME text/html renvoyé par Webpack/Next pour le worker local
setWorkerUrl(
  "https://cdn.jsdelivr.net/npm/maplibre-gl@6.0.0/dist/maplibre-gl-worker.mjs",
);

const EU_MEMBER_IDS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK",
  "EE", "FI", "FR", "DE", "EL", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL",
  "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

const NON_EUROZONE_IDS = ["CZ", "DK", "HU", "PL", "RO", "SE"] as const;

const EUROZONE_IDS = EU_MEMBER_IDS.filter(
  (id) => !(NON_EUROZONE_IDS as readonly string[]).includes(id),
);

const SELECTABLE_FILL_LAYERS = [
  "eurozone-fill",
  "non-eurozone-fill",
  "eu-candidates-fill",
  "schengen-non-eu-fill",
] as const;

const EFFIS_WMS_BASE =
  "https://maps.effis.emergency.copernicus.eu/effis";

/** EFFIS time range: YYYY-MM-DD/YYYY-MM-DD (UTC calendar days). */
function formatEffisTimeRange(daysBack: number): string {
  const to = new Date();
  const toIso = to.toISOString().slice(0, 10);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - daysBack);
  const fromIso = from.toISOString().slice(0, 10);
  return `${fromIso}/${toIso}`;
}

function buildEffisWmsTileUrl(layers: string, timeRange: string): string {
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: layers,
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    WIDTH: "256",
    HEIGHT: "256",
    CRS: "EPSG:3857",
    TIME: timeRange,
  });

  return `${EFFIS_WMS_BASE}?${params.toString()}&BBOX={bbox-epsg-3857}`;
}

function extendBoundsWithCoordinates(
  bounds: LngLatBounds,
  coordinates: unknown,
): void {
  if (!Array.isArray(coordinates)) return;

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    bounds.extend([
      coordinates[0],
      coordinates[1],
    ]);

    return;
  }

  coordinates.forEach((coordinate) => {
    extendBoundsWithCoordinates(bounds, coordinate);
  });
}

/** Area-weighted centroid of a polygon ring, falling back to a simple average for degenerate rings. */
function ringCentroid(ring: GeoJSON.Position[]): [number, number] {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area /= 2;

  if (Math.abs(area) > 1e-12) {
    return [cx / (6 * area), cy / (6 * area)];
  }

  const sum = ring.reduce<[number, number]>(
    (acc, [x, y]) => [acc[0] + x, acc[1] + y],
    [0, 0],
  );
  return [sum[0] / ring.length, sum[1] / ring.length];
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const radius = 6371008.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(b[1] - a[1]);
  const dLon = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function boundsFromPolygons(polygons: GeoJSON.Position[][][]): LngLatBounds {
  const bounds = new LngLatBounds();

  for (const polygon of polygons) {
    extendBoundsWithCoordinates(bounds, polygon);
  }

  return bounds;
}

const FLAME_ICON_PATH =
  "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4";

function getFlameColor(alertLevel: WildfireIncident["alertLevel"]): string {
  switch (alertLevel) {
    case "green":
      return "#16a34a";
    case "orange":
      return "#f97316";
    case "red":
      return "#dc2626";
    default:
      return "#64748b";
  }
}

/** Inline SVG flame marker (no external image); ~30x36px with a white outline and drop shadow. */
function createFlameMarkerElement(
  incident: WildfireIncident,
  isSelected: boolean,
): HTMLDivElement {
  const color = getFlameColor(incident.alertLevel);
  const scale = isSelected ? 1.2 : 1;

  const el = document.createElement("div");
  el.style.cssText = `width:30px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;transform:scale(${scale});transform-origin:bottom center;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.45))${
    isSelected ? " drop-shadow(0 0 6px rgba(220,38,38,0.85))" : ""
  };`;
  el.innerHTML = `<svg width="26" height="32" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="${FLAME_ICON_PATH}"/></svg>`;

  return el;
}

export default function MapContainer({
  showEurozone,
  showNonEurozone,
  showCandidates,
  showSchengenNonEU,
  selectedCountryCode,
  onCountrySelect,
  wildfireIncidents,
  showWildfires,
  onWildfireSelect,
  showSatelliteActiveFires,
  showSatelliteBurnedAreas,
  onEffisBurnedAreaSelect,
  onEffisBurnedAreaLoadingChange,
  effisSnapshotsByIncidentId,
  selectedWildfireId,
  locale,
  firmsSnapshotsByIncidentId,
  firmsHistorySnapshotsByIncidentId,
  onEffisBurnedAreasAvailabilityChange,
  focusRequest = null,
  temporaryMarker = null,
  focusGeometryRef,
}: {
  showEurozone: boolean;
  showNonEurozone: boolean;
  showCandidates: boolean;
  showSchengenNonEU: boolean;
  selectedCountryCode: string | null;
  onCountrySelect: (countryCode: string | null) => void;
  wildfireIncidents: WildfireIncident[];
  showWildfires: boolean;
  onWildfireSelect: (incidentId: string | null) => void;
  showSatelliteActiveFires: boolean;
  showSatelliteBurnedAreas: boolean;
  onEffisBurnedAreaSelect: (burnedArea: EffisBurnedArea | null) => void;
  onEffisBurnedAreaLoadingChange: (loading: boolean) => void;
  effisSnapshotsByIncidentId: Record<string, EffisBurnedAreaSnapshot>;
  selectedWildfireId: string | null;
  locale: Locale;
  firmsSnapshotsByIncidentId: Record<string, FirmsIncidentSnapshot>;
  firmsHistorySnapshotsByIncidentId: Record<string, FirmsIncidentSnapshot>;
  onEffisBurnedAreasAvailabilityChange?: (unavailable: boolean) => void;
  focusRequest?: MapFocusRequest | null;
  temporaryMarker?: TemporaryMapMarker | null;
  focusGeometryRef?: MutableRefObject<
    ((geometry: GeoJSON.Geometry) => void) | null
  >;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const showEurozoneRef = useRef(showEurozone);
  showEurozoneRef.current = showEurozone;
  const showNonEurozoneRef = useRef(showNonEurozone);
  showNonEurozoneRef.current = showNonEurozone;
  const showCandidatesRef = useRef(showCandidates);
  showCandidatesRef.current = showCandidates;
  const showSchengenNonEURef = useRef(showSchengenNonEU);
  showSchengenNonEURef.current = showSchengenNonEU;
  const onCountrySelectRef = useRef(onCountrySelect);
  onCountrySelectRef.current = onCountrySelect;
  const onWildfireSelectRef = useRef(onWildfireSelect);
  onWildfireSelectRef.current = onWildfireSelect;
  const showSatelliteActiveFiresRef = useRef(showSatelliteActiveFires);
  showSatelliteActiveFiresRef.current = showSatelliteActiveFires;
  const showSatelliteBurnedAreasRef = useRef(showSatelliteBurnedAreas);
  showSatelliteBurnedAreasRef.current = showSatelliteBurnedAreas;
  const onEffisBurnedAreaSelectRef = useRef(onEffisBurnedAreaSelect);
  onEffisBurnedAreaSelectRef.current = onEffisBurnedAreaSelect;
  const onEffisBurnedAreaLoadingChangeRef = useRef(
    onEffisBurnedAreaLoadingChange,
  );
  onEffisBurnedAreaLoadingChangeRef.current = onEffisBurnedAreaLoadingChange;
  const firmsLabelMarkersRef = useRef<Marker[]>([]);
  const gdacsFlameMarkersRef = useRef<Marker[]>([]);
  const temporaryMarkerRef = useRef<Marker | null>(null);
  const lastFocusNonceRef = useRef<number | null>(null);
  const effisRequestControllerRef = useRef<AbortController | null>(null);
  const onEffisBurnedAreasAvailabilityChangeRef = useRef(
    onEffisBurnedAreasAvailabilityChange,
  );
  onEffisBurnedAreasAvailabilityChangeRef.current =
    onEffisBurnedAreasAvailabilityChange;
  const [mapSourcesReadyVersion, setMapSourcesReadyVersion] = useState(0);

  const applyLayerVisibility = (
    map: MapLibreMap,
    layerId: string,
    visible: boolean,
  ) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        visible ? "visible" : "none",
      );
    }
  };

  const applyEurozoneVisibility = (map: MapLibreMap, visible: boolean) => {
    applyLayerVisibility(map, "eurozone-fill", visible);
  };

  const applyNonEurozoneVisibility = (map: MapLibreMap, visible: boolean) => {
    applyLayerVisibility(map, "non-eurozone-fill", visible);
  };

  const applyCandidateVisibility = (map: MapLibreMap, visible: boolean) => {
    applyLayerVisibility(map, "eu-candidates-fill", visible);
    applyLayerVisibility(map, "eu-candidates-border", visible);
  };

  const applySchengenNonEUVisibility = (map: MapLibreMap, visible: boolean) => {
    applyLayerVisibility(map, "schengen-non-eu-fill", visible);
    applyLayerVisibility(map, "schengen-non-eu-border", visible);
  };

  const applyWildfireVisibility = (visible: boolean) => {
    for (const marker of gdacsFlameMarkersRef.current) {
      marker.getElement().style.display = visible ? "" : "none";
    }
  };

  const applySatelliteActiveFiresVisibility = (
    map: MapLibreMap,
    visible: boolean,
  ) => {
    applyLayerVisibility(map, "firms-incident-footprints-fill", visible);
    applyLayerVisibility(map, "firms-incident-footprints-border", visible);
    applyLayerVisibility(
      map,
      "firms-incident-footprints-selected-fill",
      visible,
    );
    applyLayerVisibility(map, "firms-incident-footprints-selected", visible);
  };

  const applySatelliteBurnedAreasVisibility = (
    map: MapLibreMap,
    visible: boolean,
  ) => {
    applyLayerVisibility(map, "firms-recent-history-fill", visible);
    applyLayerVisibility(map, "firms-recent-history-border", visible);
    applyLayerVisibility(map, "firms-recent-history-selected-fill", visible);
    applyLayerVisibility(map, "firms-recent-history-selected", visible);
    applyLayerVisibility(map, "effis-burned-areas-layer", visible);
    applyLayerVisibility(map, "effis-burned-area-snapshots-fill", visible);
    applyLayerVisibility(map, "effis-burned-area-snapshots-border", visible);
    applyLayerVisibility(map, "effis-burned-area-snapshots-selected", visible);
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: "© OpenStreetMap contributors © CARTO",
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm-tiles",
          },
        ],
      },
      center: [15.2551, 54.5260],
      zoom: 4,
    });

    mapRef.current = map;

    const handleMapError = (event: MapLibreErrorEvent) => {
      const error = event.error;

      const message =
        error instanceof Error
          ? error.message
          : String(error ?? "");

      const isEffisGetMapError =
        message.includes(
          "maps.effis.emergency.copernicus.eu/effis",
        ) && message.includes("REQUEST=GetMap");

      if (isEffisGetMapError) {
        onEffisBurnedAreasAvailabilityChangeRef.current?.(true);
        return;
      }

      const eventSourceId =
        "sourceId" in event && typeof event.sourceId === "string"
          ? event.sourceId
          : "source" in event && typeof event.source === "string"
            ? event.source
            : null;

      const isRasterSource = eventSourceId === "effis-burned-areas";

      const isEffisStatusFailure =
        eventSourceId === "effis-burned-areas" &&
        /\b(status|4\d\d|5\d\d|failed|error)\b/i.test(message);

      if (isEffisStatusFailure) {
        onEffisBurnedAreasAvailabilityChangeRef.current?.(true);
      }

      const isDecodeError =
        message === "The source image could not be decoded";

      if (isDecodeError && isRasterSource) {
        return;
      }

      if (
        isDecodeError &&
        !eventSourceId &&
        map.getLayer("effis-burned-areas-layer") &&
        map.getLayoutProperty(
          "effis-burned-areas-layer",
          "visibility",
        ) === "visible"
      ) {
        return;
      }

      console.error(error);
    };

    map.on("error", handleMapError);

    const updateEuOpacity = () => {
      const zoom = map.getZoom();

      let opacity = 0.18;

      if (zoom >= 7) {
        opacity = 0;
      } else if (zoom >= 6) {
        opacity = 0.05;
      } else if (zoom >= 5) {
        opacity = 0.10;
      }

      for (const layerId of ["eurozone-fill", "non-eurozone-fill"] as const) {
        if (map.getLayer(layerId)) {
          map.setPaintProperty(layerId, "fill-opacity", opacity);
        }
      }
    };

    const handleCountryClick = (event: MapLayerMouseEvent) => {
      const countryCode = event.features?.[0]?.properties?.CNTR_ID;

      if (typeof countryCode === "string") {
        onCountrySelectRef.current(countryCode);
      }

      const feature = event.features?.[0];

      if (
        feature?.geometry &&
        "coordinates" in feature.geometry
      ) {
        const bounds = new LngLatBounds();

        extendBoundsWithCoordinates(
          bounds,
          feature.geometry.coordinates,
        );

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: 80,
            maxZoom: 7,
            duration: 800,
          });
        }
      }
    };

    const handleEffisSnapshotClick = (event: MapLayerMouseEvent) => {
      const incidentId = event.features?.[0]?.properties?.incidentId;

      if (typeof incidentId === "string" && incidentId.trim().length > 0) {
        onWildfireSelectRef.current(incidentId);
      } else if (typeof incidentId === "number") {
        onWildfireSelectRef.current(String(incidentId));
      }
    };

    const FIRMS_LOCAL_CLUSTER_METERS = 12_000;

    const handleFirmsFootprintClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const rawIncidentId = feature?.properties?.incidentId;

      const incidentId =
        typeof rawIncidentId === "string"
          ? rawIncidentId
          : typeof rawIncidentId === "number"
            ? String(rawIncidentId)
            : null;

      if (!incidentId) return;

      onWildfireSelectRef.current(incidentId);

      if (!feature?.geometry || feature.geometry.type !== "Polygon") return;

      const clickedPolygon = feature.geometry.coordinates;
      const clickedCentroid = ringCentroid(clickedPolygon[0]);

      const sourceFeatures = map.querySourceFeatures(
        "firms-incident-footprints",
        {
          filter: ["==", ["get", "incidentId"], incidentId],
        },
      );

      const nearbyPolygons: GeoJSON.Position[][][] = [];

      for (const sourceFeature of sourceFeatures) {
        if (sourceFeature.geometry.type !== "Polygon") continue;

        const centroid = ringCentroid(sourceFeature.geometry.coordinates[0]);

        if (
          haversineMeters(clickedCentroid, centroid) <=
          FIRMS_LOCAL_CLUSTER_METERS
        ) {
          nearbyPolygons.push(sourceFeature.geometry.coordinates);
        }
      }

      if (nearbyPolygons.length === 0) {
        nearbyPolygons.push(clickedPolygon);
      }

      const bounds = boundsFromPolygons(nearbyPolygons);

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 380, right: 80 },
          maxZoom: 11.5,
          duration: 900,
        });
      }
    };

    const handleFirmsHistoryClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const rawIncidentId = feature?.properties?.incidentId;

      const incidentId =
        typeof rawIncidentId === "string"
          ? rawIncidentId
          : typeof rawIncidentId === "number"
            ? String(rawIncidentId)
            : null;

      if (!incidentId) return;

      onWildfireSelectRef.current(incidentId);

      if (!feature?.geometry || feature.geometry.type !== "Polygon") return;

      const clickedPolygon = feature.geometry.coordinates;
      const clickedCentroid = ringCentroid(clickedPolygon[0]);

      const sourceFeatures = map.querySourceFeatures("firms-recent-history", {
        filter: ["==", ["get", "incidentId"], incidentId],
      });

      const nearbyPolygons: GeoJSON.Position[][][] = [];

      for (const sourceFeature of sourceFeatures) {
        if (sourceFeature.geometry.type !== "Polygon") continue;

        const centroid = ringCentroid(sourceFeature.geometry.coordinates[0]);

        if (
          haversineMeters(clickedCentroid, centroid) <=
          FIRMS_LOCAL_CLUSTER_METERS
        ) {
          nearbyPolygons.push(sourceFeature.geometry.coordinates);
        }
      }

      if (nearbyPolygons.length === 0) {
        nearbyPolygons.push(clickedPolygon);
      }

      const bounds = boundsFromPolygons(nearbyPolygons);

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: { top: 100, bottom: 100, left: 380, right: 80 },
          maxZoom: 11.5,
          duration: 900,
        });
      }
    };

    const handleEffisBurnedAreaClick = (event: MapLayerMouseEvent) => {
      if (!showSatelliteBurnedAreasRef.current) return;
      if (map.getZoom() < 6) return;

      // GDACS incidents are now rendered as HTML flame markers (outside the
      // MapLibre layer/event system); their own click handlers stopPropagation
      // so this global handler never sees those clicks.

      if (map.getLayer("effis-burned-area-snapshots-fill")) {
        const snapshotHits = map.queryRenderedFeatures(event.point, {
          layers: ["effis-burned-area-snapshots-fill"],
        });
        if (snapshotHits.length > 0) return;
      }

      const halfQuerySize = 32;

      const topLeft = map.unproject([
        event.point.x - halfQuerySize,
        event.point.y - halfQuerySize,
      ]);

      const bottomRight = map.unproject([
        event.point.x + halfQuerySize,
        event.point.y + halfQuerySize,
      ]);

      // WFS GetFeature validated with EPSG:4326 BBOX as lon,lat,lon,lat
      // (without CRS suffix) + SRSNAME=EPSG:4326.
      const bbox: [number, number, number, number] = [
        Math.min(topLeft.lng, bottomRight.lng),
        Math.min(topLeft.lat, bottomRight.lat),
        Math.max(topLeft.lng, bottomRight.lng),
        Math.max(topLeft.lat, bottomRight.lat),
      ];

      effisRequestControllerRef.current?.abort();
      const controller = new AbortController();
      effisRequestControllerRef.current = controller;

      onEffisBurnedAreaLoadingChangeRef.current(true);

      void (async () => {
        try {
          const response = await fetch("/api/incidents/effis/burned-area", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              longitude: event.lngLat.lng,
              latitude: event.lngLat.lat,
              bbox,
              time: formatEffisTimeRange(7),
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            return;
          }

          const data: unknown = await response.json();
          if (
            data &&
            typeof data === "object" &&
            "burnedArea" in data &&
            data.burnedArea &&
            typeof data.burnedArea === "object"
          ) {
            onEffisBurnedAreaSelectRef.current(
              data.burnedArea as EffisBurnedArea,
            );
          }
        } catch (error: unknown) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }

          if (
            typeof error === "object" &&
            error !== null &&
            "name" in error &&
            error.name === "AbortError"
          ) {
            return;
          }
        } finally {
          if (!controller.signal.aborted) {
            onEffisBurnedAreaLoadingChangeRef.current(false);
          }
        }
      })();
    };

    const setPointerCursor = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const resetCursor = () => {
      map.getCanvas().style.cursor = "";
    };

    let layersReady = false;
    const onMapLoad = () => {
      if (layersReady) return;
      layersReady = true;
      const burnedAreasTime = formatEffisTimeRange(7);

      // Satellite overlays (above Voyager, below country fills / GDACS markers).
      map.addSource("effis-burned-areas", {
        type: "raster",
        tiles: [
          buildEffisWmsTileUrl(
            "modis.ba.poly.week,effis.nrt.ba.poly",
            burnedAreasTime,
          ),
        ],
        tileSize: 256,
        bounds: [-25, 34, 45, 72],
        minzoom: 4,
        maxzoom: 12,
        attribution: "© EFFIS / Copernicus EMS",
      });

      map.addLayer({
        id: "effis-burned-areas-layer",
        type: "raster",
        source: "effis-burned-areas",
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "raster-opacity": 0.55,
          "raster-fade-duration": 0,
          "raster-resampling": "nearest",
        },
      });

      map.addSource("effis-burned-area-snapshots", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "effis-burned-area-snapshots-fill",
        type: "fill",
        source: "effis-burned-area-snapshots",
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "fill-color": "#c2410c",
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "effis-burned-area-snapshots-border",
        type: "line",
        source: "effis-burned-area-snapshots",
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "line-color": "#7f1d1d",
          "line-width": 2.5,
          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "effis-burned-area-snapshots-selected",
        type: "line",
        source: "effis-burned-area-snapshots",
        filter: ["==", ["get", "incidentId"], ""],
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "line-color": "#facc15",
          "line-width": 4,
          "line-opacity": 1,
        },
      });

      map.addSource("europe-countries", {
        type: "geojson",
        data: "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson",
      });

      map.addLayer({
        id: "eurozone-fill",
        type: "fill",
        source: "europe-countries",
        filter: [
          "match",
          ["get", "CNTR_ID"],
          [...EUROZONE_IDS],
          true,
          false,
        ],
        paint: {
          "fill-color": "#2563eb",
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "non-eurozone-fill",
        type: "fill",
        source: "europe-countries",
        filter: [
          "match",
          ["get", "CNTR_ID"],
          [...NON_EUROZONE_IDS],
          true,
          false,
        ],
        paint: {
          "fill-color": "#7c3aed",
          "fill-opacity": 0.18,
        },
      });

      applyEurozoneVisibility(map, showEurozoneRef.current);
      applyNonEurozoneVisibility(map, showNonEurozoneRef.current);

      map.addLayer({
        id: "europe-countries-border",
        type: "line",
        source: "europe-countries",
        filter: [
          "match",
          ["get", "CNTR_ID"],
          [...EU_MEMBER_IDS],
          true,
          false,
        ],
        paint: {
          "line-color": "#60a5fa",
          "line-width": 1.5,
          "line-opacity": 1,
        },
      });

      map.addLayer({
        id: "selected-country-border",
        type: "line",
        source: "europe-countries",
        filter: ["==", ["get", "CNTR_ID"], ""],
        paint: {
          "line-color": "#facc15",
          "line-width": 3,
          "line-opacity": 1,
        },
      });

      map.addLayer({
        id: "schengen-non-eu-fill",
        type: "fill",
        source: "europe-countries",
        filter: [
          "match",
          ["get", "CNTR_ID"],
          ["IS", "LI", "NO", "CH"],
          true,
          false,
        ],
        paint: {
          "fill-color": "#14b8a6",
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "schengen-non-eu-border",
        type: "line",
        source: "europe-countries",
        filter: [
          "match",
          ["get", "CNTR_ID"],
          ["IS", "LI", "NO", "CH"],
          true,
          false,
        ],
        paint: {
          "line-color": "#5eead4",
          "line-width": 0.7,
          "line-opacity": 0.55,
        },
      });

      applySchengenNonEUVisibility(map, showSchengenNonEURef.current);

      map.addLayer({
        id: "eu-candidates-fill",
        type: "fill",
        source: "europe-countries",
        filter: [
          "match",
          ["get", "CNTR_ID"],
          ["AL", "BA", "GE", "MD", "ME", "MK", "RS", "TR", "UA"],
          true,
          false,
        ],
        paint: {
          "fill-color": "#f59e0b",
          "fill-opacity": 0.06,
        },
      });

      map.addLayer({
        id: "eu-candidates-border",
        type: "line",
        source: "europe-countries",
        filter: [
          "match",
          ["get", "CNTR_ID"],
          ["AL", "BA", "GE", "MD", "ME", "MK", "RS", "TR", "UA"],
          true,
          false,
        ],
        paint: {
          "line-color": "#fbbf24",
          "line-width": 1,
          "line-opacity": 0.35,
        },
      });

      applyCandidateVisibility(map, showCandidatesRef.current);

      for (const layerId of SELECTABLE_FILL_LAYERS) {
        map.on("click", layerId, handleCountryClick);
        map.on("mouseenter", layerId, setPointerCursor);
        map.on("mouseleave", layerId, resetCursor);
      }

      map.addLayer({
        id: "eu-potential-candidate-fill",
        type: "fill",
        source: "europe-countries",
        filter: ["==", ["get", "CNTR_ID"], "XK"],
        paint: {
          "fill-color": "#fb923c",
          "fill-opacity": 0.03,
        },
      });

      map.addLayer({
        id: "eu-potential-candidate-border",
        type: "line",
        source: "europe-countries",
        filter: ["==", ["get", "CNTR_ID"], "XK"],
        paint: {
          "line-color": "#fdba74",
          "line-width": 1,
          "line-opacity": 0.2,
          "line-dasharray": [2, 2],
        },
      });

      updateEuOpacity();
      map.on("zoom", updateEuOpacity);

      // NASA FIRMS 7-day history (brown) renders below the 24h red layer.
      map.addSource("firms-recent-history", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "firms-recent-history-fill",
        type: "fill",
        source: "firms-recent-history",
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "fill-color": "#92400e",
          "fill-opacity": 0.10,
        },
      });

      map.addLayer({
        id: "firms-recent-history-border",
        type: "line",
        source: "firms-recent-history",
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "line-color": "#78350f",
          "line-width": 1.2,
          "line-opacity": 0.50,
        },
      });

      map.addLayer({
        id: "firms-recent-history-selected-fill",
        type: "fill",
        source: "firms-recent-history",
        filter: ["==", ["get", "incidentId"], ""],
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "fill-color": "#92400e",
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "firms-recent-history-selected",
        type: "line",
        source: "firms-recent-history",
        filter: ["==", ["get", "incidentId"], ""],
        layout: {
          visibility: showSatelliteBurnedAreasRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "line-color": "#451a03",
          "line-width": 3,
          "line-opacity": 0.90,
        },
      });

      // FIRMS footprints render above country layers and below GDACS flame markers.
      map.addSource("firms-incident-footprints", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "firms-incident-footprints-fill",
        type: "fill",
        source: "firms-incident-footprints",
        layout: {
          visibility: showSatelliteActiveFiresRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0.28,
        },
      });

      map.addLayer({
        id: "firms-incident-footprints-border",
        type: "line",
        source: "firms-incident-footprints",
        layout: {
          visibility: showSatelliteActiveFiresRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "line-color": "#991b1b",
          "line-width": 2,
          "line-opacity": 1,
        },
      });

      map.addLayer({
        id: "firms-incident-footprints-selected-fill",
        type: "fill",
        source: "firms-incident-footprints",
        filter: ["==", ["get", "incidentId"], ""],
        layout: {
          visibility: showSatelliteActiveFiresRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "fill-color": "#dc2626",
          "fill-opacity": 0.38,
        },
      });

      map.addLayer({
        id: "firms-incident-footprints-selected",
        type: "line",
        source: "firms-incident-footprints",
        filter: ["==", ["get", "incidentId"], ""],
        layout: {
          visibility: showSatelliteActiveFiresRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "line-color": "#7f1d1d",
          "line-width": 4,
          "line-opacity": 1,
        },
      });

      // Reorder so brown (7d history) sits below red (24h active) which sits
      // below the EFFIS layers, all stacked above the base country layers.
      const layerStackOrder = [
        "firms-recent-history-fill",
        "firms-recent-history-border",
        "firms-recent-history-selected-fill",
        "firms-recent-history-selected",
        "firms-incident-footprints-fill",
        "firms-incident-footprints-border",
        "firms-incident-footprints-selected-fill",
        "firms-incident-footprints-selected",
        "effis-burned-areas-layer",
        "effis-burned-area-snapshots-fill",
        "effis-burned-area-snapshots-border",
        "effis-burned-area-snapshots-selected",
      ];

      for (const layerId of layerStackOrder) {
        if (map.getLayer(layerId)) {
          map.moveLayer(layerId);
        }
      }

      map.on("click", "effis-burned-area-snapshots-fill", handleEffisSnapshotClick);
      map.on(
        "mouseenter",
        "effis-burned-area-snapshots-fill",
        setPointerCursor,
      );
      map.on("mouseleave", "effis-burned-area-snapshots-fill", resetCursor);
      map.on("click", "firms-incident-footprints-fill", handleFirmsFootprintClick);
      map.on(
        "mouseenter",
        "firms-incident-footprints-fill",
        setPointerCursor,
      );
      map.on("mouseleave", "firms-incident-footprints-fill", resetCursor);
      map.on("click", "firms-recent-history-fill", handleFirmsHistoryClick);
      map.on("mouseenter", "firms-recent-history-fill", setPointerCursor);
      map.on("mouseleave", "firms-recent-history-fill", resetCursor);
      map.on("click", handleEffisBurnedAreaClick);

      // Re-run GeoJSON sync effects that may have run before sources existed
      // (history GET from Supabase cache is often faster than map load).
      setMapSourcesReadyVersion((version) => version + 1);
    };

    if (map.loaded()) {
      onMapLoad();
    } else {
      map.on("load", onMapLoad);
    }

    return () => {
      map.off("load", onMapLoad);
      for (const layerId of SELECTABLE_FILL_LAYERS) {
        map.off("click", layerId, handleCountryClick);
        map.off("mouseenter", layerId, setPointerCursor);
        map.off("mouseleave", layerId, resetCursor);
      }

      map.off(
        "click",
        "effis-burned-area-snapshots-fill",
        handleEffisSnapshotClick,
      );
      map.off(
        "mouseenter",
        "effis-burned-area-snapshots-fill",
        setPointerCursor,
      );
      map.off("mouseleave", "effis-burned-area-snapshots-fill", resetCursor);
      map.off(
        "click",
        "firms-incident-footprints-fill",
        handleFirmsFootprintClick,
      );
      map.off(
        "mouseenter",
        "firms-incident-footprints-fill",
        setPointerCursor,
      );
      map.off("mouseleave", "firms-incident-footprints-fill", resetCursor);
      map.off("click", "firms-recent-history-fill", handleFirmsHistoryClick);
      map.off("mouseenter", "firms-recent-history-fill", setPointerCursor);
      map.off("mouseleave", "firms-recent-history-fill", resetCursor);
      map.off("click", handleEffisBurnedAreaClick);

      effisRequestControllerRef.current?.abort();
      for (const marker of firmsLabelMarkersRef.current) {
        marker.remove();
      }
      firmsLabelMarkersRef.current = [];
      for (const marker of gdacsFlameMarkersRef.current) {
        marker.remove();
      }
      gdacsFlameMarkersRef.current = [];
      map.off("zoom", updateEuOpacity);
      map.off("error", handleMapError);
      map.remove();
      mapRef.current = null;
      if (focusGeometryRef) {
        focusGeometryRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!focusGeometryRef) return;

    focusGeometryRef.current = (geometry: GeoJSON.Geometry) => {
      const map = mapRef.current;
      if (!map || !("coordinates" in geometry)) return;

      const bounds = new LngLatBounds();
      extendBoundsWithCoordinates(bounds, geometry.coordinates);

      if (bounds.isEmpty()) return;

      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 12,
        duration: 800,
      });
    };

    return () => {
      if (focusGeometryRef.current) {
        focusGeometryRef.current = null;
      }
    };
  }, [focusGeometryRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyEurozoneVisibility(map, showEurozone);
  }, [showEurozone]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyNonEurozoneVisibility(map, showNonEurozone);
  }, [showNonEurozone]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyCandidateVisibility(map, showCandidates);
  }, [showCandidates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applySchengenNonEUVisibility(map, showSchengenNonEU);
  }, [showSchengenNonEU]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyWildfireVisibility(showWildfires);
  }, [showWildfires]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applySatelliteActiveFiresVisibility(map, showSatelliteActiveFires);
  }, [showSatelliteActiveFires]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applySatelliteBurnedAreasVisibility(map, showSatelliteBurnedAreas);

    if (!showSatelliteBurnedAreas) {
      onEffisBurnedAreasAvailabilityChangeRef.current?.(false);
    }
  }, [showSatelliteBurnedAreas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(
      "effis-burned-area-snapshots",
    ) as GeoJSONSource | undefined;
    if (!source) return;

    const features = Object.values(effisSnapshotsByIncidentId)
      .filter((snapshot) => {
        const geometryType = snapshot.geometry?.type;
        return geometryType === "Polygon" || geometryType === "MultiPolygon";
      })
      .map((snapshot) => ({
        type: "Feature" as const,
        id: snapshot.incidentId,
        properties: {
          incidentId: snapshot.incidentId,
          areaHectares: snapshot.areaHectares,
          sourceUpdatedAt: snapshot.sourceUpdatedAt,
          fetchedAt: snapshot.fetchedAt,
        },
        geometry: snapshot.geometry,
      }));

    source.setData({
      type: "FeatureCollection",
      features,
    });
  }, [effisSnapshotsByIncidentId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getLayer("effis-burned-area-snapshots-selected")) return;

    map.setFilter("effis-burned-area-snapshots-selected", [
      "==",
      ["get", "incidentId"],
      selectedWildfireId ?? "",
    ]);
  }, [selectedWildfireId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer("firms-incident-footprints-selected-fill")) {
      map.setFilter("firms-incident-footprints-selected-fill", [
        "==",
        ["get", "incidentId"],
        selectedWildfireId ?? "",
      ]);
    }

    if (map.getLayer("firms-incident-footprints-selected")) {
      map.setFilter("firms-incident-footprints-selected", [
        "==",
        ["get", "incidentId"],
        selectedWildfireId ?? "",
      ]);
    }
  }, [selectedWildfireId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer("firms-recent-history-selected-fill")) {
      map.setFilter("firms-recent-history-selected-fill", [
        "==",
        ["get", "incidentId"],
        selectedWildfireId ?? "",
      ]);
    }

    if (map.getLayer("firms-recent-history-selected")) {
      map.setFilter("firms-recent-history-selected", [
        "==",
        ["get", "incidentId"],
        selectedWildfireId ?? "",
      ]);
    }
  }, [selectedWildfireId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of gdacsFlameMarkersRef.current) {
      marker.remove();
    }
    gdacsFlameMarkersRef.current = [];

    for (const incident of wildfireIncidents) {
      const el = createFlameMarkerElement(
        incident,
        incident.id === selectedWildfireId,
      );
      el.style.display = showWildfires ? "" : "none";
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onWildfireSelectRef.current(incident.id);
      });

      const marker = new Marker({ element: el, anchor: "bottom" })
        .setLngLat([incident.longitude, incident.latitude])
        .addTo(map);

      gdacsFlameMarkersRef.current.push(marker);
    }
  }, [wildfireIncidents, showWildfires, selectedWildfireId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const footprintsSource = map.getSource(
      "firms-incident-footprints",
    ) as GeoJSONSource | undefined;
    if (!footprintsSource) return;

    const incidentsById = new Map(
      wildfireIncidents.map((incident) => [incident.id, incident]),
    );

    const snapshots = Object.values(firmsSnapshotsByIncidentId).filter(
      (snapshot) => snapshot.geometry?.type === "MultiPolygon",
    );

    // MapLibre feature-state / hover-friendly rendering needs one Polygon per
    // ring-group; the Supabase snapshot itself stays an untouched MultiPolygon.
    const footprintFeatures = snapshots.flatMap((snapshot) =>
      snapshot.geometry.coordinates.map((polygonCoordinates, footprintIndex) => ({
        type: "Feature" as const,
        properties: {
          incidentId: snapshot.incidentId,
          incidentName: snapshot.incidentName,
          sourceUpdatedAt: snapshot.sourceUpdatedAt,
          approximateAreaHectares: snapshot.approximateAreaHectares,
          detectionCount: snapshot.detectionCount,
          sensors: snapshot.sensors.join(", "),
          footprintIndex,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: polygonCoordinates,
        },
      })),
    );

    footprintsSource.setData({
      type: "FeatureCollection",
      features: footprintFeatures,
    });

    for (const marker of firmsLabelMarkersRef.current) {
      marker.remove();
    }
    firmsLabelMarkersRef.current = [];

    if (!showSatelliteActiveFires) {
      return;
    }

    const dateFormatter = new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const snapshot of snapshots) {
      const incident = incidentsById.get(snapshot.incidentId);
      if (!incident) continue;

      const rawDate = snapshot.sourceUpdatedAt ?? snapshot.fetchedAt;
      const parsedDate = rawDate ? new Date(rawDate) : null;
      const shortDate =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? dateFormatter.format(parsedDate)
          : null;
      const label = shortDate
        ? `${snapshot.incidentName} · ${shortDate}`
        : snapshot.incidentName;

      const el = document.createElement("div");
      el.textContent = label;
      el.style.cssText =
        "cursor:pointer;pointer-events:auto;white-space:nowrap;font:700 14px/1.3 system-ui,sans-serif;color:#b91c1c;background:rgba(255,255,255,0.9);border:1px solid #fca5a5;border-radius:5px;padding:3px 6px;box-shadow:0 1px 4px rgba(0,0,0,0.25);";
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onWildfireSelectRef.current(snapshot.incidentId);
      });

      // Sits to the right of the GDACS flame marker at the same coordinate.
      const marker = new Marker({ element: el, anchor: "left", offset: [18, -18] })
        .setLngLat([incident.longitude, incident.latitude])
        .addTo(map);
      firmsLabelMarkersRef.current.push(marker);
    }
  }, [
    firmsSnapshotsByIncidentId,
    wildfireIncidents,
    locale,
    showSatelliteActiveFires,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const historySource = map.getSource(
      "firms-recent-history",
    ) as GeoJSONSource | undefined;
    if (!historySource) return;

    const snapshots = Object.values(firmsHistorySnapshotsByIncidentId).filter(
      (snapshot) => snapshot.geometry?.type === "MultiPolygon",
    );

    const historyFeatures = snapshots.flatMap((snapshot) =>
      snapshot.geometry.coordinates.map((polygonCoordinates, footprintIndex) => ({
        type: "Feature" as const,
        properties: {
          incidentId: snapshot.incidentId,
          incidentName: snapshot.incidentName,
          footprintIndex,
          sourceUpdatedAt: snapshot.sourceUpdatedAt,
          periodStart: snapshot.periodStart ?? null,
          periodEnd: snapshot.periodEnd ?? null,
          approximateAreaHectares: snapshot.approximateAreaHectares,
          detectionCount: snapshot.detectionCount,
          sensors: snapshot.sensors.join(", "),
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: polygonCoordinates,
        },
      })),
    );

    historySource.setData({
      type: "FeatureCollection",
      features: historyFeatures,
    });
  }, [firmsHistorySnapshotsByIncidentId, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getLayer("selected-country-border")) return;

    if (selectedCountryCode) {
      map.setFilter("selected-country-border", [
        "==",
        ["get", "CNTR_ID"],
        selectedCountryCode,
      ]);
    } else {
      map.setFilter("selected-country-border", [
        "==",
        ["get", "CNTR_ID"],
        "",
      ]);

      map.easeTo({
        center: [15.2551, 54.526],
        zoom: 4,
        duration: 800,
      });
    }
  }, [selectedCountryCode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) return;
    if (lastFocusNonceRef.current === focusRequest.nonce) return;
    lastFocusNonceRef.current = focusRequest.nonce;

    if (focusRequest.kind === "europe") {
      map.easeTo({
        center: [15.2551, 54.526],
        zoom: 4,
        duration: 800,
      });
      return;
    }

    if (focusRequest.kind === "point") {
      map.easeTo({
        center: [focusRequest.longitude, focusRequest.latitude],
        zoom: focusRequest.zoom,
        duration: 800,
      });
      return;
    }

    if (focusRequest.kind === "country") {
      const features = map.querySourceFeatures("europe-countries", {
        filter: ["==", ["get", "CNTR_ID"], focusRequest.countryCode],
      });

      const bounds = new LngLatBounds();
      for (const feature of features) {
        if (feature.geometry && "coordinates" in feature.geometry) {
          extendBoundsWithCoordinates(bounds, feature.geometry.coordinates);
        }
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: 80,
          maxZoom: 7,
          duration: 800,
        });
      }
    }
  }, [focusRequest, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (temporaryMarkerRef.current) {
      temporaryMarkerRef.current.remove();
      temporaryMarkerRef.current = null;
    }

    if (!temporaryMarker) return;

    const el = document.createElement("div");
    el.className = "eu-temp-place-marker";
    el.style.width = "18px";
    el.style.height = "18px";
    el.style.borderRadius = "9999px";
    el.style.background = "#f59e0b";
    el.style.border = "2px solid #fff7ed";
    el.style.boxShadow = "0 0 0 4px rgba(245, 158, 11, 0.35)";

    temporaryMarkerRef.current = new Marker({ element: el, anchor: "center" })
      .setLngLat([temporaryMarker.longitude, temporaryMarker.latitude])
      .addTo(map);

    return () => {
      temporaryMarkerRef.current?.remove();
      temporaryMarkerRef.current = null;
    };
  }, [temporaryMarker, mapSourcesReadyVersion]);

  return (
    <div ref={mapContainerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
  );
}
