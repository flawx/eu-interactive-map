import "server-only";

/**
 * Top-level flight search orchestrator: resolves airports for the requested
 * places, searches SerpApi Google Flights with a single request per side
 * (candidate airports joined into comma-separated departure_id/arrival_id
 * lists), optionally attaches ground access/egress via the Google Transit
 * provider, and returns both the raw flight offers and door-to-door
 * multimodal journeys. This is the only module in this tree marked
 * server-only — it is the sole entry point used by the flight API routes.
 */

import { calculateTransitJourneys } from "@/lib/routing/transit/calculateTransit";
import type { TransitJourney } from "@/lib/routing/transit/types";
import { resolveAirportsForPlace } from "@/lib/routing/flights/airportResolver";
import { RECOMMENDED_FLIGHT_BUFFERS, connectionMarginMinutes, shareCalendarDate } from "@/lib/routing/flights/airportBuffers";
import {
  flightSearchCacheKey,
  withFlightSearchDedup,
} from "@/lib/routing/flights/flightCache";
import { sortOffers } from "@/lib/routing/flights/flightScore";
import { assembleMultimodalJourney } from "@/lib/routing/flights/multimodalJourney";
import { bareFlightPlace } from "@/lib/routing/flights/normalizeSerpApiFlights";
import { serpapiFlightProvider } from "@/lib/routing/flights/providers/serpapiFlightProvider";
import {
  FlightError,
  type FlightCabin,
  type FlightJourney,
  type FlightPlace,
  type FlightSearchRequest,
  type FlightSearchResponse,
  type FlightSortOrder,
  type FlightWarning,
  type MultimodalJourney,
  type ResolvedAirport,
} from "@/lib/routing/flights/types";
import { isRoutingPointAllowed } from "@/lib/routing/routingGeofence";
import { getEuropeanAirportByIata } from "@/lib/transport/europeanAirports";

/** Only the top offers get ground access/egress attached (each costs a Google Transit call). */
const MAX_MULTIMODAL_JOURNEYS = 5;
/** Cap how many candidate airports on each side get folded into a single SerpApi request. */
const MAX_ORIGIN_CANDIDATES = 3;
const MAX_DESTINATION_CANDIDATES = 3;

const VALID_CABINS: FlightCabin[] = ["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePoint(
  value: unknown,
  label: string,
): FlightSearchRequest["origin"] {
  if (!value || typeof value !== "object") {
    throw new FlightError("invalid_request", `${label} is required`);
  }
  const raw = value as Record<string, unknown>;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new FlightError("invalid_request", `${label} coordinates invalid`);
  }
  return {
    latitude,
    longitude,
    name: typeof raw.name === "string" ? raw.name : null,
    iataHint: typeof raw.iataHint === "string" ? raw.iataHint : null,
  };
}

function parseCabin(value: unknown): FlightCabin | null {
  if (typeof value === "string" && VALID_CABINS.includes(value as FlightCabin)) {
    return value as FlightCabin;
  }
  return null;
}

function parseSort(value: unknown): FlightSortOrder {
  if (value === "cheapest" || value === "fastest" || value === "recommended") {
    return value;
  }
  return "recommended";
}

export function parseFlightRequestBody(body: unknown): FlightSearchRequest {
  if (!body || typeof body !== "object") {
    throw new FlightError("invalid_request", "Body must be a JSON object");
  }
  const raw = body as Record<string, unknown>;
  if (!raw.origin) {
    throw new FlightError("origin_required", "Origin is required");
  }
  if (!raw.destination) {
    throw new FlightError("destination_required", "Destination is required");
  }

  const origin = parsePoint(raw.origin, "origin");
  const destination = parsePoint(raw.destination, "destination");

  if (
    !isRoutingPointAllowed({ latitude: origin.latitude, longitude: origin.longitude }) ||
    !isRoutingPointAllowed({ latitude: destination.latitude, longitude: destination.longitude })
  ) {
    throw new FlightError(
      "point_outside_coverage",
      "Point outside European coverage",
      400,
    );
  }

  const departureDate = typeof raw.departureDate === "string" ? raw.departureDate : "";
  if (!DATE_RE.test(departureDate)) {
    throw new FlightError(
      "invalid_request",
      "departureDate must be a YYYY-MM-DD string",
    );
  }
  let returnDate: string | null = null;
  if (typeof raw.returnDate === "string" && raw.returnDate.length > 0) {
    if (!DATE_RE.test(raw.returnDate)) {
      throw new FlightError("invalid_request", "returnDate must be a YYYY-MM-DD string");
    }
    if (raw.returnDate < departureDate) {
      throw new FlightError("invalid_request", "returnDate cannot be before departureDate");
    }
    returnDate = raw.returnDate;
  }

  const adults = Number.isFinite(Number(raw.adults)) ? Math.max(1, Math.trunc(Number(raw.adults))) : 1;
  const children = Number.isFinite(Number(raw.children)) ? Math.max(0, Math.trunc(Number(raw.children))) : 0;
  const infants = Number.isFinite(Number(raw.infants)) ? Math.max(0, Math.trunc(Number(raw.infants))) : 0;

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    adults,
    children,
    infants,
    cabin: parseCabin(raw.cabin),
    nonStop: raw.nonStop === true,
    currency: typeof raw.currency === "string" && raw.currency.trim() ? raw.currency.trim().toUpperCase() : "EUR",
    sort: parseSort(raw.sort),
    includeGroundAccess: raw.includeGroundAccess !== false,
    locale: typeof raw.locale === "string" ? raw.locale : "en",
  };
}

