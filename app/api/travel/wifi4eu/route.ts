/**
 * WiFi4EU — viewport / filter query endpoint (multi-source).
 *
 * GET params:
 *   bbox    "minLng,minLat,maxLng,maxLat"
 *   zoom    informational
 *   limit   max features (default 200, cap 500)
 *   cursor  pagination offset
 *   includeOsm  "true"|"false" — include OSM community fallback (default true)
 */
import { wifi4EuRecordsToFeatureCollection } from "@/lib/travel/wifi4eu/types";
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
  const includeOsmParam = searchParams.get("includeOsm");

  const { hotspots, meta } = await queryWifi4EuHotspots({
    bbox,
    limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
    cursor: cursorParam ? Number.parseInt(cursorParam, 10) : undefined,
    includeOsm: includeOsmParam === "false" ? false : true,
  });

  const collection = wifi4EuRecordsToFeatureCollection(hotspots);

  return Response.json(
    {
      ...collection,
      meta,
      metadata: {
        coverageType: meta.coverageType,
        sources: meta.sources,
        exactHotspotCount: meta.exactHotspotCount,
        municipalityCount: meta.municipalityCount,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
