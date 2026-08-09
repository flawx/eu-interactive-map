import "server-only";

import { amadeusFlightProvider } from "@/lib/routing/flights/providers/amadeusFlightProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = await amadeusFlightProvider.getStatus();
  return Response.json(
    {
      provider: "amadeus",
      environment: amadeusFlightProvider.getEnvironment(),
      status,
      configured: status !== "misconfigured",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
