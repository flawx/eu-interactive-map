import { fetchGdacsAlerts } from "@/lib/alerts/providers/gdacs";
import {
  alertDemoModeEnabled,
  demoStormAlerts,
} from "@/lib/alerts/demoFixtures";

export async function GET() {
  const result = await fetchGdacsAlerts("TC");
  if (alertDemoModeEnabled()) {
    result.alerts.push(...demoStormAlerts());
    result.demoMode = true;
    result.warnings.push("demo_mode");
  }
  return Response.json(result, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=600, stale-while-revalidate=1200",
    },
  });
}
