import { MAP_MARKER_THUMB_SIZE } from "@/lib/map/mapMarkerThumbnail";

export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = new Set([
  "upload.wikimedia.org",
  "commons.wikimedia.org",
]);

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8_000;

function isAllowedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    if (!ALLOWED_HOSTS.has(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  const sizeParam = Number(searchParams.get("size") ?? MAP_MARKER_THUMB_SIZE);
  const size = Number.isFinite(sizeParam)
    ? Math.min(128, Math.max(48, Math.round(sizeParam)))
    : MAP_MARKER_THUMB_SIZE;

  if (!rawUrl) {
    return Response.json({ error: "missing_url" }, { status: 400 });
  }

  let target = isAllowedUrl(rawUrl);
  if (!target) {
    return Response.json({ error: "host_not_allowed" }, { status: 400 });
  }

  // Prefer an explicit small Wikimedia thumb when the caller passed a large one.
  const path = target.pathname.replace(
    /\/\d+px-([^/]+)$/,
    `/${size}px-$1`,
  );
  if (path !== target.pathname) {
    target = new URL(target.toString());
    target.pathname = path;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(target.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/jpeg,image/png,*/*",
        "User-Agent": "EUInteractiveMap/0.2 (map thumbnails; contact: local-dev)",
      },
      next: { revalidate: 604_800 },
    });
    if (!upstream.ok) {
      return Response.json(
        { error: `upstream_${upstream.status}` },
        { status: 502 },
      );
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!/^image\/(jpeg|jpg|png|webp|avif)/i.test(contentType)) {
      return Response.json({ error: "invalid_content_type" }, { status: 415 });
    }
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_BYTES) {
      return Response.json({ error: "invalid_image_size" }, { status: 422 });
    }
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0]!,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
