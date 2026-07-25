import { defaultLocale, supportedLocales } from "@/lib/i18n/config";

type CountryLanguage = {
  code: string | null;
  name: string;
};

type PoliticalLeader = {
  name: string;
  role: string | null;
};

type LargestCity = {
  name: string;
  population: number | null;
};

type CountryPhoto = {
  url: string;
  sourceUrl: string | null;
  credit: string | null;
  license: string | null;
  licenseUrl: string | null;
};

type TravelSafetyStatus = "safe" | "caution" | "avoid" | "unknown";

type TravelSafety = {
  level: 1 | 2 | 3 | 4 | null;
  status: TravelSafetyStatus;
  sourceUrl: string | null;
  updatedAt: string | null;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractXmlTag(xml: string, tagName: string): string | null {
  const expression = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i",
  );

  const match = xml.match(expression);

  if (!match?.[1]) {
    return null;
  }

  const value = decodeXmlEntities(
    match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
  );

  return value || null;
}

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

function parseIndicatorEntry(entry: unknown): {
  value: number | null;
  date: string | null;
} {
  let value: number | null = null;
  let date: string | null = null;

  if (entry && typeof entry === "object") {
    const rawValue = "value" in entry ? entry.value : null;
    const rawDate = "date" in entry ? entry.date : null;

    if (typeof rawValue === "number") {
      value = rawValue;
    }

    if (typeof rawDate === "string") {
      date = rawDate;
    }
  }

  return { value, date };
}

function parseLanguages(data: unknown): CountryLanguage[] {
  if (
    !data ||
    typeof data !== "object" ||
    !("languages" in data) ||
    !Array.isArray(data.languages)
  ) {
    return [];
  }

  const languages: CountryLanguage[] = [];

  for (const item of data.languages) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const name =
      "name" in item && typeof item.name === "string"
        ? item.name
        : null;

    if (!name) {
      continue;
    }

    const code =
      "iso639_1" in item && typeof item.iso639_1 === "string"
        ? item.iso639_1
        : null;

    languages.push({ code, name });
  }

  return languages;
}

