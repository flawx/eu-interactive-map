import { buildCopernicusTileUrl } from "@/lib/alerts/copernicusFlood";

export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  try {
    const { z, x, y } = await context.params;
    const time = new URL(request.url).searchParams.get("time") ?? "";
    const target = buildCopernicusTileUrl(Number(z), Number(x), Number(y), time);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(target, {
        headers: { Accept: "image/png" },
        signal: controller.signal,
        next: { revalidate: 900 },
      });
      if (!response.ok) {
        return new Response(null, { status: 204 });
      }
      return new Response(response.body, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return Response.json({ error: "invalid_flood_extent_request" }, { status: 400 });
  }
}
