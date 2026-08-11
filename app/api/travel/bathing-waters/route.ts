/**
 * European Bathing Waters — viewport / filter query endpoint.
 *
 * Server-only: proxies bbox-scoped pages of the EEA
 * `BathingWater/BathingWater_Dyna_WM` ArcGIS MapServer (~22k EU sites).
 * Never bundles the full dataset — always bbox + limit scoped, and only
 * ever requested by the client while the layer is switched ON.
 *
 * GET params:
 *   bbox    "minLng,minLat,maxLng,maxLat" (omitted = server default page, no bbox filter)
 *   zoom    current map zoom (informational)
 *   limit   max features returned (default 300, capped at 1000)
 *   cursor  offset for pagination
 */
import { bathingWaterSitesToFeatureCollection } from "@/lib/travel/bathingWaters/types";
import { fetchBathingWatersInBbox } from "@/lib/travel/bathingWaters/query";
import { parseBboxParam } from "@/lib/travel/wifi4eu/query";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const bbox = parseBboxParam(searchParams.get("bbox"));
  if (searchParams.get("bbox") && !bbox) {
    return Response.json(
      { error: "invalid_bbox", message: "bbox must be minLng,minLat,maxLng,maxLat" },
      { status: 400 },
    );
  }

  const limitParam = searchParams.get("limit");
  const cursorParam = searchParams.get("cursor");

  const result = await fetchBathingWatersInBbox({
    bbox,
    limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
    cursor: cursorParam ? Number.parseInt(cursorParam, 10) : undefined,
  });

  if (!result.ok) {
    const status = result.error === "timeout" ? 504 : 502;
    return Response.json(
      { type: "FeatureCollection", features: [], error: result.error },
      { status },
    );
  }

  const collection = bathingWaterSitesToFeatureCollection(result.sites);

  return Response.json(
    { ...collection, meta: result.meta },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
