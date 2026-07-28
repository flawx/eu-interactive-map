import { jsonWithAlertCache } from "@/lib/alerts/apiResponse";
import { alertDemoModeEnabled } from "@/lib/alerts/demoFixtures";
import { fetchNasaLhasaStatus } from "@/lib/alerts/providers/nasaLhasa";

export async function GET() {
  const result = await fetchNasaLhasaStatus();
  if (alertDemoModeEnabled()) {
    result.demoMode = true;
    result.warnings.push("demo_mode");
  }
  return jsonWithAlertCache(result, 1800);
}
