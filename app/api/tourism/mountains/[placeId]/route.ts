import { getMessages } from "@/lib/i18n/messages";
import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";
import {
  getEuropeanMountainPlaceById,
} from "@/lib/tourism/europeanMountainDestinations";
import type { EuropeanMountainPlaceDetails } from "@/lib/tourism/europeanMountainPlaceDetails";
import {
  ENTITY_RESOLVER_VERSION,
  resolveEntityEnrichment,
} from "@/lib/enrichment/wikimediaEntityResolver";

const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

function resolveLocale(value: string | null): Locale {
  return supportedLocales.find((locale) => locale === value) ?? defaultLocale;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId } = await context.params;
  const place = getEuropeanMountainPlaceById(placeId);
  if (!place) {
    return Response.json({ error: "Mountain place not found" }, { status: 404 });
  }

  const locale = resolveLocale(new URL(request.url).searchParams.get("locale"));
  const t = getMessages(locale).mountainPanel;
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(10_000),
  ]);
  const enrichment = await resolveEntityEnrichment(
    {
      wikidataId: place.wikidataId,
      canonicalName: place.canonicalName,
      aliases: place.aliases,
      countryCode: place.countryCodes[0] ?? null,
      latitude: place.latitude,
      longitude: place.longitude,
      expectedTypes: [place.category],
      searchContext: `${place.category.replaceAll("_", " ")} ${place.countryCodes.join(" ")}`,
      distanceThresholdKm: place.category === "mountain_range" ? 150 : 60,
    },
    locale,
    signal,
    5,
  );
  const description = enrichment.entity?.extract ?? null;
  const wikipediaUrl = enrichment.entity?.pageUrl ?? null;
  const images: EuropeanMountainPlaceDetails["images"] = enrichment.images;
  const warnings = [...enrichment.warnings];

  const sources = [
    ...(place.officialWebsite
      ? [{ label: t.sourceOfficial, url: place.officialWebsite }]
      : []),
    ...(place.tourismWebsite
      ? [{ label: t.sourceTourism, url: place.tourismWebsite }]
      : []),
    ...(wikipediaUrl
      ? [{ label: t.sourceWikipedia, url: wikipediaUrl }]
      : []),
    { label: t.sourceCommons, url: "https://commons.wikimedia.org/" },
  ];

  const details: EuropeanMountainPlaceDetails = {
    placeId: place.id,
    name: place.canonicalName,
    nativeName: place.nativeName,
    category: place.category,
    countryCodes: [...place.countryCodes],
    cityOrRegion: place.cityOrRegion,
    description,
    historySummary: null,
    mountainRange: place.mountainRange,
    seasonalOperation: place.seasonalOperation,
    summitElevationMeters: place.summitElevationMeters,
    resortBaseElevationMeters: place.resortBaseElevationMeters,
    resortTopElevationMeters: place.resortTopElevationMeters,
    officialWebsite: place.officialWebsite,
    tourismWebsite: place.tourismWebsite,
    snowReportUrl: place.snowReportUrl,
    liftStatusUrl: place.liftStatusUrl,
    practicalInformation: {
      officialSeasonInformation: null,
      accessSummary: null,
      accessibilityInformation: null,
    },
    images,
    sources,
    fetchedAt: new Date().toISOString(),
    partial: description === null || images.length === 0,
    warnings,
    verified: enrichment.entity?.verified ?? false,
    resolvedWikidataId: enrichment.entity?.wikidataId ?? null,
    wikipediaUrl,
    resolverVersion: enrichment.resolverVersion,
  };

  return Response.json(details, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "X-Entity-Resolver-Version": ENTITY_RESOLVER_VERSION,
    },
  });
}
