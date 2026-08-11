/**
 * MapLibre layer wiring for the "Tourism Travel V2" commit-1 visitor
 * services datasets: WiFi4EU hotspots (clustered, viewport-loaded from
 * `/api/travel/wifi4eu`), Tourist Information Offices, Diplomatic Missions
 * (clustered, static curated dataset) and Visitor Safety & Assistance.
 * Mirrors the `europeProjectsEconomyLayers.ts` / `europeInstitutionsLayers.ts`
 * patterns — kept simple (circle + text layers, no custom canvas icons)
 * since these are small curated datasets (except WiFi4EU, which streams from
 * the viewport API but is still a small fixture for this commit).
 */

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";

import { toFeatureCollection as buildTouristOfficesCollection } from "@/lib/travel/touristOffices";
import { toFeatureCollection as buildDiplomaticMissionsCollection } from "@/lib/travel/diplomaticMissions";
import { toFeatureCollection as buildVisitorSafetyCollection } from "@/lib/travel/visitorSafety";
import {
  createViewportDataLoader,
  type ViewportBbox,
  type ViewportDataLoader,
} from "@/lib/map/dataLayers/viewportDataLoader";

export const WIFI4EU_SOURCE_ID = "wifi4eu";
export const TOURIST_INFORMATION_OFFICES_SOURCE_ID =
  "tourist-information-offices";
export const DIPLOMATIC_MISSIONS_SOURCE_ID = "diplomatic-missions";
export const VISITOR_SAFETY_ASSISTANCE_SOURCE_ID = "visitor-safety-assistance";

export const WIFI4EU_LAYER_IDS = [
  "wifi4eu-clusters",
  "wifi4eu-cluster-count",
  "wifi4eu-halo",
  "wifi4eu-symbol",
] as const;

export const TOURIST_INFORMATION_OFFICES_LAYER_IDS = [
  "tourist-information-offices-halo",
  "tourist-information-offices-symbol",
  "tourist-information-offices-label",
] as const;

export const DIPLOMATIC_MISSIONS_LAYER_IDS = [
  "diplomatic-missions-clusters",
  "diplomatic-missions-cluster-count",
  "diplomatic-missions-halo",
  "diplomatic-missions-symbol",
] as const;

export const VISITOR_SAFETY_ASSISTANCE_LAYER_IDS = [
  "visitor-safety-assistance-halo",
  "visitor-safety-assistance-symbol",
  "visitor-safety-assistance-label",
] as const;

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

export type TravelVisitorServicesLayerOptions = {
  showWifi4Eu: boolean;
  showTouristInformationOffices: boolean;
  showDiplomaticMissions: boolean;
  showVisitorSafetyAssistance: boolean;
  selectedWifi4EuHotspotId: string | null;
  selectedTouristOfficeId: string | null;
  selectedDiplomaticMissionId: string | null;
  selectedVisitorSafetyLocationId: string | null;
};

/**
 * Adds sources/layers for all four commit-1 visitor services datasets if
 * they don't already exist. Safe to call repeatedly (e.g. on every
 * `style.load`). The WiFi4EU source starts empty — populated client-side by
 * `createWifi4EuViewportLoader` once the layer is switched on.
 */
