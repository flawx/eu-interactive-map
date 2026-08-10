/**
 * MapLibre layer wiring for the "Data Layers V2" European bodies datasets:
 * EU bodies & agencies (clustered), international organisations and
 * European Capitals of Culture. Extracted from `MapContainer.tsx` to keep
 * that file from growing further — mirrors the existing `eu-main-institutions`
 * / `major-european-airports` layer patterns.
 */

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";

import { toFeatureCollection as buildEuBodiesAgenciesCollection } from "@/lib/europe/euBodiesAgencies";
import { toFeatureCollection as buildInternationalOrganisationsCollection } from "@/lib/europe/internationalOrganisations";
import { toFeatureCollection as buildEuropeanCapitalsOfCultureCollection } from "@/lib/europe/europeanCapitalsOfCulture";

export const EU_BODIES_AGENCIES_SOURCE_ID = "eu-bodies-agencies";
export const INTERNATIONAL_ORGANISATIONS_SOURCE_ID =
  "international-organisations";
export const EUROPEAN_CAPITALS_OF_CULTURE_SOURCE_ID =
  "european-capitals-of-culture";

export const EU_BODIES_AGENCIES_LAYER_IDS = [
  "eu-bodies-agencies-clusters",
  "eu-bodies-agencies-cluster-count",
  "eu-bodies-agencies-halo",
  "eu-bodies-agencies-symbol",
  "eu-bodies-agencies-label",
] as const;

export const INTERNATIONAL_ORGANISATIONS_LAYER_IDS = [
  "international-organisations-halo",
  "international-organisations-symbol",
  "international-organisations-label",
] as const;

export const EUROPEAN_CAPITALS_OF_CULTURE_LAYER_IDS = [
  "european-capitals-of-culture-halo",
  "european-capitals-of-culture-symbol",
  "european-capitals-of-culture-label",
] as const;

const EU_BODIES_AGENCIES_ICON_ID = "eu-bodies-agencies-icon";
const INTERNATIONAL_ORGANISATIONS_ICON_ID = "international-organisations-icon";
const EUROPEAN_CAPITALS_OF_CULTURE_ICON_ID = "european-capitals-of-culture-icon";

type RawImage = { width: number; height: number; data: Uint8Array };

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x + radius, y);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function blankImage(size: number): RawImage {
  return { width: size, height: size, data: new Uint8Array(size * size * 4) };
}

