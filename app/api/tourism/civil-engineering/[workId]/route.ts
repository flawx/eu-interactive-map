import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  ENTITY_RESOLVER_VERSION,
  resolveEntityEnrichment,
} from "@/lib/enrichment/wikimediaEntityResolver";
import {
  getMajorCivilEngineeringWorkById,
} from "@/lib/tourism/majorCivilEngineeringWorks";
import type { CivilEngineeringWorkDetails } from "@/lib/tourism/majorCivilEngineeringWorkDetails";

const CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";

function resolveLocale(value: string | null): Locale {
  return supportedLocales.find((locale) => locale === value) ?? defaultLocale;
}

function wikipediaTitle(url: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = "/wiki/";
    const index = parsed.pathname.indexOf(marker);
    return index >= 0
      ? decodeURIComponent(parsed.pathname.slice(index + marker.length))
          .replaceAll("_", " ")
      : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ workId: string }> },
) {
  const { workId } = await context.params;
  const item = getMajorCivilEngineeringWorkById(workId);
  if (!item) {
    return Response.json(
      { error: "Civil engineering work not found" },
      { status: 404 },
    );
  }

  const locale = resolveLocale(new URL(request.url).searchParams.get("locale"));
  const t = getMessages(locale).civilEngineeringPanel;
  const title = wikipediaTitle(item.wikipediaUrl);
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(10_000),
  ]);
  let enrichment: Awaited<ReturnType<typeof resolveEntityEnrichment>> | null =
    null;
  try {
    enrichment = await resolveEntityEnrichment(
      {
        wikidataId: item.wikidataId,
        canonicalName: item.name,
        aliases: item.aliases,
        countryCode:
          item.countryCodes.length === 1 ? item.countryCodes[0] : null,
        latitude: item.latitude,
        longitude: item.longitude,
        wikipediaTitles: title ? { en: title } : undefined,
        searchContext: `${item.category.replaceAll("_", " ")} ${item.countryCodes.join(" ")}`,
        distanceThresholdKm: item.category === "dam" ? 25 : 15,
      },
      locale,
      signal,
      5,
    );
  } catch {
    enrichment = null;
  }

  const verifiedEntity = enrichment?.entity?.verified
    ? enrichment.entity
    : null;
  const images = enrichment?.images ?? [];
  const sources = [
    ...(item.officialUrl
      ? [{ label: t.sourceOfficial, url: item.officialUrl }]
      : []),
    ...(verifiedEntity?.pageUrl
      ? [{ label: t.sourceWikipedia, url: verifiedEntity.pageUrl }]
      : []),
    ...(images.length
      ? [{ label: t.sourceCommons, url: "https://commons.wikimedia.org/" }]
      : []),
  ];

  const details: CivilEngineeringWorkDetails = {
    workId: item.id,
    name: item.name,
    category: item.category,
    status: item.status,
    countryCodes: [...item.countryCodes],
    regionOrCity: item.regionOrCity,
    summary: item.summary,
    description: verifiedEntity?.extract ?? null,
    openingYear: item.openingYear,
    lengthMeters: item.lengthMeters,
    heightMeters: item.heightMeters,
    mainSpanMeters: item.mainSpanMeters,
    depthMeters: item.depthMeters,
    carries: item.carries,
    officialUrl: item.officialUrl,
    wikipediaUrl: verifiedEntity?.pageUrl ?? null,
    images,
    sources,
    verified: Boolean(verifiedEntity),
    resolvedWikidataId: verifiedEntity?.wikidataId ?? null,
    partial: !verifiedEntity || images.length === 0,
    warnings: enrichment?.warnings ?? ["entity_enrichment_unavailable"],
    fetchedAt: new Date().toISOString(),
    resolverVersion: enrichment?.resolverVersion ?? ENTITY_RESOLVER_VERSION,
  };

  return Response.json(details, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "X-Entity-Resolver-Version": ENTITY_RESOLVER_VERSION,
    },
  });
}
