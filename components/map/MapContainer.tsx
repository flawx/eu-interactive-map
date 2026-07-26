"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  LngLatBounds,
  setWorkerUrl,
  type ErrorEvent as MapLibreErrorEvent,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapSourceDataEvent,
} from "maplibre-gl";
import type {
  EffisBurnedArea,
  WildfireIncident,
} from "@/lib/incidents/types";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type { Locale } from "@/lib/i18n/config";
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
  onFirmsRasterAvailabilityChange,
  onEffisBurnedAreasAvailabilityChange,
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
  onFirmsRasterAvailabilityChange?: (available: boolean) => void;
  onEffisBurnedAreasAvailabilityChange?: (unavailable: boolean) => void;
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
  const showWildfiresRef = useRef(showWildfires);
  showWildfiresRef.current = showWildfires;
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
  const wildfireIncidentsRef = useRef(wildfireIncidents);
  wildfireIncidentsRef.current = wildfireIncidents;
  const firmsLabelMarkersRef = useRef<Marker[]>([]);
  const effisRequestControllerRef = useRef<AbortController | null>(null);
  const firmsSnapshotsByIncidentIdRef = useRef(firmsSnapshotsByIncidentId);
  firmsSnapshotsByIncidentIdRef.current = firmsSnapshotsByIncidentId;
  const onFirmsRasterAvailabilityChangeRef = useRef(
    onFirmsRasterAvailabilityChange,
  );
  onFirmsRasterAvailabilityChangeRef.current = onFirmsRasterAvailabilityChange;
  const onEffisBurnedAreasAvailabilityChangeRef = useRef(
    onEffisBurnedAreasAvailabilityChange,
  );
  onEffisBurnedAreasAvailabilityChangeRef.current =
    onEffisBurnedAreasAvailabilityChange;

  const toWildfireFeatureCollection = (incidents: WildfireIncident[]) => ({
    type: "FeatureCollection" as const,
    features: incidents.map((incident) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [incident.longitude, incident.latitude],
      },
      properties: {
        id: incident.id,
        title: incident.title,
        alertLevel: incident.alertLevel,
      },
    })),
  });

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

  const applyWildfireVisibility = (map: MapLibreMap, visible: boolean) => {
    applyLayerVisibility(map, "wildfire-incidents-halo", visible);
    applyLayerVisibility(map, "wildfire-incidents-points", visible);
  };

  const applySatelliteActiveFiresVisibility = (
    map: MapLibreMap,
    visible: boolean,
  ) => {
    applyLayerVisibility(map, "firms-active-fires-layer", visible);
    applyLayerVisibility(map, "firms-incident-footprints-fill", visible);
    applyLayerVisibility(map, "firms-incident-footprints-border", visible);
    applyLayerVisibility(map, "firms-incident-footprints-selected", visible);
  };

  const applySatelliteBurnedAreasVisibility = (
    map: MapLibreMap,
    visible: boolean,
  ) => {
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

      const isRasterSource =
        eventSourceId === "effis-burned-areas" ||
        eventSourceId === "firms-active-fires";

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
        (
          (map.getLayer("effis-burned-areas-layer") &&
            map.getLayoutProperty(
              "effis-burned-areas-layer",
              "visibility",
            ) === "visible") ||
          (map.getLayer("firms-active-fires-layer") &&
            map.getLayoutProperty(
              "firms-active-fires-layer",
              "visibility",
            ) === "visible")
        )
      ) {
        return;
      }

      console.error(error);
    };

    map.on("error", handleMapError);

    const handleFirmsSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId === "firms-active-fires" && event.isSourceLoaded) {
        onFirmsRasterAvailabilityChangeRef.current?.(true);
      }
    };

    map.on("sourcedata", handleFirmsSourceData);

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

    const handleWildfireClick = (event: MapLayerMouseEvent) => {
      const incidentId = event.features?.[0]?.properties?.id;

      if (typeof incidentId === "string") {
        onWildfireSelectRef.current(incidentId);
      } else if (typeof incidentId === "number") {
        onWildfireSelectRef.current(String(incidentId));
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

    const handleFirmsFootprintClick = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties;
      const rawIncidentId = properties?.incidentId;

      const incidentId =
        typeof rawIncidentId === "string"
          ? rawIncidentId
          : typeof rawIncidentId === "number"
            ? String(rawIncidentId)
            : null;

      if (!incidentId) return;

      onWildfireSelectRef.current(incidentId);

      const minLon = properties?.bboxMinLon;
      const minLat = properties?.bboxMinLat;
      const maxLon = properties?.bboxMaxLon;
      const maxLat = properties?.bboxMaxLat;

      const bbox: [number, number, number, number] | null =
        typeof minLon === "number" &&
        typeof minLat === "number" &&
        typeof maxLon === "number" &&
        typeof maxLat === "number"
          ? [minLon, minLat, maxLon, maxLat]
          : (firmsSnapshotsByIncidentIdRef.current[incidentId]?.bbox ?? null);

      if (!bbox) return;

      const bounds = new LngLatBounds(
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      );

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: { top: 40, bottom: 40, left: 360, right: 40 },
          maxZoom: 12,
          duration: 800,
        });
      }
    };

    const handleEffisBurnedAreaClick = (event: MapLayerMouseEvent) => {
      if (!showSatelliteBurnedAreasRef.current) return;
      if (map.getZoom() < 6) return;

      if (map.getLayer("wildfire-incidents-points")) {
        const wildfireHits = map.queryRenderedFeatures(event.point, {
          layers: ["wildfire-incidents-points"],
        });
        if (wildfireHits.length > 0) return;
      }

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

      map.addSource("firms-active-fires", {
        type: "raster",
        tiles: ["/api/incidents/firms/tiles/{z}/{x}/{y}"],
        tileSize: 256,
        minzoom: 2,
        maxzoom: 12,
        attribution: "© NASA FIRMS",
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

      map.addLayer({
        id: "firms-active-fires-layer",
        type: "raster",
        source: "firms-active-fires",
        layout: {
          visibility: showSatelliteActiveFiresRef.current
            ? "visible"
            : "none",
        },
        paint: {
          "raster-opacity": 0.85,
          "raster-fade-duration": 0,
          "raster-resampling": "nearest",
        },
      });

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
          "fill-color": "#dc2626",
          "fill-opacity": 0.18,
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
          "line-color": "#7f1d1d",
          "line-width": 1.5,
          "line-opacity": 0.9,
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
          "line-width": 3,
          "line-opacity": 1,
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

      map.addSource("wildfire-incidents", {
        type: "geojson",
        data: toWildfireFeatureCollection(wildfireIncidentsRef.current),
      });

      map.addLayer({
        id: "wildfire-incidents-halo",
        type: "circle",
        source: "wildfire-incidents",
        paint: {
          "circle-radius": 14,
          "circle-opacity": 0.18,
          "circle-color": [
            "match",
            ["get", "alertLevel"],
            "red",
            "#ef4444",
            "orange",
            "#f59e0b",
            "green",
            "#22c55e",
            "#64748b",
          ],
        },
      });

      map.addLayer({
        id: "wildfire-incidents-points",
        type: "circle",
        source: "wildfire-incidents",
        paint: {
          "circle-radius": 8,
          "circle-color": [
            "match",
            ["get", "alertLevel"],
            "red",
            "#ef4444",
            "orange",
            "#f59e0b",
            "green",
            "#22c55e",
            "#64748b",
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-stroke-opacity": 0.9,
        },
      });

      applyWildfireVisibility(map, showWildfiresRef.current);

      map.on("click", "wildfire-incidents-points", handleWildfireClick);
      map.on("mouseenter", "wildfire-incidents-points", setPointerCursor);
      map.on("mouseleave", "wildfire-incidents-points", resetCursor);
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
      map.on("click", handleEffisBurnedAreaClick);
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

      map.off("click", "wildfire-incidents-points", handleWildfireClick);
      map.off("mouseenter", "wildfire-incidents-points", setPointerCursor);
      map.off("mouseleave", "wildfire-incidents-points", resetCursor);
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
      map.off("click", handleEffisBurnedAreaClick);

      effisRequestControllerRef.current?.abort();
      for (const marker of firmsLabelMarkersRef.current) {
        marker.remove();
      }
      firmsLabelMarkersRef.current = [];
      map.off("zoom", updateEuOpacity);
      map.off("error", handleMapError);
      map.off("sourcedata", handleFirmsSourceData);
      map.remove();
      mapRef.current = null;
    };
  }, []);

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
    applyWildfireVisibility(map, showWildfires);
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
    if (!map.getLayer("firms-incident-footprints-selected")) return;

    map.setFilter("firms-incident-footprints-selected", [
      "==",
      ["get", "incidentId"],
      selectedWildfireId ?? "",
    ]);

    if (map.getLayer("firms-incident-footprints-fill")) {
      map.setPaintProperty("firms-incident-footprints-fill", "fill-opacity", [
        "case",
        ["==", ["get", "incidentId"], selectedWildfireId ?? ""],
        0.28,
        0.18,
      ]);
    }
  }, [selectedWildfireId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("wildfire-incidents") as GeoJSONSource | undefined;
    if (!source) return;

    source.setData(toWildfireFeatureCollection(wildfireIncidents));
  }, [wildfireIncidents]);

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

    const footprintFeatures = snapshots.map((snapshot) => ({
      type: "Feature" as const,
      id: snapshot.incidentId,
      properties: {
        incidentId: snapshot.incidentId,
        incidentName: snapshot.incidentName,
        sourceUpdatedAt: snapshot.sourceUpdatedAt,
        fetchedAt: snapshot.fetchedAt,
        approximateAreaHectares: snapshot.approximateAreaHectares,
        detectionCount: snapshot.detectionCount,
        sensors: snapshot.sensors.join(", "),
        bboxMinLon: snapshot.bbox[0],
        bboxMinLat: snapshot.bbox[1],
        bboxMaxLon: snapshot.bbox[2],
        bboxMaxLat: snapshot.bbox[3],
      },
      geometry: snapshot.geometry,
    }));

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
        ? `${snapshot.incidentName} (${shortDate})`
        : snapshot.incidentName;

      const el = document.createElement("div");
      el.textContent = label;
      el.style.cssText =
        "pointer-events:none;transform:translate(-50%,8px);white-space:nowrap;font:600 11px/1.2 system-ui,sans-serif;color:#111827;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff,0 0 4px #fff;";

      const marker = new Marker({ element: el, anchor: "top" })
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

  return (
    <div ref={mapContainerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
  );
}
