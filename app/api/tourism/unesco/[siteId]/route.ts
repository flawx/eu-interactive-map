import {
  getUnescoSiteById,
  type UnescoWorldHeritageSite,
} from "@/lib/tourism/unescoWorldHeritage";
import type {
  UnescoSiteDetails,
  UnescoSiteImage,
  UnescoSiteSource,
} from "@/lib/tourism/unescoSiteDetails";
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

const USER_AGENT =
  "EUInteractiveMap/0.1 (educational; contact: local-dev)";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";
const REVALIDATE_SECONDS = 86_400;

const PHOTO_EXCLUSION_TERMS = [
  "flag",
  "coat of arms",
  "coat_of_arms",
  "emblem",
  "logo",
  "locator",
  "location map",
  "blank map",
  "icon",
  "signature",
  "symbol",
  "map.svg",
  "diagram",
  "portrait",
] as const;

function resolveLocale(requested: string | null): Locale {
  return (
    supportedLocales.find((locale) => locale === requested) ?? defaultLocale
  );
}

function isAllowedWikipediaLang(lang: string): boolean {
  return lang === "en" || supportedLocales.includes(lang as Locale);
}

function stripHtml(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function metadataValue(
  extmetadata: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!extmetadata || !(key in extmetadata)) return null;
  const entry = extmetadata[key];
  if (!entry || typeof entry !== "object" || !("value" in entry)) return null;
  return stripHtml(entry.value);
}

function truncateDescription(value: string, max = 900): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trim()}…`;
}

function buildLocalDetails(
  site: UnescoWorldHeritageSite,
  locale: Locale,
): UnescoSiteDetails {
  const t = getMessages(locale).unescoPanel;
  return {
    siteId: site.id,
    unescoId: site.unescoId,
    name: site.canonicalName,
    originalName: site.canonicalName,
    description: site.shortDescription
      ? truncateDescription(site.shortDescription)
      : null,
    countryCodes: [...site.countryCodes],
    category: site.category,
    inscriptionYear: site.inscriptionYear,
    extensionYears: [...site.extensionYears],
    criteria: [...site.criteria],
    areaHectares: site.areaHectares,
    bufferZoneHectares: site.bufferZoneHectares,
    dangerStatus: site.dangerStatus,
    dangerYears: [...site.dangerYears],
    transboundary: site.transboundary,
    serial: site.serial,
    officialUrl: site.officialUrl,
    wikipediaUrl: null,
    location: site.location,
    images: [],
    sources: [
      { label: t.sourceUnesco, url: site.officialUrl },
    ],
    fetchedAt: new Date().toISOString(),
    importedAt: site.importedAt,
  };
}

async function fetchWikipediaSummary(
  lang: string,
  title: string,
): Promise<{
  extract: string | null;
  wikipediaUrl: string | null;
  image: UnescoSiteImage | null;
}> {
  const empty = { extract: null, wikipediaUrl: null, image: null };
  if (!isAllowedWikipediaLang(lang)) return empty;

  try {
    const response = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS },
      },
    );
    if (!response.ok) return empty;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return empty;

    const extract =
      "extract" in data &&
      typeof data.extract === "string" &&
      data.extract.trim()
        ? data.extract.trim()
        : null;

    const desktopPage =
      "content_urls" in data &&
      data.content_urls &&
      typeof data.content_urls === "object" &&
      "desktop" in data.content_urls &&
      data.content_urls.desktop &&
      typeof data.content_urls.desktop === "object" &&
      "page" in data.content_urls.desktop &&
      typeof data.content_urls.desktop.page === "string"
        ? data.content_urls.desktop.page
        : null;

    const wikipediaUrl =
      desktopPage?.startsWith(`https://${lang}.wikipedia.org/`)
        ? desktopPage
        : `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`;

    let image: UnescoSiteImage | null = null;
    const original =
      "originalimage" in data &&
      data.originalimage &&
      typeof data.originalimage === "object"
        ? data.originalimage
        : null;
    const thumbnail =
      "thumbnail" in data &&
      data.thumbnail &&
      typeof data.thumbnail === "object"
        ? data.thumbnail
        : null;
    const imageSource = original ?? thumbnail;
    if (
      imageSource &&
      "source" in imageSource &&
      typeof imageSource.source === "string" &&
      imageSource.source.startsWith("https://")
    ) {
      image = {
        url: imageSource.source,
        thumbnailUrl:
          thumbnail &&
          "source" in thumbnail &&
          typeof thumbnail.source === "string"
            ? thumbnail.source
            : null,
        width:
          "width" in imageSource && typeof imageSource.width === "number"
            ? imageSource.width
            : null,
        height:
          "height" in imageSource && typeof imageSource.height === "number"
            ? imageSource.height
            : null,
        title: null,
        author: null,
        license: null,
        licenseUrl: null,
        sourceUrl: wikipediaUrl,
      };
    }

    return { extract, wikipediaUrl, image };
  } catch {
    return empty;
  }
}

