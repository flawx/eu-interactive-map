import { jsonWithAlertCache } from "@/lib/alerts/apiResponse";
import {
  alertDemoModeEnabled,
  demoCemsAlerts,
} from "@/lib/alerts/demoFixtures";
import {
  cemsActivationToAlert,
  fetchCemsActivationDetail,
} from "@/lib/alerts/providers/copernicusEmergencyMapping";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const normalized = code.toUpperCase();
  if (!/^EMSR\d{3,4}$/.test(normalized)) {
    return Response.json({ error: "invalid_cems_activation_code" }, { status: 400 });
  }
  const demo = alertDemoModeEnabled()
    ? demoCemsAlerts().find(
        (alert) => String(alert.metadata.cemsActivationCode).toUpperCase() === normalized,
      )
    : null;
  if (demo) {
    return jsonWithAlertCache(
      { alert: demo, activation: demo.metadata, partial: false, warnings: ["demo_mode"] },
      600,
    );
  }
  try {
    const activation = await fetchCemsActivationDetail(normalized);
    return jsonWithAlertCache(
      {
        activation,
        alert: cemsActivationToAlert(activation, new Date().toISOString()),
        partial: false,
        warnings: [],
      },
      600,
    );
  } catch (error) {
    return Response.json(
      {
        error: "cems_activation_unavailable",
        warning: error instanceof Error ? error.message : "unknown",
      },
      { status: 404 },
    );
  }
}
