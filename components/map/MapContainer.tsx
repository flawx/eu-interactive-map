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
import { EU_CAPITALS } from "@/lib/europe/euCapitals";
import {
  EU_INSTITUTION_SITES,
  uniquePhysicalSites,
  type EuInstitutionId,
} from "@/lib/europe/euInstitutions";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type {
  MapFocusRequest,
  TemporaryMapMarker,
} from "@/lib/map/focusRequest";
import type { MapCameraCommands } from "@/lib/map/mapCameraCommands";
import type {
  MapBaseMode,
  MapDimensionMode,
} from "@/lib/map/mapViewPreferences";
import {
  EMPTY_USER_LOCATION_COLLECTION,
  buildUserLocationCollection,
  displayAccuracyMeters,
  zoomForAccuracy,
  type UserLocation,
} from "@/lib/map/userLocation";
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

function setSymbolLayoutIfChanged(
  map: MapLibreMap,
  layerId: string,
  property: "text-pitch-alignment" | "text-rotation-alignment" | "text-keep-upright",
  value: "viewport" | boolean,
): void {
  try {
    const current = map.getLayoutProperty(layerId, property);
    if (current === value) return;
    map.setLayoutProperty(layerId, property, value);
  } catch {
    // Some symbol layers refuse individual text layout properties.
  }
}

/**
 * Keep vector basemap / place labels facing the screen in pitched 3D views.
 * No-op when the style has no symbol layers with text-field (e.g. raster Voyager).
 */
function keepBasemapLabelsUpright(map: MapLibreMap): void {
  const layers = map.getStyle()?.layers;
  if (!layers) return;

  for (const layer of layers) {
    if (layer.type !== "symbol") continue;

    const textField = layer.layout?.["text-field"];
    if (textField === undefined || textField === "") continue;

    try {
      setSymbolLayoutIfChanged(map, layer.id, "text-pitch-alignment", "viewport");
      setSymbolLayoutIfChanged(
        map,
        layer.id,
        "text-rotation-alignment",
        "viewport",
      );
      setSymbolLayoutIfChanged(map, layer.id, "text-keep-upright", true);
    } catch {
      // Ignore layers that cannot accept upright text layout.
    }
  }
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

function buildEuCapitalsCollection(locale: Locale): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: EU_CAPITALS.map((capital) => ({
      type: "Feature",
      properties: {
        capitalId: capital.id,
        name: capital.wikipediaTitles?.[locale] ?? capital.canonicalName,
        nativeName: capital.nativeName,
        countryCode: capital.countryCode,
        searchLabel: [capital.canonicalName, capital.nativeName, ...capital.aliases].join(" "),
      },
      geometry: {
        type: "Point",
        coordinates: [capital.longitude, capital.latitude],
      },
    })),
  };
}

function createEuCapitalIcon(): { width: number; height: number; data: Uint8Array } {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }
  // soft shadow
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 + 1, 18, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();
  // white ring
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  // EU blue disc
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#003399";
  ctx.fill();
  // yellow star (simple 5-point)
  const drawStar = (cx: number, cy: number, spikes: number, outer: number, inner: number) => {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outer);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outer;
      y = cy + Math.sin(rot) * outer;
      ctx.lineTo(x, y);
      rot += Math.PI / spikes;
      x = cx + Math.cos(rot) * inner;
      y = cy + Math.sin(rot) * inner;
      ctx.lineTo(x, y);
      rot += Math.PI / spikes;
    }
    ctx.lineTo(cx, cy - outer);
    ctx.closePath();
    ctx.fillStyle = "#facc15";
    ctx.fill();
  };
  drawStar(size / 2, size / 2, 5, 8, 3.5);
  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}

type InstitutionPanelMessages = ReturnType<typeof getMessages>["institutionPanel"];

function shortNameForInstitution(
  id: EuInstitutionId,
  tp: InstitutionPanelMessages,
): string {
  switch (id) {
    case "european-commission":
      return tp.shortCommission;
    case "european-council":
      return tp.shortEuropeanCouncil;
    case "council-of-the-eu":
      return tp.shortCouncilOfTheEu;
    case "european-parliament":
      return tp.shortParliament;
    case "european-central-bank":
      return tp.shortEcb;
  }
}

