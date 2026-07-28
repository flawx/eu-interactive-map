import {
  getEuropeanHeritageLabelSiteById,
  type EuropeanHeritageLabelLocation,
} from "@/lib/tourism/europeanHeritageLabel";
import type {
  EuropeanHeritageLabelDetails,
  EuropeanHeritageLabelImage,
  EuropeanHeritageLabelSource,
} from "@/lib/tourism/europeanHeritageLabelDetails";
import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  ENTITY_RESOLVER_VERSION,
  resolveEntityEnrichment,
  type ResolvedEntityEnrichment,
} from "@/lib/enrichment/wikimediaEntityResolver";

const CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

function resolveLocale(requested: string | null): Locale {
  return (
    supportedLocales.find((locale) => locale === requested) ?? defaultLocale
  );
}

function truncate(value: string | null, max = 900): string | null {
  if (!value) return null;
  return value.length <= max
    ? value
    : `${value.slice(0, max).trim()}…`;
}

function expectedLocation(location: EuropeanHeritageLabelLocation) {
  return {
    wikidataId: location.wikidataId,
    canonicalName: location.name,
    aliases: [location.cityOrRegion],
    countryCode: location.countryCode,
    latitude: location.latitude,
    longitude: location.longitude,
    expectedTypes: ["historic_area"],
    distanceThresholdKm: 10,
  };
}

function locationImages(
  enrichment: ResolvedEntityEnrichment,
  location: EuropeanHeritageLabelLocation,
): EuropeanHeritageLabelImage[] {
  return enrichment.images.map((image) => ({
    ...image,
    representedLocationId: location.id,
    representedLocationName: location.name,
  }));
}

export async function GET(
  request: Request,
  context: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await context.params;
  const site = getEuropeanHeritageLabelSiteById(siteId);
  if (!site) {
    return Response.json(
      { error: "Unknown European Heritage Label site" },
      { status: 404 },
    );
  }

  const locale = resolveLocale(new URL(request.url).searchParams.get("locale"));
  const t = getMessages(locale).ehlPanel;
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(15_000),
  ]);
  const sources: EuropeanHeritageLabelSource[] = [
    { label: t.dataCommission, url: site.officialCommissionUrl },
  ];
  if (site.officialWebsite) {
    sources.push({ label: t.officialWebsite, url: site.officialWebsite });
  }

  const locationDetails: EuropeanHeritageLabelDetails["locations"] =
    site.locations.map((location) => ({
      locationId: location.id,
      name: location.name,
      countryCode: location.countryCode,
      cityOrRegion: location.cityOrRegion,
      description: null,
      wikipediaUrl: null,
      officialUrl: location.officialUrl,
    }));
  const images: EuropeanHeritageLabelImage[] = [];
  let description: string | null = null;
  let wikipediaUrl: string | null = null;

  try {
    if (site.entityIdentityType === "single-entity" && site.wikidataId) {
      const location = site.locations[0];
      const enrichment = await resolveEntityEnrichment(
        {
          ...expectedLocation(location),
          wikidataId: site.wikidataId,
          canonicalName: location.name,
        },
        locale,
        signal,
        5,
      );
      description = truncate(enrichment.entity?.extract ?? null);
      wikipediaUrl = enrichment.entity?.pageUrl ?? null;
      images.push(...locationImages(enrichment, location));
      locationDetails[0].description = description;
      locationDetails[0].wikipediaUrl = wikipediaUrl;
    } else {
      const enrichableLocations = site.locations
        .filter((location) => location.wikidataId)
        .slice(0, 5);
      for (const location of enrichableLocations) {
        if (signal.aborted) break;
        const enrichment = await resolveEntityEnrichment(
          expectedLocation(location),
          locale,
          signal,
          1,
        );
        const detail = locationDetails.find(
          (item) => item.locationId === location.id,
        );
        if (detail) {
          detail.description = truncate(enrichment.entity?.extract ?? null, 500);
          detail.wikipediaUrl = enrichment.entity?.pageUrl ?? null;
        }
        images.push(...locationImages(enrichment, location));
      }
    }
  } catch {
    // Official local data remains available when Wikimedia is unavailable.
  }

  if (wikipediaUrl) {
    sources.push({ label: t.wikipedia, url: wikipediaUrl });
  }
  if (images.some((image) => image.sourceUrl?.includes("commons.wikimedia"))) {
    sources.push({
      label: "Wikimedia Commons",
      url: "https://commons.wikimedia.org/",
    });
  }

  const details: EuropeanHeritageLabelDetails = {
    siteId: site.id,
    name: site.canonicalName,
    awardYear: site.awardYear,
    countryCodes: [...site.countryCodes],
    transnational: site.transnational,
    serial: site.serial,
    entityIdentityType: site.entityIdentityType,
    europeanSignificance: site.officialSummary,
    description,
    wikipediaUrl,
    images,
    locations: locationDetails,
    sources,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(details, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "X-Entity-Resolver-Version": ENTITY_RESOLVER_VERSION,
    },
  });
}
