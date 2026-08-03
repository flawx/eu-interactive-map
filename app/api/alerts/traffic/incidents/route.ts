import { demoTrafficAlerts } from "@/lib/alerts/demoFixtures";
import type { GeographicBounds } from "@/lib/alerts/geography";
import { getTrafficProvider } from "@/lib/alerts/providers/traffic/provider";
import type { TrafficIncidentTimeMode } from "@/lib/alerts/types";

export const dynamic = "force-dynamic";

function parseBounds(value: string | null): GeographicBounds | null {
  const parts = value?.split(",").map(Number);
  if (!parts || parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  return { west: parts[0], south: parts[1], east: parts[2], north: parts[3] };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const bounds = parseBounds(url.searchParams.get("bbox"));
  if (!bounds) {
    return Response.json({ error: "invalid_bbox" }, { status: 400 });
  }
  const requestedMode = url.searchParams.get("mode");
  const timeMode: TrafficIncidentTimeMode =
    requestedMode === "planned" || requestedMode === "recent"
      ? requestedMode
      : "current";
  const locale = url.searchParams.get("locale") || "en";
  const demoMode =
    process.env.NODE_ENV !== "production" &&
    process.env.ALERTS_DEMO_MODE === "true";
  if (demoMode) {
    const alerts = demoTrafficAlerts().filter((alert) => {
      if (!alert.centroid) return false;
      const inside =
        alert.centroid.longitude >= bounds.west &&
        alert.centroid.longitude <= bounds.east &&
        alert.centroid.latitude >= bounds.south &&
        alert.centroid.latitude <= bounds.north;
      if (!inside) return false;
      if (timeMode === "planned") return alert.status === "upcoming";
      if (timeMode === "recent") return alert.status === "ended";
      return alert.status === "active";
    });
    return Response.json({
      alerts,
      connectorStatus: "operational",
      trafficModelId: "demo-traffic-model",
      fetchedAt: new Date().toISOString(),
      warnings: [],
      demoMode: true,
    });
  }
  const result = await getTrafficProvider().getIncidents({
    bounds,
    locale,
    timeMode,
  });
  return Response.json(
    { ...result, demoMode: false },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