function localNameForInstitution(
  id: EuInstitutionId,
  tp: InstitutionPanelMessages,
): string {
  switch (id) {
    case "european-commission":
      return tp.nameCommission;
    case "european-council":
      return tp.nameEuropeanCouncil;
    case "council-of-the-eu":
      return tp.nameCouncilOfTheEu;
    case "european-parliament":
      return tp.nameParliament;
    case "european-central-bank":
      return tp.nameEcb;
  }
}

function buildEuMainInstitutionsCollection(
  locale: Locale,
): GeoJSON.FeatureCollection {
  const tp = getMessages(locale).institutionPanel;
  const sites = uniquePhysicalSites();

  return {
    type: "FeatureCollection",
    features: sites.map((site) => {
      const institutionCount = site.institutionIds.length;
      const primaryInstitutionId = site.institutionIds[0];

      const displayName = site.sharedSite
        ? site.name
        : localNameForInstitution(primaryInstitutionId, tp);
      const displaySubtitle = site.sharedSite
        ? site.institutionIds
            .map((id) => shortNameForInstitution(id, tp))
            .join(" · ")
        : site.city;
      const labelCompact = site.sharedSite
        ? site.name
        : shortNameForInstitution(primaryInstitutionId, tp);
      const labelDetailed = site.sharedSite
        ? `${site.name} — ${site.city}`
        : `${localNameForInstitution(primaryInstitutionId, tp)} — ${site.city}`;
      const iconImageId =
        site.sharedSite && institutionCount > 1
          ? `eu-institution-icon-badge-${institutionCount}`
          : "eu-institution-icon";

      return {
        type: "Feature",
        id: site.id,
        properties: {
          siteId: site.id,
          siteName: site.name,
          institutionIds: JSON.stringify(site.institutionIds),
          institutionCount,
          city: site.city,
          countryCode: site.countryCode,
          siteType: site.siteType,
          sharedSite: site.sharedSite,
          primaryInstitutionId,
          displayName,
          displaySubtitle,
          labelCompact,
          labelDetailed,
          iconImageId,
        },
        geometry: {
          type: "Point",
          coordinates: [site.longitude, site.latitude],
        },
      };
    }),
  };
}

/**
 * Institutional marker distinct from capital discs: rounded square in deep
 * violet with a golden classical-building pictogram, white stroke and soft
 * shadow. Optional `badgeCount` draws a top-right count badge for shared
 * sites (e.g. Europa building hosting both Councils).
 *
 * Canvas is 64×64 at pixelRatio 2 → ~32×32 CSS px at icon-size 1.0.
 */
function createEuInstitutionIcon(
  badgeCount?: number,
): { width: number; height: number; data: Uint8Array } {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }

  const roundedRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  const faceSize = 44;
  const faceX = (size - faceSize) / 2;
  const faceY = (size - faceSize) / 2 + 1;
  const violet = "#5b21b6";
  const gold = "#facc15";

  // soft shadow
  roundedRect(faceX, faceY + 2, faceSize, faceSize, 11);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  // white 2px outer contour (filled ring)
  roundedRect(faceX, faceY, faceSize, faceSize, 11);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // deep violet face
  roundedRect(faceX + 3, faceY + 3, faceSize - 6, faceSize - 6, 9);
  ctx.fillStyle = violet;
  ctx.fill();

  // golden classical building / columns pictogram
  const cx = size / 2;
  const cy = faceY + faceSize / 2 + 1;
  ctx.fillStyle = gold;
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // pediment
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 8);
  ctx.lineTo(cx, cy - 15);
  ctx.lineTo(cx + 12, cy - 8);
  ctx.closePath();
  ctx.fill();

  // entablature
  roundedRect(cx - 13, cy - 8, 26, 4, 1);
  ctx.fill();

  // three columns
  for (const offset of [-8, 0, 8]) {
    roundedRect(cx + offset - 2, cy - 4, 4, 14, 1);
    ctx.fill();
  }

  // stylobate / base
  roundedRect(cx - 14, cy + 10, 28, 3.5, 1);
  ctx.fill();

  if (badgeCount && badgeCount > 1) {
    const bx = faceX + faceSize - 2;
    const by = faceY + 2;
    const r = 10;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = violet;
    ctx.stroke();
    ctx.fillStyle = violet;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(badgeCount), bx, by + 0.5);
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}