function parseTimeZones(data: unknown): string[] {
  if (
    !data ||
    typeof data !== "object" ||
    !("timezones" in data) ||
    !Array.isArray(data.timezones)
  ) {
    return [];
  }

  return Array.from(
    new Set(
      data.timezones.filter(
        (timeZone: unknown): timeZone is string =>
          typeof timeZone === "string" && timeZone.trim().length > 0,
      ),
    ),
  );
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
    field.value.trim() === ""
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

function parseGovernmentTypes(data: unknown): {
  governmentTypes: string[];
  officialWebsite: string | null;
  nationalMotto: string | null;
} {
  const governmentTypes: string[] = [];
  let officialWebsite: string | null = null;
  let nationalMotto: string | null = null;

  for (const binding of getSparqlBindings(data)) {
    const governmentTypeLabel = getBindingLiteral(
      binding,
      "governmentTypeLabel",
    );

    if (
      governmentTypeLabel &&
      !governmentTypes.includes(governmentTypeLabel)
    ) {
      governmentTypes.push(governmentTypeLabel);
    }

    if (!officialWebsite) {
      const website = getBindingLiteral(binding, "officialWebsite");

      if (website && website.startsWith("https://")) {
        officialWebsite = website;
      }
    }

    if (!nationalMotto) {
      const mottoText = getBindingLiteral(binding, "mottoText");
      const mottoItemLabel = getBindingLiteral(binding, "mottoItemLabel");

      if (mottoText && mottoText.trim()) {
        nationalMotto = mottoText.trim();
      } else if (mottoItemLabel && mottoItemLabel.trim()) {
        nationalMotto = mottoItemLabel.trim();
      }
    }
  }

  return { governmentTypes, officialWebsite, nationalMotto };
}

function addUniqueLeader(
  leaders: PoliticalLeader[],
  leader: PoliticalLeader,
): void {
  const alreadyExists = leaders.some(
    (existing) =>
      existing.name === leader.name && existing.role === leader.role,
  );

  if (!alreadyExists) {
    leaders.push(leader);
  }
}

function parsePoliticalLeaders(data: unknown): {
  headOfStates: PoliticalLeader[];
} {
  const headOfStates: PoliticalLeader[] = [];

  for (const binding of getSparqlBindings(data)) {
    const name = getBindingLiteral(binding, "personLabel");
    const role = getBindingLiteral(binding, "officeLabel");

    if (!name) {
      continue;
    }

    addUniqueLeader(headOfStates, { name, role });
  }

  return { headOfStates };
}

async function fetchWikidata(
  query: string,
  revalidate = 86400,
): Promise<Response | null> {
  const wikidataUrl = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
    query,
  )}&format=json`;

  try {
    return await fetch(wikidataUrl, {
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": "EUInteractiveMap/0.1",
      },
      next: {
        revalidate,
      },
    });
  } catch {
    return null;
  }
}

function parseWikipediaArticleUrl(data: unknown): string | null {
  const [binding] = getSparqlBindings(data);

  if (!binding) {
    return null;
  }

  const localizedArticle = getBindingLiteral(binding, "localizedArticle");
  const englishArticle = getBindingLiteral(binding, "englishArticle");
  const candidate = localizedArticle ?? englishArticle;

  if (candidate && candidate.startsWith("https://")) {
    return candidate;
  }

  return null;
}

async function fetchWikipediaSummary(
  wikipediaUrl: string,
): Promise<string | null> {
  try {
    const parsedWikipediaUrl = new URL(wikipediaUrl);

    const wikipediaTitle = decodeURIComponent(
      parsedWikipediaUrl.pathname.replace(/^\/wiki\//, ""),
    );

    const summaryUrl =
      `https://${parsedWikipediaUrl.hostname}` +
      `/api/rest_v1/page/summary/` +
      encodeURIComponent(wikipediaTitle);

    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "EUInteractiveMap/0.1",
      },
      next: {
        revalidate: 604800,
      },
    });

    if (!summaryResponse.ok) {
      return null;
    }

    const summaryData: unknown = await summaryResponse.json();

    if (
      summaryData &&
      typeof summaryData === "object" &&
      "extract" in summaryData &&
      typeof summaryData.extract === "string" &&
      summaryData.extract.trim() !== ""
    ) {
      return summaryData.extract;
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchWikipediaPhotos(
  wikipediaUrl: string,
): Promise<CountryPhoto[]> {
  try {
    const parsedWikipediaUrl = new URL(wikipediaUrl);
    const wikipediaTitle = decodeURIComponent(
      parsedWikipediaUrl.pathname.replace(/^\/wiki\//, ""),
    );

    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      generator: "images",
      titles: wikipediaTitle,
      gimlimit: "30",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "1200",
      iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl",
      origin: "*",
    });

    const photosResponse = await fetch(
      `https://${parsedWikipediaUrl.hostname}/w/api.php?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "EUInteractiveMap/0.1",
        },
        next: {
          revalidate: 604800,
        },
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

    const uniquePhotos: CountryPhoto[] = [];

    for (const page of photosData.query.pages) {
      if (!page || typeof page !== "object") {
        continue;
      }

      const title =
        "title" in page && typeof page.title === "string"
          ? page.title
          : null;

      if (!title) {
        continue;
      }

      const normalizedTitle = title.toLowerCase();
      if (
        PHOTO_EXCLUSION_TERMS.some((term) =>
          normalizedTitle.includes(term),
        )
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

      if (!photoUrl || !photoUrl.startsWith("https://")) {
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

      const artistValue =
        extmetadata &&
        "Artist" in extmetadata &&
        extmetadata.Artist &&
        typeof extmetadata.Artist === "object" &&
        "value" in extmetadata.Artist
          ? extmetadata.Artist.value
          : null;

      const licenseValue =
        extmetadata &&
        "LicenseShortName" in extmetadata &&
        extmetadata.LicenseShortName &&
        typeof extmetadata.LicenseShortName === "object" &&
        "value" in extmetadata.LicenseShortName
          ? extmetadata.LicenseShortName.value
          : null;

      const licenseUrlValue =
        extmetadata &&
        "LicenseUrl" in extmetadata &&
        extmetadata.LicenseUrl &&
        typeof extmetadata.LicenseUrl === "object" &&
        "value" in extmetadata.LicenseUrl
          ? extmetadata.LicenseUrl.value
          : null;

      const sourceUrl =
        "descriptionurl" in imageInfo &&
        typeof imageInfo.descriptionurl === "string" &&
        imageInfo.descriptionurl.startsWith("https://")
          ? imageInfo.descriptionurl
          : null;

      uniquePhotos.push({
        url: photoUrl,
        sourceUrl,
        credit: stripHtml(artistValue),
        license: stripHtml(licenseValue),
        licenseUrl:
          typeof licenseUrlValue === "string" &&
          licenseUrlValue.startsWith("https://")
            ? licenseUrlValue
            : null,
      });
    }

    return uniquePhotos.slice(0, 5);
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ code: string }>;
  },
) {
  const { code } = await params;

  const requestUrl = new URL(request.url);
  const requestedLocale = requestUrl.searchParams.get("locale");

  const locale =
    supportedLocales.find(
      (supportedLocale) => supportedLocale === requestedLocale,
    ) ?? defaultLocale;

  const normalizedCode =
    code.toUpperCase() === "EL"
      ? "GR"
      : code.toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCode)) {
    return Response.json(
      { error: "Invalid country code" },
      { status: 400 },
    );
  }

  try {
    const governmentTypesQuery = `
  SELECT
    ?governmentTypeLabel
    ?officialWebsite
    ?mottoText
    ?mottoItemLabel
  WHERE {
    ?country wdt:P297 "${normalizedCode}".

    OPTIONAL {
      ?country wdt:P122 ?governmentType.
    }

    OPTIONAL {
      ?country wdt:P856 ?officialWebsite.
    }

    OPTIONAL {
      ?country wdt:P1451 ?mottoText.
    }

    OPTIONAL {
      ?country wdt:P1546 ?mottoItem.
    }

    SERVICE wikibase:label {
      bd:serviceParam wikibase:language "${locale},en".
    }
  }
`;

    const leadersQuery = `
  SELECT DISTINCT
    ?personLabel
    ?officeLabel
  WHERE {
    ?country wdt:P297 "${normalizedCode}".

    ?country wdt:P35 ?person.

    OPTIONAL {
      ?country wdt:P1906 ?office.
    }

    SERVICE wikibase:label {
      bd:serviceParam wikibase:language "${locale},en".
    }
  }
`;

    const wikipediaQuery = `
  PREFIX wdt: <http://www.wikidata.org/prop/direct/>
  PREFIX schema: <http://schema.org/>

  SELECT
    ?localizedArticle
    ?englishArticle
  WHERE {
    ?country wdt:P297 "${normalizedCode}".

    OPTIONAL {
      ?localizedArticle
        schema:about ?country;
        schema:isPartOf <https://${locale}.wikipedia.org/>.
    }

    OPTIONAL {
      ?englishArticle
        schema:about ?country;
        schema:isPartOf <https://en.wikipedia.org/>.
    }
  }
  LIMIT 1
`;

    const [
      countryResponse,
      populationResponse,
      areaResponse,
      languagesResponse,
      governmentTypesResponse,
      leadersResponse,
      wikipediaResponse,
    ] = await Promise.all([
      fetch(
        `https://api.worldbank.org/v2/country/${normalizedCode}?format=json`,
        {
          next: {
            revalidate: 604800,
          },
        },
      ),
      fetch(
        `https://api.worldbank.org/v2/country/${normalizedCode}/indicator/SP.POP.TOTL?format=json&mrnev=1`,
        {
          next: {
            revalidate: 604800,
          },
        },
      ),
      fetch(
        `https://api.worldbank.org/v2/country/${normalizedCode}/indicator/AG.SRF.TOTL.K2?format=json&mrnev=1`,
        {
          next: {
            revalidate: 604800,
          },
        },
      ),
      fetch(
        `https://countries.dev/alpha/${normalizedCode}?fields=languages,timezones`,
        {
          next: {
            revalidate: 604800,
          },
        },
      ).catch(() => null),
      fetchWikidata(governmentTypesQuery),
      fetchWikidata(leadersQuery),
      fetchWikidata(wikipediaQuery, 604800),
    ]);

    if (!countryResponse.ok) {
      throw new Error("World Bank request failed");
    }

    const data: unknown = await countryResponse.json();

    const country =
      Array.isArray(data) &&
      Array.isArray(data[1])
        ? data[1][0]
        : null;

    if (
      !country ||
      typeof country !== "object"
    ) {
      return Response.json(
        { error: "Country not found" },
        { status: 404 },
      );
    }

    const capital =
      "capitalCity" in country &&
      typeof country.capitalCity === "string"
        ? country.capitalCity
        : null;

    let population: number | null = null;
    let populationYear: string | null = null;

    if (populationResponse.ok) {
      const populationData: unknown = await populationResponse.json();

      const populationEntry =
        Array.isArray(populationData) &&
        Array.isArray(populationData[1])
          ? populationData[1][0]
          : null;

      const parsed = parseIndicatorEntry(populationEntry);
      population = parsed.value;
      populationYear = parsed.date;
    }

    let area: number | null = null;
    let areaYear: string | null = null;

    if (areaResponse.ok) {
      const areaData: unknown = await areaResponse.json();

      const areaEntry =
        Array.isArray(areaData) &&
        Array.isArray(areaData[1])
          ? areaData[1][0]
          : null;

      const parsed = parseIndicatorEntry(areaEntry);
      area = parsed.value;
      areaYear = parsed.date;
    }

    let languages: CountryLanguage[] = [];
    let timeZones: string[] = [];

    try {
      if (languagesResponse?.ok) {
        const languagesData: unknown = await languagesResponse.json();
        languages = parseLanguages(languagesData);
        timeZones = parseTimeZones(languagesData);
      }
    } catch {
      languages = [];
      timeZones = [];
    }

    let governmentTypes: string[] = [];
    let officialWebsite: string | null = null;
    let nationalMotto: string | null = null;

    try {
      if (governmentTypesResponse?.ok) {
        const governmentTypesData: unknown =
          await governmentTypesResponse.json();
        const parsed = parseGovernmentTypes(governmentTypesData);
        governmentTypes = parsed.governmentTypes;
        officialWebsite = parsed.officialWebsite;
        nationalMotto = parsed.nationalMotto;
      }
    } catch {
      governmentTypes = [];
      officialWebsite = null;
      nationalMotto = null;
    }

    let headOfStates: PoliticalLeader[] = [];

    try {
      if (leadersResponse?.ok) {
        const leadersData: unknown = await leadersResponse.json();
        const parsed = parsePoliticalLeaders(leadersData);
        headOfStates = parsed.headOfStates;
      }
    } catch {
      headOfStates = [];
    }

    let wikipediaUrl: string | null = null;
    let wikipediaSummary: string | null = null;
    let photos: CountryPhoto[] = [];

    try {
      if (wikipediaResponse?.ok) {
        const wikipediaData: unknown = await wikipediaResponse.json();
        wikipediaUrl = parseWikipediaArticleUrl(wikipediaData);

        if (wikipediaUrl) {
          wikipediaSummary = await fetchWikipediaSummary(wikipediaUrl);
        }
      }
    } catch {
      wikipediaUrl = null;
      wikipediaSummary = null;
    }

    try {
      if (wikipediaUrl) {
        photos = await fetchWikipediaPhotos(wikipediaUrl);
      }
    } catch {
      photos = [];
    }

    let largestCity: LargestCity | null = null;

    try {
      const citiesResponse = await fetch(
        `https://countries.dev/cities?country=${normalizedCode}&sort=population&order=desc&limit=1&fields=name,population,countryCode`,
        {
          next: {
            revalidate: 604800,
          },
        },
      );

      if (citiesResponse.ok) {
        const citiesData: unknown = await citiesResponse.json();

        if (Array.isArray(citiesData) && citiesData.length > 0) {
          const city = citiesData[0];

          if (
            city &&
            typeof city === "object" &&
            "name" in city &&
            typeof city.name === "string" &&
            city.name.trim() !== "" &&
            "countryCode" in city &&
            typeof city.countryCode === "string" &&
            city.countryCode === normalizedCode
          ) {
            largestCity = {
              name: city.name,
              population:
                "population" in city && typeof city.population === "number"
                  ? city.population
                  : null,
            };
          }
        }
      }
    } catch {
      largestCity = null;
    }

    let gdp: number | null = null;
    let gdpYear: string | null = null;

    try {
      const gdpResponse = await fetch(
        `https://api.worldbank.org/v2/country/${normalizedCode}/indicator/NY.GDP.MKTP.CD?format=json&mrnev=1&per_page=1`,
        {
          next: {
            revalidate: 604800,
          },
        },
      );

      if (gdpResponse.ok) {
        const gdpData: unknown = await gdpResponse.json();

        const gdpEntry =
          Array.isArray(gdpData) && Array.isArray(gdpData[1])
            ? gdpData[1][0]
            : null;

        const parsed = parseIndicatorEntry(gdpEntry);
        gdp = parsed.value;
        gdpYear = parsed.date;
      }
    } catch {
      gdp = null;
      gdpYear = null;
    }

    let travelSafety: TravelSafety = {
      level: null,
      status: "unknown",
      sourceUrl: null,
      updatedAt: null,
    };

    try {
      const advisoryResponse = await fetch(
        `https://cadataapi.state.gov/api/TravelAdvisories/${normalizedCode}`,
        {
          headers: {
            Accept: "application/xml",
            "User-Agent": "EUInteractiveMap/0.1",
          },
          next: {
            revalidate: 21600,
          },
        },
      );

      if (advisoryResponse.ok) {
        const advisoryXml = await advisoryResponse.text();
        const levelMatch = advisoryXml.match(/Level\s*([1-4])/i);
        const parsedLevel = levelMatch ? Number(levelMatch[1]) : null;

        const level =
          parsedLevel === 1 ||
          parsedLevel === 2 ||
          parsedLevel === 3 ||
          parsedLevel === 4
            ? parsedLevel
            : null;

        const status: TravelSafetyStatus =
          level === 1
            ? "safe"
            : level === 2
              ? "caution"
              : level === 3 || level === 4
                ? "avoid"
                : "unknown";

        const publishedValue =
          extractXmlTag(advisoryXml, "Published") ??
          extractXmlTag(advisoryXml, "Updated");

        let updatedAt: string | null = null;

        if (
          publishedValue &&
          !Number.isNaN(Date.parse(publishedValue))
        ) {
          updatedAt = publishedValue;
        }

        const xmlLink = extractXmlTag(advisoryXml, "Link");
        const hrefMatch = advisoryXml.match(
          /href=["'](https:\/\/travel\.state\.gov[^"']+)["']/i,
        );
        const candidateSourceUrl = xmlLink ?? hrefMatch?.[1] ?? null;

        const sourceUrl =
          candidateSourceUrl &&
          candidateSourceUrl.startsWith("https://travel.state.gov/")
            ? candidateSourceUrl
            : null;

        travelSafety = {
          level,
          status,
          sourceUrl,
          updatedAt,
        };
      }
    } catch {
      travelSafety = {
        level: null,
        status: "unknown",
        sourceUrl: null,
        updatedAt: null,
      };
    }

    return Response.json({
      capital,
      population,
      populationYear,
      area,
      areaYear,
      languages,
      governmentTypes,
      headOfStates,
      officialWebsite,
      wikipediaSummary,
      wikipediaUrl,
      largestCity,
      gdp,
      gdpYear,
      nationalMotto,
      timeZones,
      photos,
      travelSafety,
    });
  } catch {
    return Response.json(
      { error: "Country data unavailable" },
      { status: 502 },
    );
  }
}
