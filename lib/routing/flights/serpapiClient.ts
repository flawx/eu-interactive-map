/**
 * Low-level HTTP client for the SerpApi Google Flights engine
 * (https://serpapi.com/google-flights-api).
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components. SERPAPI_API_KEY (and any URL containing it) must never be
 * logged, thrown in an error message, or returned to a client.
 */

import { FlightError } from "@/lib/routing/flights/types";

const SERPAPI_BASE_URL = "https://serpapi.com/search.json";
const DEFAULT_TIMEOUT_MS = 15_000;

export type SerpApiQueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

function getApiKey(): string | null {
  const key = process.env.SERPAPI_API_KEY?.trim();
  return key || null;
}

export function hasSerpApiCredentials(): boolean {
  return getApiKey() !== null;
}

/** Builds the request URL without ever including it in a thrown/logged string elsewhere. */
function buildUrl(params: SerpApiQueryParams, apiKey: string): URL {
  const url = new URL(SERPAPI_BASE_URL);
  url.searchParams.set("engine", "google_flights");
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set("api_key", apiKey);
  return url;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError")
  );
}

function mapHttpStatusToFlightError(
  status: number,
  detail: string | null,
): FlightError {
  if (status === 401) {
    return new FlightError(
      "authentication_error",
      "SerpApi rejected the API key",
      401,
    );
  }
  if (status === 403) {
    return new FlightError(
      "provider_not_entitled",
      detail ?? "SerpApi account is not entitled for Google Flights searches",
      403,
    );
  }
  if (status === 429) {
    return new FlightError(
      "provider_rate_limited",
      "SerpApi rate limit or search quota reached",
      429,
    );
  }
  if (status === 400 || status === 422) {
    return new FlightError(
      "invalid_request",
      detail ?? "SerpApi rejected the request",
      400,
    );
  }
  return new FlightError(
    "provider_unavailable",
    detail ?? `SerpApi temporarily unavailable (HTTP ${status})`,
    503,
  );
}

export type SerpApiSearchMetadata = {
  id?: string;
  status?: "Processing" | "Success" | "Error" | string;
  json_endpoint?: string;
};

/** Generic shape shared by every SerpApi Google Flights response (search + booking options). */
export type SerpApiRawResponse = {
  search_metadata?: SerpApiSearchMetadata;
  search_parameters?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
};

function extractErrorDetail(payload: SerpApiRawResponse | null): string | null {
  if (!payload) return null;
  return typeof payload.error === "string" ? payload.error : null;
}

/**
 * Performs a GET request against the SerpApi Google Flights engine, attaching
 * the API key, an abort timeout, and mapping non-2xx / search_metadata error
 * states to a FlightError. Never logs the constructed URL or the API key.
 */
export async function fetchSerpApiGoogleFlights<T extends SerpApiRawResponse = SerpApiRawResponse>(
  params: SerpApiQueryParams,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new FlightError(
      "provider_misconfigured",
      "SERPAPI_API_KEY is not configured",
      503,
    );
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const onExternalAbort = () => timeoutController.abort();
  options.signal?.addEventListener("abort", onExternalAbort);

  try {
    const url = buildUrl(params, apiKey);
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: timeoutController.signal,
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as T | null;

    if (!response.ok) {
      throw mapHttpStatusToFlightError(response.status, extractErrorDetail(payload));
    }

    if (payload?.search_metadata?.status === "Error") {
      throw new FlightError(
        "provider_unavailable",
        payload.error ?? "SerpApi search failed",
        503,
      );
    }

    if (!payload) {
      throw new FlightError(
        "provider_unavailable",
        "SerpApi returned an empty response",
        503,
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof FlightError) throw error;
    if (isAbortError(error)) {
      if (options.signal?.aborted) {
        throw new FlightError("aborted", "Flight search aborted", 499);
      }
      throw new FlightError("timeout", "SerpApi request timed out", 504);
    }
    throw new FlightError(
      "provider_unavailable",
      "SerpApi temporarily unavailable",
      503,
    );
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}

export type GoogleFlightsSearchInput = {
  departureId: string;
  arrivalId: string;
  outboundDate: string;
  returnDate?: string | null;
  /** 1 = round trip, 2 = one way, 3 = multi-city. */
  type: 1 | 2 | 3;
  travelClass?: 1 | 2 | 3 | 4;
  stops?: 0 | 1 | 2 | 3;
  adults?: number;
  children?: number;
  infantsInSeat?: number;
  infantsOnLap?: number;
  currency: string;
  hl?: string;
  gl?: string;
  deepSearch?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Searches Google Flights via SerpApi for a single origin/destination pair
 * (each of which may itself be a comma-separated list of IATA codes so a
 * single request can cover several nearby airports at once).
 */
export async function searchGoogleFlights(
  input: GoogleFlightsSearchInput,
): Promise<SerpApiRawResponse> {
  return fetchSerpApiGoogleFlights(
    {
      departure_id: input.departureId,
      arrival_id: input.arrivalId,
      outbound_date: input.outboundDate,
      return_date: input.returnDate ?? undefined,
      type: input.type,
      travel_class: input.travelClass,
      stops: input.stops,
      adults: input.adults,
      children: input.children,
      infants_in_seat: input.infantsInSeat,
      infants_on_lap: input.infantsOnLap,
      currency: input.currency,
      hl: input.hl,
      gl: input.gl,
      deep_search: input.deepSearch,
    },
    { signal: input.signal, timeoutMs: input.timeoutMs },
  );
}

export type GoogleFlightsBookingOptionsInput = {
  bookingToken: string;
  /** Same search context the token was issued from — required by SerpApi to resolve pricing. */
  departureId?: string | null;
  arrivalId?: string | null;
  outboundDate?: string | null;
  returnDate?: string | null;
  type?: 1 | 2 | 3;
  currency?: string;
  hl?: string;
  gl?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Fetches booking options for a previously returned itinerary via its
 * `booking_token` (see https://serpapi.com/google-flights-booking-options).
 * SerpApi still requires `departure_id` / `arrival_id` / `outbound_date`
 * alongside the token.
 */
export async function getGoogleFlightsBookingOptions(
  input: GoogleFlightsBookingOptionsInput,
): Promise<SerpApiRawResponse> {
  return fetchSerpApiGoogleFlights(
    {
      booking_token: input.bookingToken,
      departure_id: input.departureId ?? undefined,
      arrival_id: input.arrivalId ?? undefined,
      outbound_date: input.outboundDate ?? undefined,
      return_date: input.returnDate ?? undefined,
      type: input.type,
      currency: input.currency,
      hl: input.hl,
      gl: input.gl,
    },
    { signal: input.signal, timeoutMs: input.timeoutMs },
  );
}
