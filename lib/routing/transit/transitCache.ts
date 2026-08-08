import type {
  TransitRoutingRequest,
  TransitRoutingResult,
} from "@/lib/routing/transit/types";

type CacheEntry = {
  expiresAt: number;
  value: TransitRoutingResult;
};

const CACHE_TTL_MS = 45_000;
const MAX_ENTRIES = 40;
const cache = new Map<string, CacheEntry>();

function roundCoord(n: number): string {
  return n.toFixed(5);
}

export function transitCacheKey(request: TransitRoutingRequest): string {
  const timing =
    request.timing.kind === "depart_now"
      ? "depart_now"
      : `${request.timing.kind}:${request.timing.at}`;
  const modes = (request.allowedModes ?? []).slice().sort().join(",");
  return [
    roundCoord(request.origin.latitude),
    roundCoord(request.origin.longitude),
    roundCoord(request.destination.latitude),
    roundCoord(request.destination.longitude),
    timing,
    modes,
    request.routingPreference ?? "none",
    request.alternatives ? "alt" : "noalt",
    request.locale ?? "en",
  ].join("|");
}

export function getCachedTransitResult(
  request: TransitRoutingRequest,
): TransitRoutingResult | null {
  const key = transitCacheKey(request);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedTransitResult(
  request: TransitRoutingRequest,
  value: TransitRoutingResult,
) {
  if (cache.size >= MAX_ENTRIES) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(transitCacheKey(request), {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
}

export function clearTransitCacheForTests() {
  cache.clear();
}