function resolvePlace(iataCode: string): FlightPlace {
  const airport = getEuropeanAirportByIata(iataCode);
  if (!airport) return bareFlightPlace(iataCode);
  return {
    iataCode: airport.iataCode ?? iataCode.toUpperCase(),
    name: airport.name,
    city: airport.city,
    countryCode: airport.countryCode,
    latitude: airport.latitude,
    longitude: airport.longitude,
  };
}

function mapProviderStatusToError(status: string): FlightError {
  switch (status) {
    case "misconfigured":
      return new FlightError("provider_misconfigured", "SERPAPI_API_KEY is not configured", 503);
    case "not_entitled":
      return new FlightError("provider_not_entitled", "SerpApi account not entitled for Google Flights", 403);
    case "rate_limited":
      return new FlightError("provider_rate_limited", "SerpApi rate limit reached", 429);
    case "authentication_error":
      return new FlightError("authentication_error", "SerpApi rejected the API key", 401);
    default:
      return new FlightError("provider_unavailable", "SerpApi temporarily unavailable", 503);
  }
}

/**
 * Searches SerpApi Google Flights once for the whole origin/destination
 * place pair: every resolved candidate airport on each side is folded into
 * a single comma-separated departure_id/arrival_id request, rather than
 * searching every airport-pair combination individually.
 */
async function searchAllAirports(
  origins: ResolvedAirport[],
  destinations: ResolvedAirport[],
  request: FlightSearchRequest,
  signal?: AbortSignal,
): Promise<FlightJourney[]> {
  const originIatas = origins.slice(0, MAX_ORIGIN_CANDIDATES).map((a) => a.iataCode);
  const destinationIatas = destinations
    .slice(0, MAX_DESTINATION_CANDIDATES)
    .map((a) => a.iataCode)
    .filter((iata) => !originIatas.includes(iata));

  if (destinationIatas.length === 0) {
    throw new FlightError(
      "airport_not_resolved",
      "Origin and destination resolve to the same airport(s)",
      404,
    );
  }

  const departureIds = originIatas.join(",");
  const arrivalIds = destinationIatas.join(",");

  const key = flightSearchCacheKey({
    originIata: departureIds,
    destinationIata: arrivalIds,
    departureDate: request.departureDate,
    returnDate: request.returnDate,
    adults: request.adults,
    children: request.children,
    infants: request.infants,
    cabin: request.cabin,
    nonStop: request.nonStop,
    currency: request.currency,
  });

  return withFlightSearchDedup(key, async () => {
    const journeys = await serpapiFlightProvider.searchFlights({
      departureIds,
      arrivalIds,
      outboundDate: request.departureDate,
      returnDate: request.returnDate,
      adults: request.adults,
      children: request.children,
      infants: request.infants,
      cabin: request.cabin,
      nonStop: request.nonStop,
      currency: request.currency,
      hl: request.locale,
      gl: originCountryHint(origins),
      signal,
      resolvePlace,
    });

    // Defense in depth: SerpApi multi-airport queries can occasionally
    // surface itineraries that leave/enter outside the requested set.
    const originSet = new Set(originIatas.map((c) => c.toUpperCase()));
    const destinationSet = new Set(destinationIatas.map((c) => c.toUpperCase()));
    return journeys.filter((journey) => {
      const first = journey.segments[0];
      const last = journey.segments[journey.segments.length - 1];
      if (!first || !last) return false;
      return (
        originSet.has(first.departure.place.iataCode.toUpperCase()) &&
        destinationSet.has(last.arrival.place.iataCode.toUpperCase())
      );
    });
  });
}

/** Best-effort `gl` (Google country) hint from the top resolved origin airport. */
function originCountryHint(origins: ResolvedAirport[]): string | undefined {
  const code = origins[0]?.countryCode;
  return code ? code.toLowerCase() : undefined;
}

async function computeGroundLeg(
  from: { latitude: number; longitude: number; name?: string | null },
  to: { latitude: number; longitude: number; name?: string | null },
  locale: string | undefined,
  signal?: AbortSignal,
): Promise<TransitJourney | null> {
  try {
    const result = await calculateTransitJourneys(
      {
        origin: from,
        destination: to,
        timing: { kind: "depart_now" },
        allowedModes: null,
        routingPreference: null,
        alternatives: false,
        locale,
      },
      signal,
    );
    return result.journeys[0] ?? null;
  } catch {
    // Ground access/egress is best-effort — never a hard failure for the flight search.
    return null;
  }
}

