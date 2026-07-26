import { getWildfireOperationalSummary } from "@/lib/incidents/getWildfireOperationalSummary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ incidentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { incidentId: rawIncidentId } = await context.params;
    const incidentId = decodeURIComponent(rawIncidentId ?? "").trim();

    if (!incidentId) {
      return Response.json(
        {
          error: "Missing incident id",
        },
        { status: 400 },
      );
    }

    const summary = await getWildfireOperationalSummary(incidentId);
    if (!summary) {
      return Response.json(
        {
          error: "Wildfire incident not found",
          incidentId,
        },
        { status: 404 },
      );
    }

    return Response.json({
      incidentId,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Operational data unavailable";

    if (message.includes("Supabase server configuration is incomplete")) {
      return Response.json(
        {
          error: "Operational storage temporarily unavailable",
        },
        { status: 502 },
      );
    }

    return Response.json(
      {
        error: "Operational data temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
