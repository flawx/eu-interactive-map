/**
 * Converts a raw Amadeus Flight Offers Search (or Flight Offers Price)
 * response into our normalized FlightJourney[] model. Pure transformation —
 * no network, no secrets (the Amadeus response body never contains the API
 * key/secret/bearer token).
 */

import { lookupAirlineName } from "@/lib/routing/flights/airlineNames";
import type {
  FlightCabin,
  FlightEnvironment,
  FlightJourney,
  FlightLayover,
  FlightPlace,
  FlightPrice,
  FlightSegment,
} from "@/lib/routing/flights/types";

export type AmadeusLocationDictionaryEntry = {
  cityCode?: string;
  countryCode?: string;
};

export type AmadeusDictionaries = {
  locations?: Record<string, AmadeusLocationDictionaryEntry>;
  aircraft?: Record<string, string>;
  currencies?: Record<string, string>;
  carriers?: Record<string, string>;
};

export type AmadeusEndpoint = {
  iataCode?: string;
  terminal?: string;
  at?: string;
};

export type AmadeusSegment = {
  id?: string;
  departure?: AmadeusEndpoint;
  arrival?: AmadeusEndpoint;
  carrierCode?: string;
  number?: string;
  aircraft?: { code?: string };
  operating?: { carrierCode?: string };
  duration?: string;
  numberOfStops?: number;
};

export type AmadeusItinerary = {
  duration?: string;
  segments?: AmadeusSegment[];
};

export type AmadeusPrice = {
  currency?: string;
  total?: string;
  grandTotal?: string;
};

export type AmadeusFlightOffer = {
  id?: string;
  source?: string;
  numberOfBookableSeats?: number;
  lastTicketingDate?: string;
  itineraries?: AmadeusItinerary[];
  price?: AmadeusPrice;
  validatingAirlineCodes?: string[];
  travelerPricings?: Array<{
    fareOption?: string;
    fareDetailsBySegment?: Array<{ cabin?: string }>;
  }>;
};

export type AmadeusFlightOffersResponse = {
  data?: AmadeusFlightOffer[];
  dictionaries?: AmadeusDictionaries;
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

/**
 * Parses an ISO 8601 duration such as "PT2H5M" or "P1DT3H" into seconds.
 * Returns 0 for unparseable input rather than throwing — durations are
 * always secondary to the departure/arrival timestamps for correctness.
 */
export function parseIso8601Duration(duration: string | null | undefined): number {
  if (!duration) return 0;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
    duration.trim(),
  );
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  const totalSeconds =
    (Number(days ?? 0) * 24 * 60 * 60) +
    (Number(hours ?? 0) * 60 * 60) +
    (Number(minutes ?? 0) * 60) +
    Number(seconds ?? 0);
  return Number.isFinite(totalSeconds) ? totalSeconds : 0;
}

function resolveCarrierName(
  code: string | undefined,
  dictionaries: AmadeusDictionaries | undefined,
): string | null {
  if (!code) return null;
  const fromDictionary = dictionaries?.carriers?.[code];
  if (fromDictionary) return fromDictionary;
  return lookupAirlineName(code);
}

function normalizeSegment(
  raw: AmadeusSegment,
  index: number,
  offerId: string,
  dictionaries: AmadeusDictionaries | undefined,
  resolvePlace: ResolvePlace,
): FlightSegment | null {
  const departureIata = raw.departure?.iataCode;
  const arrivalIata = raw.arrival?.iataCode;
  const departureAt = raw.departure?.at;
  const arrivalAt = raw.arrival?.at;
  const carrierCode = raw.carrierCode;
  const flightNumber = raw.number;

  if (!departureIata || !arrivalIata || !departureAt || !arrivalAt || !carrierCode || !flightNumber) {
    return null;
  }

  const operatingCarrierCode = raw.operating?.carrierCode ?? null;

  return {
    id: raw.id ?? `${offerId}-seg-${index}`,
    carrierCode,
    carrierName: resolveCarrierName(carrierCode, dictionaries),
    operatingCarrierCode,
    operatingCarrierName: resolveCarrierName(operatingCarrierCode ?? undefined, dictionaries),
    flightNumber,
    aircraftCode: raw.aircraft?.code ?? null,
    departure: {
      place: resolvePlace(departureIata),
      terminal: raw.departure?.terminal ?? null,
      at: departureAt,
    },
    arrival: {
      place: resolvePlace(arrivalIata),
      terminal: raw.arrival?.terminal ?? null,
      at: arrivalAt,
    },
    durationSeconds: parseIso8601Duration(raw.duration),
    numberOfStopsEnRoute: raw.numberOfStops ?? 0,
  };
}

