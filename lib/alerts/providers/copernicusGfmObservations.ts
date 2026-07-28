import "server-only";

import { isPointInsideProjectEurope } from "@/lib/alerts/geography";

const GFM_STAC_ITEMS =
  "https://stac.eodc.eu/api/v1/collections/GFM/items";
const TITILER_POINT = "https://titiler.services.eodc.eu/cog/point";

type StacAsset = { href?: string };
type GfmStacItem = {
  id: string;
  bbox?: number[];
  properties?: Record<string, unknown>;
  assets?: Record<string, StacAsset>;
  links?: Array<{ rel?: string; href?: string }>;
};

export type CopernicusFloodObservation = {
  observationId: string;
  latitude: number;
  longitude: number;
  acquisitionTime: string;
  publishedAt: string | null;
  satellite: string;
  confidencePercent: number | null;
  qualityIndicators: string[];
  sourceUrl: string;
};

function itemContainsPoint(
  item: GfmStacItem,
  longitude: number,
  latitude: number,
): boolean {
  const bbox = item.bbox;
  return Boolean(
    bbox &&
      bbox.length >= 4 &&
      longitude >= bbox[0] &&
      longitude <= bbox[2] &&
      latitude >= bbox[1] &&
      latitude <= bbox[3],
  );
}

async function queryCogPoint(
  href: string,
  longitude: number,
  latitude: number,
  signal: AbortSignal,
): Promise<number | null> {
  const target =
    `${TITILER_POINT}/${longitude},${latitude}?url=${encodeURIComponent(href)}`;
  const response = await fetch(target, {
    headers: { Accept: "application/json" },
    signal,
    next: { revalidate: 900 },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { values?: unknown[] };
  const value = Number(data.values?.[0]);
  return Number.isFinite(value) ? value : null;
}

export async function inspectGfmFloodObservation(
  longitude: number,
  latitude: number,
  now = new Date(),
): Promise<CopernicusFloodObservation | null> {
  if (!isPointInsideProjectEurope(longitude, latitude)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const end = now.toISOString();
    const start = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const epsilon = 0.00001;
    const params = new URLSearchParams({
      bbox: [
        longitude - epsilon,
        latitude - epsilon,
        longitude + epsilon,
        latitude + epsilon,
      ].join(","),
      datetime: `${start}/${end}`,
      limit: "50",
    });
    const response = await fetch(`${GFM_STAC_ITEMS}?${params}`, {
      headers: { Accept: "application/geo+json,application/json" },
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!response.ok) throw new Error(`gfm_stac_http_${response.status}`);
    const data = (await response.json()) as { features?: GfmStacItem[] };
    const items = (data.features ?? [])
      .filter((item) => itemContainsPoint(item, longitude, latitude))
      .sort(
        (a, b) =>
          Date.parse(String(b.properties?.datetime ?? "")) -
          Date.parse(String(a.properties?.datetime ?? "")),
      );

    for (const item of items) {
      const floodAsset = item.assets?.ensemble_flood_extent?.href;
      if (!floodAsset) continue;
      const floodValue = await queryCogPoint(
        floodAsset,
        longitude,
        latitude,
        controller.signal,
      );
      // Product User Manual: 1 = flood, 0 = no flood, 255 = no data.
      if (floodValue !== 1) continue;
      const confidenceAsset = item.assets?.ensemble_likelihood?.href;
      const confidenceValue = confidenceAsset
        ? await queryCogPoint(
            confidenceAsset,
            longitude,
            latitude,
            controller.signal,
          )
        : null;
      const acquisitionTime = String(item.properties?.datetime ?? "");
      if (!Number.isFinite(Date.parse(acquisitionTime))) continue;
      const publishedAt = String(
        item.properties?.created ??
          item.properties?.["processing:datetime"] ??
          "",
      );
      const constellation = item.properties?.constellation;
      const satellite = Array.isArray(constellation)
        ? constellation.join(", ")
        : typeof constellation === "string"
          ? constellation
          : "Sentinel-1";
      return {
        observationId: item.id,
        latitude,
        longitude,
        acquisitionTime: new Date(acquisitionTime).toISOString(),
        publishedAt: Number.isFinite(Date.parse(publishedAt))
          ? new Date(publishedAt).toISOString()
          : null,
        satellite,
        confidencePercent:
          confidenceValue != null &&
          confidenceValue >= 0 &&
          confidenceValue <= 100
            ? confidenceValue
            : null,
        qualityIndicators:
          item.properties?.anomaly_detected === true
            ? ["anomaly_detected"]
            : [],
        sourceUrl:
          item.links?.find((link) => link.rel === "self")?.href ??
          "https://services.eodc.eu/browser/#/v1/collections/GFM",
      };
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
