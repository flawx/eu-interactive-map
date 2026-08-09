/**
 * Backwards-compatible shim — the flight integration lives in
 * lib/routing/flights/ (SerpApi Google Flights, see
 * providers/serpapiFlightProvider.ts). This module only re-exports what
 * /api/routing/transit/status still needs.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components.
 */

import { diagnoseSerpApiFlightSearch } from "@/lib/routing/flights/flightProvider";
import type { FlightProviderStatus } from "@/lib/routing/flights/types";
import type { TransitProviderStatus } from "@/lib/routing/transit/types";

function toTransitProviderStatus(status: FlightProviderStatus): TransitProviderStatus {
  // TransitProviderStatus predates the flight-specific "authentication_error"
  // state; fold it into "unavailable" for this legacy diagnostic shape.
  if (status === "authentication_error") return "unavailable";
  return status;
}

export async function diagnoseFlightSearch(): Promise<{
  configured: boolean;
  status: TransitProviderStatus;
}> {
  const { configured, status } = await diagnoseSerpApiFlightSearch();
  return { configured, status: toTransitProviderStatus(status) };
}
