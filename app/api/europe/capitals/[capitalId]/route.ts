import {
  getEuCapitalById,
  type EuCapital,
} from "@/lib/europe/euCapitals";
import type {
  CapitalImage,
  EuCapitalDetails,
} from "@/lib/europe/euCapitalDetails";
import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";

const USER_AGENT =
  "EUInteractiveMap/0.1 (educational; contact: local-dev)";
const FETCH_TIMEOUT_MS = 10_000;
const CACHE_CONTROL =
  "public, s-maxage=86400, stale-while-revalidate=604800";
const REVALIDATE_SECONDS = 86_400;
const UNIT_SQUARE_METRE = "http://www.wikidata.org/entity/Q25359";

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
] as const;

type WikidataCapitalFacts = {
  label: string | null;
  description: string | null;
  population: number | null;
  populationYear: number | null;
  areaKm2: number | null;
  elevationMeters: number | null;
  officialWebsite: string | null;
  wikipediaUrl: string | null;
};

type WikipediaSummaryResult = {
  extract: string | null;
  description: string | null;
  wikipediaUrl: string | null;
  image: CapitalImage | null;
};

function resolveLocale(requested: string | null): Locale {
  return (
    supportedLocales.find((locale) => locale === requested) ?? defaultLocale
  );
}

function isAllowedWikipediaLang(lang: string): boolean {
  return lang === "en" || supportedLocales.includes(lang as Locale);
}

function getTranslatedCapitalName(
  capital: EuCapital,
  locale: Locale,
  wikidataLabel?: string | null,
): string {
  if (wikidataLabel?.trim()) {
    return wikidataLabel.trim();
  }

  const titled = capital.wikipediaTitles?.[locale];
  if (titled) {
    return titled.replace(/_/g, " ");
  }

  if (locale !== "en" && capital.nativeName) {
    return capital.nativeName;
  }

  return capital.canonicalName;
}

function stripHtml(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

function getBindingLiteral(
  binding: Record<string, unknown>,
  key: string,
): string | null {
  const field = binding[key];
  if (
    !field ||
    typeof field !== "object" ||
    !("value" in field) ||
    typeof field.value !== "string" ||
    !field.value.trim()
  ) {
    return null;
  }
  return field.value;
}

function getSparqlBindings(data: unknown): Record<string, unknown>[] {
  if (
    !data ||
    typeof data !== "object" ||
    !("results" in data) ||
    !data.results ||
    typeof data.results !== "object" ||
    !("bindings" in data.results) ||
    !Array.isArray(data.results.bindings)
  ) {
    return [];
  }
  return data.results.bindings.filter(
    (binding): binding is Record<string, unknown> =>
      !!binding && typeof binding === "object",
  );
}

function parseNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseYearFromDate(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const year = Number(value.slice(0, 4));
  return Number.isInteger(year) && year >= 1000 && year <= 3000 ? year : null;
}

function metadataValue(
  extmetadata: Record<string, unknown> | null,
  key: string,
): unknown {
  const entry = extmetadata?.[key];
  if (entry && typeof entry === "object" && "value" in entry) {
    return entry.value;
  }
  return null;
}

async function fetchWikidata(query: string): Promise<Response | null> {
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
    query,
  )}&format=json`;

  try {
    return await fetch(url, {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch {
    return null;
  }
}

function buildCapitalSparql(wikidataId: string, locale: Locale): string {
  return `
SELECT
  ?cityLabel ?cityDescription
  ?population ?populationDate ?rank
  ?areaAmount ?areaUnit ?elevation ?officialWebsite
  ?localizedArticle ?englishArticle
