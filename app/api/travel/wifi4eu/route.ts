/**
 * WiFi4EU hotspots — viewport / filter query endpoint.
 *
 * Server-only: scans the curated fixture (`lib/travel/wifi4eu/fixtureHotspots.ts`)
 * in-memory. See that file's header for the data-access reality (no
 * redistributable pan-EU WiFi4EU API exists — this proxies a small curated
 * municipal open-data seed instead). Never returns a password/credential
 * field — WiFi4EU hotspots are free public Wi-Fi by design.
 *
 * GET params:
 *   bbox    "minLng,minLat,maxLng,maxLat" (omitted = whole in-scope dataset)
 *   zoom    current map zoom (informational — reserved for future majorOnly-style thinning)
 *   limit   max features returned (default 200, capped at 500)
 *   cursor  offset for pagination
 */
import { wifiHotspotsToFeatureCollection } from "@/lib/travel/wifi4eu/types";
import { parseBboxParam, queryWifi4EuHotspots } from "@/lib/travel/wifi4eu/query";

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

  const { hotspots, meta } = queryWifi4EuHotspots({
    bbox,
    limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
    cursor: cursorParam ? Number.parseInt(cursorParam, 10) : undefined,
  });

  const collection = wifiHotspotsToFeatureCollection(hotspots);

  return Response.json(
    { ...collection, meta },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
