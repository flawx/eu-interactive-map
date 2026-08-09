/**
 * Resolves a free-form place (coordinates + optional name/IATA hint) to one
 * or more candidate commercial airports for flight search. The sole source
 * is the curated EUROPEAN_AIRPORTS list — SerpApi Google Flights has no
 * airport/location search endpoint, so there is no live fallback.
 */

import type { ResolvedAirport } from "@/lib/routing/flights/types";
import {
  EUROPEAN_AIRPORTS,
  getEuropeanAirportByIata,
  type EuropeanAirport,
} from "@/lib/transport/europeanAirports";

const EARTH_RADIUS_KM = 6371;
const MAX_RESULTS = 3;
/** Reject haversine padding beyond this radius — avoids NCE for Rome, BRU for Paris. */
const MAX_HAVERSINE_PADDING_KM = 120;

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
 * distance, then curated airports are ranked by haversine distance.
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
    // Prefer exact city-name grouping (e.g. "Paris" → CDG, ORY) when the
    // free-text label is a city. Match on the first token so "Paris France"
    // still groups correctly.
    const cityToken = input.name.split(/[|,]/)[0]?.trim() ?? input.name;
    for (const airport of airportsForCity(cityToken)) {
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

  // Only pad with nearby airports when city grouping left empty (or short).
  // Never pull in distant cities (Nice for Rome, Brussels for Paris).
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
      .filter(({ distanceKm }) => distanceKm <= MAX_HAVERSINE_PADDING_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    for (const { airport, distanceKm } of ranked) {
      if (results.length >= MAX_RESULTS) break;
      push(toResolvedAirport(airport, distanceKm));
    }
  }

  return results.slice(0, MAX_RESULTS);
}