function siteSelectionCaseExpression(
  selectedSiteId: string | null,
  selectedValue: number,
  defaultValue: number,
): [
  "case",
  ["==", ["get", "siteId"], string],
  number,
  number,
] {
  return [
    "case",
    ["==", ["get", "siteId"], selectedSiteId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

function capitalSelectionCaseExpression(
  selectedCapitalId: string | null,
  selectedValue: number,
  defaultValue: number,
): [
  "case",
  ["==", ["get", "capitalId"], string],
  number,
  number,
] {
  return [
    "case",
    ["==", ["get", "capitalId"], selectedCapitalId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

export default function MapContainer({
  showEurozone,
  showNonEurozone,
  showCandidates,
  showSchengenNonEU,
  selectedCountryCode,
  onCountrySelect,
  showEuCapitals = false,
  selectedCapitalId = null,
  onCapitalSelect,
  showEuMainInstitutions = false,
  selectedInstitutionSiteId = null,
  onInstitutionSiteSelect,
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
  mapCommandsRef,
  baseMode = "map",
  dimensionMode = "2d",
  onCameraChange,
  onTerrainReadyChange,
  userLocation = null,
  focusUserLocationRef,
  onUserMapGesture,
}: {
  showEurozone: boolean;
  showNonEurozone: boolean;
  showCandidates: boolean;
  showSchengenNonEU: boolean;
  selectedCountryCode: string | null;
  onCountrySelect: (countryCode: string | null) => void;
  showEuCapitals?: boolean;
  selectedCapitalId?: string | null;
  onCapitalSelect: (capitalId: string | null) => void;
  showEuMainInstitutions?: boolean;
  selectedInstitutionSiteId?: string | null;
  onInstitutionSiteSelect?: (siteId: string | null) => void;
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
  mapCommandsRef?: MutableRefObject<MapCameraCommands | null>;
  baseMode?: MapBaseMode;
  dimensionMode?: MapDimensionMode;
  onCameraChange?: (snapshot: {
    pitch: number;
    bearing: number;
    zoom: number;
  }) => void;
  onTerrainReadyChange?: (ready: boolean) => void;
  userLocation?: UserLocation | null;
  focusUserLocationRef?: MutableRefObject<
    ((mode?: "fit" | "soft") => void) | null
  >;
  onUserMapGesture?: () => void;
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
  const showEuCapitalsRef = useRef(showEuCapitals);
  showEuCapitalsRef.current = showEuCapitals;
  const selectedCapitalIdRef = useRef(selectedCapitalId);
  selectedCapitalIdRef.current = selectedCapitalId;
  const onCapitalSelectRef = useRef(onCapitalSelect);
  onCapitalSelectRef.current = onCapitalSelect;
  const showEuMainInstitutionsRef = useRef(showEuMainInstitutions);
  showEuMainInstitutionsRef.current = showEuMainInstitutions;
  const selectedInstitutionSiteIdRef = useRef(selectedInstitutionSiteId);
  selectedInstitutionSiteIdRef.current = selectedInstitutionSiteId;
  const onInstitutionSiteSelectRef = useRef(onInstitutionSiteSelect);
  onInstitutionSiteSelectRef.current = onInstitutionSiteSelect;
  const localeRef = useRef(locale);
  localeRef.current = locale;
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
  const baseModeRef = useRef(baseMode);
  baseModeRef.current = baseMode;
  const dimensionModeRef = useRef(dimensionMode);
  dimensionModeRef.current = dimensionMode;
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;
  const onTerrainReadyChangeRef = useRef(onTerrainReadyChange);
  onTerrainReadyChangeRef.current = onTerrainReadyChange;
  const onUserMapGestureRef = useRef(onUserMapGesture);
  onUserMapGestureRef.current = onUserMapGesture;
  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;
  const programmaticCameraRef = useRef(false);
  const pulseFrameRef = useRef<number | null>(null);
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
      maxPitch: 70,
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

      if (eventSourceId === "terrain-dem") {
        onTerrainReadyChangeRef.current?.(false);
        return;
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

    const emitCameraChange = () => {
      onCameraChangeRef.current?.({
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        zoom: map.getZoom(),
      });
    };

    map.on("rotate", emitCameraChange);
    map.on("move", emitCameraChange);
    map.on("pitch", emitCameraChange);
    emitCameraChange();

    const handleUserGesture = () => {
      if (programmaticCameraRef.current) return;
      onUserMapGestureRef.current?.();
    };

    map.on("dragstart", handleUserGesture);
    map.on("zoomstart", handleUserGesture);
    map.on("rotatestart", handleUserGesture);
    map.on("pitchstart", handleUserGesture);

    if (mapCommandsRef) {
      mapCommandsRef.current = {
        zoomIn: () => {
          map.zoomIn({ duration: 300 });
        },
        zoomOut: () => {
          map.zoomOut({ duration: 300 });
        },
        resetNorth: () => {
          map.easeTo({
            bearing: 0,
            ...(dimensionModeRef.current === "2d" ? { pitch: 0 } : {}),
            duration: 500,
          });
        },
        pitchUp: () => {
          map.easeTo({
            pitch: Math.min(70, map.getPitch() + 15),
            duration: 350,
          });
        },
        pitchDown: () => {
          map.easeTo({
            pitch: Math.max(0, map.getPitch() - 15),
            duration: 350,
          });
        },
        isReady: () => Boolean(mapRef.current),
      };
    }

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

    const handleCapitalClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const capitalId = feature?.properties?.capitalId;
      if (typeof capitalId === "string") {
        onCapitalSelectRef.current(capitalId);
      }
    };

    const handleInstitutionSiteClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const siteId = feature?.properties?.siteId;
      if (typeof siteId === "string") {
        onInstitutionSiteSelectRef.current?.(siteId);
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

      if (!map.getSource("terrain-dem")) {
        map.addSource("terrain-dem", {
          type: "raster-dem",
          tiles: [
            "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
          ],
          tileSize: 256,
          encoding: "terrarium",
          minzoom: 0,
          maxzoom: 15,
          attribution:
            "Elevation data © Mapzen, AWS Open Data and contributors",
        });
      }

      if (!map.getLayer("terrain-hillshade")) {
        map.addLayer({
          id: "terrain-hillshade",
          type: "hillshade",
          source: "terrain-dem",
          layout: {
            visibility:
              baseModeRef.current === "relief" ? "visible" : "none",
          },
          paint: {
            "hillshade-exaggeration": 0.35,
            "hillshade-shadow-color": "#473b2f",
            "hillshade-highlight-color": "#ffffff",
            "hillshade-accent-color": "#7c6f5d",
          },
        });
      }

      onTerrainReadyChangeRef.current?.(true);

      // Satellite overlays (above Voyager / hillshade, below country fills / GDACS).
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

      if (!map.getSource("user-location")) {
        map.addSource("user-location", {
          type: "geojson",
          data: EMPTY_USER_LOCATION_COLLECTION,
        });
      }

      if (!map.getLayer("user-location-accuracy")) {
        map.addLayer({
          id: "user-location-accuracy",
          type: "fill",
          source: "user-location",
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: {
            "fill-color": "#1a73e8",
            "fill-opacity": 0.1,
            "fill-outline-color": "#1a73e8",
          },
        });
      }

      if (!map.getLayer("user-location-halo")) {
        map.addLayer({
          id: "user-location-halo",
          type: "circle",
          source: "user-location",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 13,
            "circle-color": "#ffffff",
            "circle-opacity": 0.9,
          },
        });
      }

      if (!map.getLayer("user-location-pulse")) {
        map.addLayer({
          id: "user-location-pulse",
          type: "circle",
          source: "user-location",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 18,
            "circle-color": "#1a73e8",
            "circle-opacity": 0.18,
          },
        });
      }

      if (!map.getLayer("user-location-dot")) {
        map.addLayer({
          id: "user-location-dot",
          type: "circle",
          source: "user-location",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": 8,
            "circle-color": "#1a73e8",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });
      }

      if (!map.getSource("eu-capitals")) {
        map.addSource("eu-capitals", {
          type: "geojson",
          data: buildEuCapitalsCollection(localeRef.current),
          promoteId: "capitalId",
        });
      }

      if (!map.hasImage("eu-capital-icon")) {
        map.addImage("eu-capital-icon", createEuCapitalIcon(), { pixelRatio: 2 });
      }

      if (!map.getLayer("eu-capitals-halo")) {
        map.addLayer({
          id: "eu-capitals-halo",
          type: "circle",
          source: "eu-capitals",
          layout: {
            visibility: showEuCapitalsRef.current ? "visible" : "none",
          },
          paint: {
            "circle-radius": capitalSelectionCaseExpression(
              selectedCapitalIdRef.current,
              16,
              12,
            ),
            "circle-color": "#1a73e8",
            "circle-opacity": 0.25,
          },
        });
      }

      if (!map.getLayer("eu-capitals-symbol")) {
        map.addLayer({
          id: "eu-capitals-symbol",
          type: "symbol",
          source: "eu-capitals",
          layout: {
            visibility: showEuCapitalsRef.current ? "visible" : "none",
            "icon-image": "eu-capital-icon",
            "icon-size": capitalSelectionCaseExpression(
              selectedCapitalIdRef.current,
              0.55,
              0.45,
            ),
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      }

      if (!map.getLayer("eu-capitals-label")) {
        map.addLayer({
          id: "eu-capitals-label",
          type: "symbol",
          source: "eu-capitals",
          minzoom: 4,
          layout: {
            visibility: showEuCapitalsRef.current ? "visible" : "none",
            "text-field": ["get", "name"],
            "text-size": 12,
            "text-offset": [0, 1.4],
            "text-anchor": "top",
            "text-optional": true,
            "text-pitch-alignment": "viewport",
            "text-rotation-alignment": "viewport",
            "text-keep-upright": true,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#1f2937",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.5,
          },
        });
      }

      if (!map.getSource("eu-main-institutions")) {
        map.addSource("eu-main-institutions", {
          type: "geojson",
          data: buildEuMainInstitutionsCollection(localeRef.current),
          promoteId: "siteId",
        });
      }

      if (!map.hasImage("eu-institution-icon")) {
        map.addImage("eu-institution-icon", createEuInstitutionIcon(), {
          pixelRatio: 2,
        });
      }

      const sharedInstitutionCounts = new Set<number>();
      for (const site of EU_INSTITUTION_SITES) {
        if (site.sharedSite) sharedInstitutionCounts.add(site.institutionIds.length);
      }
      for (const count of sharedInstitutionCounts) {
        const imageId = `eu-institution-icon-badge-${count}`;
        if (!map.hasImage(imageId)) {
          map.addImage(imageId, createEuInstitutionIcon(count), {
            pixelRatio: 2,
          });
        }
      }

      if (!map.getLayer("eu-main-institutions-halo")) {
        map.addLayer({
          id: "eu-main-institutions-halo",
          type: "circle",
          source: "eu-main-institutions",
          minzoom: 5,
          layout: {
            visibility: showEuMainInstitutionsRef.current ? "visible" : "none",
          },
          paint: {
            "circle-radius": siteSelectionCaseExpression(
              selectedInstitutionSiteIdRef.current,
              22,
              16,
            ),
            "circle-color": "#a78bfa",
            "circle-opacity": 0.35,
          },
        });
      }

      if (!map.getLayer("eu-main-institutions-symbol")) {
        map.addLayer({
          id: "eu-main-institutions-symbol",
          type: "symbol",
          source: "eu-main-institutions",
          minzoom: 5,
          layout: {
            visibility: showEuMainInstitutionsRef.current ? "visible" : "none",
            "icon-image": ["get", "iconImageId"],
            "icon-size": siteSelectionCaseExpression(
              selectedInstitutionSiteIdRef.current,
              1.15,
              1,
            ),
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-pitch-alignment": "viewport",
            "icon-rotation-alignment": "viewport",
          },
        });
      }

      if (!map.getLayer("eu-main-institutions-label")) {
        map.addLayer({
          id: "eu-main-institutions-label",
          type: "symbol",
          source: "eu-main-institutions",
          minzoom: 5,
          layout: {
            visibility: showEuMainInstitutionsRef.current ? "visible" : "none",
            "text-field": [
              "step",
              ["zoom"],
              ["get", "labelCompact"],
              7,
              ["get", "labelDetailed"],
            ],
            "text-size": 12,
            "text-offset": [0, 1.5],
            "text-anchor": "top",
            "text-optional": true,
            "text-pitch-alignment": "viewport",
            "text-rotation-alignment": "viewport",
            "text-keep-upright": true,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#4c1d95",
            "text-halo-color": "#ede9fe",
            "text-halo-width": 1.6,
          },
        });
      }

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
        "eu-capitals-halo",
        "eu-capitals-symbol",
        "eu-capitals-label",
        "eu-main-institutions-halo",
        "eu-main-institutions-symbol",
        "eu-main-institutions-label",
        "user-location-accuracy",
        "user-location-halo",
        "user-location-pulse",
        "user-location-dot",
      ];

      for (const layerId of layerStackOrder) {
        if (map.getLayer(layerId)) {
          map.moveLayer(layerId);
        }
      }

      keepBasemapLabelsUpright(map);

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
      map.on("click", "eu-capitals-symbol", handleCapitalClick);
      map.on("mouseenter", "eu-capitals-symbol", setPointerCursor);
      map.on("mouseleave", "eu-capitals-symbol", resetCursor);
      map.on("click", "eu-main-institutions-symbol", handleInstitutionSiteClick);
      map.on("mouseenter", "eu-main-institutions-symbol", setPointerCursor);
      map.on("mouseleave", "eu-main-institutions-symbol", resetCursor);
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
      map.off("click", "eu-capitals-symbol", handleCapitalClick);
      map.off("mouseenter", "eu-capitals-symbol", setPointerCursor);
      map.off("mouseleave", "eu-capitals-symbol", resetCursor);
      map.off(
        "click",
        "eu-main-institutions-symbol",
        handleInstitutionSiteClick,
      );
      map.off("mouseenter", "eu-main-institutions-symbol", setPointerCursor);
      map.off("mouseleave", "eu-main-institutions-symbol", resetCursor);
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
      map.off("rotate", emitCameraChange);
      map.off("move", emitCameraChange);
      map.off("pitch", emitCameraChange);
      map.off("dragstart", handleUserGesture);
      map.off("zoomstart", handleUserGesture);
      map.off("rotatestart", handleUserGesture);
      map.off("pitchstart", handleUserGesture);
      if (pulseFrameRef.current != null) {
        window.cancelAnimationFrame(pulseFrameRef.current);
        pulseFrameRef.current = null;
      }
      if (mapCommandsRef) {
        mapCommandsRef.current = null;
      }
      onTerrainReadyChangeRef.current?.(false);
      map.remove();
      mapRef.current = null;
      if (focusGeometryRef) {
        focusGeometryRef.current = null;
      }
      if (focusUserLocationRef) {
        focusUserLocationRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("terrain-hillshade")) return;

    map.setLayoutProperty(
      "terrain-hillshade",
      "visibility",
      baseMode === "relief" ? "visible" : "none",
    );
  }, [baseMode, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("terrain-dem")) return;

    if (dimensionMode === "3d") {
      map.setTerrain({
        source: "terrain-dem",
        exaggeration: 1.15,
      });
      keepBasemapLabelsUpright(map);
      map.easeTo({
        pitch: Math.max(map.getPitch(), 50),
        duration: 700,
      });
      return;
    }

    map.setTerrain(null);
    if (map.getPitch() !== 0) {
      map.easeTo({
        pitch: 0,
        duration: 600,
      });
    }
  }, [dimensionMode, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("user-location")) return;

    const source = map.getSource("user-location") as GeoJSONSource;
    source.setData(buildUserLocationCollection(userLocation));
  }, [userLocation, mapSourcesReadyVersion]);

  useEffect(() => {
    if (!focusUserLocationRef) return;

    focusUserLocationRef.current = (mode = "fit") => {
      const map = mapRef.current;
      const location = userLocationRef.current;
      if (!map || !location) return;

      const accuracy = displayAccuracyMeters(location.accuracyMeters);
      programmaticCameraRef.current = true;
      const clearProgrammatic = () => {
        programmaticCameraRef.current = false;
        map.off("moveend", clearProgrammatic);
      };
      map.once("moveend", clearProgrammatic);

      if (mode === "soft") {
        map.easeTo({
          center: [location.longitude, location.latitude],
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          duration: 700,
        });
        return;
      }

      if (accuracy <= 2000) {
        const collection = buildUserLocationCollection(location);
        const accuracyFeature = collection.features[0];
        const bounds = new LngLatBounds();
        if (
          accuracyFeature?.geometry.type === "Polygon"
        ) {
          extendBoundsWithCoordinates(
            bounds,
            accuracyFeature.geometry.coordinates,
          );
        }

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, {
            padding: 72,
            maxZoom: 16,
            duration: 700,
            bearing: map.getBearing(),
            pitch: map.getPitch(),
          });
          return;
        }
      }

      map.easeTo({
        center: [location.longitude, location.latitude],
        zoom: zoomForAccuracy(accuracy),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        duration: 700,
      });
    };

    return () => {
      if (focusUserLocationRef.current) {
        focusUserLocationRef.current = null;
      }
    };
  }, [focusUserLocationRef, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || !map.getLayer("user-location-pulse")) {
      if (pulseFrameRef.current != null) {
        window.cancelAnimationFrame(pulseFrameRef.current);
        pulseFrameRef.current = null;
      }
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const activeMap = mapRef.current;
      if (!activeMap?.getLayer("user-location-pulse")) {
        pulseFrameRef.current = null;
        return;
      }

      const phase = ((now - startedAt) % 1800) / 1800;
      const radius = 14 + phase * 12;
      const opacity = 0.22 * (1 - phase);
      try {
        activeMap.setPaintProperty("user-location-pulse", "circle-radius", radius);
        activeMap.setPaintProperty(
          "user-location-pulse",
          "circle-opacity",
          opacity,
        );
      } catch {
        pulseFrameRef.current = null;
        return;
      }

      pulseFrameRef.current = window.requestAnimationFrame(tick);
    };

    pulseFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (pulseFrameRef.current != null) {
        window.cancelAnimationFrame(pulseFrameRef.current);
        pulseFrameRef.current = null;
      }
    };
  }, [userLocation, mapSourcesReadyVersion]);

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

    const visibility = showEuCapitals ? "visible" : "none";
    for (const layerId of [
      "eu-capitals-halo",
      "eu-capitals-symbol",
      "eu-capitals-label",
    ] as const) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    }
  }, [showEuCapitals, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("eu-capitals") as GeoJSONSource | undefined;
    if (!source) return;

    source.setData(buildEuCapitalsCollection(locale));
  }, [locale, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer("eu-capitals-halo")) {
      map.setPaintProperty(
        "eu-capitals-halo",
        "circle-radius",
        capitalSelectionCaseExpression(selectedCapitalId, 16, 12),
      );
    }

    if (map.getLayer("eu-capitals-symbol")) {
      map.setLayoutProperty(
        "eu-capitals-symbol",
        "icon-size",
        capitalSelectionCaseExpression(selectedCapitalId, 0.55, 0.45),
      );
    }
  }, [selectedCapitalId, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const visibility = showEuMainInstitutions ? "visible" : "none";
    for (const layerId of [
      "eu-main-institutions-halo",
      "eu-main-institutions-symbol",
      "eu-main-institutions-label",
    ] as const) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visibility);
      }
    }
  }, [showEuMainInstitutions, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource(
      "eu-main-institutions",
    ) as GeoJSONSource | undefined;
    if (!source) return;

    source.setData(buildEuMainInstitutionsCollection(locale));
  }, [locale, mapSourcesReadyVersion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer("eu-main-institutions-halo")) {
      map.setPaintProperty(
        "eu-main-institutions-halo",
        "circle-radius",
        siteSelectionCaseExpression(selectedInstitutionSiteId, 22, 16),
      );
    }

    if (map.getLayer("eu-main-institutions-symbol")) {
      map.setLayoutProperty(
        "eu-main-institutions-symbol",
        "icon-size",
        siteSelectionCaseExpression(selectedInstitutionSiteId, 1.15, 1),
      );
    }
  }, [selectedInstitutionSiteId, mapSourcesReadyVersion]);

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
      return;
    }

    if (focusRequest.kind === "bounds") {
      const bounds = new LngLatBounds(
        [focusRequest.west, focusRequest.south],
        [focusRequest.east, focusRequest.north],
      );

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, {
          padding: focusRequest.padding ?? 90,
          maxZoom: focusRequest.maxZoom ?? 12,
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
