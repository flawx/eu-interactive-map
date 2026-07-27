import { getEuropeanHeritageLabelSiteById } from "@/lib/tourism/europeanHeritageLabel";
import type {
  EuropeanHeritageLabelDetails,
  EuropeanHeritageLabelImage,
  EuropeanHeritageLabelSource,
} from "@/lib/tourism/europeanHeritageLabelDetails";
import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

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

/**
 * Loose keyword heuristic used to decide whether a Wikipedia extract
 * genuinely discusses the site's European significance / the European
 * Heritage Label itself, rather than just being a generic description.
 * We never fabricate this field from the site name alone.
 */
const EUROPEAN_SIGNIFICANCE_MARKERS = [
  "european heritage label",
  "european significance",
  "european integration",
  "european identity",
  "european history",
  "european union",
  "symbol of europe",
  "european ideal",
  "european values",
  "history of europe",
  "european unification",
  "construction of europe",
  "european citizenship",
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

/**
 * Returns a truncated excerpt of the extract only when it actually mentions
 * European significance / the Label itself — otherwise null. Never invented
 * from the site name.
 */
function extractEuropeanSignificance(extract: string | null): string | null {
  if (!extract) return null;
  const normalized = extract.toLowerCase();
  const mentioned = EUROPEAN_SIGNIFICANCE_MARKERS.some((marker) =>
    normalized.includes(marker),
  );
  if (!mentioned) return null;
  return truncateDescription(extract, 600);
}

function buildLocalDetails(
  site: ReturnType<typeof getEuropeanHeritageLabelSiteById>,
  locale: Locale,
): EuropeanHeritageLabelDetails {
  if (!site) {
    throw new Error("Unknown European Heritage Label site");
  }
  const t = getMessages(locale).ehlPanel;
  return {
    siteId: site.id,
    name: site.canonicalName,
    awardYear: site.awardYear,
    countryCodes: [...site.countryCodes],
    transnational: site.transnational,
    serial: site.serial,
    europeanSignificance: null,
    description: null,
    wikipediaUrl: null,
    images: [],
    sources: [
      { label: t.dataCommission, url: site.officialCommissionUrl },
    ],
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchWikipediaSummary(
  lang: string,
  title: string,
): Promise<{
  extract: string | null;
  wikipediaUrl: string | null;
  image: EuropeanHeritageLabelImage | null;
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

    let image: EuropeanHeritageLabelImage | null = null;
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
): Promise<EuropeanHeritageLabelImage[]> {
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

    const uniquePhotos: EuropeanHeritageLabelImage[] = [];

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
  const site = getEuropeanHeritageLabelSiteById(siteId);
  if (!site) {
    return Response.json(
      { error: "Unknown European Heritage Label site" },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const t = getMessages(locale).ehlPanel;
  const details = buildLocalDetails(site, locale);

  const wikiTitle = site.canonicalName.replace(/ /g, "_");
  const wikiLang = supportedLocales.includes(locale) ? locale : "en";

  try {
    const [wikiPrimary, wikiEn, photosPrimary, photosEn] = await Promise.all([
      fetchWikipediaSummary(wikiLang, wikiTitle),
      wikiLang === "en"
        ? Promise.resolve({
            extract: null,
            wikipediaUrl: null,
            image: null,
          })
        : fetchWikipediaSummary("en", wikiTitle),
      fetchWikipediaPhotos(wikiLang, wikiTitle),
      wikiLang === "en" ? Promise.resolve([]) : fetchWikipediaPhotos("en", wikiTitle),
    ]);

    details.description =
      (wikiPrimary.extract ? truncateDescription(wikiPrimary.extract) : null) ??
      (wikiEn.extract ? truncateDescription(wikiEn.extract) : null);

    details.europeanSignificance =
      extractEuropeanSignificance(wikiPrimary.extract) ??
      extractEuropeanSignificance(wikiEn.extract);

    const images: EuropeanHeritageLabelImage[] = [];
    for (const photo of [...photosPrimary, ...photosEn]) {
      if (images.some((item) => item.url === photo.url)) continue;
      images.push(photo);
      if (images.length >= 5) break;
    }
    if (images.length === 0) {
      const fallback = wikiPrimary.image ?? wikiEn.image;
      if (fallback) images.push(fallback);
    }
    details.images = images;

    const wikipediaUrl = wikiPrimary.wikipediaUrl ?? wikiEn.wikipediaUrl;
    details.wikipediaUrl = wikipediaUrl;

    const sources: EuropeanHeritageLabelSource[] = [
      { label: t.dataCommission, url: site.officialCommissionUrl },
    ];
    if (wikipediaUrl) {
      sources.push({ label: t.wikipedia, url: wikipediaUrl });
    }
    if (images.some((image) => image.sourceUrl?.includes("commons"))) {
      sources.push({
        label: "Wikimedia Commons",
        url: "https://commons.wikimedia.org/",
      });
    }
    details.sources = sources;
  } catch {
    // Keep local fallback.
  }

  return Response.json(details, {
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
