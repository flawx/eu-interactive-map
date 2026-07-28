import { getAlertSource } from "@/lib/alerts/sourceRegistry";
import type { AlertApiResponse } from "@/lib/alerts/types";

export const NASA_LHASA_IMAGE_SERVICE =
  "https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/LHASA_Hazard_Today/ImageServer";
export const NASA_LHASA_REFRESH_MS = 30 * 60 * 1000;
export const NASA_LHASA_MAX_ZOOM = 10;
const TIMEOUT_MS = 10_000;

export type NasaLhasaStatus = AlertApiResponse & {
  model: "NASA LHASA";
  dataType: "modelled_likelihood";
  validAt: string | null;
  publishedAt: string | null;
  refreshIntervalMinutes: 30;
  levels: readonly ["moderate", "high"];
  tileTemplates: {
    moderate: string;
    high: string;
  };
  bounds: [number, number, number, number];
  maxZoom: number;
};

let cached: { expiresAt: number; value: NasaLhasaStatus } | null = null;
let inFlight: Promise<NasaLhasaStatus> | null = null;

function extractTimestamp(payload: Record<string, unknown>): string | null {
  const candidates = [
    payload.productTime,
    payload.validAt,
    payload.acquisitionDate,
    payload.lastUpdated,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

export function isLhasaTimestampStale(
  value: string | null,
  now = new Date(),
): boolean {
  if (!value) return true;
  const parsed = Date.parse(value);
  return !Number.isFinite(parsed) || now.getTime() - parsed > 90 * 60 * 1000;
}

export async function fetchNasaLhasaStatus(): Promise<NasaLhasaStatus> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const fetchedAt = new Date().toISOString();
    const source = getAlertSource("nasaLhasa");
    const base: Omit<NasaLhasaStatus, keyof AlertApiResponse> = {
      model: "NASA LHASA",
      dataType: "modelled_likelihood",
      validAt: null,
      publishedAt: null,
      refreshIntervalMinutes: 30,
      levels: ["moderate", "high"],
      tileTemplates: {
        moderate: "/api/alerts/landslides/nowcast/tiles/{z}/{x}/{y}?level=moderate",
        high: "/api/alerts/landslides/nowcast/tiles/{z}/{x}/{y}?level=high",
      },
      bounds: [-31.5, 27, 45, 72.5],
      maxZoom: NASA_LHASA_MAX_ZOOM,
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${NASA_LHASA_IMAGE_SERVICE}?f=pjson`, {
        signal: controller.signal,
        next: { revalidate: 1800 },
      });
      if (!response.ok) throw new Error(`nasa_lhasa_http_${response.status}`);
      const payload = (await response.json()) as Record<string, unknown>;
      if (typeof payload.name !== "string" || !payload.name.includes("LHASA")) {
        throw new Error("nasa_lhasa_schema_invalid");
      }
      const validAt = extractTimestamp(payload);
      const value: NasaLhasaStatus = {
        alerts: [],
        fetchedAt,
        source,
        connectorStatus: validAt && isLhasaTimestampStale(validAt) ? "delayed" : "operational",
        warnings: validAt ? [] : ["lhasa_product_time_unavailable"],
        providerStatuses: {
          "nasa-lhasa": validAt && isLhasaTimestampStale(validAt) ? "delayed" : "operational",
        },
        ...base,
        validAt,
      };
      cached = { value, expiresAt: Date.now() + NASA_LHASA_REFRESH_MS };
      return value;
    } catch (error) {
      const value: NasaLhasaStatus = {
        alerts: [],
        fetchedAt,
        source,
        connectorStatus: "unavailable",
        warnings: [error instanceof Error ? error.message : "nasa_lhasa_unavailable"],
        providerStatuses: { "nasa-lhasa": "unavailable" },
        ...base,
      };
      cached = { value, expiresAt: Date.now() + 60_000 };
      return value;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function buildNasaLhasaExportUrl(
  bounds: { west: number; south: number; east: number; north: number },
  level: "moderate" | "high",
): string {
  const ranges =
    level === "moderate"
      ? [0.01, 0.05]
      : [0.05, 1.01];
  const renderingRule = {
    rasterFunction: "Remap",
    rasterFunctionArguments: {
      NoDataRanges: [-9999, 0.01],
      InputRanges: ranges,
      OutputValues: [255],
      Raster: "$$",
    },
    outputPixelType: "U8",
  };
  const url = new URL(`${NASA_LHASA_IMAGE_SERVICE}/exportImage`);
  url.searchParams.set("f", "image");
  url.searchParams.set("bbox", `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`);
  url.searchParams.set("bboxSR", "4326");
  url.searchParams.set("imageSR", "4326");
  url.searchParams.set("size", "256,256");
  url.searchParams.set("format", "png32");
  url.searchParams.set("transparent", "true");
  url.searchParams.set("renderingRule", JSON.stringify(renderingRule));
  return url.toString();
}

export function resetNasaLhasaCacheForTests(): void {
  cached = null;
  inFlight = null;
}
