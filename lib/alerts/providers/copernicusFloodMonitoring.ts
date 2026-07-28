import "server-only";

import {
  COPERNICUS_GFM_WMS,
  COPERNICUS_OBSERVED_FLOOD_LAYER,
  parseCopernicusCapabilities,
  type CopernicusFloodLayerStatus,
} from "@/lib/alerts/copernicusFlood";
import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";

const CAPABILITIES_URL =
  `${COPERNICUS_GFM_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;

export async function getCopernicusFloodLayerStatus(): Promise<CopernicusFloodLayerStatus> {
  const publishedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(CAPABILITIES_URL, {
      headers: { Accept: "application/xml,text/xml" },
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!response.ok) throw new Error(`copernicus_http_${response.status}`);
    const xml = await response.text();
    return {
      ...parseCopernicusCapabilities(xml),
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
    };
  } finally {
    clearTimeout(timeout);
  }
}
