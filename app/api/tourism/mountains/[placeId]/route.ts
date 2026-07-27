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
  fetchCommonsImagesForSearch,
  fetchWikidataWikipediaUrl,
  withTimeoutSignal,
} from "@/lib/transport/transportMedia";

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
  const signal = withTimeoutSignal(request.signal);
  let description: string | null = null;
  let wikipediaUrl: string | null = null;
  let images: EuropeanMountainPlaceDetails["images"] = [];
  const warnings: string[] = [];

  try {
    [images, wikipediaUrl] = await Promise.all([
      fetchCommonsImagesForSearch(
        [
          `${place.canonicalName} ${place.mountainRange ?? ""}`.trim(),
          place.canonicalName,
          place.aliases[0] ?? place.canonicalName,
        ],
        signal,
        5,
      ),
      place.wikidataId
        ? fetchWikidataWikipediaUrl(place.wikidataId, locale, signal)
        : Promise.resolve(null),
    ]);
  } catch {
    warnings.push(t.detailsUnavailable);
  }

  if (wikipediaUrl) {
    try {
      const encodedTitle = wikipediaUrl.split("/wiki/")[1]?.split(/[?#]/)[0];
      const language = wikipediaUrl.split("://")[1]?.split(".")[0] ?? "en";
      if (encodedTitle) {
        const response = await fetch(
          `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(decodeURIComponent(encodedTitle))}`,
          {
            headers: { Accept: "application/json", "User-Agent": "EUInteractiveMap/0.1" },
            signal,
            next: { revalidate: 86_400 },
          },
        );
        if (response.ok) {
          const summary = (await response.json()) as { extract?: string };
          description = summary.extract?.trim().slice(0, 900) ?? null;
        }
      }
    } catch {
      warnings.push(t.presentationUnavailable);
    }
  }

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
  };

  return Response.json(details, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
