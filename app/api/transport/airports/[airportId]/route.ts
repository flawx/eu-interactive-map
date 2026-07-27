import {
  getEuropeanAirportById,
  EUROCONTROL_SNAPSHOT_58,
} from "@/lib/transport/europeanAirports";
import type { EuropeanAirportDetails } from "@/lib/transport/transportDetails";
import {
  ENTITY_RESOLVER_VERSION,
  resolveEntityEnrichment,
} from "@/lib/enrichment/wikimediaEntityResolver";
import {
  fetchWikidataOpenedYear,
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
  context: { params: Promise<{ airportId: string }> },
) {
  const { airportId } = await context.params;
  const airport = getEuropeanAirportById(airportId);
  if (!airport) {
    return Response.json({ error: "Airport not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const t = getMessages(locale).airportPanel;
  const signal = withTimeoutSignal(request.signal);

  let openedYear: number | null = null;
  const enrichment = await resolveEntityEnrichment(
    {
      wikidataId: airport.wikidataId,
      canonicalName: airport.name,
      aliases: [airport.iataCode ?? "", airport.icaoCode],
      countryCode: airport.countryCode,
      latitude: airport.latitude,
      longitude: airport.longitude,
      expectedTypes: ["airport"],
      searchContext: `airport ${airport.city} ${airport.countryCode}`,
      distanceThresholdKm: 25,
    },
    locale,
    signal,
    5,
  );
  const description = enrichment.entity?.extract ?? null;
  const wikipediaUrl = enrichment.entity?.pageUrl ?? null;
  const images = enrichment.images;

  if (airport.wikidataId) {
    openedYear = await fetchWikidataOpenedYear(airport.wikidataId, signal);
  }

  const details: EuropeanAirportDetails = {
    airportId: airport.id,
    name: airport.name,
    city: airport.city,
    countryCode: airport.countryCode,
    iataCode: airport.iataCode,
    icaoCode: airport.icaoCode,
    rank2025: airport.rank2025,
    description,
    openedYear,
    officialWebsite: airport.officialWebsite,
    operatorName: null,
    terminals: null,
    groundTransportSummary: null,
    wikipediaUrl,
    images,
    sources: [
      {
        label: t.sourceEurocontrol,
        url: EUROCONTROL_SNAPSHOT_58.publicationUrl,
      },
      ...(airport.officialWebsite
        ? [{ label: t.sourceOfficial, url: airport.officialWebsite }]
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
