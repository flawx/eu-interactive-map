import { refreshFirmsHistorySnapshots } from "@/lib/incidents/refreshFirmsHistorySnapshots";
import { normalizeFirmsHistorySnapshot } from "@/lib/incidents/firmsHistorySnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST() {
  try {
    const result = await refreshFirmsHistorySnapshots();
    const snapshots = result.snapshots
      .map((snapshot) => normalizeFirmsHistorySnapshot(snapshot))
      .filter((snapshot): snapshot is FirmsIncidentSnapshot => snapshot !== null);

    return Response.json({
      snapshots,
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