WHERE {
  BIND(wd:${wikidataId} AS ?city)

  OPTIONAL {
    ?city p:P1082 ?popStmt.
    ?popStmt ps:P1082 ?population.
    OPTIONAL { ?popStmt pq:P585 ?populationDate. }
    OPTIONAL { ?popStmt wikibase:rank ?rank. }
    FILTER NOT EXISTS { ?popStmt wikibase:rank wikibase:DeprecatedRank }
  }

  OPTIONAL {
    ?city p:P2046 ?areaStmt.
    ?areaStmt psv:P2046 ?areaNode.
    ?areaNode wikibase:quantityAmount ?areaAmount.
    ?areaNode wikibase:quantityUnit ?areaUnit.
  }

  OPTIONAL { ?city wdt:P2044 ?elevation. }

  OPTIONAL {
    ?city wdt:P856 ?officialWebsite.
    FILTER(STRSTARTS(STR(?officialWebsite), "https://"))
  }

  OPTIONAL {
    ?localizedArticle schema:about ?city;
      schema:isPartOf <https://${locale}.wikipedia.org/>.
  }

  OPTIONAL {
    ?englishArticle schema:about ?city;
      schema:isPartOf <https://en.wikipedia.org/>.
  }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "${locale},en".
  }
}
`;
}

function pickBestPopulation(
  bindings: Record<string, unknown>[],
): { value: number | null; year: number | null } {
  type Candidate = {
    value: number;
    year: number | null;
    preferred: boolean;
    dateMs: number;
  };

  const candidates: Candidate[] = [];

  for (const binding of bindings) {
    const value = parseNumber(getBindingLiteral(binding, "population"));
    if (value === null) {
      continue;
    }
    const dateRaw = getBindingLiteral(binding, "populationDate");
    const dateMs = dateRaw ? Date.parse(dateRaw) : Number.NaN;
    candidates.push({
      value,
      year: parseYearFromDate(dateRaw),
      preferred: (getBindingLiteral(binding, "rank") ?? "").includes(
        "PreferredRank",
      ),
      dateMs: Number.isFinite(dateMs) ? dateMs : -1,
    });
  }

  if (candidates.length === 0) {
    return { value: null, year: null };
  }

  candidates.sort((a, b) => {
    if (a.preferred !== b.preferred) {
      return a.preferred ? -1 : 1;
    }
    return b.dateMs - a.dateMs;
  });

  return { value: candidates[0].value, year: candidates[0].year };
}

function parseAreaKm2(bindings: Record<string, unknown>[]): number | null {
  for (const binding of bindings) {
    const amount = parseNumber(getBindingLiteral(binding, "areaAmount"));
    if (amount === null) {
      continue;
    }
    const unit = getBindingLiteral(binding, "areaUnit");
    return unit === UNIT_SQUARE_METRE ? amount / 1_000_000 : amount;
  }
  return null;
}

function parseWikidataFacts(data: unknown): WikidataCapitalFacts {
  const bindings = getSparqlBindings(data);
  const [first] = bindings;
  const population = pickBestPopulation(bindings);

  let officialWebsite: string | null = null;
  let wikipediaUrl: string | null = null;

  for (const binding of bindings) {
    if (!officialWebsite) {
      const website = getBindingLiteral(binding, "officialWebsite");
      if (website?.startsWith("https://")) {
        officialWebsite = website;
      }
    }
    if (!wikipediaUrl) {
      const candidate =
        getBindingLiteral(binding, "localizedArticle") ??
        getBindingLiteral(binding, "englishArticle");
      if (candidate?.startsWith("https://")) {
        wikipediaUrl = candidate;
      }
    }
  }

  return {
    label: first ? getBindingLiteral(first, "cityLabel") : null,
    description: first ? getBindingLiteral(first, "cityDescription") : null,
    population: population.value,
    populationYear: population.year,
    areaKm2: parseAreaKm2(bindings),
    elevationMeters: first
      ? parseNumber(getBindingLiteral(first, "elevation"))
      : null,
    officialWebsite,
    wikipediaUrl,
  };
}

function wikipediaTitleFromCapital(
  capital: EuCapital,
  locale: Locale,
): { lang: string; title: string } {
  const localized = capital.wikipediaTitles?.[locale];
  if (localized && isAllowedWikipediaLang(locale)) {
    return { lang: locale, title: localized };
  }

  const english = capital.wikipediaTitles?.en;
  if (english) {
    return { lang: "en", title: english };
  }

  return { lang: "en", title: capital.canonicalName.replace(/ /g, "_") };
}

function parseWikipediaPageUrl(
  url: string,
): { lang: string; title: string } | null {
  try {
    const parsed = new URL(url);
    const hostMatch = parsed.hostname.match(/^([a-z]{2,3})\.wikipedia\.org$/i);
    if (!hostMatch) {
      return null;
    }
    const lang = hostMatch[1].toLowerCase();
    if (!isAllowedWikipediaLang(lang)) {
      return null;
    }
    const title = decodeURIComponent(
      parsed.pathname.replace(/^\/wiki\//, ""),
    );
    return title ? { lang, title } : null;
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(
  lang: string,
  title: string,
): Promise<WikipediaSummaryResult> {
  const empty: WikipediaSummaryResult = {
    extract: null,
    description: null,
    wikipediaUrl: null,
    image: null,
  };

  if (!isAllowedWikipediaLang(lang)) {
    return empty;
  }

  try {
    const summaryUrl =
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/` +
      encodeURIComponent(title);

    const response = await fetch(summaryUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return empty;
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") {
      return empty;
    }

    const extract =
      "extract" in data &&
      typeof data.extract === "string" &&
      data.extract.trim()
        ? data.extract.trim()
        : null;

    const description =
      "description" in data &&
      typeof data.description === "string" &&
      data.description.trim()
        ? data.description.trim()
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

    let image: CapitalImage | null = null;
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
      const thumbUrl =
        thumbnail &&
        "source" in thumbnail &&
        typeof thumbnail.source === "string" &&
        thumbnail.source.startsWith("https://")
          ? thumbnail.source
          : null;

      image = {
        url: imageSource.source,
        thumbnailUrl: thumbUrl,
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

    return { extract, description, wikipediaUrl, image };
  } catch {
    return empty;
  }
}

