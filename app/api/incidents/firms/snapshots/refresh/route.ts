import { refreshFirmsSnapshots } from "@/lib/incidents/refreshFirmsSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    const result = await refreshFirmsSnapshots();

    return Response.json({
      snapshots: result.snapshots,
      updated: result.updated,
      preservedPrevious: result.preservedPrevious,
      stats: result.stats ?? null,
      warning: result.warning ?? null,
      source: "NASA FIRMS",
    });
  } catch {
    return Response.json(
      {
        snapshots: [],
        updated: false,
        preservedPrevious: false,
        error: "FIRMS snapshot storage temporarily unavailable",
        source: "NASA FIRMS",
      },
      { status: 502 },
    );
  }
}
