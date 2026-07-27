import {
  getEuInstitutionById,
  isEuInstitutionId,
  type EuInstitution,
  type EuInstitutionId,
} from "@/lib/europe/euInstitutions";
import type {
  EuInstitutionDetails,
  EuInstitutionImage,
  EuInstitutionSource,
} from "@/lib/europe/euInstitutionDetails";
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
  "portrait",
  "president",
  "chair",
] as const;

const WIKIPEDIA_TITLES: Record<EuInstitutionId, string> = {
  "european-commission": "European_Commission",
  "european-council": "European_Council",
  "council-of-the-eu": "Council_of_the_European_Union",
  "european-parliament": "European_Parliament",
  "european-central-bank": "European_Central_Bank",
};

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

function roleSummaryFor(
  institutionId: EuInstitutionId,
  locale: Locale,
): string {
  const t = getMessages(locale).institutionPanel;
  switch (institutionId) {
    case "european-commission":
      return t.roleCommission;
    case "european-council":
      return t.roleEuropeanCouncil;
    case "council-of-the-eu":
      return t.roleCouncilOfTheEu;
    case "european-parliament":
      return t.roleParliament;
    case "european-central-bank":
      return t.roleEcb;
  }
}

function institutionDisplayName(
  institution: EuInstitution,
  locale: Locale,
  wikidataLabel?: string | null,
): string {
  if (wikidataLabel?.trim()) return wikidataLabel.trim();
  const t = getMessages(locale).institutionPanel;
  switch (institution.id) {
    case "european-commission":
      return t.nameCommission;
    case "european-council":
      return t.nameEuropeanCouncil;
    case "council-of-the-eu":
      return t.nameCouncilOfTheEu;
    case "european-parliament":
      return t.nameParliament;
    case "european-central-bank":
      return t.nameEcb;
  }
}

async function fetchWikidataLabelDescription(
  wikidataId: string,
  locale: Locale,
): Promise<{ label: string | null; description: string | null }> {
  try {
    const params = new URLSearchParams({
      action: "wbgetentities",
      ids: wikidataId,
      props: "labels|descriptions",
      languages: `${locale}|en`,
      format: "json",
      origin: "*",
    });
    const response = await fetch(
      `https://www.wikidata.org/w/api.php?${params.toString()}`,
      {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS },
      },
    );
    if (!response.ok) return { label: null, description: null };
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("entities" in data) ||
      !data.entities ||
      typeof data.entities !== "object"
    ) {
      return { label: null, description: null };
    }
    const entity = (data.entities as Record<string, unknown>)[wikidataId];
    if (!entity || typeof entity !== "object") {
      return { label: null, description: null };
    }

    const readLocalized = (
      bagKey: "labels" | "descriptions",
    ): string | null => {
      if (!(bagKey in entity)) return null;
      const bag = (entity as Record<string, unknown>)[bagKey];
      if (!bag || typeof bag !== "object") return null;
      const record = bag as Record<string, { value?: string }>;
      return (
        record[locale]?.value?.trim() ||
        record.en?.value?.trim() ||
        null
      );
    };

    return {
      label: readLocalized("labels"),
      description: readLocalized("descriptions"),
    };
  } catch {
    return { label: null, description: null };
  }
}

async function fetchWikipediaSummary(
  lang: string,
  title: string,
): Promise<{
  extract: string | null;
  wikipediaUrl: string | null;
  image: EuInstitutionImage | null;
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

    let image: EuInstitutionImage | null = null;
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
): Promise<EuInstitutionImage[]> {
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

    const uniquePhotos: EuInstitutionImage[] = [];

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

function buildLocalDetails(
  institution: EuInstitution,
  locale: Locale,
): EuInstitutionDetails {
  const t = getMessages(locale).institutionPanel;
  return {
    institutionId: institution.id,
    name: institutionDisplayName(institution, locale),
    shortName: institution.shortName,
    description: null,
    roleSummary: roleSummaryFor(institution.id, locale),
    historySummary: null,
    establishedYear: institution.establishedYear,
    officialWebsite: institution.officialWebsite,
    officialInformationUrl: institution.officialInformationUrl,
    sites: institution.sites.map((site) => ({
      siteId: site.id,
      name: site.name,
      city: site.city,
      countryCode: site.countryCode,
      siteType: site.siteType,
      address: site.address,
      officialUrl: site.officialUrl,
      sharedSite: site.sharedSite,
      institutionIds: [...site.institutionIds],
      longitude: site.longitude,
      latitude: site.latitude,
    })),
    images: [],
    sources: [
      { label: t.sourceOfficial, url: institution.officialWebsite },
      { label: t.sourceEuPortal, url: institution.officialInformationUrl },
    ],
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ institutionId: string }> },
) {
  const { institutionId: rawId } = await context.params;
  if (!isEuInstitutionId(rawId)) {
    return Response.json({ error: "Unknown institution" }, { status: 404 });
  }

  const institution = getEuInstitutionById(rawId);
  if (!institution) {
    return Response.json({ error: "Unknown institution" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const t = getMessages(locale).institutionPanel;
  const details = buildLocalDetails(institution, locale);

  const wikiTitle = WIKIPEDIA_TITLES[institution.id];
  const wikiLang = supportedLocales.includes(locale) ? locale : "en";

  try {
    const [wikidata, wikiPrimary, wikiEn, photosPrimary, photosEn] =
      await Promise.all([
        fetchWikidataLabelDescription(institution.wikidataId, locale),
        fetchWikipediaSummary(wikiLang, wikiTitle),
        wikiLang === "en"
          ? Promise.resolve({
              extract: null,
              wikipediaUrl: null,
              image: null,
            })
          : fetchWikipediaSummary("en", wikiTitle),
        fetchWikipediaPhotos(wikiLang, wikiTitle),
        wikiLang === "en"
          ? Promise.resolve([])
          : fetchWikipediaPhotos("en", wikiTitle),
      ]);

    details.name = institutionDisplayName(
      institution,
      locale,
      wikidata.label,
    );
    details.description =
      wikiPrimary.extract ??
      wikiEn.extract ??
      wikidata.description ??
      null;
    details.historySummary =
      wikiPrimary.extract ?? wikiEn.extract ?? null;

    const images: EuInstitutionImage[] = [];
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

    const sources: EuInstitutionSource[] = [
      { label: t.sourceOfficial, url: institution.officialWebsite },
      { label: t.sourceEuPortal, url: institution.officialInformationUrl },
      {
        label: t.sourceWikidata,
        url: `https://www.wikidata.org/wiki/${institution.wikidataId}`,
      },
    ];
    const wikipediaUrl = wikiPrimary.wikipediaUrl ?? wikiEn.wikipediaUrl;
    if (wikipediaUrl) {
      sources.push({ label: t.sourceWikipedia, url: wikipediaUrl });
    }
    if (images.some((image) => image.sourceUrl?.includes("commons"))) {
      sources.push({
        label: t.sourceCommons,
        url: "https://commons.wikimedia.org/",
      });
    }
    details.sources = sources;
  } catch {
    // Keep local fallback details.
  }

  return Response.json(details, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
