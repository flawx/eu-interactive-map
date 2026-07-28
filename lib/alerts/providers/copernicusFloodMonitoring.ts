import "server-only";

import {
  COPERNICUS_OBSERVED_FLOOD_LAYER,
  type CopernicusFloodLayerStatus,
} from "@/lib/alerts/copernicusFlood";
import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";
import {
  COPERNICUS_GFM_MAX_ZOOM,
  getGfmCapabilities,
  resolveLatestAvailableGfmTime,
} from "@/lib/alerts/providers/copernicusGfmCapabilities";

export async function getCopernicusFloodLayerStatus(): Promise<CopernicusFloodLayerStatus> {
  const publishedAt = new Date().toISOString();
  try {
    const capabilities = await getGfmCapabilities();
    const layer = capabilities.observedFloodExtent;
    const acquisitionTime = resolveLatestAvailableGfmTime(capabilities);
    const interval =
      layer?.time?.kind === "interval"
        ? `${layer.time.start}/${layer.time.end}/${layer.time.period}`
        : layer?.time?.kind === "values"
          ? layer.time.values.join(",")
          : null;
    const age = acquisitionTime
      ? Date.now() - Date.parse(acquisitionTime)
      : Infinity;
    return {
      available: Boolean(layer && acquisitionTime),
      connectorStatus:
        !layer || !acquisitionTime
          ? "unavailable"
          : age > 48 * 60 * 60 * 1000
            ? "delayed"
            : "operational",
      layerName: COPERNICUS_OBSERVED_FLOOD_LAYER,
      acquisitionTime,
      interval,
      satellite: "Sentinel-1",
      dataNature: "satellite-observation",
      warning: layer
        ? acquisitionTime
          ? null
          : "copernicus_time_missing"
        : "copernicus_layer_not_found",
      queryable: Boolean(layer?.queryable),
      maxZoom: COPERNICUS_GFM_MAX_ZOOM,
      publishedAt,
      source: ALERT_SOURCES.copernicusGfm,
    };
  } catch (error) {
    return {
      available: false,
      connectorStatus: "unavailable",
      layerName: COPERNICUS_OBSERVED_FLOOD_LAYER,
      acquisitionTime: null,
      publishedAt,
      interval: null,
      satellite: "Sentinel-1",
      dataNature: "satellite-observation",
      source: ALERT_SOURCES.copernicusGfm,
      warning:
        error instanceof Error ? error.message : "copernicus_unavailable",
      queryable: false,
      maxZoom: COPERNICUS_GFM_MAX_ZOOM,
    };
  }
}
