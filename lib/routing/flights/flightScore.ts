/**
 * Deterministic offer scoring/sorting. Pure functions — no network, no
 * randomness, so the same input always produces the same order.
 */

import type {
  FlightJourney,
  FlightSortOrder,
} from "@/lib/routing/flights/types";

const DURATION_WEIGHT = 1;
/** Roughly "1 stop feels like +45 minutes" for the recommended blend. */
const STOP_PENALTY_SECONDS = 45 * 60;
/** Roughly "1 EUR feels like +6 seconds" so price still matters at parity duration. */
const PRICE_WEIGHT_SECONDS_PER_UNIT = 6;
const MAX_LAYOVER_PENALTY_SECONDS = 60 * 60;

function priceAmount(journey: FlightJourney): number | null {
  return journey.price?.amount ?? null;
}

function totalLayoverSeconds(journey: FlightJourney): number {
  return journey.layovers.reduce((sum, layover) => sum + layover.durationSeconds, 0);
}

/**
 * Lower is better. Combines duration, number of stops, cumulative layover
 * time (excessively long layovers are penalized, capped so one bad layover
 * doesn't dominate), and price when known.
 */
export function recommendedScore(journey: FlightJourney): number {
  let score = journey.durationSeconds * DURATION_WEIGHT;
  score += journey.stops * STOP_PENALTY_SECONDS;

  const layoverSeconds = Math.min(
    totalLayoverSeconds(journey),
    MAX_LAYOVER_PENALTY_SECONDS * Math.max(journey.layovers.length, 1),
  );
  score += layoverSeconds * 0.5;

  const price = priceAmount(journey);
  if (price !== null) {
    score += price * PRICE_WEIGHT_SECONDS_PER_UNIT;
  }
  return score;
}

function compareCheapest(a: FlightJourney, b: FlightJourney): number {
  const priceA = priceAmount(a);
  const priceB = priceAmount(b);
  if (priceA === null && priceB === null) return recommendedScore(a) - recommendedScore(b);
  if (priceA === null) return 1;
  if (priceB === null) return -1;
  if (priceA !== priceB) return priceA - priceB;
  return a.durationSeconds - b.durationSeconds;
}

function compareFastest(a: FlightJourney, b: FlightJourney): number {
  if (a.durationSeconds !== b.durationSeconds) {
    return a.durationSeconds - b.durationSeconds;
  }
  return a.stops - b.stops;
}

/** "best_flights" ranks before "other_flights" on an otherwise-tied score. */
function sourceRankWeight(journey: FlightJourney): number {
  return journey.sourceRank === "best" ? 0 : 1;
}

function compareRecommended(a: FlightJourney, b: FlightJourney): number {
  const diff = recommendedScore(a) - recommendedScore(b);
  if (diff !== 0) return diff;
  const rankDiff = sourceRankWeight(a) - sourceRankWeight(b);
  if (rankDiff !== 0) return rankDiff;
  return a.id.localeCompare(b.id);
}

/** Stable sort — never mutates the input array. */
export function sortOffers(
  offers: FlightJourney[],
  order: FlightSortOrder,
): FlightJourney[] {
  const copy = offers.slice();
  const comparator =
    order === "cheapest"
      ? compareCheapest
      : order === "fastest"
        ? compareFastest
        : compareRecommended;
  return copy.sort(comparator);
}
