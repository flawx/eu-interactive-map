import "server-only";

import { serpapiFlightProvider } from "@/lib/routing/flights/providers/serpapiFlightProvider";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = await serpapiFlightProvider.getStatus();
  return Response.json(
    {
      provider: "serpapi_google_flights",
      status,
      configured: status !== "misconfigured",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
