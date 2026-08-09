/**
 * Converts a raw SerpApi Google Flights response (best_flights[] +
 * other_flights[]) into our normalized FlightJourney[] model. Pure
 * transformation — no network, no secrets (the SerpApi response body never
 * contains the api_key).
 *
 * Ranking is preserved: every itinerary from `best_flights` is normalized
 * before any itinerary from `other_flights`, and each is tagged with
 * `sourceRank` so callers (e.g. the "recommended" sort) can keep Google's
 * own ordering as a tiebreaker.
 */

import { lookupAirlineName } from "@/lib/routing/flights/airlineNames";
import type {
  FlightCabin,
  FlightJourney,
  FlightLayover,
  FlightPlace,
  FlightPrice,
  FlightSegment,
  FlightSourceRank,
} from "@/lib/routing/flights/types";

export type SerpApiAirportEndpoint = {
  name?: string;
  /** IATA airport code. */
  id?: string;
  /** Local time, "YYYY-MM-DD HH:mm" — no timezone information. */
  time?: string;
};

export type SerpApiFlightSegmentRaw = {
  departure_airport?: SerpApiAirportEndpoint;
  arrival_airport?: SerpApiAirportEndpoint;
  /** Minutes. */
  duration?: number;
  airplane?: string;
  airline?: string;
  airline_logo?: string;
  travel_class?: string;
  /** e.g. "TO 3950". */
  flight_number?: string;
  extensions?: string[];
  ticket_also_sold_by?: string[];
  legroom?: string;
  overnight?: boolean;
  often_delayed_by_over_30_min?: boolean;
  /** Free-text description of the operating carrier ("plane and crew by"). */
  plane_and_crew_by?: string;
};

export type SerpApiLayoverRaw = {
  /** Minutes. */
  duration?: number;
  name?: string;
  id?: string;
  overnight?: boolean;
};

export type SerpApiCarbonEmissionsRaw = {
  this_flight?: number;
  typical_for_this_route?: number;
  difference_percent?: number;
};

export type SerpApiFlightResultRaw = {
  flights?: SerpApiFlightSegmentRaw[];
  layovers?: SerpApiLayoverRaw[];
  /** Minutes. */
  total_duration?: number;
  carbon_emissions?: SerpApiCarbonEmissionsRaw;
  price?: number;
  type?: string;
  airline_logo?: string;
  extensions?: string[];
  departure_token?: string;
  booking_token?: string;
};

export type SerpApiGoogleFlightsSearchResult = {
  best_flights?: SerpApiFlightResultRaw[];
  other_flights?: SerpApiFlightResultRaw[];
};

export type ResolvePlace = (iataCode: string) => FlightPlace;

/** Fallback used when the caller has no better airport metadata for a code. */
export function bareFlightPlace(iataCode: string): FlightPlace {
  return {
    iataCode: iataCode.toUpperCase(),
    name: null,
    city: null,
    countryCode: null,
    latitude: null,
    longitude: null,
  };
}

function minutesToSeconds(minutes: number | null | undefined): number {
  return typeof minutes === "number" && Number.isFinite(minutes)
    ? Math.max(0, Math.round(minutes * 60))
    : 0;
}

/**
 * Converts SerpApi's "YYYY-MM-DD HH:mm" local time string into
 * "YYYY-MM-DDTHH:mm:ss" — still local to the airport, still no timezone
 * offset invented. Falls back to the raw trimmed string when it doesn't
 * match the expected shape.
 */
export function toLocalIsoLikeString(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(trimmed);
  if (!match) return trimmed;
  const [, date, hm, sec] = match;
  return `${date}T${hm}${sec ?? ":00"}`;
}

/** Splits a SerpApi "flight_number" like "TO 3950" into carrier code + number. */
export function parseFlightNumber(
  raw: string | null | undefined,
): { carrierCode: string; flightNumber: string } {
  if (!raw) return { carrierCode: "", flightNumber: "" };
  const match = /^([A-Z0-9]{2,3})\s*([A-Z0-9]+)$/i.exec(raw.trim());
  if (!match) return { carrierCode: "", flightNumber: raw.trim() };
  return { carrierCode: match[1]!.toUpperCase(), flightNumber: match[2]! };
}

function mapCabin(label: string | null | undefined): FlightCabin | null {
  if (!label) return null;
  switch (label.trim().toLowerCase()) {
    case "economy":
      return "ECONOMY";
    case "premium economy":
      return "PREMIUM_ECONOMY";
    case "business":
      return "BUSINESS";
    case "first":
      return "FIRST";
    default:
      return null;
  }
}

