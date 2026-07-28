import { jsonWithAlertCache } from "@/lib/alerts/apiResponse";
import {
  alertDemoModeEnabled,
  demoEarthquakeAlerts,
} from "@/lib/alerts/demoFixtures";
import { fetchEuropeanEarthquakes } from "@/lib/alerts/providers/geologicalHazards";

export async function GET() {
  const result = await fetchEuropeanEarthquakes();
  if (alertDemoModeEnabled()) {
    result.alerts.push(...demoEarthquakeAlerts());
    result.demoMode = true;
    result.warnings.push("demo_mode");
  }
  return jsonWithAlertCache(result, 120);
}
