/**
 * Small facade over the SerpApi Google Flights provider for diagnostics
 * (status endpoints). Server-only — import from API routes / Node scripts,
 * never from client components.
 */

import { serpapiFlightProvider } from "@/lib/routing/flights/providers/serpapiFlightProvider";
import type { FlightProviderStatus } from "@/lib/routing/flights/types";

export { serpapiFlightProvider };

export async function diagnoseSerpApiFlightSearch(): Promise<{
  configured: boolean;
  status: FlightProviderStatus;
}> {
  const status = await serpapiFlightProvider.getStatus();
  return {
    configured: status !== "misconfigured",
    status,
  };
}
