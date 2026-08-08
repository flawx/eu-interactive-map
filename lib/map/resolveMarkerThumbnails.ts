import { EU_CAPITALS } from "@/lib/europe/euCapitals";
import {
  emptyMarkerThumbnail,
  markerThumbnailFromResolvedImage,
  markerThumbnailKey,
  type MapMarkerThumbnail,
  type MarkerThumbnailRequest,
  type PhotoMarkerCategory,
} from "@/lib/map/mapMarkerThumbnail";
import {
  catalogEntryKey,
  getCatalogVersion,
  getMapMarkerThumbnailCatalog,
  lookupStoredThumbnail,
  storedToMapMarkerThumbnail,
  type StoredMapThumbnail,
} from "@/lib/map/mapMarkerThumbnailCatalog";
import type { Locale } from "@/lib/i18n/config";
import {
  resolveEntityEnrichment,
  resolvePrimaryMarkerImage,
  type ExpectedEntity,
  type ResolvedWikimediaImage,
} from "@/lib/enrichment/wikimediaEntityResolver";
import { MAJOR_TOURIST_PLACES } from "@/lib/tourism/majorTouristPlaces";
import {
  EUROPEAN_HERITAGE_LABEL_SITES,
  getEuropeanHeritageLabelLocationById,
  getEuropeanHeritageLabelSiteById,
} from "@/lib/tourism/europeanHeritageLabel";
import { getUnescoSiteById, UNESCO_WORLD_HERITAGE_SITES } from "@/lib/tourism/unescoWorldHeritage";
import { MAJOR_CIVIL_ENGINEERING_WORKS } from "@/lib/tourism/majorCivilEngineeringWorks";

export type { MarkerThumbnailRequest };
export { markerThumbnailKey };

export type MarkerThumbnailResult = MarkerThumbnailRequest & {
  key: string;
  thumbnail: MapMarkerThumbnail;
};

export type MarkerThumbnailBatchStats = {
  entries: number;
  catalogHits: number;
  catalogMisses: number;
  durationMs: number;
  catalogVersion: number;
};

const MAX_BATCH = 200;

function wikipediaTitleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/wiki\/(.+)$/);
    return match ? decodeURIComponent(match[1].replace(/_/g, " ")) : null;
  } catch {
    return null;
  }
}

export function expectedForRequest(
  request: MarkerThumbnailRequest,
): ExpectedEntity | null {
  if (request.category === "capital") {
    const capital = EU_CAPITALS.find((item) => item.id === request.id);
    if (!capital) return null;
    return {
      wikidataId: capital.wikidataId,
      canonicalName: capital.canonicalName,
      aliases: capital.aliases,
      countryCode: capital.countryCode,
      latitude: capital.latitude,
      longitude: capital.longitude,
      expectedTypes: ["city", "capital"],
      wikipediaTitles: capital.wikipediaTitles,
    };
  }
  if (request.category === "tourist") {
    const place = MAJOR_TOURIST_PLACES.find((item) => item.id === request.id);
    if (!place) return null;
    return {
      wikidataId: place.wikidataId,
      canonicalName: place.canonicalName,
      aliases: place.aliases,
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      wikipediaTitles: place.wikipediaTitles,
    };
  }
  if (request.category === "unesco") {
    const site = getUnescoSiteById(request.id);
    if (!site) return null;
    return {
      wikidataId: null,
      canonicalName: site.canonicalName,
      aliases: [site.canonicalName, site.location].filter(Boolean) as string[],
      countryCode: site.countryCodes[0] ?? null,
      latitude: site.latitude,
      longitude: site.longitude,
      searchContext: "UNESCO World Heritage",
      distanceThresholdKm: 35,
    };
  }
  if (request.category === "ehl") {
    const locationId = request.locationId ?? null;
    if (locationId) {
      const location = getEuropeanHeritageLabelLocationById(locationId);
      const site = location
        ? getEuropeanHeritageLabelSiteById(location.siteId)
        : null;
      if (!location || !site) return null;
      return {
        wikidataId: location.wikidataId ?? site.wikidataId,
        canonicalName: location.name,
        aliases: [site.canonicalName, location.name],
        countryCode: location.countryCode,
        latitude: location.latitude,
        longitude: location.longitude,
        searchContext: "European Heritage Label",
      };
    }
    const site = getEuropeanHeritageLabelSiteById(request.id);
    if (!site) return null;
    const primary =
      site.locations.find((item) => item.representativePoint) ??
      site.locations[0];
    return {
      wikidataId: primary?.wikidataId ?? site.wikidataId,
      canonicalName: primary?.name ?? site.canonicalName,
      aliases: [site.canonicalName, primary?.name].filter(Boolean) as string[],
      countryCode: primary?.countryCode ?? site.countryCodes[0] ?? null,
      latitude: primary?.latitude ?? null,
      longitude: primary?.longitude ?? null,
      searchContext: "European Heritage Label",
    };
  }
  const work = MAJOR_CIVIL_ENGINEERING_WORKS.find(
    (item) => item.id === request.id,
  );
  if (!work) return null;
  const wikiTitle = wikipediaTitleFromUrl(work.wikipediaUrl);
  return {
    wikidataId: work.wikidataId,
    canonicalName: work.name,
    aliases: work.aliases,
    countryCode: work.countryCodes[0] ?? null,
    latitude: work.latitude,
    longitude: work.longitude,
    wikipediaTitles: wikiTitle ? { en: wikiTitle } : undefined,
    searchContext: "civil engineering",
  };
}

