import { fetchGdacsAlerts } from "@/lib/alerts/providers/gdacs";

export async function GET() {
  const result = await fetchGdacsAlerts("FL");
  return Response.json(result, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}