/** Deep violet rounded square with a golden "building" pictogram (EU bodies & agencies). */
function createEuBodyAgencyIcon(): RawImage {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blankImage(size);

  const faceSize = 40;
  const faceX = (size - faceSize) / 2;
  const faceY = (size - faceSize) / 2 + 1;
  const violet = "#6d28d9";
  const gold = "#facc15";

  roundedRectPath(ctx, faceX, faceY + 2, faceSize, faceSize, 9);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  roundedRectPath(ctx, faceX, faceY, faceSize, faceSize, 9);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  roundedRectPath(ctx, faceX + 3, faceY + 3, faceSize - 6, faceSize - 6, 7);
  ctx.fillStyle = violet;
  ctx.fill();

  const cx = size / 2;
  const cy = faceY + faceSize / 2 + 1;
  ctx.fillStyle = gold;

  // simple office-block pictogram: base + windows grid
  roundedRectPath(ctx, cx - 10, cy - 12, 20, 24, 1.5);
  ctx.fill();
  ctx.fillStyle = violet;
  const winSize = 3;
  for (const row of [-7, -1, 5]) {
    for (const col of [-6, 0, 6]) {
      ctx.fillRect(cx + col - winSize / 2, cy + row - winSize / 2, winSize, winSize);
    }
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}

/** Teal disc with a white "globe" pictogram (non-EU international organisations). */
function createInternationalOrganisationIcon(): RawImage {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blankImage(size);

  const radius = 20;
  const cx = size / 2;
  const cy = size / 2 + 1;
  const teal = "#0f766e";

  ctx.beginPath();
  ctx.arc(cx, cy + 1, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = teal;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - (radius - 5), cy);
  ctx.lineTo(cx + (radius - 5), cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, (radius - 5) * 0.42, radius - 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}

/** Magenta disc with a white sparkle/star pictogram (European Capitals of Culture). */
function createCapitalOfCultureIcon(): RawImage {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blankImage(size);

  const radius = 20;
  const cx = size / 2;
  const cy = size / 2 + 1;

  ctx.beginPath();
  ctx.arc(cx, cy + 1, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#c026d3";
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  const drawSparkle = (x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.closePath();
    ctx.fill();
  };
  drawSparkle(cx, cy, 11);
  drawSparkle(cx + 9, cy - 8, 4.5);

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}

/**
 * Adds the sources, images and layers for all three "Data Layers V2" Europe
 * bodies datasets if they don't already exist. Safe to call repeatedly (e.g.
 * on every `style.load`) — every add is guarded.
 */
export function ensureEuropeInstitutionsV2Layers(
  map: MapLibreMap,
  options: {
    showEuBodiesAgencies: boolean;
    showInternationalOrganisations: boolean;
    showEuropeanCapitalsOfCulture: boolean;
    selectedEuBodyAgencyId: string | null;
    selectedInternationalOrganisationId: string | null;
    selectedCapitalOfCultureId: string | null;
  },
): void {
  if (!map.hasImage(EU_BODIES_AGENCIES_ICON_ID)) {
    map.addImage(EU_BODIES_AGENCIES_ICON_ID, createEuBodyAgencyIcon(), {
      pixelRatio: 2,
    });
  }
  if (!map.hasImage(INTERNATIONAL_ORGANISATIONS_ICON_ID)) {
    map.addImage(
      INTERNATIONAL_ORGANISATIONS_ICON_ID,
      createInternationalOrganisationIcon(),
      { pixelRatio: 2 },
    );
  }
  if (!map.hasImage(EUROPEAN_CAPITALS_OF_CULTURE_ICON_ID)) {
    map.addImage(
      EUROPEAN_CAPITALS_OF_CULTURE_ICON_ID,
      createCapitalOfCultureIcon(),
      { pixelRatio: 2 },
    );
  }

  // --- EU bodies & agencies (clustered) ---
  if (!map.getSource(EU_BODIES_AGENCIES_SOURCE_ID)) {
    map.addSource(EU_BODIES_AGENCIES_SOURCE_ID, {
      type: "geojson",
      data: buildEuBodiesAgenciesCollection(),
      promoteId: "id",
      cluster: true,
      clusterMaxZoom: 11,
      clusterRadius: 50,
    });
  }

  if (!map.getLayer("eu-bodies-agencies-clusters")) {
    map.addLayer({
      id: "eu-bodies-agencies-clusters",
      type: "circle",
      source: EU_BODIES_AGENCIES_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showEuBodiesAgencies ? "visible" : "none",
      },
      paint: {
        "circle-color": "#6d28d9",
        "circle-opacity": 0.85,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-radius": ["step", ["get", "point_count"], 14, 8, 18, 20, 22],
      },
    });
  }

  if (!map.getLayer("eu-bodies-agencies-cluster-count")) {
    map.addLayer({
      id: "eu-bodies-agencies-cluster-count",
      type: "symbol",
      source: EU_BODIES_AGENCIES_SOURCE_ID,
      filter: ["has", "point_count"],
      layout: {
        visibility: options.showEuBodiesAgencies ? "visible" : "none",
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 12,
        "text-font": ["Noto Sans Bold"],
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
      },
      paint: { "text-color": "#ffffff" },
    });
  }

  if (!map.getLayer("eu-bodies-agencies-halo")) {
    map.addLayer({
      id: "eu-bodies-agencies-halo",
      type: "circle",
      source: EU_BODIES_AGENCIES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 4,
      layout: {
        visibility: options.showEuBodiesAgencies ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedEuBodyAgencyId,
          20,
          0,
        ),
        "circle-color": "#a78bfa",
        "circle-opacity": 0.3,
      },
    });
  }

  if (!map.getLayer("eu-bodies-agencies-symbol")) {
    map.addLayer({
      id: "eu-bodies-agencies-symbol",
      type: "symbol",
      source: EU_BODIES_AGENCIES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 4,
      layout: {
        visibility: options.showEuBodiesAgencies ? "visible" : "none",
        "icon-image": EU_BODIES_AGENCIES_ICON_ID,
        "icon-size": entitySelectionSizeExpression(
          options.selectedEuBodyAgencyId,
        ),
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-pitch-alignment": "viewport",
        "icon-rotation-alignment": "viewport",
      },
    });
  }

  if (!map.getLayer("eu-bodies-agencies-label")) {
    map.addLayer({
      id: "eu-bodies-agencies-label",
      type: "symbol",
      source: EU_BODIES_AGENCIES_SOURCE_ID,
      filter: ["!", ["has", "point_count"]],
      minzoom: 6,
      layout: {
        visibility: options.showEuBodiesAgencies ? "visible" : "none",
        "text-field": ["get", "acronym"],
        "text-size": 11,
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#6d28d9",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }

  // --- International organisations (not clustered — small dataset) ---
  if (!map.getSource(INTERNATIONAL_ORGANISATIONS_SOURCE_ID)) {
    map.addSource(INTERNATIONAL_ORGANISATIONS_SOURCE_ID, {
      type: "geojson",
      data: buildInternationalOrganisationsCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("international-organisations-halo")) {
    map.addLayer({
      id: "international-organisations-halo",
      type: "circle",
      source: INTERNATIONAL_ORGANISATIONS_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showInternationalOrganisations ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedInternationalOrganisationId,
          20,
          16,
        ),
        "circle-color": "#5eead4",
        "circle-opacity": 0.3,
      },
    });
  }

  if (!map.getLayer("international-organisations-symbol")) {
    map.addLayer({
      id: "international-organisations-symbol",
      type: "symbol",
      source: INTERNATIONAL_ORGANISATIONS_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showInternationalOrganisations ? "visible" : "none",
        "icon-image": INTERNATIONAL_ORGANISATIONS_ICON_ID,
        "icon-size": entitySelectionSizeExpression(
          options.selectedInternationalOrganisationId,
        ),
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-pitch-alignment": "viewport",
        "icon-rotation-alignment": "viewport",
      },
    });
  }

  if (!map.getLayer("international-organisations-label")) {
    map.addLayer({
      id: "international-organisations-label",
      type: "symbol",
      source: INTERNATIONAL_ORGANISATIONS_SOURCE_ID,
      minzoom: 5,
      layout: {
        visibility: options.showInternationalOrganisations ? "visible" : "none",
        "text-field": ["get", "acronym"],
        "text-size": 11,
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#0f766e",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }

  // --- European Capitals of Culture ---
  if (!map.getSource(EUROPEAN_CAPITALS_OF_CULTURE_SOURCE_ID)) {
    map.addSource(EUROPEAN_CAPITALS_OF_CULTURE_SOURCE_ID, {
      type: "geojson",
      data: buildEuropeanCapitalsOfCultureCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("european-capitals-of-culture-halo")) {
    map.addLayer({
      id: "european-capitals-of-culture-halo",
      type: "circle",
      source: EUROPEAN_CAPITALS_OF_CULTURE_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showEuropeanCapitalsOfCulture ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedCapitalOfCultureId,
          20,
          14,
        ),
        "circle-color": ["get", "color"],
        "circle-opacity": ["*", 0.3, ["coalesce", ["get", "opacity"], 1]],
      },
    });
  }

  if (!map.getLayer("european-capitals-of-culture-symbol")) {
    map.addLayer({
      id: "european-capitals-of-culture-symbol",
      type: "symbol",
      source: EUROPEAN_CAPITALS_OF_CULTURE_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showEuropeanCapitalsOfCulture ? "visible" : "none",
        "icon-image": EUROPEAN_CAPITALS_OF_CULTURE_ICON_ID,
        "icon-size": entitySelectionSizeExpression(
          options.selectedCapitalOfCultureId,
        ),
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-pitch-alignment": "viewport",
        "icon-rotation-alignment": "viewport",
      },
      paint: {
        "icon-opacity": ["coalesce", ["get", "opacity"], 1],
      },
    });
  }

  if (!map.getLayer("european-capitals-of-culture-label")) {
    map.addLayer({
      id: "european-capitals-of-culture-label",
      type: "symbol",
      source: EUROPEAN_CAPITALS_OF_CULTURE_SOURCE_ID,
      minzoom: 5,
      layout: {
        visibility: options.showEuropeanCapitalsOfCulture ? "visible" : "none",
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.3],
        "text-anchor": "top",
        "text-optional": true,
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#a21caf",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
        "text-opacity": ["coalesce", ["get", "opacity"], 1],
      },
    });
  }
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

function entitySelectionSizeExpression(
  selectedId: string | null,
): ["case", ["==", ["get", "id"], string], number, number] {
  return ["case", ["==", ["get", "id"], selectedId ?? ""], 1.15, 1];
}

export function setEuropeInstitutionsV2Visibility(
  map: MapLibreMap,
  options: {
    showEuBodiesAgencies: boolean;
    showInternationalOrganisations: boolean;
    showEuropeanCapitalsOfCulture: boolean;
  },
): void {
  const groups: Array<[readonly string[], boolean]> = [
    [EU_BODIES_AGENCIES_LAYER_IDS, options.showEuBodiesAgencies],
    [
      INTERNATIONAL_ORGANISATIONS_LAYER_IDS,
      options.showInternationalOrganisations,
    ],
    [
      EUROPEAN_CAPITALS_OF_CULTURE_LAYER_IDS,
      options.showEuropeanCapitalsOfCulture,
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

export function updateEuropeInstitutionsV2Selection(
  map: MapLibreMap,
  options: {
    selectedEuBodyAgencyId: string | null;
    selectedInternationalOrganisationId: string | null;
    selectedCapitalOfCultureId: string | null;
  },
): void {
  if (map.getLayer("eu-bodies-agencies-halo")) {
    map.setPaintProperty(
      "eu-bodies-agencies-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedEuBodyAgencyId, 20, 0),
    );
  }
  if (map.getLayer("eu-bodies-agencies-symbol")) {
    map.setLayoutProperty(
      "eu-bodies-agencies-symbol",
      "icon-size",
      entitySelectionSizeExpression(options.selectedEuBodyAgencyId),
    );
  }
  if (map.getLayer("international-organisations-halo")) {
    map.setPaintProperty(
      "international-organisations-halo",
      "circle-radius",
      entitySelectionRadiusExpression(
        options.selectedInternationalOrganisationId,
        20,
        16,
      ),
    );
  }
  if (map.getLayer("international-organisations-symbol")) {
    map.setLayoutProperty(
      "international-organisations-symbol",
      "icon-size",
      entitySelectionSizeExpression(options.selectedInternationalOrganisationId),
    );
  }
  if (map.getLayer("european-capitals-of-culture-halo")) {
    map.setPaintProperty(
      "european-capitals-of-culture-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedCapitalOfCultureId, 20, 14),
    );
  }
  if (map.getLayer("european-capitals-of-culture-symbol")) {
    map.setLayoutProperty(
      "european-capitals-of-culture-symbol",
      "icon-size",
      entitySelectionSizeExpression(options.selectedCapitalOfCultureId),
    );
  }
}

export type EuropeInstitutionsV2ClickHandlers = {
  onEuBodyAgencyClick: (event: MapLayerMouseEvent) => void;
  onInternationalOrganisationClick: (event: MapLayerMouseEvent) => void;
  onCapitalOfCultureClick: (event: MapLayerMouseEvent) => void;
  onEuBodyAgenciesClusterClick: (event: MapLayerMouseEvent) => void;
};

/** Attaches click / hover listeners; returns a cleanup function. */
export function attachEuropeInstitutionsV2Handlers(
  map: MapLibreMap,
  handlers: EuropeInstitutionsV2ClickHandlers,
  setPointerCursor: () => void,
  resetCursor: () => void,
): () => void {
  const clusterClickHandler = async (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id;
    const source = map.getSource(EU_BODIES_AGENCIES_SOURCE_ID) as
      | GeoJSONSource
      | undefined;
    if (
      !feature ||
      feature.geometry.type !== "Point" ||
      !source ||
      !Number.isFinite(clusterId)
    ) {
      handlers.onEuBodyAgenciesClusterClick(event);
      return;
    }
    const zoom = await source.getClusterExpansionZoom(clusterId);
    map.easeTo({
      center: feature.geometry.coordinates as [number, number],
      zoom,
      duration: 650,
    });
  };

  const interactiveLayers: Array<
    [string, (event: MapLayerMouseEvent) => void]
  > = [
    ["eu-bodies-agencies-clusters", clusterClickHandler],
    ["eu-bodies-agencies-symbol", handlers.onEuBodyAgencyClick],
    ["international-organisations-symbol", handlers.onInternationalOrganisationClick],
    ["european-capitals-of-culture-symbol", handlers.onCapitalOfCultureClick],
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
