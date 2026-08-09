/**
 * Flight routing domain model — SerpApi Google Flights integration.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components. Never persist or log SERPAPI_API_KEY or any URL containing
 * an `api_key` query parameter anywhere in this module tree.
 */

import type { TransitJourney } from "@/lib/routing/transit/types";

export type FlightProviderStatus =
  | "operational"
  | "misconfigured"
  | "not_entitled"
  | "rate_limited"
  | "unavailable"
  | "authentication_error";

export type FlightPlace = {
  iataCode: string;
  name: string | null;
  city: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type FlightSegmentEndpoint = {
  place: FlightPlace;
  terminal: string | null;
  /**
   * Local time string as returned by SerpApi/Google Flights (e.g.
   * "2026-08-23 21:10"), local to the departure/arrival airport. Never
   * converted to an invented UTC/"Z" timestamp — SerpApi does not provide
   * a timezone offset, so callers must treat this as airport-local wall
   * clock time only.
   */
  at: string;
};

export type FlightSegment = {
  id: string;
  carrierCode: string;
  carrierName: string | null;
  operatingCarrierCode: string | null;
  operatingCarrierName: string | null;
  flightNumber: string;
  aircraftCode: string | null;
  /** Free-text airplane model as returned by SerpApi (e.g. "Airbus A320neo"). */
  airplane: string | null;
  /** Free-text travel class as returned by SerpApi (e.g. "Economy"). */
  travelClassLabel: string | null;
  /** Airline logo URL for this specific segment, when available. */
  airlineLogo: string | null;
  departure: FlightSegmentEndpoint;
  arrival: FlightSegmentEndpoint;
  durationSeconds: number;
  /** Technical stops within this segment (rare; distinct from `stops` at journey level). */
  numberOfStopsEnRoute: number;
  /** True when this segment lands the day after it departs (SerpApi `overnight`). */
  overnight: boolean;
  /** True when SerpApi flags this flight as often delayed by 30+ minutes. */
  oftenDelayed: boolean;
};

export type FlightLayover = {
  airport: FlightPlace;
  durationSeconds: number;
  /** True when the layover spans overnight (SerpApi `overnight` on the layover). */
  overnight: boolean;
};

export type FlightPriceStatus = "search" | "unavailable";

export type FlightPrice = {
  amount: number;
  currency: string;
  status: FlightPriceStatus;
  source: "serpapi";
};

export type FlightCabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

/** Ranking bucket assigned by Google Flights/SerpApi — best_flights vs other_flights. */
export type FlightSourceRank = "best" | "other";

/**
 * A single priced itinerary composed of one or more segments (technical
 * stops/connections on the same ticket), normalized from a SerpApi Google
 * Flights result.
 */
export type FlightJourney = {
  id: string;
  segments: FlightSegment[];
  durationSeconds: number;
  stops: number;
  layovers: FlightLayover[];
  price: FlightPrice | null;
  cabin: FlightCabin | null;
  validatingAirlineCodes: string[];
  bookableSeats: number | null;
  lastTicketingDate: string | null;
  /** Opaque SerpApi token used to fetch booking options for this itinerary, when available. */
  bookingToken?: string | null;
  /** Representative airline logo URL for this itinerary, when available. */
  airlineLogo?: string | null;
  carbonEmissions?: {
    thisFlightGrams: number;
    typicalForRouteGrams: number;
    differencePercent: number;
  } | null;
  /** Whether this itinerary came from SerpApi's best_flights (recommended) or other_flights bucket. */
  sourceRank?: FlightSourceRank;
  /** True when any segment/layover in this itinerary spans overnight. */
  overnight?: boolean;
};

export type FlightSearchRequest = {
  origin: {
    latitude: number;
    longitude: number;
    name?: string | null;
    iataHint?: string | null;
  };
  destination: {
    latitude: number;
    longitude: number;
    name?: string | null;
    iataHint?: string | null;
  };
  /** YYYY-MM-DD */
  departureDate: string;
  /** YYYY-MM-DD, round-trip only when present */
  returnDate?: string | null;
  adults: number;
  children: number;
  infants: number;
  cabin: FlightCabin | null;
  nonStop: boolean;
  currency: string;
  sort: FlightSortOrder;
  includeGroundAccess: boolean;
  locale?: string;
};

export type FlightSortOrder = "recommended" | "cheapest" | "fastest";

export type FlightWarningCode =
  | "airport_change"
  | "connection_too_tight"
  | "egress_too_tight"
  | "ground_unavailable"
  | "partial_pricing"
  | "limited_airport_pairs_searched";

export type FlightWarning = {
  code: FlightWarningCode;
  message: string;
  severity: "info" | "warning" | "critical";
};

export type FlightSearchResponse = {
  provider: "serpapi_google_flights";
  status: FlightProviderStatus;
  offers: FlightJourney[];
  journeys: MultimodalJourney[];
  warnings: FlightWarning[];
  calculatedAt: string;
};

/** One access/egress leg handled by the Google Transit provider (ground segment). */
export type GroundTransitSegment = {
  kind: "ground_transit";
  id: string;
  role: "access" | "egress";
  journey: TransitJourney;
};

export type FlightArcGeometry = {
  type: "LineString" | "MultiLineString";
  coordinates: [number, number][] | [number, number][][];
};

export type FlightLegSegment = {
  kind: "flight";
  id: string;
  journey: FlightJourney;
  arcGeometry: FlightArcGeometry;
};

export type MultimodalSegment = GroundTransitSegment | FlightLegSegment;

/**
 * A full door-to-door journey: optional ground access, one flight offer,
 * optional ground egress. Total price is only aggregated when every known
 * segment has a known fare — never invented.
 */
export type MultimodalJourney = {
  id: string;
  segments: MultimodalSegment[];
  totalDurationSeconds: number;
  departureAt: string | null;
  arrivalAt: string | null;
  totalPrice: FlightPrice | null;
  warnings: FlightWarning[];
  provider: "serpapi_google_flights";
};

export type FlightErrorCode =
  | "invalid_request"
  | "origin_required"
  | "destination_required"
  | "point_outside_coverage"
  | "airport_not_resolved"
  | "no_offers_found"
  | "provider_misconfigured"
  | "provider_not_entitled"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "authentication_error"
  | "aborted"
  | "timeout";

export class FlightError extends Error {
  readonly code: FlightErrorCode;
  readonly status: number;

  constructor(code: FlightErrorCode, message: string, status = 400) {
    super(message);
    this.name = "FlightError";
    this.code = code;
    this.status = status;
  }
}

/** A single fare/booking action returned by SerpApi Google Flights Booking Options. */
export type FlightBookingSellerType = "airline" | "agency" | "other";

export type FlightBookingAction =
  | {
      type: "post";
      url: string;
      /** Ephemeral form-urlencoded body — never log, never persist. */
      postData: string;
    }
  | {
      type: "get";
      url: string;
    }
  | {
      type: "phone";
      phone: string;
    };

export type FlightBookingOption = {
  id: string;
  seller: string | null;
  /** @deprecated Prefer `seller` — kept for older UI call sites during migration. */
  bookWith: string | null;
  sellerType: FlightBookingSellerType;
  airline: boolean;
  airlineLogos: string[];
  marketedAs: string[];
  price: number | null;
  currency: string | null;
  optionTitle: string | null;
  extensions: string[];
  baggagePrices: string[];
  bookingAction: FlightBookingAction | null;
  /** @deprecated Prefer `bookingAction` — GET url only when available. */
  url: string | null;
};

/** Resolved candidate airport for a free-text/coordinate place in a flight search. */
export type ResolvedAirport = {
  iataCode: string;
  icaoCode: string | null;
  name: string;
  city: string | null;
  countryCode: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  source: "curated";
};
