import { jsonWithAlertCache } from "@/lib/alerts/apiResponse";
import {
  alertDemoModeEnabled,
  demoVolcanoAlerts,
} from "@/lib/alerts/demoFixtures";
import { fetchEuropeanVolcanoes } from "@/lib/alerts/providers/geologicalHazards";

export async function GET(
  _request: Request,
  context: { params: Promise<{ alertId: string }> },
) {
  const { alertId } = await context.params;
  const result = await fetchEuropeanVolcanoes();
  const alerts = alertDemoModeEnabled()
    ? [...result.alerts, ...demoVolcanoAlerts()]
    : result.alerts;
  const alert = alerts.find((candidate) => candidate.id === alertId);
  if (!alert) {
    return Response.json({ error: "volcano_not_found" }, { status: 404 });
  }
  return jsonWithAlertCache(
    {
      alert,
      providerStatuses: result.providerStatuses,
      fetchedAt: result.fetchedAt,
      partial: result.connectorStatus !== "operational",
      warnings: result.warnings,
    },
    600,
  );
}