function buildLayovers(segments: FlightSegment[]): FlightLayover[] {
  const layovers: FlightLayover[] = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    const current = segments[i]!;
    const next = segments[i + 1]!;
    const arrivalMs = new Date(current.arrival.at).getTime();
    const departureMs = new Date(next.departure.at).getTime();
    const durationSeconds =
      Number.isFinite(arrivalMs) && Number.isFinite(departureMs)
        ? Math.max(0, Math.round((departureMs - arrivalMs) / 1000))
        : 0;
    layovers.push({
      airport: current.arrival.place,
      durationSeconds,
    });
  }
  return layovers;
}

function extractCabin(offer: AmadeusFlightOffer): FlightCabin | null {
  const cabin = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin;
  if (
    cabin === "ECONOMY" ||
    cabin === "PREMIUM_ECONOMY" ||
    cabin === "BUSINESS" ||
    cabin === "FIRST"
  ) {
    return cabin;
  }
  return null;
}

function extractPrice(offer: AmadeusFlightOffer): FlightPrice | null {
  const amountRaw = offer.price?.grandTotal ?? offer.price?.total;
  const currency = offer.price?.currency;
  if (!amountRaw || !currency) return null;
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) return null;
  return { amount, currency, status: "search", source: "amadeus" };
}

/** Deep-clones via JSON round trip so mutation of the returned journeys never affects the cache entry. */
function cloneRawOffer(offer: AmadeusFlightOffer): unknown {
  try {
    return JSON.parse(JSON.stringify(offer));
  } catch {
    return null;
  }
}

/**
 * Converts an Amadeus Flight Offers Search response into flat FlightJourney
 * records — one per itinerary (a one-way search yields one itinerary per
 * offer; a round-trip search yields two, sharing the same offer id and
 * price so totals are not double-counted by naive summation).
 */
export function normalizeAmadeusOffers(
  payload: AmadeusFlightOffersResponse,
  options: {
    environment: FlightEnvironment;
    resolvePlace?: ResolvePlace;
  },
): FlightJourney[] {
  const resolvePlace = options.resolvePlace ?? bareFlightPlace;
  const dictionaries = payload.dictionaries;
  const journeys: FlightJourney[] = [];

  for (const offer of payload.data ?? []) {
    const offerId = offer.id ?? "";
    if (!offerId) continue;

    const price = extractPrice(offer);
    const cabin = extractCabin(offer);
    const rawOffer = cloneRawOffer(offer);

    for (const itinerary of offer.itineraries ?? []) {
      const segments: FlightSegment[] = [];
      for (const [index, rawSegment] of (itinerary.segments ?? []).entries()) {
        const segment = normalizeSegment(
          rawSegment,
          index,
          offerId,
          dictionaries,
          resolvePlace,
        );
        if (segment) segments.push(segment);
      }
      if (segments.length === 0) continue;

      const layovers = buildLayovers(segments);
      const durationSeconds =
        itinerary.duration != null
          ? parseIso8601Duration(itinerary.duration)
          : segments.reduce((sum, s) => sum + s.durationSeconds, 0) +
            layovers.reduce((sum, l) => sum + l.durationSeconds, 0);

      journeys.push({
        id: `${offerId}-${journeys.length}`,
        segments,
        durationSeconds,
        stops: segments.length - 1,
        layovers,
        price,
        cabin,
        validatingAirlineCodes: offer.validatingAirlineCodes ?? [],
        bookableSeats: offer.numberOfBookableSeats ?? null,
        lastTicketingDate: offer.lastTicketingDate ?? null,
        sourceEnvironment: options.environment,
        rawOfferId: offerId,
        rawOffer,
      });
    }
  }

  return journeys;
}
