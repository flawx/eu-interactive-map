import {
  getMajorTouristPlaceById,
} from "@/lib/tourism/majorTouristPlaces";
import type { TouristPlaceDetails } from "@/lib/tourism/touristPlaceDetails";
import { getUnescoSiteById } from "@/lib/tourism/unescoWorldHeritage";
import {
  ENTITY_RESOLVER_VERSION,
  resolveEntityEnrichment,
} from "@/lib/enrichment/wikimediaEntityResolver";
import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

const CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";

function resolveLocale(requested: string | null): Locale {
  return (
    supportedLocales.find((locale) => locale === requested) ?? defaultLocale
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await context.params;
  const place = getMajorTouristPlaceById(placeId);
  if (!place) {
    return Response.json({ error: "Tourist place not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const t = getMessages(locale).touristPlacePanel;
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(10_000),
  ]);

  const enrichment = await resolveEntityEnrichment(
    {
      wikidataId: place.wikidataId,
      canonicalName: place.canonicalName,
      aliases: place.aliases,
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      expectedTypes: [place.category],
      wikipediaTitles: place.wikipediaTitles,
      searchContext: `${place.category.replaceAll("_", " ")} ${place.cityOrRegion} ${place.countryCode}`,
      distanceThresholdKm:
        place.category === "natural_landscape" ? 150 : 60,
    },
    locale,
    signal,
    5,
  );
  const description = enrichment.entity?.extract ?? null;
  const wikipediaUrl = enrichment.entity?.pageUrl ?? null;
  const images = enrichment.images;

  const unescoSite = place.unescoSiteId
    ? getUnescoSiteById(place.unescoSiteId)
    : undefined;

  const details: TouristPlaceDetails = {
    placeId: place.id,
    name: place.canonicalName,
    cityOrRegion: place.cityOrRegion,
    countryCode: place.countryCode,
    category: place.category,
    description,
    officialWebsite: place.officialWebsite,
    tourismWebsite: place.tourismWebsite,
    unescoSiteId: place.unescoSiteId,
    unescoOfficialUrl: unescoSite?.officialUrl ?? null,
    wikipediaUrl,
    images,
    sources: [
      ...(place.officialWebsite
        ? [{ label: t.sourceOfficial, url: place.officialWebsite }]
        : []),
      ...(place.tourismWebsite
        ? [{ label: t.sourceTourism, url: place.tourismWebsite }]
        : []),
      ...(unescoSite
        ? [{ label: t.sourceUnesco, url: unescoSite.officialUrl }]
        : []),
      ...(wikipediaUrl
        ? [{ label: t.sourceWikipedia, url: wikipediaUrl }]
        : []),
      {
        label: t.sourceCommons,
        url: "https://commons.wikimedia.org/",
      },
    ],
    fetchedAt: new Date().toISOString(),
    partial: description === null || images.length === 0,
    warnings: enrichment.warnings,
    verified: enrichment.entity?.verified ?? false,
    resolvedWikidataId: enrichment.entity?.wikidataId ?? null,
    resolverVersion: enrichment.resolverVersion,
  };

  return Response.json(details, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "X-Entity-Resolver-Version": ENTITY_RESOLVER_VERSION,
    },
  });
}
