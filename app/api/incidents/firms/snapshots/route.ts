import { listFirmsSnapshots } from "@/lib/incidents/refreshFirmsSnapshots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshots = await listFirmsSnapshots();
    return Response.json({
      snapshots,
      updatedAt: new Date().toISOString(),
      source: "NASA FIRMS",
    });
  } catch {
    return Response.json(
      {
        snapshots: [],
        updatedAt: null,
        source: "NASA FIRMS",
        error: "FIRMS snapshot storage temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
