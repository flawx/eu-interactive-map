import { refreshFirmsHistorySnapshots } from "@/lib/incidents/refreshFirmsHistorySnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    const result = await refreshFirmsHistorySnapshots();

    return Response.json({
      snapshots: result.snapshots,
      updated: result.updated,
      preservedPrevious: result.preservedPrevious,
      stats: result.stats ?? null,
      warning: result.warning ?? null,
      source: "NASA FIRMS",
      period: "7d",
    });
  } catch {
    return Response.json(
      {
        snapshots: [],
        updated: false,
        preservedPrevious: false,
        error: "FIRMS history storage temporarily unavailable",
        source: "NASA FIRMS",
        period: "7d",
      },
      { status: 502 },
    );
  }
}
