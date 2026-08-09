import { NextResponse } from "next/server";
import { getTransitProvidersStatus } from "@/lib/routing/transit/providers/providerRegistry";
import { diagnoseFlightSearch } from "@/lib/routing/transit/flightProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const transit = await getTransitProvidersStatus();
  const flight = await diagnoseFlightSearch();
  return NextResponse.json(
    {
      providers: transit.providers,
      flight: {
        serpapi: flight.status,
        configured: flight.configured,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
