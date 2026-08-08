import "server-only";

import type {
  FlightOffer,
  FlightProvider,
  TransitProviderStatus,
} from "@/lib/routing/transit/types";

/**
 * Amadeus Flight Offers Search stub.
 * Full commercial integration is intentionally deferred.
 */
export class AmadeusFlightProvider implements FlightProvider {
  readonly id = "amadeus" as const;

  async getStatus(): Promise<TransitProviderStatus> {
    const key = process.env.AMADEUS_API_KEY?.trim();
    const secret = process.env.AMADEUS_API_SECRET?.trim();
    if (!key || !secret) return "misconfigured";
    return "operational";
  }

  async search(_input: {
    origin: string;
    destination: string;
    departureDate: string;
    adults?: number;
    currency?: string;
    signal?: AbortSignal;
  }): Promise<FlightOffer[]> {
    const status = await this.getStatus();
    if (status === "misconfigured") {
      return [];
    }
    // Intentionally not calling Amadeus until the dedicated flight commit.
    return [];
  }
}

export const amadeusFlightProvider = new AmadeusFlightProvider();

export async function diagnoseAmadeusFlightSearch(): Promise<{
  configured: boolean;
  status: TransitProviderStatus;
}> {
  const status = await amadeusFlightProvider.getStatus();
  return {
    configured: status !== "misconfigured",
    status,
  };
}
