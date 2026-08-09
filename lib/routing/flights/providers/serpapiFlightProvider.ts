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
  FlightBookingAction,
  FlightBookingOption,
  FlightBookingSellerType,
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

/** Booking-options lookups are slower than search; SerpApi often exceeds 15s. */
const BOOKING_OPTIONS_TIMEOUT_MS = 45_000;

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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

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
      return { amount: match.price, currency: (match.currency as string).toUpperCase() };
    }
  }
  if (typeof option.price === "number") {
    return { amount: option.price, currency: currency?.toUpperCase() ?? null };
  }
  return { amount: null, currency: null };
}

function resolveSellerType(option: Record<string, unknown>): FlightBookingSellerType {
  if (option.airline === true) return "airline";
  if (typeof option.book_with === "string" && option.book_with.trim()) return "agency";
  return "other";
}

function resolveBookingAction(option: Record<string, unknown>): FlightBookingAction | null {
  const bookingRequest = option.booking_request as Record<string, unknown> | undefined;
  const url = typeof bookingRequest?.url === "string" ? bookingRequest.url.trim() : "";
  const postData =
    typeof bookingRequest?.post_data === "string" ? bookingRequest.post_data : "";
  if (url && postData) {
    return { type: "post", url, postData };
  }
  if (url) {
    return { type: "get", url };
  }
  const phone = typeof option.booking_phone === "string" ? option.booking_phone.trim() : "";
  if (phone) {
    return { type: "phone", phone };
  }
  return null;
}

function normalizeOneBookingSlice(
  option: Record<string, unknown>,
  currency: string | undefined,
  id: string,
): FlightBookingOption | null {
  const seller = typeof option.book_with === "string" ? option.book_with.trim() : "";
  const action = resolveBookingAction(option);
  const { amount, currency: priceCurrency } = extractLocalPrice(option, currency);
  if (!seller && !action && amount == null) return null;

  return {
    id,
    seller: seller || null,
    bookWith: seller || null,
    sellerType: resolveSellerType(option),
    airline: option.airline === true,
    airlineLogos: asStringArray(option.airline_logos),
    marketedAs: asStringArray(option.marketed_as),
    price: amount,
    currency: priceCurrency,
    optionTitle: typeof option.option_title === "string" ? option.option_title : null,
    extensions: asStringArray(option.extensions),
    baggagePrices: asStringArray(option.baggage_prices),
    bookingAction: action,
    url: action?.type === "get" || action?.type === "post" ? action.url : null,
  };
}

/**
 * Normalizes the `booking_options[]` array from a SerpApi booking-token
 * lookup. Each raw entry nests the fare under `together` (single ticket)
 * and/or `departing`/`returning` (separate tickets).
 */
export function normalizeSerpApiBookingOptions(
  payload: SerpApiRawResponse,
  currency?: string,
): FlightBookingOption[] {
  const rawOptions = Array.isArray(payload.booking_options)
    ? (payload.booking_options as Array<Record<string, unknown>>)
    : [];

  const options: FlightBookingOption[] = [];
  rawOptions.forEach((entry, index) => {
    const together = entry.together as Record<string, unknown> | undefined;
    const departing = entry.departing as Record<string, unknown> | undefined;
    const returning = entry.returning as Record<string, unknown> | undefined;

    if (together) {
      const normalized = normalizeOneBookingSlice(together, currency, `bo-${index}-together`);
      if (normalized) options.push(normalized);
      return;
    }

    if (departing) {
      const normalized = normalizeOneBookingSlice(departing, currency, `bo-${index}-departing`);
      if (normalized) options.push(normalized);
    }
    if (returning) {
      const normalized = normalizeOneBookingSlice(returning, currency, `bo-${index}-returning`);
      if (normalized) options.push(normalized);
    }
  });
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
   * SerpApi's google_flights engine still requires `departure_id` (validated
   * live) alongside `booking_token`; arrival/date are sent for context.
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
      timeoutMs: BOOKING_OPTIONS_TIMEOUT_MS,
    });

    if (process.env.NODE_ENV === "development") {
      const rawCount = Array.isArray(payload.booking_options)
        ? payload.booking_options.length
        : 0;
      const selectedCount = Array.isArray(payload.selected_flights)
        ? payload.selected_flights.length
        : 0;
      console.info("[booking provider]", {
        provider: "serpapi_google_flights",
        searchStatus: payload.search_metadata?.status ?? null,
        bookingOptionsCount: rawCount,
        selectedFlightsCount: selectedCount,
        providerError: typeof payload.error === "string" ? payload.error : null,
      });
    }

    return normalizeSerpApiBookingOptions(payload, options.currency);
  }
}

export const serpapiFlightProvider = new SerpApiFlightProvider();