function normalizeSegment(
  raw: SerpApiFlightSegmentRaw,
  index: number,
  resolvePlace: ResolvePlace,
): FlightSegment | null {
  const departureIata = raw.departure_airport?.id;
  const arrivalIata = raw.arrival_airport?.id;
  const departureAt = toLocalIsoLikeString(raw.departure_airport?.time);
  const arrivalAt = toLocalIsoLikeString(raw.arrival_airport?.time);
  if (!departureIata || !arrivalIata || !departureAt || !arrivalAt) return null;

  const { carrierCode, flightNumber } = parseFlightNumber(raw.flight_number);
  if (!carrierCode || !flightNumber) return null;

  return {
    id: `seg-${index}-${carrierCode}${flightNumber}`,
    carrierCode,
    carrierName: raw.airline?.trim() || lookupAirlineName(carrierCode),
    operatingCarrierCode: null,
    operatingCarrierName: raw.plane_and_crew_by?.trim() || null,
    flightNumber,
    aircraftCode: null,
    airplane: raw.airplane?.trim() || null,
    travelClassLabel: raw.travel_class?.trim() || null,
    airlineLogo: raw.airline_logo ?? null,
    departure: {
      place: resolvePlace(departureIata),
      terminal: null,
      at: departureAt,
    },
    arrival: {
      place: resolvePlace(arrivalIata),
      terminal: null,
      at: arrivalAt,
    },
    durationSeconds: minutesToSeconds(raw.duration),
    numberOfStopsEnRoute: 0,
    overnight: raw.overnight === true,
    oftenDelayed: raw.often_delayed_by_over_30_min === true,
  };
}

function normalizeLayovers(
  raw: SerpApiLayoverRaw[] | undefined,
  resolvePlace: ResolvePlace,
): FlightLayover[] {
  return (raw ?? []).map((layover) => ({
    airport: layover.id ? resolvePlace(layover.id) : bareFlightPlace(layover.name ?? ""),
    durationSeconds: minutesToSeconds(layover.duration),
    overnight: layover.overnight === true,
  }));
}

function extractPrice(
  raw: SerpApiFlightResultRaw,
  currency: string,
): FlightPrice | null {
  if (typeof raw.price !== "number" || !Number.isFinite(raw.price)) return null;
  return { amount: raw.price, currency, status: "search", source: "serpapi" };
}

function extractCarbonEmissions(
  raw: SerpApiFlightResultRaw,
): FlightJourney["carbonEmissions"] {
  const carbon = raw.carbon_emissions;
  if (!carbon || typeof carbon.this_flight !== "number") return null;
  return {
    thisFlightGrams: carbon.this_flight,
    typicalForRouteGrams:
      typeof carbon.typical_for_this_route === "number" ? carbon.typical_for_this_route : 0,
    differencePercent:
      typeof carbon.difference_percent === "number" ? carbon.difference_percent : 0,
  };
}

function normalizeOneResult(
  raw: SerpApiFlightResultRaw,
  rank: FlightSourceRank,
  index: number,
  currency: string,
  resolvePlace: ResolvePlace,
): FlightJourney | null {
  const segments: FlightSegment[] = [];
  for (const [segIndex, rawSegment] of (raw.flights ?? []).entries()) {
    const segment = normalizeSegment(rawSegment, segIndex, resolvePlace);
    if (segment) segments.push(segment);
  }
  if (segments.length === 0) return null;

  const layovers = normalizeLayovers(raw.layovers, resolvePlace);
  const durationSeconds =
    typeof raw.total_duration === "number"
      ? minutesToSeconds(raw.total_duration)
      : segments.reduce((sum, s) => sum + s.durationSeconds, 0) +
        layovers.reduce((sum, l) => sum + l.durationSeconds, 0);

  const overnight = segments.some((s) => s.overnight) || layovers.some((l) => l.overnight);
  const firstSegment = segments[0]!;

  const id = raw.booking_token
    ? `sa-${rank}-${index}-${raw.booking_token.slice(0, 24)}`
    : `sa-${rank}-${index}-${firstSegment.carrierCode}${firstSegment.flightNumber}`;

  return {
    id,
    segments,
    durationSeconds,
    stops: segments.length - 1,
    layovers,
    price: extractPrice(raw, currency),
    cabin: mapCabin(firstSegment.travelClassLabel),
    validatingAirlineCodes: Array.from(new Set(segments.map((s) => s.carrierCode))),
    bookableSeats: null,
    lastTicketingDate: null,
    bookingToken: raw.booking_token ?? null,
    airlineLogo: raw.airline_logo ?? firstSegment.airlineLogo ?? null,
    carbonEmissions: extractCarbonEmissions(raw),
    sourceRank: rank,
    overnight,
  };
}

/**
 * Converts a SerpApi Google Flights search response into flat FlightJourney
 * records. `best_flights` is normalized first (Google's own recommended
 * ordering), then `other_flights` — each tagged with `sourceRank` so the
 * "recommended" sort can prefer Google's ranking as a tiebreaker.
 */
export function normalizeSerpApiFlights(
  payload: SerpApiGoogleFlightsSearchResult,
  options: {
    currency: string;
    resolvePlace?: ResolvePlace;
  },
): FlightJourney[] {
  const resolvePlace = options.resolvePlace ?? bareFlightPlace;
  const journeys: FlightJourney[] = [];

  const buckets: Array<{ rank: FlightSourceRank; results: SerpApiFlightResultRaw[] }> = [
    { rank: "best", results: payload.best_flights ?? [] },
    { rank: "other", results: payload.other_flights ?? [] },
  ];

  for (const bucket of buckets) {
    bucket.results.forEach((raw, index) => {
      const journey = normalizeOneResult(raw, bucket.rank, index, options.currency, resolvePlace);
      if (journey) journeys.push(journey);
    });
  }

  return journeys;
}
