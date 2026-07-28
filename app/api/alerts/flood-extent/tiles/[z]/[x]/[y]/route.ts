import { buildCopernicusTileUrl } from "@/lib/alerts/copernicusFlood";
import {
  getGfmCapabilities,
  isAvailableGfmTime,
  resolveLatestAvailableGfmTime,
  COPERNICUS_GFM_MAX_ZOOM,
} from "@/lib/alerts/providers/copernicusGfmCapabilities";
import {
  sanitizeObservedFloodExtentTile,
  tileIntersectsProjectEurope,
  transparentPng256,
  validateTileCoordinates,
  TRANSPARENT_TILE_CACHE_CONTROL,
} from "@/lib/alerts/providers/copernicusFloodTiles";

type TileResult = {
  body: Buffer;
  status: string;
  acquisitionTime: string | null;
};

const requestsInFlight = new Map<string, Promise<TileResult>>();
const loggedErrors = new Set<string>();

function logOnce(code: string, error?: unknown): void {
  if (loggedErrors.has(code)) return;
  loggedErrors.add(code);
  console.error(`[copernicus-gfm:${code}]`, error);
}

async function transparent(
  status: string,
  acquisitionTime: string | null = null,
): Promise<TileResult> {
  return { body: await transparentPng256(), status, acquisitionTime };
}

async function loadTile(
  z: number,
  x: number,
  y: number,
  requestedTime: string | null,
): Promise<TileResult> {
  if (!validateTileCoordinates(z, x, y)) {
    return transparent("invalid-request");
  }
  if (z > COPERNICUS_GFM_MAX_ZOOM) {
    return transparent("overscaled");
  }
  if (!tileIntersectsProjectEurope(z, x, y)) {
    return transparent("outside-project-europe");
  }

  let capabilities;
  try {
    capabilities = await getGfmCapabilities();
  } catch (error) {
    logOnce("capabilities-unavailable", error);
    return transparent("provider-unavailable");
  }
  if (!capabilities.observedFloodExtent) {
    logOnce("observed-flood-layer-missing");
    return transparent("layer-missing");
  }
  const acquisitionTime =
    requestedTime && isAvailableGfmTime(capabilities, requestedTime)
      ? new Date(requestedTime).toISOString()
      : resolveLatestAvailableGfmTime(capabilities);
  if (!acquisitionTime) return transparent("no-time");

  const target = buildCopernicusTileUrl(z, x, y, acquisitionTime);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(target, {
      headers: { Accept: "image/png" },
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      logOnce(`provider-http-${response.status}`);
      return transparent(`provider-http-${response.status}`, acquisitionTime);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("image/png")) {
      logOnce("provider-invalid-content-type");
      return transparent("provider-invalid-response", acquisitionTime);
    }
    return {
      body: await sanitizeObservedFloodExtentTile(
        await response.arrayBuffer(),
        z,
        x,
        y,
      ),
      status: "observed-flood-extent",
      acquisitionTime,
    };
  } catch (error) {
    logOnce(
      error instanceof Error && error.name === "AbortError"
        ? "provider-timeout"
        : "provider-request-failed",
      error,
    );
    return transparent("provider-unavailable", acquisitionTime);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z: zValue, x: xValue, y: yValue } = await context.params;
  const z = Number(zValue);
  const x = Number(xValue);
  const y = Number(yValue);
  const requestedTime = new URL(request.url).searchParams.get("time");
  const key = `${z}/${x}/${y}/${requestedTime ?? "latest"}`;
  let pending = requestsInFlight.get(key);
  if (!pending) {
    pending = loadTile(z, x, y, requestedTime);
    requestsInFlight.set(key, pending);
  }
  try {
    const result = await pending;
    return new Response(new Uint8Array(result.body), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": TRANSPARENT_TILE_CACHE_CONTROL,
        "X-Alert-Tile-Status": result.status,
        ...(result.acquisitionTime
          ? { "X-GFM-Acquisition-Time": result.acquisitionTime }
          : {}),
      },
    });
  } finally {
    if (requestsInFlight.get(key) === pending) requestsInFlight.delete(key);
  }
}
