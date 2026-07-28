import { jsonWithAlertCache } from "@/lib/alerts/apiResponse";
import {
  alertDemoModeEnabled,
  demoVolcanoAlerts,
} from "@/lib/alerts/demoFixtures";
import { fetchEuropeanVolcanoes } from "@/lib/alerts/providers/geologicalHazards";

export async function GET() {
  const result = await fetchEuropeanVolcanoes();
  if (alertDemoModeEnabled()) {
    result.alerts.push(...demoVolcanoAlerts());
    result.demoMode = true;
    result.warnings.push("demo_mode");
  }
  return jsonWithAlertCache(result, 600);
}
