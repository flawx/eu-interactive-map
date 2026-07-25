export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EFFIS_WMS_BASE =
  "https://maps.effis.emergency.copernicus.eu/effis";

const WEB_MERCATOR_LIMIT = 20037508.342789244;

const MAX_CONCURRENT_EFFIS_REQUESTS = 4;
let activeEffisRequests = 0;
const waitingEffisRequests: Array<() => void> = [];

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const TRANSPARENT_PNG = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");

const FETCH_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 600;

function tileToWebMercatorBbox(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const tileCount = 2 ** z;
  const tileSpan = (WEB_MERCATOR_LIMIT * 2) / tileCount;
  const minX = -WEB_MERCATOR_LIMIT + x * tileSpan;
  const maxX = minX + tileSpan;
  const maxY = WEB_MERCATOR_LIMIT - y * tileSpan;
  const minY = maxY - tileSpan;

  return [minX, minY, maxX, maxY];
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildTimeRange(daysBack: number): string {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - daysBack);
  return `${formatUtcDate(from)}/${formatUtcDate(to)}`;
}

async function withEffisRequestLimit<T>(
  task: () => Promise<T>,
): Promise<T> {
  if (activeEffisRequests >= MAX_CONCURRENT_EFFIS_REQUESTS) {
    await new Promise<void>((resolve) => {
      waitingEffisRequests.push(resolve);
    });
  }

  activeEffisRequests += 1;

  try {
    return await task();
  } finally {
    activeEffisRequests -= 1;
    const nextRequest = waitingEffisRequests.shift();
    nextRequest?.();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "image/png,image/*",
        "User-Agent": "EUInteractiveMap/0.1",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function shouldRetryStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function fetchEffisTile(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }

    try {
      const response = await withEffisRequestLimit(() =>
        fetchWithTimeout(url, FETCH_TIMEOUT_MS),
      );

      if (response.ok) {
        return response;
      }

      if (!shouldRetryStatus(response.status) || attempt === 1) {
        return null;
      }
    } catch {
      if (attempt === 1) {
        return null;
      }
    }
  }

  return null;
}

function fallbackTileResponse(): Response {
  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-EFFIS-Proxy": "fallback",
    },
  });
}

function parsePositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      dataset: string;
      z: string;
      x: string;
      y: string;
    }>;
  },
) {
  const { dataset, z: zRaw, x: xRaw, y: yRaw } = await params;

  if (dataset !== "active" && dataset !== "burned") {
    return new Response("Invalid dataset", { status: 400 });
  }

  const z = parsePositiveInt(zRaw);
  const x = parsePositiveInt(xRaw);
  const y = parsePositiveInt(yRaw);

  if (z === null || x === null || y === null) {
    return new Response("Invalid tile coordinates", { status: 400 });
  }

  if (z < 0 || z > 14) {
    return new Response("Invalid zoom", { status: 400 });
  }

  const maxIndex = 2 ** z - 1;
  if (x < 0 || y < 0 || x > maxIndex || y > maxIndex) {
    return new Response("Tile out of range", { status: 400 });
  }

  const layers =
    dataset === "active"
      ? "modis.hs,viirs.hs"
      : "modis.ba.poly.week,effis.nrt.ba.poly";
  const time = buildTimeRange(dataset === "active" ? 1 : 7);
  const [minX, minY, maxX, maxY] = tileToWebMercatorBbox(z, x, y);

  const url = new URL(EFFIS_WMS_BASE);
  url.search = new URLSearchParams({
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
    TIME: time,
    BBOX: `${minX},${minY},${maxX},${maxY}`,
  }).toString();

  const upstream = await fetchEffisTile(url.toString());
  if (!upstream) {
    return fallbackTileResponse();
  }

  const contentType = upstream.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return fallbackTileResponse();
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  if (body.byteLength < 1) {
    return fallbackTileResponse();
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType || "image/png",
      "Cache-Control":
        "public, max-age=300, stale-while-revalidate=86400",
      "X-EFFIS-Proxy": "success",
    },
  });
}
