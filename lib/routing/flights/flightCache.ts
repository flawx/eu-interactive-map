/**
 * Short-lived in-memory cache + in-flight request dedup for SerpApi Google
 * Flights searches. A short TTL meaningfully reduces duplicate (and billed)
 * SerpApi calls during a single planning session without risking stale
 * prices for long.
 */

import type { FlightCabin, FlightJourney } from "@/lib/routing/flights/types";

const CACHE_TTL_MS = 90_000;
const MAX_ENTRIES = 60;

export type FlightSearchCacheKeyInput = {
  originIata: string;
  destinationIata: string;
  departureDate: string;
  returnDate?: string | null;
  adults: number;
  children?: number;
  infants?: number;
  cabin?: FlightCabin | null;
  nonStop: boolean;
  currency: string;
};

type CacheEntry = {
  expiresAt: number;
  value: FlightJourney[];
};

const cache = new Map<string, CacheEntry>();
export const inFlightFlightSearches = new Map<
  string,
  Promise<FlightJourney[]>
>();

export function flightSearchCacheKey(
  input: FlightSearchCacheKeyInput,
): string {
  return [
    input.originIata.toUpperCase(),
    input.destinationIata.toUpperCase(),
    input.departureDate,
    input.returnDate ?? "oneway",
    input.adults,
    input.children ?? 0,
    input.infants ?? 0,
    input.cabin ?? "any",
    input.nonStop ? "nonstop" : "any-stops",
    input.currency.toUpperCase(),
  ].join("|");
}

export function getCachedFlightOffers(
  key: string,
): FlightJourney[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedFlightOffers(
  key: string,
  value: FlightJourney[],
): void {
  if (cache.size >= MAX_ENTRIES) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

/**
 * Runs `fetcher` for `key`, reusing any in-flight promise for the same key
 * and caching a successful result for CACHE_TTL_MS.
 */
export async function withFlightSearchDedup(
  key: string,
  fetcher: () => Promise<FlightJourney[]>,
): Promise<FlightJourney[]> {
  const cached = getCachedFlightOffers(key);
  if (cached) return cached;

  const existing = inFlightFlightSearches.get(key);
  if (existing) return existing;

  const promise = fetcher()
    .then((result) => {
      setCachedFlightOffers(key, result);
      return result;
    })
    .finally(() => {
      inFlightFlightSearches.delete(key);
    });

  inFlightFlightSearches.set(key, promise);
  return promise;
}

export function clearFlightCacheForTests(): void {
  cache.clear();
  inFlightFlightSearches.clear();
}
