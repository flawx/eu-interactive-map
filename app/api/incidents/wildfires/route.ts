import { fetchEuWildfireIncidents } from "@/lib/incidents/gdacsWildfires";

export async function GET() {
  try {
    const incidents = await fetchEuWildfireIncidents();

    return Response.json({
      incidents,
      updatedAt: new Date().toISOString(),
      source: "GDACS",
    });
  } catch {
    return Response.json(
      {
        incidents: [],
        updatedAt: null,
        source: "GDACS",
        error: "Wildfire data temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
