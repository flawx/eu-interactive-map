import { jsonWithAlertCache } from "@/lib/alerts/apiResponse";
import {
  alertDemoModeEnabled,
  demoCemsAlerts,
} from "@/lib/alerts/demoFixtures";
import {
  fetchEuropeanCemsActivations,
} from "@/lib/alerts/providers/copernicusEmergencyMapping";
import type { CemsActivationTimeMode } from "@/lib/alerts/types";

const MODES = new Set<CemsActivationTimeMode>(["ongoing", "72h", "30d"]);
const CATEGORIES = new Set(["all", "landslide", "industrial"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "all";
  const mode = url.searchParams.get("period") ?? "ongoing";
  if (!CATEGORIES.has(category) || !MODES.has(mode as CemsActivationTimeMode)) {
    return Response.json({ error: "invalid_cems_query" }, { status: 400 });
  }
  const result = await fetchEuropeanCemsActivations(
    category as "all" | "landslide" | "industrial",
    mode as CemsActivationTimeMode,
  );
  if (alertDemoModeEnabled()) {
    result.alerts.push(
      ...demoCemsAlerts().filter((alert) =>
        category === "all"
          ? true
          : category === "landslide"
            ? alert.category === "landslide"
            : alert.category === "industrial_incident",
      ),
    );
    result.demoMode = true;
    result.connectorStatus = "operational";
    result.providerStatuses = {
      ...(result.providerStatuses ?? {}),
      "copernicus-emergency-mapping": "operational",
    };
    result.warnings.push("demo_mode");
  }
  return jsonWithAlertCache(result, 600);
}