async function fetchWikipediaPhotos(
  lang: string,
  title: string,
): Promise<CapitalImage[]> {
  if (!isAllowedWikipediaLang(lang)) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "images",
      titles: title,
      gimlimit: "30",
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: "1200",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
      origin: "*",
    });

    const photosResponse = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS },
      },
    );

    if (!photosResponse.ok) {
      return [];
    }

    const photosData: unknown = await photosResponse.json();
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

    const uniquePhotos: CapitalImage[] = [];

    for (const page of photosData.query.pages) {
      if (!page || typeof page !== "object") {
        continue;
      }

      const pageTitle =
        "title" in page && typeof page.title === "string" ? page.title : null;
      if (!pageTitle) {
        continue;
      }

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
      if (!imageInfo || typeof imageInfo !== "object") {
        continue;
      }

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
      if (!photoUrl?.startsWith("https://")) {
        continue;
      }
      if (uniquePhotos.some((photo) => photo.url === photoUrl)) {
        continue;
      }

      const extmetadata =
        "extmetadata" in imageInfo &&
        imageInfo.extmetadata &&
        typeof imageInfo.extmetadata === "object"
          ? (imageInfo.extmetadata as Record<string, unknown>)
          : null;

      const licenseUrlValue = metadataValue(extmetadata, "LicenseUrl");
      const descriptionUrl =
        "descriptionurl" in imageInfo &&
        typeof imageInfo.descriptionurl === "string"
          ? imageInfo.descriptionurl
          : null;
      const sourceUrl =
        descriptionUrl?.startsWith("https://commons.wikimedia.org/") ||
        descriptionUrl?.startsWith(`https://${lang}.wikipedia.org/`)
          ? descriptionUrl
          : null;

      uniquePhotos.push({
        url: photoUrl,
        thumbnailUrl: thumburl,
        width:
          "thumbwidth" in imageInfo && typeof imageInfo.thumbwidth === "number"
            ? imageInfo.thumbwidth
            : "width" in imageInfo && typeof imageInfo.width === "number"
              ? imageInfo.width
              : null,
        height:
          "thumbheight" in imageInfo &&
          typeof imageInfo.thumbheight === "number"
            ? imageInfo.thumbheight
            : "height" in imageInfo && typeof imageInfo.height === "number"
              ? imageInfo.height
              : null,
        title: pageTitle.replace(/^File:/i, ""),
        author: stripHtml(metadataValue(extmetadata, "Artist")),
        license: stripHtml(metadataValue(extmetadata, "LicenseShortName")),
        licenseUrl:
          typeof licenseUrlValue === "string" &&
          licenseUrlValue.startsWith("https://")
            ? licenseUrlValue
            : null,
        sourceUrl,
      });

      if (uniquePhotos.length >= 5) {
        break;
      }
    }

    return uniquePhotos.slice(0, 5);
  } catch {
    return [];
  }
}

