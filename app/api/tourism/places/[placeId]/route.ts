import {
  getMajorTouristPlaceById,
} from "@/lib/tourism/majorTouristPlaces";
import type { TouristPlaceDetails } from "@/lib/tourism/touristPlaceDetails";
import { getUnescoSiteById } from "@/lib/tourism/unescoWorldHeritage";
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
  const signal = withTimeoutSignal(request.signal);

  let description: string | null = null;
  let wikipediaUrl: string | null = null;
  const images = await fetchCommonsImagesForSearch(
    [
      place.canonicalName,
      `${place.canonicalName} ${place.cityOrRegion}`,
      place.aliases[0] ?? place.canonicalName,
    ],
    signal,
    5,
  );

  wikipediaUrl = await fetchWikidataWikipediaUrl(
    place.wikidataId,
    locale,
    signal,
  );

  if (
    !wikipediaUrl &&
    place.wikipediaTitles?.[locale]
  ) {
    wikipediaUrl = `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(
      place.wikipediaTitles[locale]!,
    )}`;
  } else if (!wikipediaUrl && place.wikipediaTitles?.en) {
    wikipediaUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
      place.wikipediaTitles.en,
    )}`;
  }

  if (wikipediaUrl) {
    try {
      const pageEncoded = wikipediaUrl.split("/wiki/")[1]?.split(/[?#]/)[0];
      if (pageEncoded) {
        const lang = wikipediaUrl.includes("://")
          ? wikipediaUrl.split("://")[1]?.split(".")[0] ?? "en"
          : "en";
        const pageTitle = decodeURIComponent(pageEncoded);
        const summaryRes = await fetch(
          `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
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
  };

  return Response.json(details, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
