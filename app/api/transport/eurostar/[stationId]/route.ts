import {
  EUROSTAR_NETWORK_META,
  getDirectEurostarDestinations,
  getEurostarStationById,
} from "@/lib/transport/eurostarNetwork";
import type { EurostarStationDetails } from "@/lib/transport/transportDetails";
import {
  fetchCommonsImagesForSearch,
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

  let description: string | null = null;
  let wikipediaUrl: string | null = null;
  const images = await fetchCommonsImagesForSearch(
    [
      `${station.name} railway station`,
      `${station.city} train station`,
      `Eurostar ${station.city}`,
    ],
    signal,
    5,
  );

  if (station.wikidataId) {
    wikipediaUrl = await fetchWikidataWikipediaUrl(
      station.wikidataId,
      locale,
      signal,
    );
  }

  if (wikipediaUrl) {
    try {
      const page = wikipediaUrl.split("/wiki/")[1];
      if (page) {
        const lang = wikipediaUrl.split("://")[1]?.split(".")[0] ?? "en";
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
      // ignore
    }
  }

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
  };

  return Response.json(details, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
