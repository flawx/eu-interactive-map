import { jsonWithAlertCache } from "@/lib/alerts/apiResponse";
import {
  alertDemoModeEnabled,
  demoEarthquakeAlerts,
} from "@/lib/alerts/demoFixtures";
import { fetchEuropeanEarthquakes } from "@/lib/alerts/providers/geologicalHazards";

export async function GET(
  _request: Request,
  context: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await context.params;
  const result = await fetchEuropeanEarthquakes();
  const alerts = alertDemoModeEnabled()
    ? [...result.alerts, ...demoEarthquakeAlerts()]
    : result.alerts;
  const alert = alerts.find((candidate) => candidate.id === alertId);
  if (!alert) {
    return Response.json({ error: "earthquake_not_found" }, { status: 404 });
  }
  return jsonWithAlertCache(
    {
      alert,
      providerStatuses: result.providerStatuses,
      fetchedAt: result.fetchedAt,
      partial: result.connectorStatus !== "operational",
      warnings: result.warnings,
    },
    120,
  );
}
