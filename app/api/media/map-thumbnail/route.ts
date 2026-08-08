import {
  MAP_MARKER_WIKIMEDIA_FETCH_SIZE,
  nearestWikimediaThumbWidth,
  toCommonsFilePathThumbnailUrl,
  toOptimizedMarkerThumbnailUrl,
} from "@/lib/map/mapMarkerThumbnail";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set([
  "upload.wikimedia.org",
  "commons.wikimedia.org",
]);

const MAX_BYTES = 1_500_000;
/** Keep upstream waits short so one bad URL cannot stall the map. */
const TIMEOUT_MS = 2_800;

type MetricKey = "200" | "404" | "429" | "5xx" | "timeout" | "other";

const metrics: Record<MetricKey, number> = {
  "200": 0,
  "404": 0,
  "429": 0,
  "5xx": 0,
  timeout: 0,
  other: 0,
};

let lastMetricsLogAt = 0;

function bump(key: MetricKey) {
  metrics[key] += 1;
  const now = Date.now();
  if (process.env.NODE_ENV !== "production" && now - lastMetricsLogAt > 30_000) {
    lastMetricsLogAt = now;
    console.info(
      "[thumbnail upstream]",
      Object.entries(metrics)
        .map(([k, v]) => `${k}=${v}`)
        .join(" "),
    );
  }
}

function isAllowedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function candidateUrls(rawUrl: string, size: number): string[] {
  const thumbWidth = nearestWikimediaThumbWidth(size);
  const altWidth = nearestWikimediaThumbWidth(Math.max(thumbWidth, 250));
  const optimized = toOptimizedMarkerThumbnailUrl(rawUrl, thumbWidth);
  const optimizedAlt = toOptimizedMarkerThumbnailUrl(rawUrl, altWidth);
  const filePath = toCommonsFilePathThumbnailUrl(rawUrl, thumbWidth);
  const parsed = isAllowedUrl(rawUrl);
  const urls = [
    optimized,
    optimizedAlt,
    filePath,
    parsed?.toString() ?? null,
  ].filter((value): value is string => Boolean(value));
  return [...new Set(urls)];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const sizeParam = Number(
    searchParams.get("size") ?? MAP_MARKER_WIKIMEDIA_FETCH_SIZE,
  );
  const size = Number.isFinite(sizeParam)
    ? Math.min(1280, Math.max(40, Math.round(sizeParam)))
    : MAP_MARKER_WIKIMEDIA_FETCH_SIZE;

  if (!rawUrl) {
    return Response.json({ error: "missing_url" }, { status: 400 });
  }

  const parsed = isAllowedUrl(rawUrl);
  if (!parsed) {
    return Response.json({ error: "host_not_allowed" }, { status: 400 });
  }

  const candidates = candidateUrls(rawUrl, size);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let upstream: Response | null = null;
    let lastStatus = 0;
    for (const candidate of candidates) {
      const response = await fetch(candidate, {
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/jpeg,image/png,*/*",
          "User-Agent":
            "EUInteractiveMap/0.2 (map thumbnails; contact: local-dev)",
        },
        redirect: "follow",
        cache: "force-cache",
      });
      lastStatus = response.status;
      if (response.ok) {
        const finalHost = new URL(response.url).hostname;
        if (!ALLOWED_HOSTS.has(finalHost)) {
          lastStatus = 502;
          continue;
        }
        upstream = response;
        break;
      }
      if (response.status === 429) break;
    }

    if (!upstream) {
      if (lastStatus === 404) bump("404");
      else if (lastStatus === 429) bump("429");
      else if (lastStatus >= 500) bump("5xx");
      else bump("other");
      return Response.json(
        { error: `upstream_${lastStatus || "unavailable"}` },
        {
          status: 502,
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            "X-Thumbnail-Upstream-Status": String(lastStatus || 0),
          },
        },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!/^image\/(jpeg|jpg|png|webp|avif)/i.test(contentType)) {
      bump("other");
      return Response.json({ error: "invalid_content_type" }, { status: 415 });
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      bump("other");
      return Response.json({ error: "invalid_image_size" }, { status: 422 });
    }
    bump("200");
    const etag = `"${createHash("sha1").update(buffer).digest("hex")}"`;
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control":
            "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
        },
      });
    }
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0]!,
        ETag: etag,
        "Cache-Control":
          "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const aborted =
      (error instanceof DOMException && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as { name?: string }).name === "AbortError");
    bump(aborted ? "timeout" : "other");
    return Response.json(
      { error: aborted ? "upstream_timeout" : "upstream_unavailable" },
      {
        status: 502,
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "X-Thumbnail-Upstream-Status": aborted ? "timeout" : "error",
        },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
