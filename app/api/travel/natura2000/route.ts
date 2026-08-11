/**
 * Natura 2000 — high-zoom click/identify endpoint.
 *
 * Server-only: proxies a single-point identify query to the EEA
 * `ProtectedSites/Natura2000_Dyna_WM` ArcGIS MapServer (layer 0, "Query
 * Sites"). Never bundles or caches the full Natura 2000 dataset — one
 * request per map click, only while the Natura 2000 layer is switched ON
 * client-side.
 *
 * GET params:
 *   lng   clicked longitude (required)
 *   lat   clicked latitude (required)
 */
import { fetchNatura2000Site } from "@/lib/travel/natura2000/eeaQuery";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lng = Number.parseFloat(searchParams.get("lng") ?? "");
  const lat = Number.parseFloat(searchParams.get("lat") ?? "");

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return Response.json(
      { error: "invalid_coordinates", message: "lng and lat query params are required" },
      { status: 400 },
    );
  }

  const result = await fetchNatura2000Site(lng, lat);

  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return Response.json({ error: result.error, site: null }, { status });
  }

  return Response.json(
    { site: result.site },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
