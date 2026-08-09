/**
 * Resolves a free-form place (coordinates + optional name/IATA hint) to one
 * or more candidate commercial airports for flight search. Primary source
 * is the curated EUROPEAN_AIRPORTS list; Amadeus Airport & City Search is
 * only used as an optional fallback when credentials are configured and the
 * curated list has no close-enough match.
 */

import { amadeusFlightProvider } from "@/lib/routing/flights/providers/amadeusFlightProvider";
import type { ResolvedAirport } from "@/lib/routing/flights/types";
import {
  EUROPEAN_AIRPORTS,
  getEuropeanAirportByIata,
  type EuropeanAirport,
} from "@/lib/transport/europeanAirports";

const EARTH_RADIUS_KM = 6371;
/** Beyond this, a curated top-40 match is too far to be a sensible default. */
const CURATED_FALLBACK_TRIGGER_KM = 250;
const MAX_RESULTS = 3;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toResolvedAirport(
  airport: EuropeanAirport,
  distanceKm: number | null,
): ResolvedAirport | null {
  if (!airport.iataCode) return null;
  return {
    iataCode: airport.iataCode,
    icaoCode: airport.icaoCode,
    name: airport.name,
    city: airport.city,
    countryCode: airport.countryCode,
    latitude: airport.latitude,
    longitude: airport.longitude,
    distanceKm,
    source: "curated",
  };
}

function normalizeCityName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Groups the curated airports by normalized city name, e.g. "paris" → [CDG, ORY]. */
export function airportsForCity(cityName: string): EuropeanAirport[] {
  const target = normalizeCityName(cityName);
  return EUROPEAN_AIRPORTS.filter(
    (airport) => normalizeCityName(airport.city) === target,
  );
}

export function resolveByIata(code: string): ResolvedAirport | null {
  const airport = getEuropeanAirportByIata(code);
  if (!airport) return null;
  return toResolvedAirport(airport, null);
}

export type ResolveAirportsInput = {
  latitude: number;
  longitude: number;
  name?: string | null;
  iataHint?: string | null;
  signal?: AbortSignal;
};

/**
 * Returns up to MAX_RESULTS ranked candidate airports for a place: an exact
 * IATA hint always wins; otherwise city-name grouping is preferred over pure
 * distance, then curated airports are ranked by haversine distance; the
 * Amadeus location search is only consulted when nothing curated is close.
 */
export async function resolveAirportsForPlace(
  input: ResolveAirportsInput,
): Promise<ResolvedAirport[]> {
  const seen = new Set<string>();
  const results: ResolvedAirport[] = [];

  const push = (candidate: ResolvedAirport | null) => {
    if (!candidate || seen.has(candidate.iataCode)) return;
    seen.add(candidate.iataCode);
    results.push(candidate);
  };

  if (input.iataHint) {
    push(resolveByIata(input.iataHint));
  }

  if (input.name && results.length < MAX_RESULTS) {
    for (const airport of airportsForCity(input.name)) {
      const distanceKm =
        Number.isFinite(input.latitude) && Number.isFinite(input.longitude)
          ? haversineDistanceKm(
              input.latitude,
              input.longitude,
              airport.latitude,
              airport.longitude,
            )
          : null;
      push(toResolvedAirport(airport, distanceKm));
    }
  }

  if (
    results.length < MAX_RESULTS &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    const ranked = EUROPEAN_AIRPORTS.filter((airport) => airport.iataCode)
      .map((airport) => ({
        airport,
        distanceKm: haversineDistanceKm(
          input.latitude,
          input.longitude,
          airport.latitude,
          airport.longitude,
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    for (const { airport, distanceKm } of ranked) {
      if (results.length >= MAX_RESULTS) break;
      push(toResolvedAirport(airport, distanceKm));
    }
  }

  const nearestCuratedDistance = results
    .map((r) => r.distanceKm)
    .filter((d): d is number => d != null)
    .sort((a, b) => a - b)[0];

  const shouldTryAmadeusFallback =
    results.length === 0 ||
    (nearestCuratedDistance != null &&
      nearestCuratedDistance > CURATED_FALLBACK_TRIGGER_KM);

  if (shouldTryAmadeusFallback && input.name) {
    const fallback = await amadeusFlightProvider.searchAirportLocations(
      input.name,
      input.signal,
    );
    for (const candidate of fallback) {
      if (results.length >= MAX_RESULTS) break;
      push(candidate);
    }
  }

  return results.slice(0, MAX_RESULTS);
}
