import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";
import type { AlertConnectorStatus } from "@/lib/alerts/types";
import {
  COPERNICUS_GFM_MAX_ZOOM,
  COPERNICUS_GFM_WMS,
  COPERNICUS_OBSERVED_FLOOD_LAYER,
  parseGfmCapabilities,
  resolveLatestAvailableGfmTime,
} from "@/lib/alerts/providers/copernicusGfmCapabilities";

export {
  COPERNICUS_GFM_MAX_ZOOM,
  COPERNICUS_GFM_WMS,
  COPERNICUS_OBSERVED_FLOOD_LAYER,
};

export type CopernicusFloodLayerStatus = {
  available: boolean;
  connectorStatus: AlertConnectorStatus;
  layerName: string;
  acquisitionTime: string | null;
  publishedAt: string;
  interval: string | null;
  satellite: "Sentinel-1";
  dataNature: "satellite-observation";
  source: typeof ALERT_SOURCES.copernicusGfm;
  warning: string | null;
  queryable: boolean;
  maxZoom: number;
};

export function parseCopernicusCapabilities(
  xml: string,
  now = new Date(),
): Omit<CopernicusFloodLayerStatus, "publishedAt" | "source"> {
  const capabilities = parseGfmCapabilities(xml, now.toISOString());
  const layer = capabilities.observedFloodExtent;
  if (!layer) {
    return {
      available: false,
      connectorStatus: "unavailable",
      layerName: COPERNICUS_OBSERVED_FLOOD_LAYER,
      acquisitionTime: null,
      interval: null,
      satellite: "Sentinel-1",
      dataNature: "satellite-observation",
      warning: "copernicus_layer_not_found",
      queryable: false,
      maxZoom: COPERNICUS_GFM_MAX_ZOOM,
    };
  }
  const acquisitionTime = resolveLatestAvailableGfmTime(capabilities, now);
  const interval =
    layer.time?.kind === "interval"
      ? `${layer.time.start}/${layer.time.end}/${layer.time.period}`
      : layer.time?.kind === "values"
        ? layer.time.values.join(",")
        : null;
  const age = acquisitionTime ? now.getTime() - Date.parse(acquisitionTime) : Infinity;
  return {
    available: true,
    connectorStatus: age > 48 * 60 * 60 * 1000 ? "delayed" : "operational",
    layerName: COPERNICUS_OBSERVED_FLOOD_LAYER,
    acquisitionTime,
    interval,
    satellite: "Sentinel-1",
    dataNature: "satellite-observation",
    warning: acquisitionTime ? null : "copernicus_time_missing",
    queryable: layer.queryable,
    maxZoom: COPERNICUS_GFM_MAX_ZOOM,
  };
}
export function tileBounds3857(z: number, x: number, y: number): string {
  const world = 20037508.342789244;
  const tiles = 2 ** z;
  const size = (world * 2) / tiles;
  const minx = -world + x * size;
  const maxx = minx + size;
  const maxy = world - y * size;
  const miny = maxy - size;
  return [minx, miny, maxx, maxy].join(",");
}

export function buildCopernicusTileUrl(
  z: number,
  x: number,
  y: number,
  time: string,
): string {
  if (!Number.isInteger(z) || z < 0 || z > COPERNICUS_GFM_MAX_ZOOM) {
    throw new Error("invalid_zoom");
  }
  const max = 2 ** z;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= max || y >= max) {
    throw new Error("invalid_tile");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(time)) {
    throw new Error("invalid_time");
  }
  const params = new URLSearchParams({
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    LAYERS: COPERNICUS_OBSERVED_FLOOD_LAYER,
    STYLES: "",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    WIDTH: "256",
    HEIGHT: "256",
    CRS: "EPSG:3857",
    BBOX: tileBounds3857(z, x, y),
    TIME: time,
  });
  return `${COPERNICUS_GFM_WMS}?${params}`;
}
