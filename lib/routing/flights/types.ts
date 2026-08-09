/**
 * Flight routing domain model — Amadeus Self-Service Flight Offers Search /
 * Flight Offers Price integration.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components. Never persist or log AMADEUS_API_KEY / AMADEUS_API_SECRET /
 * bearer tokens anywhere in this module tree.
 */

import type { TransitJourney } from "@/lib/routing/transit/types";

export type FlightProviderStatus =
  | "operational"
  | "misconfigured"
  | "not_entitled"
  | "rate_limited"
  | "unavailable"
  | "authentication_error";

export type FlightEnvironment = "test" | "production";

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
  /** ISO 8601, local to the airport as returned by Amadeus. */
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
  departure: FlightSegmentEndpoint;
  arrival: FlightSegmentEndpoint;
  durationSeconds: number;
  /** Technical stops within this segment (rare; distinct from `stops` at journey level). */
  numberOfStopsEnRoute: number;
};

export type FlightLayover = {
  airport: FlightPlace;
  durationSeconds: number;
};

export type FlightPriceStatus = "search" | "confirmed" | "unavailable";

export type FlightPrice = {
  amount: number;
  currency: string;
  status: FlightPriceStatus;
  source: "amadeus";
};

export type FlightCabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";

/**
 * A single priced itinerary composed of one or more segments (technical
 * stops/connections on the same ticket). Kept close to the Amadeus Flight
 * Offer shape while normalizing units to seconds / ISO strings.
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
  sourceEnvironment: FlightEnvironment;
  /** Amadeus offer id — required to call Flight Offers Price for the same offer. */
  rawOfferId: string;
  /** Amadeus raw offer, secrets stripped, kept for price confirmation replay. */
  rawOffer: unknown;
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
  provider: "amadeus";
  environment: FlightEnvironment;
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
 * segment has a confirmed/estimated fare — never invented.
 */
export type MultimodalJourney = {
  id: string;
  segments: MultimodalSegment[];
  totalDurationSeconds: number;
  departureAt: string | null;
  arrivalAt: string | null;
  totalPrice: FlightPrice | null;
  warnings: FlightWarning[];
  provider: "amadeus";
  environment: FlightEnvironment;
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
  source: "curated" | "amadeus";
};
