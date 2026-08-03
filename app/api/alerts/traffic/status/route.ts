import { PROJECT_EUROPE_ALERT_BOUNDS } from "@/lib/alerts/geography";
import { getTrafficProvider } from "@/lib/alerts/providers/traffic/provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const demoMode =
    process.env.NODE_ENV !== "production" &&
    process.env.ALERTS_DEMO_MODE === "true";
  const status = demoMode
    ? {
        connectorStatus: "operational" as const,
        configured: true,
        trafficModelId: "demo-traffic-model",
        updatedAt: new Date().toISOString(),
        warning: null,
      }
    : await getTrafficProvider().getStatus();
  return Response.json(
    {
      ...status,
      demoMode,
      provider: "TomTom Traffic Orbis v2",
      apiVersion: 2,
      maxZoom: 22,
      bounds: [
        PROJECT_EUROPE_ALERT_BOUNDS.west,
        PROJECT_EUROPE_ALERT_BOUNDS.south,
        PROJECT_EUROPE_ALERT_BOUNDS.east,
        PROJECT_EUROPE_ALERT_BOUNDS.north,
      ],
      flowTileTemplate: "/api/alerts/traffic/flow/tiles/{z}/{x}/{y}",
      incidentTileTemplate:
        "/api/alerts/traffic/incidents/tiles/{z}/{x}/{y}",
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
