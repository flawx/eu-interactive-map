import { listFirmsHistorySnapshots } from "@/lib/incidents/refreshFirmsHistorySnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshots = await listFirmsHistorySnapshots();
    return Response.json({
      snapshots,
      updatedAt: new Date().toISOString(),
      source: "NASA FIRMS",
      period: "7d",
    });
  } catch {
    return Response.json(
      {
        snapshots: [],
        updatedAt: null,
        source: "NASA FIRMS",
        period: "7d",
        error: "FIRMS history storage temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
