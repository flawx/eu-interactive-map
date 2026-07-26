export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEB_MERCATOR_LIMIT = 20037508.342789244;
const FETCH_TIMEOUT_MS = 15_000;

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const TRANSPARENT_PNG = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");

const CACHE_CONTROL =
  "public, s-maxage=300, stale-while-revalidate=900";

type RouteContext = {
  params: Promise<{ z: string; x: string; y: string }>;
};

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

function parseTileCoordinate(
  value: string,
  max: number,
): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > max) {
    return null;
  }
  return parsed;
}

function transparentPngResponse(): Response {
  return new Response(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { z: zRaw, x: xRaw, y: yRaw } = await context.params;

  const z = parseTileCoordinate(zRaw, 22);
  if (z === null) {
    return transparentPngResponse();
  }

  const tileCount = 2 ** z;
  const x = parseTileCoordinate(xRaw, tileCount - 1);
  const y = parseTileCoordinate(yRaw, tileCount - 1);

  if (x === null || y === null) {
    return transparentPngResponse();
  }

  const mapKey = process.env.FIRMS_MAP_KEY?.trim();
  if (!mapKey) {
    console.error("[FIRMS] FIRMS_MAP_KEY is not configured");
    return transparentPngResponse();
  }

  const [minX, minY, maxX, maxY] = tileToWebMercatorBbox(z, x, y);

  const params = new URLSearchParams({
    SERVICE: "WMS",
    REQUEST: "GetMap",
    VERSION: "1.1.1",
    LAYERS: "fires_viirs_24",
    STYLES: "",
    SRS: "EPSG:3857",
    WIDTH: "256",
    HEIGHT: "256",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    BBOX: `${minX},${minY},${maxX},${maxY}`,
  });

  const upstreamUrl = `https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/${encodeURIComponent(mapKey)}/?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await fetch(upstreamUrl, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "image/png,image/*",
        "User-Agent": "EUInteractiveMap/0.1",
      },
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    if (!upstream.ok || !contentType.toLowerCase().startsWith("image/")) {
      console.error(
        `[FIRMS] upstream unavailable status=${upstream.status} content-type=${contentType || "none"}`,
      );
      return transparentPngResponse();
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    if (body.byteLength === 0) {
      console.error("[FIRMS] upstream returned empty body");
      return transparentPngResponse();
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType.startsWith("image/")
          ? contentType
          : "image/png",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? "timeout"
        : "request failed";
    console.error(`[FIRMS] ${reason}`);
    return transparentPngResponse();
  } finally {
    clearTimeout(timeoutId);
  }
}
