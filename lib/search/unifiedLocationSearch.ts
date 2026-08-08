import { searchLocalIndex, flattenSearchGroups, type MapSearchResult } from "@/lib/search/mapSearch";
import type { UnifiedLocationResult } from "@/lib/search/externalLocation";
import type { ExternalLocationSearchResult } from "@/lib/search/externalLocation";

function haversineRough(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = aLat - bLat;
  const dLon = aLon - bLon;
  return dLat * dLat + dLon * dLon;
}

function nearDuplicate(
  a: { latitude: number; longitude: number; name: string },
  b: { latitude: number; longitude: number; name: string },
): boolean {
  if (haversineRough(a.latitude, a.longitude, b.latitude, b.longitude) > 0.00005) {
    return false;
  }
  const an = a.name.trim().toLowerCase();
  const bn = b.name.trim().toLowerCase();
  return an === bn || an.includes(bn) || bn.includes(an);
}

function localToUnified(result: MapSearchResult): UnifiedLocationResult {
  return {
    id: `local:${result.id}`,
    source: "local",
    kind: "internal",
    name: result.title,
    subtitle: result.subtitle,
    latitude: result.latitude,
    longitude: result.longitude,
    countryCode: result.countryCode ?? null,
    localResultId: result.id,
  };
}

function externalToUnified(
  result: ExternalLocationSearchResult,
): UnifiedLocationResult {
  const parts = [
    result.addressLabel && result.addressLabel !== result.name
      ? result.addressLabel
      : null,
    [result.municipality, result.region, result.countryCode]
      .filter(Boolean)
      .join(" · ") || null,
  ].filter(Boolean);
  return {
    id: result.id,
    source: result.provider,
    kind: result.type,
    name: result.name,
    subtitle: parts.join(" · ") || result.type,
    latitude: result.latitude,
    longitude: result.longitude,
    countryCode: result.countryCode,
    providerId: result.providerId,
  };
}

const KIND_PRIORITY: Record<UnifiedLocationResult["kind"], number> = {
  internal: 0,
  address: 1,
  poi: 2,
  street: 3,
  intersection: 4,
  city: 5,
  geography: 6,
};

export function mergeUnifiedLocationResults(
  local: MapSearchResult[],
  external: ExternalLocationSearchResult[],
  limit = 8,
): UnifiedLocationResult[] {
  const merged: UnifiedLocationResult[] = [
    ...local.map(localToUnified),
    ...external.map(externalToUnified),
  ];

  merged.sort(
    (a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind],
  );

  const deduped: UnifiedLocationResult[] = [];
  for (const item of merged) {
    if (
      deduped.some((existing) =>
        nearDuplicate(
          {
            latitude: existing.latitude,
            longitude: existing.longitude,
            name: existing.name,
          },
          {
            latitude: item.latitude,
            longitude: item.longitude,
            name: item.name,
          },
        ),
      )
    ) {
      continue;
    }
    deduped.push(item);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

export function searchLocalUnified(
  query: string,
  index: MapSearchResult[],
  limit = 8,
): MapSearchResult[] {
  return flattenSearchGroups(searchLocalIndex(query, index, limit)).slice(
    0,
    limit,
  );
}
