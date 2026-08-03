import { getTrafficProvider } from "@/lib/alerts/providers/traffic/provider";
import { validateTileCoordinates } from "@/lib/alerts/providers/copernicusFloodTiles";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/alerts/traffic/flow/tiles/[z]/[x]/[y]">,
) {
  const params = await context.params;
  const z = Number(params.z);
  const x = Number(params.x);
  const y = Number(params.y);
  if (!validateTileCoordinates(z, x, y)) {
    return Response.json({ error: "invalid_tile_coordinates" }, { status: 400 });
  }
  const result = await getTrafficProvider().getTile("flow", z, x, y);
  return new Response(result.body, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      "X-Traffic-Data": result.dataState,
      "X-Traffic-Provider-Status": result.connectorStatus,
      ...(result.trafficModelId
        ? { "X-Traffic-Model-ID": result.trafficModelId }
        : {}),
      ...(result.retryAfter ? { "Retry-After": result.retryAfter } : {}),
    },
  });
}
