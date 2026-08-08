import { EU_CAPITALS } from "@/lib/europe/euCapitals";
import {
  markerThumbnailFromResolvedImage,
  emptyMarkerThumbnail,
  markerThumbnailKey,
  type MapMarkerThumbnail,
  type MarkerThumbnailRequest,
  type PhotoMarkerCategory,
} from "@/lib/map/mapMarkerThumbnail";
import type { Locale } from "@/lib/i18n/config";
import {
  resolveEntityEnrichment,
  resolvePrimaryMarkerImage,
  type ExpectedEntity,
} from "@/lib/enrichment/wikimediaEntityResolver";
import { MAJOR_TOURIST_PLACES } from "@/lib/tourism/majorTouristPlaces";
import {
  EUROPEAN_HERITAGE_LABEL_SITES,
  getEuropeanHeritageLabelLocationById,
  getEuropeanHeritageLabelSiteById,
} from "@/lib/tourism/europeanHeritageLabel";
import { getUnescoSiteById } from "@/lib/tourism/unescoWorldHeritage";
import { MAJOR_CIVIL_ENGINEERING_WORKS } from "@/lib/tourism/majorCivilEngineeringWorks";

export type { MarkerThumbnailRequest };
export { markerThumbnailKey };

export type MarkerThumbnailResult = MarkerThumbnailRequest & {
  key: string;
  thumbnail: MapMarkerThumbnail;
};

const memoryCache = new Map<
  string,
  { expiresAt: number; value: MapMarkerThumbnail }
>();
const CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_BATCH = 40;

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

function expectedForRequest(
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

async function resolveOne(
  request: MarkerThumbnailRequest,
  locale: Locale,
  signal?: AbortSignal,
): Promise<MapMarkerThumbnail> {
  const key = markerThumbnailKey(
    request.category,
    request.id,
    request.locationId,
  );
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }
  const expected = expectedForRequest(request);
  if (!expected) {
    const empty = emptyMarkerThumbnail();
    memoryCache.set(key, { expiresAt: Date.now() + 60_000, value: empty });
    return empty;
  }
  try {
    if (expected.wikidataId) {
      const primary = await resolvePrimaryMarkerImage(
        expected.wikidataId,
        signal,
      );
      if (primary) {
        const value = markerThumbnailFromResolvedImage(primary);
        memoryCache.set(key, { expiresAt: Date.now() + CACHE_MS, value });
        return value;
      }
    }
    const enrichment = await resolveEntityEnrichment(
      expected,
      locale,
      signal,
      1,
    );
    const image = enrichment.images[0];
    const value = image
      ? markerThumbnailFromResolvedImage(image)
      : emptyMarkerThumbnail();
    memoryCache.set(key, {
      expiresAt: Date.now() + (value.url ? CACHE_MS : 60_000),
      value,
    });
    return value;
  } catch {
    return emptyMarkerThumbnail();
  }
}

export async function resolveMarkerThumbnails(
  requests: MarkerThumbnailRequest[],
  locale: Locale,
  signal?: AbortSignal,
): Promise<MarkerThumbnailResult[]> {
  const limited = requests.slice(0, MAX_BATCH);
  const results: MarkerThumbnailResult[] = [];
  const concurrency = 2;
  let index = 0;

  async function worker() {
    while (index < limited.length) {
      const current = limited[index];
      index += 1;
      if (!current) continue;
      let thumbnail = await resolveOne(current, locale, signal);
      if (!thumbnail.url) {
        // One retry helps when Wikimedia rate-limits the first attempt.
        thumbnail = await resolveOne(current, locale, signal);
      }
      results.push({
        ...current,
        key: markerThumbnailKey(
          current.category,
          current.id,
          current.locationId,
        ),
        thumbnail,
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, limited.length) }, () =>
      worker(),
    ),
  );
  return results;
}

// Keep datasets referenced so tree-shaking does not drop lookups used only via APIs.
void EUROPEAN_HERITAGE_LABEL_SITES.length;