export async function calculateFlightJourneys(
  request: FlightSearchRequest,
  signal?: AbortSignal,
): Promise<FlightSearchResponse> {
  if (signal?.aborted) {
    throw new FlightError("aborted", "Flight search aborted", 499);
  }

  const status = await serpapiFlightProvider.getStatus();
  if (status !== "operational") {
    throw mapProviderStatusToError(status);
  }

  const [originCandidates, destinationCandidates] = await Promise.all([
    resolveAirportsForPlace({
      latitude: request.origin.latitude,
      longitude: request.origin.longitude,
      name: request.origin.name,
      iataHint: request.origin.iataHint,
      signal,
    }),
    resolveAirportsForPlace({
      latitude: request.destination.latitude,
      longitude: request.destination.longitude,
      name: request.destination.name,
      iataHint: request.destination.iataHint,
      signal,
    }),
  ]);

  if (originCandidates.length === 0 || destinationCandidates.length === 0) {
    throw new FlightError(
      "airport_not_resolved",
      "No commercial airport could be resolved for the requested place(s)",
      404,
    );
  }

  const warnings: FlightWarning[] = [];
  if (
    originCandidates.length > MAX_ORIGIN_CANDIDATES ||
    destinationCandidates.length > MAX_DESTINATION_CANDIDATES
  ) {
    warnings.push({
      code: "limited_airport_pairs_searched",
      message: "Only the closest airport(s) on each side were searched.",
      severity: "info",
    });
  }

  const offers = await searchAllAirports(originCandidates, destinationCandidates, request, signal);

  if (offers.length === 0) {
    throw new FlightError("no_offers_found", "No flight offers found", 404);
  }

  const sortedOffers = sortOffers(offers, request.sort);

  let accessUnavailable = false;
  let egressUnavailable = false;

  const journeys: MultimodalJourney[] = [];
  for (const offer of sortedOffers.slice(0, MAX_MULTIMODAL_JOURNEYS)) {
    const firstSegment = offer.segments[0];
    const lastSegment = offer.segments[offer.segments.length - 1];
    if (!firstSegment || !lastSegment) continue;

    let accessJourney: TransitJourney | null = null;
    let egressJourney: TransitJourney | null = null;

    if (
      request.includeGroundAccess &&
      firstSegment.departure.place.latitude != null &&
      firstSegment.departure.place.longitude != null
    ) {
      accessJourney = await computeGroundLeg(
        { latitude: request.origin.latitude, longitude: request.origin.longitude, name: request.origin.name },
        {
          latitude: firstSegment.departure.place.latitude,
          longitude: firstSegment.departure.place.longitude,
          name: firstSegment.departure.place.name,
        },
        request.locale,
        signal,
      );
      if (!accessJourney) accessUnavailable = true;
    }

    if (
      request.includeGroundAccess &&
      lastSegment.arrival.place.latitude != null &&
      lastSegment.arrival.place.longitude != null
    ) {
      egressJourney = await computeGroundLeg(
        {
          latitude: lastSegment.arrival.place.latitude,
          longitude: lastSegment.arrival.place.longitude,
          name: lastSegment.arrival.place.name,
        },
        { latitude: request.destination.latitude, longitude: request.destination.longitude, name: request.destination.name },
        request.locale,
        signal,
      );
      if (!egressJourney) egressUnavailable = true;
    }

    // Drop physically impossible connections (ground arrives after the flight departs, or
    // the egress leg would need to depart before the flight lands) rather than just warning.
    // Also drop legs timed on a different calendar day than the flight (Google Routes defaults
    // to "now", which invents multi-day door-to-door durations against future SerpApi flights).
    if (accessJourney) {
      const margin = connectionMarginMinutes(accessJourney.arrivalAt, firstSegment.departure.at);
      const sameDay = shareCalendarDate(accessJourney.arrivalAt, firstSegment.departure.at);
      if (!sameDay || (margin != null && margin < 0)) {
        accessJourney = null;
        accessUnavailable = true;
      }
    }
    if (egressJourney) {
      const margin = connectionMarginMinutes(lastSegment.arrival.at, egressJourney.departureAt);
      const sameDay = shareCalendarDate(lastSegment.arrival.at, egressJourney.departureAt);
      if (!sameDay || (margin != null && margin < 0)) {
        egressJourney = null;
        egressUnavailable = true;
      }
    }

    journeys.push(
      assembleMultimodalJourney({
        flight: offer,
        accessJourney,
        egressJourney,
        accessUnavailable: request.includeGroundAccess && accessUnavailable && !accessJourney,
        egressUnavailable: request.includeGroundAccess && egressUnavailable && !egressJourney,
        primaryOriginIata: originCandidates[0]?.iataCode ?? null,
        primaryDestinationIata: destinationCandidates[0]?.iataCode ?? null,
        buffers: RECOMMENDED_FLIGHT_BUFFERS,
      }),
    );
  }

  return {
    provider: "serpapi_google_flights",
    status: "operational",
    offers: sortedOffers,
    journeys,
    warnings,
    calculatedAt: new Date().toISOString(),
  };
}
