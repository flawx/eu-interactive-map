/**
 * SerpApi Google Flights provider: flight search (best_flights/other_flights)
 * and booking options lookup by booking_token.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components.
 */

import {
  getGoogleFlightsBookingOptions,
  hasSerpApiCredentials,
  searchGoogleFlights,
  type SerpApiRawResponse,
} from "@/lib/routing/flights/serpapiClient";
import {
  normalizeSerpApiFlights,
  type ResolvePlace,
  type SerpApiGoogleFlightsSearchResult,
} from "@/lib/routing/flights/normalizeSerpApiFlights";
import type {
  FlightBookingOption,
  FlightCabin,
  FlightJourney,
  FlightProviderStatus,
} from "@/lib/routing/flights/types";
import { FlightError } from "@/lib/routing/flights/types";

const CABIN_TO_TRAVEL_CLASS: Record<FlightCabin, 1 | 2 | 3 | 4> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 2,
  BUSINESS: 3,
  FIRST: 4,
};

export type SerpApiFlightSearchInput = {
  /** Comma-joined IATA codes, e.g. "CDG,ORY" — a single request covers every candidate airport. */
  departureIds: string;
  arrivalIds: string;
  outboundDate: string;
  returnDate?: string | null;
  adults: number;
  children?: number;
  infants?: number;
  cabin?: FlightCabin | null;
  nonStop: boolean;
  currency: string;
  hl?: string;
  gl?: string;
  signal?: AbortSignal;
  resolvePlace?: ResolvePlace;
};

function extractLocalPrice(
  option: Record<string, unknown>,
  currency: string | undefined,
): { amount: number | null; currency: string | null } {
  const localPrices = Array.isArray(option.local_prices)
    ? (option.local_prices as Array<Record<string, unknown>>)
    : [];
  if (currency) {
    const match = localPrices.find(
      (entry) =>
        typeof entry.currency === "string" &&
        entry.currency.toUpperCase() === currency.toUpperCase(),
    );
    if (match && typeof match.price === "number") {
      return { amount: match.price, currency: match.currency as string };
    }
  }
  if (typeof option.price === "number") {
    return { amount: option.price, currency: currency ?? null };
  }
  return { amount: null, currency: null };
}

/**
 * Normalizes the `booking_options[]` array from a SerpApi booking-token
 * lookup into flat, display-ready options. Each raw entry nests the actual
 * fare under `together` (single booking) or `departing`/`returning`
 * (booked separately) — we surface whichever is present.
 */
export function normalizeSerpApiBookingOptions(
  payload: SerpApiRawResponse,
  currency?: string,
): FlightBookingOption[] {
  const rawOptions = Array.isArray(payload.booking_options)
    ? (payload.booking_options as Array<Record<string, unknown>>)
    : [];

  const options: FlightBookingOption[] = [];
  for (const entry of rawOptions) {
    const option =
      (entry.together as Record<string, unknown> | undefined) ??
      (entry.departing as Record<string, unknown> | undefined) ??
      (entry.returning as Record<string, unknown> | undefined);
    if (!option) continue;

    const { amount, currency: priceCurrency } = extractLocalPrice(option, currency);
    const bookingRequest = option.booking_request as Record<string, unknown> | undefined;

    options.push({
      bookWith: typeof option.book_with === "string" ? option.book_with : null,
      price: amount,
      currency: priceCurrency,
      optionTitle: typeof option.option_title === "string" ? option.option_title : null,
      url: typeof bookingRequest?.url === "string" ? bookingRequest.url : null,
      extensions: Array.isArray(option.extensions)
        ? (option.extensions as unknown[]).filter((item): item is string => typeof item === "string")
        : [],
    });
  }
  return options;
}

export class SerpApiFlightProvider {
  readonly id = "serpapi_google_flights" as const;

  async getStatus(): Promise<FlightProviderStatus> {
    return hasSerpApiCredentials() ? "operational" : "misconfigured";
  }

  async searchFlights(input: SerpApiFlightSearchInput): Promise<FlightJourney[]> {
    const payload = await searchGoogleFlights({
      departureId: input.departureIds.toUpperCase(),
      arrivalId: input.arrivalIds.toUpperCase(),
      outboundDate: input.outboundDate,
      returnDate: input.returnDate ?? undefined,
      type: input.returnDate ? 1 : 2,
      travelClass: input.cabin ? CABIN_TO_TRAVEL_CLASS[input.cabin] : undefined,
      stops: input.nonStop ? 1 : 0,
      adults: input.adults,
      children: input.children,
      infantsInSeat: input.infants,
      currency: input.currency,
      hl: input.hl,
      gl: input.gl,
      signal: input.signal,
    });

    return normalizeSerpApiFlights(payload as SerpApiGoogleFlightsSearchResult, {
      currency: input.currency,
      resolvePlace: input.resolvePlace,
    });
  }

  /**
   * Fetches booking options for a previously returned itinerary.
   * SerpApi still requires the original search context (`departure_id`,
   * `arrival_id`, `outbound_date`) alongside `booking_token`.
   */
  async getBookingOptions(
    bookingToken: string,
    options: {
      departureId: string;
      arrivalId: string;
      outboundDate: string;
      currency?: string;
      hl?: string;
      gl?: string;
      signal?: AbortSignal;
    },
  ): Promise<FlightBookingOption[]> {
    if (!bookingToken || !bookingToken.trim()) {
      throw new FlightError("invalid_request", "bookingToken is required", 400);
    }
    if (!options.departureId?.trim() || !options.arrivalId?.trim() || !options.outboundDate?.trim()) {
      throw new FlightError(
        "invalid_request",
        "departureId, arrivalId and outboundDate are required",
        400,
      );
    }
    const payload = await getGoogleFlightsBookingOptions({
      bookingToken: bookingToken.trim(),
      departureId: options.departureId.trim().toUpperCase(),
      arrivalId: options.arrivalId.trim().toUpperCase(),
      outboundDate: options.outboundDate.trim(),
      type: 2,
      currency: options.currency,
      hl: options.hl,
      gl: options.gl,
      signal: options.signal,
    });
    return normalizeSerpApiBookingOptions(payload, options.currency);
  }
}

export const serpapiFlightProvider = new SerpApiFlightProvider();