export function ensureTravelVisitorServicesLayers(
  map: MapLibreMap,
  options: TravelVisitorServicesLayerOptions,
): void {
  // --- WiFi4EU hotspots (clustered, viewport-loaded) ---
  if (!map.getSource(WIFI4EU_SOURCE_ID)) {
    map.addSource(WIFI4EU_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_COLLECTION,
      promoteId: "id",
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 50,
    });
  }

  if (!map.getLayer("wifi4eu-clusters")) {
    map.addLayer({
      id: "wifi4eu-clusters",
      type: "circle",
      source: WIFI4EU_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showWifi4Eu ? "visible" : "none",
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

  if (!map.getLayer("wifi4eu-cluster-count")) {
    map.addLayer({
      id: "wifi4eu-cluster-count",
      type: "symbol",
      source: WIFI4EU_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showWifi4Eu ? "visible" : "none",
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["Noto Sans Bold"],
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  if (!map.getLayer("wifi4eu-halo")) {
    map.addLayer({
      id: "wifi4eu-halo",
      type: "circle",
      source: WIFI4EU_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 3,
      layout: {
        visibility: options.showWifi4Eu ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedWifi4EuHotspotId,
          18,
          14,
        ),
        "circle-color": "#22d3ee",
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("wifi4eu-symbol")) {
    map.addLayer({
      id: "wifi4eu-symbol",
      type: "circle",
      source: WIFI4EU_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 3,
      layout: {
        visibility: options.showWifi4Eu ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedWifi4EuHotspotId,
          8,
          6,
        ),
        "circle-color": "#0891b2",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  // --- Tourist Information Offices (small curated dataset, not clustered) ---
  if (!map.getSource(TOURIST_INFORMATION_OFFICES_SOURCE_ID)) {
    map.addSource(TOURIST_INFORMATION_OFFICES_SOURCE_ID, {
      type: "geojson",
      data: buildTouristOfficesCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("tourist-information-offices-halo")) {
    map.addLayer({
      id: "tourist-information-offices-halo",
      type: "circle",
      source: TOURIST_INFORMATION_OFFICES_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showTouristInformationOffices ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedTouristOfficeId,
          18,
          14,
        ),
        "circle-color": "#2dd4bf",
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("tourist-information-offices-symbol")) {
    map.addLayer({
      id: "tourist-information-offices-symbol",
      type: "circle",
      source: TOURIST_INFORMATION_OFFICES_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showTouristInformationOffices ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedTouristOfficeId,
          8,
          6,
        ),
        "circle-color": "#0d9488",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer("tourist-information-offices-label")) {
    map.addLayer({
      id: "tourist-information-offices-label",
      type: "symbol",
      source: TOURIST_INFORMATION_OFFICES_SOURCE_ID,
      minzoom: 5,
      layout: {
        visibility: options.showTouristInformationOffices ? "visible" : "none",
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
        "text-color": "#0d9488",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }

  // --- Diplomatic Missions (clustered — Brussels European Quarter is dense) ---
  if (!map.getSource(DIPLOMATIC_MISSIONS_SOURCE_ID)) {
    map.addSource(DIPLOMATIC_MISSIONS_SOURCE_ID, {
      type: "geojson",
      data: buildDiplomaticMissionsCollection(),
      promoteId: "id",
      cluster: true,
      clusterMaxZoom: 9,
      clusterRadius: 45,
    });
  }

  if (!map.getLayer("diplomatic-missions-clusters")) {
    map.addLayer({
      id: "diplomatic-missions-clusters",
      type: "circle",
      source: DIPLOMATIC_MISSIONS_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showDiplomaticMissions ? "visible" : "none",
      },
      paint: {
        "circle-color": "#334155",
        "circle-opacity": 0.85,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-radius": ["step", ["get", "point_count"], 14, 8, 18, 20, 22],
      },
    });
  }

  if (!map.getLayer("diplomatic-missions-cluster-count")) {
    map.addLayer({
      id: "diplomatic-missions-cluster-count",
      type: "symbol",
      source: DIPLOMATIC_MISSIONS_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showDiplomaticMissions ? "visible" : "none",
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["Noto Sans Bold"],
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  if (!map.getLayer("diplomatic-missions-halo")) {
    map.addLayer({
      id: "diplomatic-missions-halo",
      type: "circle",
      source: DIPLOMATIC_MISSIONS_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 3,
      layout: {
        visibility: options.showDiplomaticMissions ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedDiplomaticMissionId,
          18,
          14,
        ),
        "circle-color": "#94a3b8",
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("diplomatic-missions-symbol")) {
    map.addLayer({
      id: "diplomatic-missions-symbol",
      type: "circle",
      source: DIPLOMATIC_MISSIONS_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 3,
      layout: {
        visibility: options.showDiplomaticMissions ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedDiplomaticMissionId,
          8,
          6,
        ),
        "circle-color": "#334155",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  // --- Visitor Safety & Assistance (very small curated dataset, not clustered) ---
  if (!map.getSource(VISITOR_SAFETY_ASSISTANCE_SOURCE_ID)) {
    map.addSource(VISITOR_SAFETY_ASSISTANCE_SOURCE_ID, {
      type: "geojson",
      data: buildVisitorSafetyCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("visitor-safety-assistance-halo")) {
    map.addLayer({
      id: "visitor-safety-assistance-halo",
      type: "circle",
      source: VISITOR_SAFETY_ASSISTANCE_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showVisitorSafetyAssistance ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedVisitorSafetyLocationId,
          18,
          14,
        ),
        "circle-color": "#f87171",
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("visitor-safety-assistance-symbol")) {
    map.addLayer({
      id: "visitor-safety-assistance-symbol",
      type: "circle",
      source: VISITOR_SAFETY_ASSISTANCE_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showVisitorSafetyAssistance ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedVisitorSafetyLocationId,
          8,
          6,
        ),
        "circle-color": "#dc2626",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer("visitor-safety-assistance-label")) {
    map.addLayer({
      id: "visitor-safety-assistance-label",
      type: "symbol",
      source: VISITOR_SAFETY_ASSISTANCE_SOURCE_ID,
      minzoom: 5,
      layout: {
        visibility: options.showVisitorSafetyAssistance ? "visible" : "none",
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
        "text-color": "#dc2626",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }
}

export function setTravelVisitorServicesVisibility(
  map: MapLibreMap,
  options: {
    showWifi4Eu: boolean;
    showTouristInformationOffices: boolean;
    showDiplomaticMissions: boolean;
    showVisitorSafetyAssistance: boolean;
  },
): void {
  const groups: Array<[readonly string[], boolean]> = [
    [WIFI4EU_LAYER_IDS, options.showWifi4Eu],
    [
      TOURIST_INFORMATION_OFFICES_LAYER_IDS,
      options.showTouristInformationOffices,
    ],
    [DIPLOMATIC_MISSIONS_LAYER_IDS, options.showDiplomaticMissions],
    [
      VISITOR_SAFETY_ASSISTANCE_LAYER_IDS,
      options.showVisitorSafetyAssistance,
    ],
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

export function updateTravelVisitorServicesSelection(
  map: MapLibreMap,
  options: {
    selectedWifi4EuHotspotId: string | null;
    selectedTouristOfficeId: string | null;
    selectedDiplomaticMissionId: string | null;
    selectedVisitorSafetyLocationId: string | null;
  },
): void {
  if (map.getLayer("wifi4eu-halo")) {
    map.setPaintProperty(
      "wifi4eu-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedWifi4EuHotspotId, 18, 14),
    );
  }
  if (map.getLayer("wifi4eu-symbol")) {
    map.setPaintProperty(
      "wifi4eu-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedWifi4EuHotspotId, 8, 6),
    );
  }
  if (map.getLayer("tourist-information-offices-halo")) {
    map.setPaintProperty(
      "tourist-information-offices-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedTouristOfficeId, 18, 14),
    );
  }
  if (map.getLayer("tourist-information-offices-symbol")) {
    map.setPaintProperty(
      "tourist-information-offices-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedTouristOfficeId, 8, 6),
    );
  }
  if (map.getLayer("diplomatic-missions-halo")) {
    map.setPaintProperty(
      "diplomatic-missions-halo",
      "circle-radius",
      entitySelectionRadiusExpression(
        options.selectedDiplomaticMissionId,
        18,
        14,
      ),
    );
  }
  if (map.getLayer("diplomatic-missions-symbol")) {
    map.setPaintProperty(
      "diplomatic-missions-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedDiplomaticMissionId, 8, 6),
    );
  }
  if (map.getLayer("visitor-safety-assistance-halo")) {
    map.setPaintProperty(
      "visitor-safety-assistance-halo",
      "circle-radius",
      entitySelectionRadiusExpression(
        options.selectedVisitorSafetyLocationId,
        18,
        14,
      ),
    );
  }
  if (map.getLayer("visitor-safety-assistance-symbol")) {
    map.setPaintProperty(
      "visitor-safety-assistance-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(
        options.selectedVisitorSafetyLocationId,
        8,
        6,
      ),
    );
  }
}

export type TravelVisitorServicesClickHandlers = {
  onWifi4EuHotspotClick: (event: MapLayerMouseEvent) => void;
  onWifi4EuClusterClick: (event: MapLayerMouseEvent) => void;
  onTouristOfficeClick: (event: MapLayerMouseEvent) => void;
  onDiplomaticMissionClick: (event: MapLayerMouseEvent) => void;
  onDiplomaticMissionClusterClick: (event: MapLayerMouseEvent) => void;
  onVisitorSafetyLocationClick: (event: MapLayerMouseEvent) => void;
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
export function attachTravelVisitorServicesHandlers(
  map: MapLibreMap,
  handlers: TravelVisitorServicesClickHandlers,
  setPointerCursor: () => void,
  resetCursor: () => void,
): () => void {
  const wifi4EuClusterHandler = createClusterClickHandler(
    map,
    WIFI4EU_SOURCE_ID,
    handlers.onWifi4EuClusterClick,
  );
  const diplomaticClusterHandler = createClusterClickHandler(
    map,
    DIPLOMATIC_MISSIONS_SOURCE_ID,
    handlers.onDiplomaticMissionClusterClick,
  );

  const interactiveLayers: Array<
    [string, (event: MapLayerMouseEvent) => void]
  > = [
    ["wifi4eu-clusters", wifi4EuClusterHandler],
    ["wifi4eu-symbol", handlers.onWifi4EuHotspotClick],
    [
      "tourist-information-offices-symbol",
      handlers.onTouristOfficeClick,
    ],
    ["diplomatic-missions-clusters", diplomaticClusterHandler],
    ["diplomatic-missions-symbol", handlers.onDiplomaticMissionClick],
    [
      "visitor-safety-assistance-symbol",
      handlers.onVisitorSafetyLocationClick,
    ],
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

export type Wifi4EuViewportLoaderHandle = {
  requestViewport: (bbox: ViewportBbox, zoom: number) => void;
  cancel: () => void;
  destroy: () => void;
};

/**
 * Client-side viewport loader for WiFi4EU hotspots — fetches
 * `/api/travel/wifi4eu` scoped to the current map bbox and pushes the result
 * into the `wifi4eu` GeoJSON source. Caller is responsible for only calling
 * `requestViewport` while the layer is switched on, and calling `cancel()`
 * when it's switched off (never fetch while OFF).
 */
export function createWifi4EuViewportLoader(
  map: MapLibreMap,
): Wifi4EuViewportLoaderHandle {
  const loader: ViewportDataLoader<GeoJSON.FeatureCollection, Record<string, never>> =
    createViewportDataLoader<GeoJSON.FeatureCollection>({
      fetchUrl: (bbox) =>
        `/api/travel/wifi4eu?bbox=${bbox.join(",")}&limit=500`,
      buildKey: (bbox) => bbox.join(","),
      onData: (data) => {
        const source = map.getSource(WIFI4EU_SOURCE_ID) as
          | GeoJSONSource
          | undefined;
        source?.setData(data);
      },
      onError: (error) => {
        // eslint-disable-next-line no-console
        console.error("WiFi4EU viewport request failed", error);
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
