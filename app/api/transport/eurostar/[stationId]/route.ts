import {
  EUROSTAR_NETWORK_META,
  getDirectEurostarDestinations,
  getEurostarStationById,
} from "@/lib/transport/eurostarNetwork";
import type { EurostarStationDetails } from "@/lib/transport/transportDetails";
import {
  ENTITY_RESOLVER_VERSION,
  resolveEntityEnrichment,
} from "@/lib/enrichment/wikimediaEntityResolver";
import {
  withTimeoutSignal,
} from "@/lib/transport/transportMedia";
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
  context: { params: Promise<{ stationId: string }> },
) {
  const { stationId } = await context.params;
  const station = getEurostarStationById(stationId);
  if (!station) {
    return Response.json({ error: "Station not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const t = getMessages(locale).eurostarPanel;
  const signal = withTimeoutSignal(request.signal);

  const enrichment = await resolveEntityEnrichment(
    {
      wikidataId: station.wikidataId,
      canonicalName: station.name,
      aliases: [station.city],
      countryCode: station.countryCode,
      latitude: station.latitude,
      longitude: station.longitude,
      expectedTypes: ["railway_station"],
      searchContext: `railway station ${station.city} ${station.countryCode}`,
      distanceThresholdKm: 25,
    },
    locale,
    signal,
    5,
  );
  const description = enrichment.entity?.extract ?? null;
  const wikipediaUrl = enrichment.entity?.pageUrl ?? null;
  const images = enrichment.images;

  const details: EurostarStationDetails = {
    stationId: station.id,
    name: station.name,
    city: station.city,
    countryCode: station.countryCode,
    description,
    officialUrl: station.officialUrl,
    stationWebsite: station.stationWebsite,
    serviceStatus: station.serviceStatus,
    wikipediaUrl,
    directDestinations: getDirectEurostarDestinations(station.id),
    recommendedArrivalInfo: null,
    borderControlInfo: null,
    accessibilityInfo: null,
    images,
    sources: [
      { label: t.sourceEurostar, url: station.officialUrl },
      {
        label: t.sourceRoutemap,
        url: EUROSTAR_NETWORK_META.routemapUrl,
      },
      ...(station.stationWebsite
        ? [{ label: t.sourceStation, url: station.stationWebsite }]
        : []),
      ...(wikipediaUrl
        ? [{ label: t.sourceWikipedia, url: wikipediaUrl }]
        : []),
      { label: t.sourceCommons, url: "https://commons.wikimedia.org/" },
    ],
    fetchedAt: new Date().toISOString(),
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