async function fetchWikipediaPhotos(
  lang: string,
  title: string,
): Promise<UnescoSiteImage[]> {
  if (!isAllowedWikipediaLang(lang)) return [];

  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "images",
      titles: title,
      gimlimit: "40",
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: "1200",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
      origin: "*",
    });

    const response = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?${params.toString()}`,
      {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS },
      },
    );
    if (!response.ok) return [];

    const photosData: unknown = await response.json();
    if (
      !photosData ||
      typeof photosData !== "object" ||
      !("query" in photosData) ||
      !photosData.query ||
      typeof photosData.query !== "object" ||
      !("pages" in photosData.query) ||
      !Array.isArray(photosData.query.pages)
    ) {
      return [];
    }

    const uniquePhotos: UnescoSiteImage[] = [];

    for (const page of photosData.query.pages) {
      if (!page || typeof page !== "object") continue;
      const pageTitle =
        "title" in page && typeof page.title === "string" ? page.title : null;
      if (!pageTitle) continue;
      const normalizedTitle = pageTitle.toLowerCase();
      if (
        PHOTO_EXCLUSION_TERMS.some((term) => normalizedTitle.includes(term))
      ) {
        continue;
      }

      const imageInfo =
        "imageinfo" in page && Array.isArray(page.imageinfo)
          ? page.imageinfo[0]
          : null;
      if (!imageInfo || typeof imageInfo !== "object") continue;

      const mime =
        "mime" in imageInfo && typeof imageInfo.mime === "string"
          ? imageInfo.mime
          : null;
      if (
        mime !== "image/jpeg" &&
        mime !== "image/png" &&
        mime !== "image/webp"
      ) {
        continue;
      }

      const thumburl =
        "thumburl" in imageInfo && typeof imageInfo.thumburl === "string"
          ? imageInfo.thumburl
          : null;
      const url =
        "url" in imageInfo && typeof imageInfo.url === "string"
          ? imageInfo.url
          : null;
      const photoUrl = thumburl ?? url;
      if (!photoUrl?.startsWith("https://")) continue;
      if (uniquePhotos.some((photo) => photo.url === photoUrl)) continue;

      const extmetadata =
        "extmetadata" in imageInfo &&
        imageInfo.extmetadata &&
        typeof imageInfo.extmetadata === "object"
          ? (imageInfo.extmetadata as Record<string, unknown>)
          : null;

      const licenseUrlValue = metadataValue(extmetadata, "LicenseUrl");
      const license = metadataValue(extmetadata, "LicenseShortName");
      if (!license && !licenseUrlValue) continue;

      uniquePhotos.push({
        url: photoUrl,
        thumbnailUrl: thumburl,
        width:
          "width" in imageInfo && typeof imageInfo.width === "number"
            ? imageInfo.width
            : null,
        height:
          "height" in imageInfo && typeof imageInfo.height === "number"
            ? imageInfo.height
            : null,
        title: pageTitle.replace(/^File:/i, ""),
        author: metadataValue(extmetadata, "Artist"),
        license,
        licenseUrl: licenseUrlValue,
        sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(pageTitle)}`,
      });

      if (uniquePhotos.length >= 5) break;
    }

    return uniquePhotos;
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await context.params;
  const site = getUnescoSiteById(siteId);
  if (!site) {
    return Response.json({ error: "Unknown UNESCO site" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const t = getMessages(locale).unescoPanel;
  const details = buildLocalDetails(site, locale);

  try {
    const enrichment = await resolveEntityEnrichment(
      {
        wikidataId: null,
        canonicalName: site.canonicalName,
        aliases: [site.location ?? "", ...site.stateParties],
        countryCode: site.resolvedCountryCode ?? site.countryCodes[0] ?? null,
        latitude: site.latitude,
        longitude: site.longitude,
        expectedTypes: [
          site.category === "natural" ? "natural_landscape" : "historic_area",
        ],
        searchContext: `UNESCO World Heritage ${site.countryCodes.join(" ")}`,
        distanceThresholdKm: site.serial || site.transboundary ? 150 : 60,
      },
      locale,
      AbortSignal.timeout(FETCH_TIMEOUT_MS),
      5,
    );
    details.description =
      (site.shortDescription
        ? truncateDescription(site.shortDescription)
        : null) ??
      (enrichment.entity?.extract
        ? truncateDescription(enrichment.entity.extract)
        : null);
    details.images = enrichment.images;
    const wikipediaUrl = enrichment.entity?.pageUrl ?? null;
    details.wikipediaUrl = wikipediaUrl;

    const sources: UnescoSiteSource[] = [
      { label: t.sourceUnesco, url: site.officialUrl },
    ];
    if (wikipediaUrl) {
      sources.push({ label: t.sourceWikipedia, url: wikipediaUrl });
    }
    if (details.images.some((image) => image.sourceUrl?.includes("commons"))) {
      sources.push({
        label: t.sourceCommons,
        url: "https://commons.wikimedia.org/",
      });
    }
    details.sources = sources;
  } catch {
    // Keep local fallback.
  }

  return Response.json(details, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "X-Entity-Resolver-Version": ENTITY_RESOLVER_VERSION,
    },
  });
}