/**
 * Runtime path: catalog lookup only. No Wikimedia / Wikidata network I/O.
 */
export function resolveMarkerThumbnailsFromCatalog(
  requests: MarkerThumbnailRequest[],
): { results: MarkerThumbnailResult[]; stats: MarkerThumbnailBatchStats } {
  const started = performance.now();
  const limited = requests.slice(0, MAX_BATCH);
  let catalogHits = 0;
  let catalogMisses = 0;
  const results: MarkerThumbnailResult[] = limited.map((request) => {
    const key = catalogEntryKey(
      request.category,
      request.id,
      request.locationId,
    );
    const stored = lookupStoredThumbnail(
      request.category,
      request.id,
      request.locationId,
    );
    if (stored) {
      catalogHits += 1;
    } else {
      catalogMisses += 1;
    }
    return {
      ...request,
      key,
      thumbnail: storedToMapMarkerThumbnail(stored),
    };
  });

  const stats: MarkerThumbnailBatchStats = {
    entries: limited.length,
    catalogHits,
    catalogMisses,
    durationMs: Math.round(performance.now() - started),
    catalogVersion: getCatalogVersion(),
  };

  if (process.env.NODE_ENV !== "production") {
    console.info(
      [
        "marker thumbnails batch",
        `entries=${stats.entries}`,
        `catalogHits=${stats.catalogHits}`,
        `catalogMisses=${stats.catalogMisses}`,
        `wikidataRequests=0`,
        `wikipediaRequests=0`,
        `commonsRequests=0`,
        `duration=${stats.durationMs}ms`,
        `catalogVersion=${stats.catalogVersion}`,
      ].join(" "),
    );
  }

  return { results, stats };
}

/** @deprecated Use resolveMarkerThumbnailsFromCatalog for runtime. */
export async function resolveMarkerThumbnails(
  requests: MarkerThumbnailRequest[],
  _locale: Locale,
  _signal?: AbortSignal,
): Promise<MarkerThumbnailResult[]> {
  return resolveMarkerThumbnailsFromCatalog(requests).results;
}

function inferSource(
  image: ResolvedWikimediaImage,
  usedP18: boolean,
): StoredMapThumbnail["source"] {
  if (usedP18) return "wikidata-p18";
  if (image.sourceUrl?.includes("wikipedia.org")) return "wikipedia";
  if (image.sourceUrl?.includes("wikimedia.org")) return "wikimedia-commons";
  return "wikimedia-commons";
}

/**
 * Offline/build-time remote resolution (Wikidata / Commons).
 * Used only by `npm run thumbnails:update`, never by the map runtime API.
 */
