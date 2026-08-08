import { NextResponse } from "next/server";
import { getTransitProvidersStatus } from "@/lib/routing/transit/providers/providerRegistry";
import { diagnoseAmadeusFlightSearch } from "@/lib/routing/transit/flightProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const transit = await getTransitProvidersStatus();
  const amadeus = await diagnoseAmadeusFlightSearch();
  return NextResponse.json(
    {
      providers: transit.providers,
      flight: {
        amadeus: amadeus.status,
        configured: amadeus.configured,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
