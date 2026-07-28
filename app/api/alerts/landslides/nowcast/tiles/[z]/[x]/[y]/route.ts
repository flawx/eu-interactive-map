import sharp from "sharp";
import {
  TRANSPARENT_TILE_CACHE_CONTROL,
  tileBounds4326,
  tileIntersectsProjectEurope,
  transparentPng256,
  validateTileCoordinates,
} from "@/lib/alerts/providers/copernicusFloodTiles";
import {
  buildNasaLhasaExportUrl,
  NASA_LHASA_MAX_ZOOM,
} from "@/lib/alerts/providers/nasaLhasa";

const CACHE_CONTROL = "public, max-age=900, s-maxage=1800, stale-while-revalidate=1800";
const TIMEOUT_MS = 10_000;
const pending = new Map<string, Promise<Buffer>>();
const cache = new Map<string, { expiresAt: number; buffer: Buffer }>();

async function transparent(reason: string): Promise<Response> {
  const buffer = await transparentPng256();
  return new Response(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
    {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": TRANSPARENT_TILE_CACHE_CONTROL,
      "X-Alert-Data": reason,
    },
    },
  );
}

async function fetchTile(url: string, level: "moderate" | "high"): Promise<Buffer> {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.buffer;
  const existing = pending.get(url);
  if (existing) return existing;
  const promise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "image/png" },
        next: { revalidate: 1800 },
      });
      if (!response.ok) throw new Error(`nasa_lhasa_tile_http_${response.status}`);
      const input = Buffer.from(await response.arrayBuffer());
      const { data, info } = await sharp(input)
        .ensureAlpha()
        .resize(256, 256, { fit: "fill" })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const color = level === "high" ? [220, 38, 38] : [249, 115, 22];
      for (let index = 0; index < data.length; index += 4) {
        const detected = data[index + 3] > 0 && Math.max(data[index], data[index + 1], data[index + 2]) > 15;
        data[index] = color[0];
        data[index + 1] = color[1];
        data[index + 2] = color[2];
        data[index + 3] = detected ? (level === "high" ? 150 : 105) : 0;
      }
      const buffer = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
      }).png().toBuffer();
      cache.set(url, { expiresAt: Date.now() + 30 * 60 * 1000, buffer });
      return buffer;
    } finally {
      clearTimeout(timeout);
    }
  })().finally(() => pending.delete(url));
  pending.set(url, promise);
  return promise;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const params = await context.params;
  const z = Number(params.z);
  const x = Number(params.x);
  const y = Number(params.y);
  const level = new URL(request.url).searchParams.get("level");
  if (!validateTileCoordinates(z, x, y) || (level !== "moderate" && level !== "high")) {
    return Response.json({ error: "invalid_lhasa_tile_request" }, { status: 400 });
  }
  if (z > NASA_LHASA_MAX_ZOOM) return transparent("zoom-above-provider-maximum");
  if (!tileIntersectsProjectEurope(z, x, y)) return transparent("outside-project-europe");
  try {
    const buffer = await fetchTile(buildNasaLhasaExportUrl(tileBounds4326(z, x, y), level), level);
    return new Response(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
      {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": CACHE_CONTROL,
        "X-Alert-Data": "nasa-lhasa-modelled-likelihood",
      },
      },
    );
  } catch {
    return transparent("provider-unavailable");
  }
}
