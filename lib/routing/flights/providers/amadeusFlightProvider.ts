/**
 * Amadeus Self-Service flight provider: Flight Offers Search, Flight
 * Offers Price (confirmation), and Airport & City Search.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components.
 */

import { authenticatedFetch } from "@/lib/routing/flights/amadeusClient";
import {
  AmadeusAuthError,
  getAmadeusAccessToken,
  getAmadeusEnvironment,
  hasAmadeusCredentials,
} from "@/lib/routing/flights/amadeusAuth";
import {
  normalizeAmadeusOffers,
  type AmadeusFlightOffersResponse,
  type ResolvePlace,
} from "@/lib/routing/flights/normalizeAmadeusOffers";
import type {
  FlightCabin,
  FlightEnvironment,
  FlightJourney,
  FlightProviderStatus,
  ResolvedAirport,
} from "@/lib/routing/flights/types";
import { FlightError } from "@/lib/routing/flights/types";

export type AmadeusSearchInput = {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  children?: number;
  infants?: number;
  cabin?: FlightCabin | null;
  nonStop: boolean;
  currency: string;
  max?: number;
  signal?: AbortSignal;
  resolvePlace?: ResolvePlace;
};

type AmadeusLocation = {
  iataCode?: string;
  name?: string;
  address?: { cityName?: string; countryCode?: string };
  geoCode?: { latitude?: number; longitude?: number };
};

export class AmadeusFlightProvider {
  readonly id = "amadeus" as const;

  getEnvironment(): FlightEnvironment {
    return getAmadeusEnvironment();
  }

  async getStatus(): Promise<FlightProviderStatus> {
    if (!hasAmadeusCredentials()) return "misconfigured";
    try {
      await getAmadeusAccessToken();
      return "operational";
    } catch (error) {
      if (error instanceof AmadeusAuthError) {
        if (error.kind === "misconfigured") return "misconfigured";
        if (error.kind === "authentication_error") return "authentication_error";
        return "unavailable";
      }
      return "unavailable";
    }
  }

  async searchFlights(input: AmadeusSearchInput): Promise<FlightJourney[]> {
    const query: Record<string, string | number | boolean> = {
      originLocationCode: input.originIata.toUpperCase(),
      destinationLocationCode: input.destinationIata.toUpperCase(),
      departureDate: input.departureDate,
      adults: input.adults,
      nonStop: input.nonStop,
      currencyCode: input.currency.toUpperCase(),
      max: input.max ?? 10,
    };
    if (input.returnDate) query.returnDate = input.returnDate;
    if (input.children) query.children = input.children;
    if (input.infants) query.infants = input.infants;
    if (input.cabin) query.travelClass = input.cabin;

    const payload = await authenticatedFetch<AmadeusFlightOffersResponse>(
      "/v2/shopping/flight-offers",
      { query, signal: input.signal, timeoutMs: 15_000 },
    );

    return normalizeAmadeusOffers(payload, {
      environment: this.getEnvironment(),
      resolvePlace: input.resolvePlace,
    });
  }

  /**
   * Flight Offers Price — re-confirms price/availability for a previously
   * returned offer just before booking. Returns null when Amadeus can no
   * longer price the offer (e.g. inventory changed) rather than inventing a
   * price.
   */
  async confirmOffer(
    rawOffer: unknown,
    options: { resolvePlace?: ResolvePlace; signal?: AbortSignal } = {},
  ): Promise<FlightJourney | null> {
    if (!rawOffer || typeof rawOffer !== "object") {
      throw new FlightError("invalid_request", "Offer payload is required", 400);
    }

    const payload = await authenticatedFetch<AmadeusFlightOffersResponse>(
      "/v1/shopping/flight-offers/pricing",
      {
        method: "POST",
        body: {
          data: {
            type: "flight-offers-pricing",
            flightOffers: [rawOffer],
          },
        },
        signal: options.signal,
        timeoutMs: 15_000,
      },
    );

    const journeys = normalizeAmadeusOffers(payload, {
      environment: this.getEnvironment(),
      resolvePlace: options.resolvePlace,
    });
    const confirmed = journeys[0] ?? null;
    if (confirmed && confirmed.price) {
      confirmed.price = { ...confirmed.price, status: "confirmed" };
    }
    return confirmed;
  }

  async searchAirportLocations(
    keyword: string,
    signal?: AbortSignal,
  ): Promise<ResolvedAirport[]> {
    if (!hasAmadeusCredentials() || keyword.trim().length < 2) return [];
    try {
      const response = await authenticatedFetch<{ data?: AmadeusLocation[] }>(
        "/v1/reference-data/locations",
        {
          query: { subType: "AIRPORT", keyword: keyword.trim(), "page[limit]": 5 },
          signal,
          timeoutMs: 6000,
        },
      );
      const results: ResolvedAirport[] = [];
      for (const location of response.data ?? []) {
        const latitude = location.geoCode?.latitude;
        const longitude = location.geoCode?.longitude;
        if (!location.iataCode || !location.name || latitude == null || longitude == null) {
          continue;
        }
        results.push({
          iataCode: location.iataCode,
          icaoCode: null,
          name: location.name,
          city: location.address?.cityName ?? null,
          countryCode: location.address?.countryCode ?? null,
          latitude,
          longitude,
          distanceKm: null,
          source: "amadeus",
        });
      }
      return results;
    } catch {
      return [];
    }
  }
}

export const amadeusFlightProvider = new AmadeusFlightProvider();
