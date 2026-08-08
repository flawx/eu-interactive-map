import { getRoutingProvidersStatus } from "@/lib/routing/providers/providerRegistry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = await getRoutingProvidersStatus();
  return Response.json(status, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