export async function resolveMarkerThumbnailRemote(
  request: MarkerThumbnailRequest,
  locale: Locale,
  signal?: AbortSignal,
): Promise<{
  thumbnail: MapMarkerThumbnail;
  stored: StoredMapThumbnail;
  usedP18: boolean;
}> {
  const expected = expectedForRequest(request);
  const entityType =
    request.category === "tourist"
      ? "tourist_place"
      : request.category === "civil"
        ? "civil_engineering"
        : request.category;
  const resolvedAt = new Date().toISOString();
  const baseStored: StoredMapThumbnail = {
    entityType,
    entityId: request.id,
    locationId: request.locationId ?? null,
    wikidataId: expected?.wikidataId ?? null,
    originalUrl: null,
    thumbnailUrl: null,
    width: null,
    height: null,
    source: "missing",
    credit: null,
    license: null,
    licenseUrl: null,
    resolvedAt,
  };

  if (!expected) {
    return {
      thumbnail: emptyMarkerThumbnail(),
      stored: baseStored,
      usedP18: false,
    };
  }

  try {
    if (expected.wikidataId) {
      // Prefer an allowed Wikimedia thumb step (120), not 96.
      const primary = await resolvePrimaryMarkerImage(
        expected.wikidataId,
        signal,
      );
      if (primary) {
        const thumbnail = markerThumbnailFromResolvedImage(primary);
        return {
          thumbnail,
          stored: {
            ...baseStored,
            originalUrl: primary.url,
            thumbnailUrl: thumbnail.url,
            width: primary.width,
            height: primary.height,
            source: inferSource(primary, true),
            credit: primary.author ?? primary.sourceUrl,
            license: primary.license ?? null,
            licenseUrl: primary.licenseUrl ?? null,
          },
          usedP18: true,
        };
      }
    }

    const enrichment = await resolveEntityEnrichment(
      expected,
      locale,
      signal,
      1,
    );
    const image = enrichment.images[0];
    if (!image) {
      return {
        thumbnail: emptyMarkerThumbnail(),
        stored: baseStored,
        usedP18: false,
      };
    }
    const thumbnail = markerThumbnailFromResolvedImage(image);
    return {
      thumbnail,
      stored: {
        ...baseStored,
        wikidataId: baseStored.wikidataId,
        originalUrl: image.url,
        thumbnailUrl: thumbnail.url,
        width: image.width,
        height: image.height,
        source: inferSource(image, false),
        credit: image.author ?? image.sourceUrl,
        license: image.license ?? null,
        licenseUrl: image.licenseUrl ?? null,
      },
      usedP18: false,
    };
  } catch {
    return {
      thumbnail: emptyMarkerThumbnail(),
      stored: baseStored,
      usedP18: false,
    };
  }
}

export type CatalogEntityTarget = MarkerThumbnailRequest & {
  key: string;
};

export function listAllCatalogTargets(): CatalogEntityTarget[] {
  const targets: CatalogEntityTarget[] = [];

  for (const capital of EU_CAPITALS) {
    targets.push({
      category: "capital",
      id: capital.id,
      key: catalogEntryKey("capital", capital.id),
    });
  }
  for (const place of MAJOR_TOURIST_PLACES) {
    targets.push({
      category: "tourist",
      id: place.id,
      key: catalogEntryKey("tourist", place.id),
    });
  }
  for (const site of UNESCO_WORLD_HERITAGE_SITES) {
    targets.push({
      category: "unesco",
      id: site.id,
      key: catalogEntryKey("unesco", site.id),
    });
  }
  for (const site of EUROPEAN_HERITAGE_LABEL_SITES) {
    for (const location of site.locations) {
      targets.push({
        category: "ehl",
        id: site.id,
        locationId: location.id,
        key: catalogEntryKey("ehl", site.id, location.id),
      });
    }
  }
  for (const work of MAJOR_CIVIL_ENGINEERING_WORKS) {
    targets.push({
      category: "civil",
      id: work.id,
      key: catalogEntryKey("civil", work.id),
    });
  }

  return targets;
}

export function getCatalogEntryCountByCategory(): Record<
  PhotoMarkerCategory,
  { total: number; withUrl: number }
> {
  const catalog = getMapMarkerThumbnailCatalog();
  const out: Record<PhotoMarkerCategory, { total: number; withUrl: number }> = {
    capital: { total: 0, withUrl: 0 },
    tourist: { total: 0, withUrl: 0 },
    unesco: { total: 0, withUrl: 0 },
    ehl: { total: 0, withUrl: 0 },
    civil: { total: 0, withUrl: 0 },
  };
  for (const entry of Object.values(catalog.entries ?? {})) {
    const category =
      entry.entityType === "tourist_place"
        ? "tourist"
        : entry.entityType === "civil_engineering"
          ? "civil"
          : entry.entityType;
    out[category].total += 1;
    if (entry.thumbnailUrl || entry.originalUrl) out[category].withUrl += 1;
  }
  return out;
}

void EUROPEAN_HERITAGE_LABEL_SITES.length;
void UNESCO_WORLD_HERITAGE_SITES.length;
