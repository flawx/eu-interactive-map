import {
  getEuropeanAirportById,
  EUROCONTROL_SNAPSHOT_58,
} from "@/lib/transport/europeanAirports";
import type { EuropeanAirportDetails } from "@/lib/transport/transportDetails";
import {
  fetchCommonsImagesForSearch,
  fetchWikidataOpenedYear,
  fetchWikidataWikipediaUrl,
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

  let description: string | null = null;
  let wikipediaUrl: string | null = null;
  let openedYear: number | null = null;
  let images = await fetchCommonsImagesForSearch(
    [
      `${airport.name} airport terminal`,
      `${airport.iataCode ?? airport.icaoCode} airport`,
      `${airport.city} airport`,
    ],
    signal,
    5,
  );

  if (airport.wikidataId) {
    wikipediaUrl = await fetchWikidataWikipediaUrl(
      airport.wikidataId,
      locale,
      signal,
    );
    openedYear = await fetchWikidataOpenedYear(airport.wikidataId, signal);
  }

  if (wikipediaUrl) {
    try {
      const page = wikipediaUrl.split("/wiki/")[1];
      if (page) {
        const lang = wikipediaUrl.includes("://")
          ? wikipediaUrl.split("://")[1]?.split(".")[0] ?? "en"
          : "en";
        const summaryRes = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${page}`,
          {
            headers: {
              Accept: "application/json",
              "User-Agent": "EUInteractiveMap/0.1",
            },
            signal,
            next: { revalidate: 86_400 },
          },
        );
        if (summaryRes.ok) {
          const summary = (await summaryRes.json()) as { extract?: string };
          if (summary.extract?.trim()) {
            description = summary.extract.trim().slice(0, 900);
          }
        }
      }
    } catch {
      // keep local-only details
    }
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
  };

  return Response.json(details, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
