import { getCopernicusFloodLayerStatus } from "@/lib/alerts/providers/copernicusFloodMonitoring";

export async function GET() {
  const result = await getCopernicusFloodLayerStatus();
  return Response.json(result, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=900, stale-while-revalidate=1800",
    },
  });
}
