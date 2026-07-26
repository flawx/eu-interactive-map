import { getWildfireOperationalSummary } from "@/lib/incidents/getWildfireOperationalSummary";
import { importOfficialWildfireUpdates } from "@/lib/incidents/importOfficialWildfireUpdates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ incidentId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { incidentId: rawIncidentId } = await context.params;
    const incidentId = decodeURIComponent(rawIncidentId ?? "").trim();

    if (!incidentId) {
      return Response.json({ error: "Missing incident id" }, { status: 400 });
    }

    const report = await importOfficialWildfireUpdates(incidentId);

    if (
      report.errors.some((message) =>
        /Wildfire incident not found/i.test(message),
      )
    ) {
      return Response.json(
        { error: "Wildfire incident not found", incidentId, report },
        { status: 404 },
      );
    }

    const summary = await getWildfireOperationalSummary(incidentId);

    return Response.json({
      incidentId,
      report,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Official refresh unavailable";

    if (message.includes("Supabase server configuration is incomplete")) {
      return Response.json(
        { error: "Operational storage temporarily unavailable" },
        { status: 502 },
      );
    }

    return Response.json(
      { error: "Official refresh temporarily unavailable" },
      { status: 502 },
    );
  }
}
