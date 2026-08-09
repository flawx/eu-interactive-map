/**
 * Backwards-compatible shim — the real Amadeus flight integration now lives
 * in lib/routing/flights/ (see providers/amadeusFlightProvider.ts). This
 * module only re-exports what /api/routing/transit/status still needs.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components.
 */

import { amadeusFlightProvider } from "@/lib/routing/flights/providers/amadeusFlightProvider";
import type { TransitProviderStatus } from "@/lib/routing/transit/types";

export { amadeusFlightProvider };

function toTransitProviderStatus(
  status: Awaited<ReturnType<typeof amadeusFlightProvider.getStatus>>,
): TransitProviderStatus {
  // TransitProviderStatus predates the flight-specific "authentication_error"
  // state; fold it into "unavailable" for this legacy diagnostic shape.
  if (status === "authentication_error") return "unavailable";
  return status;
}

export async function diagnoseAmadeusFlightSearch(): Promise<{
  configured: boolean;
  status: TransitProviderStatus;
}> {
  const status = await amadeusFlightProvider.getStatus();
  return {
    configured: status !== "misconfigured",
    status: toTransitProviderStatus(status),
  };
}
