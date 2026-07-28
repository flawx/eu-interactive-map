import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";
import type { AlertConnectorStatus } from "@/lib/alerts/types";

export const COPERNICUS_GFM_WMS =
  "https://european-flood.emergency.copernicus.eu/api/wms/";
export const COPERNICUS_OBSERVED_FLOOD_LAYER =
  "mapserver:gfm_observed_flood_extent_group_layer";

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
};

export function parseCopernicusCapabilities(
  xml: string,
  now = new Date(),
): Omit<CopernicusFloodLayerStatus, "publishedAt" | "source"> {
  const layerIndex = xml.indexOf(`<Name>${COPERNICUS_OBSERVED_FLOOD_LAYER}</Name>`);
  if (layerIndex < 0) {
    return {
      available: false,
      connectorStatus: "unavailable",
      layerName: COPERNICUS_OBSERVED_FLOOD_LAYER,
      acquisitionTime: null,
      interval: null,
      satellite: "Sentinel-1",
      dataNature: "satellite-observation",
      warning: "copernicus_layer_not_found",
    };
  }
  const block = xml.slice(layerIndex, layerIndex + 2500);
  const match = block.match(
    /<Dimension[^>]*name=["']time["'][^>]*default=["']([^"']+)["'][^>]*>([^<]+)<\/Dimension>/i,
  );
  const acquisitionTime = match?.[1] ?? null;
  const interval = match?.[2]?.trim() ?? null;
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
  };
}
function tileBounds3857(z: number, x: number, y: number): string {
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
  if (!Number.isInteger(z) || z < 0 || z > 14) throw new Error("invalid_zoom");
  const max = 2 ** z;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= max || y >= max) {
    throw new Error("invalid_tile");
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(time)) {
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
