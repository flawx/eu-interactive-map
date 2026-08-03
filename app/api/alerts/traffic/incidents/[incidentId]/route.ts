import { demoTrafficAlerts } from "@/lib/alerts/demoFixtures";
import { getTrafficProvider } from "@/lib/alerts/providers/traffic/provider";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/alerts/traffic/incidents/[incidentId]">,
) {
  const { incidentId } = await context.params;
  const locale = new URL(request.url).searchParams.get("locale") || "en";
  const demoMode =
    process.env.NODE_ENV !== "production" &&
    process.env.ALERTS_DEMO_MODE === "true";
  const decodedId = decodeURIComponent(incidentId);
  if (demoMode) {
    const alert =
      demoTrafficAlerts().find(
        (candidate) =>
          candidate.sourceEventId === decodedId || candidate.id === decodedId,
      ) ?? null;
    return Response.json(
      {
        alert,
        connectorStatus: "operational",
        trafficModelId: "demo-traffic-model",
        fetchedAt: new Date().toISOString(),
        warnings: alert ? [] : ["incident_not_found"],
        demoMode: true,
      },
      { status: alert ? 200 : 404 },
    );
  }
  const result = await getTrafficProvider().getIncidentById(decodedId, locale);
  return Response.json(
    { ...result, alert: result.alerts[0] ?? null, demoMode: false },
    {
      status:
        result.connectorStatus === "misconfigured"
          ? 503
          : result.alerts.length
            ? 200
            : 404,
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