function buildFallbackDetails(
  capital: EuCapital,
  locale: Locale,
): EuCapitalDetails {
  return {
    capitalId: capital.id,
    name: getTranslatedCapitalName(capital, locale),
    nativeName: capital.nativeName,
    countryCode: capital.countryCode,
    description: null,
    population: null,
    areaKm2: null,
    elevationMeters: null,
    officialWebsite: null,
    tourismWebsite: null,
    wikipediaUrl: null,
    images: [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ capitalId: string }>;
  },
) {
  const { capitalId } = await params;
  const capital = getEuCapitalById(capitalId);

  if (!capital) {
    return Response.json({ error: "Capital not found" }, { status: 404 });
  }

  const locale = resolveLocale(new URL(request.url).searchParams.get("locale"));
  const details = buildFallbackDetails(capital, locale);
  const wikidataSourceUrl = `https://www.wikidata.org/wiki/${capital.wikidataId}`;

  try {
    const sparqlResponse = await fetchWikidata(
      buildCapitalSparql(capital.wikidataId, locale),
    );

    let facts: WikidataCapitalFacts | null = null;
    if (sparqlResponse?.ok) {
      try {
        facts = parseWikidataFacts(await sparqlResponse.json());
      } catch {
        facts = null;
      }
    }

    if (facts) {
      details.name = getTranslatedCapitalName(capital, locale, facts.label);
      details.description = facts.description;
      details.elevationMeters = facts.elevationMeters;
      details.officialWebsite = facts.officialWebsite;
      details.wikipediaUrl = facts.wikipediaUrl;

      if (facts.population !== null) {
        details.population = {
          value: facts.population,
          year: facts.populationYear,
          sourceUrl: wikidataSourceUrl,
          label: "municipal",
        };
      }

      if (facts.areaKm2 !== null) {
        details.areaKm2 = {
          value: facts.areaKm2,
          sourceUrl: wikidataSourceUrl,
        };
      }
    }

    let wikiRef =
      (details.wikipediaUrl
        ? parseWikipediaPageUrl(details.wikipediaUrl)
        : null) ?? wikipediaTitleFromCapital(capital, locale);

    if (wikiRef) {
      const summary = await fetchWikipediaSummary(wikiRef.lang, wikiRef.title);

      if (summary.wikipediaUrl) {
        details.wikipediaUrl = summary.wikipediaUrl;
        wikiRef = parseWikipediaPageUrl(summary.wikipediaUrl) ?? wikiRef;
      }

      if (summary.extract) {
        details.description = summary.extract;
      } else if (!details.description && summary.description) {
        details.description = summary.description;
      }

      let images = await fetchWikipediaPhotos(wikiRef.lang, wikiRef.title);

      if (images.length < 3 && summary.image) {
        const alreadyHas = images.some(
          (image) => image.url === summary.image?.url,
        );
        if (!alreadyHas) {
          images = [summary.image, ...images].slice(0, 5);
        }
      }

      details.images = images.slice(0, 5);
    }
  } catch {
    // Keep local fallbacks — never fail after the capital is resolved.
  }

  details.fetchedAt = new Date().toISOString();

  return Response.json(details, {
    status: 200,
    headers: { "Cache-Control": CACHE_CONTROL },
  });
}
