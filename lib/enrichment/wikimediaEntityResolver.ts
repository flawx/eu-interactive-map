import type { Locale } from "@/lib/i18n/config";

export const ENTITY_RESOLVER_VERSION = "entity-resolver-v2";
const USER_AGENT = "EUInteractiveMap/0.2 (entity verification; contact: local-dev)";
const REVALIDATE_SECONDS = 86_400;

export type ExpectedEntity = {
  wikidataId: string | null;
  canonicalName: string;
  aliases?: string[];
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  expectedTypes?: string[];
  wikipediaTitles?: Partial<Record<Locale, string>>;
  searchContext?: string;
  distanceThresholdKm?: number;
};

export type ResolvedWikipediaEntity = {
  wikidataId: string;
  locale: Locale;
  title: string;
  pageUrl: string;
  description: string | null;
  extract: string | null;
  thumbnailUrl: string | null;
  verified: boolean;
  verificationMethod:
    | "wikidata-sitelink"
    | "explicit-title-and-qid"
    | "validated-search-result";
};

export type ResolvedWikimediaImage = {
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  title: string | null;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
};

export type ResolvedEntityEnrichment = {
  entity: ResolvedWikipediaEntity | null;
  images: ResolvedWikimediaImage[];
  warnings: string[];
  resolverVersion: typeof ENTITY_RESOLVER_VERSION;
  imagesRejected: number;
};

type WikidataEntity = {
  id?: string;
  labels?: Record<string, { value?: string }>;
  aliases?: Record<string, Array<{ value?: string }>>;
  descriptions?: Record<string, { value?: string }>;
  sitelinks?: Record<string, { title?: string }>;
  claims?: Record<string, Claim[]>;
};

type Claim = {
  mainsnak?: {
    datavalue?: {
      value?: unknown;
    };
  };
};

const wikidataEntityCache = new Map<string, WikidataEntity>();
const wikipediaPageCache = new Map<string, WikipediaPage>();

const COUNTRY_QIDS: Record<string, string> = {
  AL: "Q222", AT: "Q40", BA: "Q225", BE: "Q31", BG: "Q219",
  CH: "Q39", CY: "Q229", CZ: "Q213", DE: "Q183", DK: "Q35",
  EE: "Q191", EL: "Q41", ES: "Q29", FI: "Q33", FR: "Q142",
  HR: "Q224", HU: "Q28", IE: "Q27", IS: "Q189", IT: "Q38",
  LI: "Q347", LT: "Q37", LU: "Q32", LV: "Q211", ME: "Q236",
  MK: "Q221", MT: "Q233", NL: "Q55", NO: "Q20", PL: "Q36",
  PT: "Q45", RO: "Q218", RS: "Q403", SE: "Q34", SI: "Q215",
  SK: "Q214", UK: "Q145", XK: "Q1246",
};

const REJECTED_TYPE_QIDS = new Set([
  "Q5", // human
  "Q4167410", // disambiguation page
  "Q11424", // film
  "Q7366", // song
]);

const EXPECTED_TYPE_QIDS: Record<string, ReadonlySet<string>> = {
  ski_resort: new Set(["Q130003", "Q1076486", "Q15243209", "Q3034650", "Q484170", "Q747074", "Q515", "Q486972"]),
  mountain_destination: new Set(["Q515", "Q486972", "Q200250", "Q3957", "Q484170", "Q747074"]),
  iconic_peak: new Set(["Q8502", "Q207326", "Q46831"]),
  mountain_range: new Set(["Q46831", "Q1061151"]),
  landmark: new Set(["Q23413", "Q41176", "Q4989906", "Q570116"]),
  museum: new Set(["Q33506"]),
  historic_area: new Set(["Q515", "Q486972", "Q174782", "Q200250"]),
  park_garden: new Set(["Q22698", "Q1107656", "Q46169"]),
  natural_landscape: new Set(["Q473972", "Q8502", "Q165", "Q9259"]),
  coastal_destination: new Set(["Q515", "Q486972", "Q23442", "Q3957"]),
  airport: new Set(["Q1248784", "Q644371"]),
  railway_station: new Set(["Q55488", "Q928830"]),
  city: new Set(["Q515", "Q200250", "Q1549591"]),
  institution: new Set(["Q43229", "Q327333", "Q163740"]),
};

const PHOTO_EXCLUSION_TERMS = [
  "coat of arms", "coat_of_arms", "arms of", "blason", "flag", "logo",
  "locator map", "location map", "map of", "map.", "diagram", "graph",
  "emblem", "seal", "pictogram", "icon", "symbol", "signature",
  "screenshot", "portrait", "headshot", "selfie", "profile photo",
  "official portrait", "adventurer",
] as const;

function claimEntityIds(entity: WikidataEntity, property: string): string[] {
  return (entity.claims?.[property] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter(
      (value): value is { id: string } =>
        typeof value === "object" &&
        value !== null &&
        "id" in value &&
        typeof value.id === "string",
    )
    .map((value) => value.id);
}

function claimString(entity: WikidataEntity, property: string): string | null {
  const value = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function claimCoordinate(
  entity: WikidataEntity,
): { latitude: number; longitude: number } | null {
  const value = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  if (
    typeof value !== "object" ||
    value === null ||
    !("latitude" in value) ||
    !("longitude" in value) ||
    typeof value.latitude !== "number" ||
    typeof value.longitude !== "number"
  ) {
    return null;
  }
  return { latitude: value.latitude, longitude: value.longitude };
}

function claimMediaFilename(entity: WikidataEntity, property: string): string | null {
  const value = entity.claims?.[property]?.[0]?.mainsnak?.datavalue?.value;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function namesMatch(expected: ExpectedEntity, entity: WikidataEntity): boolean {
  const expectedNames = [expected.canonicalName, ...(expected.aliases ?? [])]
    .map(normalize)
    .filter((value) => value.length >= 3);
  const candidateNames = [
    ...Object.values(entity.labels ?? {}).map((item) => item.value ?? ""),
    ...Object.values(entity.aliases ?? {}).flatMap((items) =>
      items.map((item) => item.value ?? ""),
    ),
  ].map(normalize);
  return expectedNames.some((name) =>
    candidateNames.some(
      (candidate) =>
        candidate === name ||
        (name.length >= 6 &&
          candidate.length >= 6 &&
          (candidate.startsWith(`${name} `) || name.startsWith(`${candidate} `))),
    ),
  );
}

export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function validateCandidateEntity(
  expected: ExpectedEntity,
  entity: WikidataEntity,
  enforceExpectedType = true,
): boolean {
  if (!namesMatch(expected, entity)) return false;
  const types = claimEntityIds(entity, "P31");
  if (types.some((qid) => REJECTED_TYPE_QIDS.has(qid))) return false;
  if (enforceExpectedType && expected.expectedTypes?.length && types.length > 0) {
    const allowed = new Set(
      expected.expectedTypes.flatMap((type) => [
        ...(EXPECTED_TYPE_QIDS[type] ?? []),
        ...(type.startsWith("Q") ? [type] : []),
      ]),
    );
    if (allowed.size > 0 && !types.some((qid) => allowed.has(qid))) {
      return false;
    }
  }
  if (expected.countryCode) {
    const countryQid = COUNTRY_QIDS[expected.countryCode];
    const countries = claimEntityIds(entity, "P17");
    if (countryQid && countries.length > 0 && !countries.includes(countryQid)) {
      return false;
    }
  }
  const coordinates = claimCoordinate(entity);
  if (
    coordinates &&
    expected.latitude != null &&
    expected.longitude != null &&
    distanceKm(coordinates, {
      latitude: expected.latitude,
      longitude: expected.longitude,
    }) > (expected.distanceThresholdKm ?? 60)
  ) {
    return false;
  }
  return true;
}

async function fetchJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal,
        next: { revalidate: REVALIDATE_SECONDS },
      });
      if (response.ok) return await response.json();
      if (![429, 502, 503, 504].includes(response.status)) return null;
    } catch {
      if (signal?.aborted) return null;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 400 * (attempt + 1)),
    );
  }
  return null;
}

async function fetchWikidataEntity(
  wikidataId: string,
  signal?: AbortSignal,
): Promise<WikidataEntity | null> {
  if (!/^Q[1-9]\d*$/.test(wikidataId)) return null;
  const cached = wikidataEntityCache.get(wikidataId);
  if (cached) return cached;
  const data = (await fetchJson(
    `https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json?v=${ENTITY_RESOLVER_VERSION}`,
    signal,
  )) as { entities?: Record<string, WikidataEntity> } | null;
  let entity = data?.entities?.[wikidataId] ?? null;
  if (!entity) {
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: wikidataId,
      props: "labels|aliases|descriptions|sitelinks|claims",
      origin: "*",
    });
    const fallback = (await fetchJson(
      `https://www.wikidata.org/w/api.php?${params.toString()}`,
      signal,
    )) as { entities?: Record<string, WikidataEntity> } | null;
    entity = fallback?.entities?.[wikidataId] ?? null;
  }
  if (entity && !("missing" in entity)) {
    wikidataEntityCache.set(wikidataId, entity);
    return entity;
  }
  return null;
}

type WikipediaPage = {
  pageid?: number;
  title?: string;
  extract?: string;
  description?: string;
  pageprops?: { wikibase_item?: string; disambiguation?: string };
  thumbnail?: { source?: string };
  fullurl?: string;
};

async function fetchWikipediaPage(
  locale: string,
  title: string,
  signal?: AbortSignal,
): Promise<WikipediaPage | null> {
  const cacheKey = `${locale}:${title}`;
  const cached = wikipediaPageCache.get(cacheKey);
  if (cached) return cached;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "pageprops|extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    piprop: "thumbnail",
    pithumbsize: "1280",
    inprop: "url",
    titles: title,
    origin: "*",
  });
  const data = (await fetchJson(
    `https://${locale}.wikipedia.org/w/api.php?${params.toString()}`,
    signal,
  )) as { query?: { pages?: WikipediaPage[] } } | null;
  const page = data?.query?.pages?.find((item) => item.pageid != null) ?? null;
  if (page) wikipediaPageCache.set(cacheKey, page);
  return page;
}

export async function primeWikipediaPages(
  locale: Locale,
  titles: string[],
  signal?: AbortSignal,
): Promise<number> {
  const unique = [...new Set(titles.filter(Boolean))];
  if (unique.length === 0) return 0;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "pageprops|extracts|pageimages|info",
    exintro: "1",
    explaintext: "1",
    piprop: "thumbnail",
    pithumbsize: "1280",
    inprop: "url",
    titles: unique.join("|"),
    origin: "*",
  });
  const data = (await fetchJson(
    `https://${locale}.wikipedia.org/w/api.php?${params.toString()}`,
    signal,
  )) as { query?: { pages?: WikipediaPage[] } } | null;
  let count = 0;
  for (const page of data?.query?.pages ?? []) {
    if (!page.title || page.pageid == null) continue;
    wikipediaPageCache.set(`${locale}:${page.title}`, page);
    count += 1;
  }
  return count;
}

async function verifiedPage(
  locale: Locale,
  title: string,
  expectedQid: string,
  method: ResolvedWikipediaEntity["verificationMethod"],
  signal?: AbortSignal,
): Promise<ResolvedWikipediaEntity | null> {
  const page = await fetchWikipediaPage(locale, title, signal);
  if (
    !page?.title ||
    page.pageprops?.wikibase_item !== expectedQid ||
    "disambiguation" in (page.pageprops ?? {})
  ) {
    return null;
  }
  return {
    wikidataId: expectedQid,
    locale,
    title: page.title,
    pageUrl:
      page.fullurl ??
      `https://${locale}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    description: page.description?.trim() || null,
    extract: page.extract?.trim().slice(0, 900) || null,
    thumbnailUrl: page.thumbnail?.source ?? null,
    verified: true,
    verificationMethod: method,
  };
}

async function resolveFromTextSearch(
  expected: ExpectedEntity,
  locale: Locale,
  signal?: AbortSignal,
): Promise<ResolvedWikipediaEntity | null> {
  const context = expected.searchContext?.trim();
  if (!context) return null;
  const query = `${expected.canonicalName} ${context}`.trim();
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "0",
    gsrlimit: "5",
    prop: "pageprops",
    origin: "*",
  });
  const data = (await fetchJson(
    `https://${locale}.wikipedia.org/w/api.php?${params.toString()}`,
    signal,
  )) as { query?: { pages?: WikipediaPage[] } } | null;
  for (const candidate of data?.query?.pages ?? []) {
    const qid = candidate.pageprops?.wikibase_item;
    if (!qid || !candidate.title || candidate.pageprops?.disambiguation != null) {
      continue;
    }
    const entity = await fetchWikidataEntity(qid, signal);
    if (!entity || !validateCandidateEntity(expected, entity, true)) continue;
    const resolved = await verifiedPage(
      locale,
      candidate.title,
      qid,
      "validated-search-result",
      signal,
    );
    if (resolved) return resolved;
  }
  return null;
}

export async function resolveWikipediaEntity(
  expected: ExpectedEntity,
  locale: Locale,
  signal?: AbortSignal,
): Promise<ResolvedWikipediaEntity | null> {
  if (expected.wikidataId) {
    const entity = await fetchWikidataEntity(expected.wikidataId, signal);
    if (!entity || !validateCandidateEntity(expected, entity, false)) return null;
    const preferred =
      entity.sitelinks?.[`${locale}wiki`]?.title ??
      entity.sitelinks?.enwiki?.title ??
      null;
    if (preferred) {
      const pageLocale = entity.sitelinks?.[`${locale}wiki`]?.title ? locale : "en";
      const result = await verifiedPage(
        pageLocale as Locale,
        preferred,
        expected.wikidataId,
        "wikidata-sitelink",
        signal,
      );
      if (result) return result;
    }
    const explicit =
      expected.wikipediaTitles?.[locale] ?? expected.wikipediaTitles?.en ?? null;
    if (explicit) {
      const explicitLocale = expected.wikipediaTitles?.[locale] ? locale : "en";
      return verifiedPage(
        explicitLocale as Locale,
        explicit,
        expected.wikidataId,
        "explicit-title-and-qid",
        signal,
      );
    }
    return null;
  }

  const explicit =
    expected.wikipediaTitles?.[locale] ?? expected.wikipediaTitles?.en ?? null;
  if (explicit) {
    const pageLocale = expected.wikipediaTitles?.[locale] ? locale : "en";
    const page = await fetchWikipediaPage(pageLocale, explicit, signal);
    const qid = page?.pageprops?.wikibase_item;
    if (
      !qid ||
      !page?.title ||
      page.pageprops?.disambiguation != null
    ) {
      return null;
    }
    const entity = await fetchWikidataEntity(qid, signal);
    if (!entity || !validateCandidateEntity(expected, entity, true)) return null;
    return verifiedPage(
      pageLocale as Locale,
      page.title,
      qid,
      "explicit-title-and-qid",
      signal,
    );
  }

  return resolveFromTextSearch(expected, locale, signal);
}

function stripHtml(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return result || null;
}

function metadataValue(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | null {
  const item = metadata?.[key];
  if (!item || typeof item !== "object" || !("value" in item)) return null;
  return stripHtml(item.value);
}

export function isRelevantTourismImage(
  title: string,
  mime: string | null,
  width: number | null,
  height: number | null,
): boolean {
  const normalized = title.toLocaleLowerCase();
  if (mime === "image/svg+xml" || /\.svg(?:$|\?)/i.test(title)) return false;
  if (mime && !["image/jpeg", "image/png", "image/webp"].includes(mime)) return false;
  if (PHOTO_EXCLUSION_TERMS.some((term) => normalized.includes(term))) return false;
  if (width != null && height != null && (width < 800 || height < 500)) return false;
  return true;
}

async function fetchCommonsFile(
  filename: string,
  signal?: AbortSignal,
  thumbWidth = 1280,
): Promise<{ image: ResolvedWikimediaImage | null; rejected: boolean }> {
  const title = filename.startsWith("File:") ? filename : `File:${filename}`;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(thumbWidth),
    origin: "*",
  });
  const data = (await fetchJson(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
    signal,
  )) as {
    query?: {
      pages?: Array<{
        title?: string;
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          width?: number;
          height?: number;
          mime?: string;
          descriptionurl?: string;
          extmetadata?: Record<string, unknown>;
        }>;
      }>;
    };
  } | null;
  const page = data?.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!page?.title || !info?.url) return { image: null, rejected: false };
  if (
    !isRelevantTourismImage(
      page.title,
      info.mime ?? null,
      info.width ?? null,
      info.height ?? null,
    )
  ) {
    return { image: null, rejected: true };
  }
  const author =
    metadataValue(info.extmetadata, "Artist") ??
    metadataValue(info.extmetadata, "Credit");
  const license =
    metadataValue(info.extmetadata, "LicenseShortName") ??
    metadataValue(info.extmetadata, "License");
  if (!author || !license) return { image: null, rejected: true };
  return {
    rejected: false,
    image: {
      url: info.url,
      thumbnailUrl: info.thumburl ?? null,
      width: info.width ?? null,
      height: info.height ?? null,
      title: page.title,
      author,
      license,
      licenseUrl: metadataValue(info.extmetadata, "LicenseUrl"),
      sourceUrl: info.descriptionurl ?? null,
    },
  };
}

async function categoryFiles(
  category: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmnamespace: "6",
    cmtype: "file",
    cmlimit: "30",
    origin: "*",
  });
  const data = (await fetchJson(
    `https://commons.wikimedia.org/w/api.php?${params.toString()}`,
    signal,
  )) as { query?: { categorymembers?: Array<{ title?: string }> } } | null;
  return (data?.query?.categorymembers ?? [])
    .map((item) => item.title)
    .filter((title): title is string => Boolean(title));
}

async function wikipediaPageFiles(
  entity: ResolvedWikipediaEntity,
  signal?: AbortSignal,
): Promise<string[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "images",
    titles: entity.title,
    gimlimit: "30",
    prop: "info",
    origin: "*",
  });
  const data = (await fetchJson(
    `https://${entity.locale}.wikipedia.org/w/api.php?${params.toString()}`,
    signal,
  )) as { query?: { pages?: Array<{ title?: string }> } } | null;
  return (data?.query?.pages ?? [])
    .map((item) => item.title)
    .filter((title): title is string => Boolean(title));
}

export async function resolveEntityEnrichment(
  expected: ExpectedEntity,
  locale: Locale,
  signal?: AbortSignal,
  imageLimit = 5,
): Promise<ResolvedEntityEnrichment> {
  const warnings: string[] = [];
  const entity = await resolveWikipediaEntity(expected, locale, signal);
  if (!entity) warnings.push("wikipedia_entity_not_verified");
  let wikidata: WikidataEntity | null = null;
  if (entity) wikidata = await fetchWikidataEntity(entity.wikidataId, signal);
  const candidates: string[] = [];
  const p18 = wikidata ? claimMediaFilename(wikidata, "P18") : null;
  if (p18) candidates.push(p18);
  const commonsCategory = wikidata ? claimString(wikidata, "P373") : null;
  if (commonsCategory) {
    candidates.push(...(await categoryFiles(commonsCategory, signal)));
  }
  if (entity) {
    candidates.push(...(await wikipediaPageFiles(entity, signal)));
  }

  const images: ResolvedWikimediaImage[] = [];
  const seen = new Set<string>();
  let imagesRejected = 0;
  for (const filename of candidates) {
    if (images.length >= imageLimit) break;
    const key = filename.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const result = await fetchCommonsFile(filename, signal);
    if (result.rejected) imagesRejected += 1;
    if (result.image) images.push(result.image);
  }
  if (images.length === 0) warnings.push("wikimedia_images_not_verified");
  return {
    entity,
    images,
    warnings,
    resolverVersion: ENTITY_RESOLVER_VERSION,
    imagesRejected,
  };
}

/** Fast path for map markers: Wikidata P18 only, small Commons thumb. */
export async function resolvePrimaryMarkerImage(
  wikidataId: string,
  signal?: AbortSignal,
): Promise<ResolvedWikimediaImage | null> {
  const entity = await fetchWikidataEntity(wikidataId, signal);
  if (!entity) return null;
  const p18 = claimMediaFilename(entity, "P18");
  if (!p18) return null;
  const result = await fetchCommonsFile(p18, signal, 96);
  return result.image;
}

export async function auditExpectedEntity(
  expected: ExpectedEntity,
  locale: Locale = "en",
  signal?: AbortSignal,
): Promise<{
  wikidataId: string | null;
  validQid: boolean;
  nameMatches: boolean;
  countryMatches: boolean;
  distanceKm: number | null;
  hasSitelink: boolean;
  imageRejected: boolean;
}> {
  if (!expected.wikidataId) {
    return {
      wikidataId: null,
      validQid: false,
      nameMatches: false,
      countryMatches: false,
      distanceKm: null,
      hasSitelink: false,
      imageRejected: false,
    };
  }
  const entity = await fetchWikidataEntity(expected.wikidataId, signal);
  if (!entity) {
    return {
      wikidataId: expected.wikidataId,
      validQid: false,
      nameMatches: false,
      countryMatches: false,
      distanceKm: null,
      hasSitelink: false,
      imageRejected: false,
    };
  }
  const countries = claimEntityIds(entity, "P17");
  const countryQid = expected.countryCode
    ? COUNTRY_QIDS[expected.countryCode]
    : null;
  const coordinate = claimCoordinate(entity);
  return {
    wikidataId: expected.wikidataId,
    validQid: true,
    nameMatches: namesMatch(expected, entity),
    countryMatches:
      !countryQid || countries.length === 0 || countries.includes(countryQid),
    distanceKm:
      coordinate && expected.latitude != null && expected.longitude != null
        ? distanceKm(coordinate, {
            latitude: expected.latitude,
            longitude: expected.longitude,
          })
        : null,
    hasSitelink: Boolean(
      entity.sitelinks?.[`${locale}wiki`]?.title ??
        entity.sitelinks?.enwiki?.title,
    ),
    imageRejected: (() => {
      const image = claimMediaFilename(entity, "P18");
      return image
        ? !isRelevantTourismImage(image, null, null, null)
        : false;
    })(),
  };
}

export async function auditExpectedEntities(
  expectedEntities: ExpectedEntity[],
  locale: Locale = "en",
  signal?: AbortSignal,
): Promise<Array<Awaited<ReturnType<typeof auditExpectedEntity>>>> {
  const entityByQid = new Map<string, WikidataEntity>();
  const qids = [
    ...new Set(
      expectedEntities
        .map((expected) => expected.wikidataId)
        .filter((qid): qid is string => Boolean(qid)),
    ),
  ];
  for (let index = 0; index < qids.length; index += 40) {
    const batch = qids.slice(index, index + 40);
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: batch.join("|"),
      props: "labels|aliases|descriptions|sitelinks|claims",
      origin: "*",
    });
    const data = (await fetchJson(
      `https://www.wikidata.org/w/api.php?${params.toString()}`,
      signal,
    )) as { entities?: Record<string, WikidataEntity> } | null;
    for (const [qid, entity] of Object.entries(data?.entities ?? {})) {
      if (!("missing" in entity)) {
        entityByQid.set(qid, entity);
        wikidataEntityCache.set(qid, entity);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return expectedEntities.map((expected) => {
    const qid = expected.wikidataId;
    const entity = qid ? entityByQid.get(qid) ?? null : null;
    if (!qid) {
      return {
        wikidataId: null,
        validQid: false,
        nameMatches: false,
        countryMatches: false,
        distanceKm: null,
        hasSitelink: false,
        imageRejected: false,
      };
    }
    if (!entity) {
      return {
        wikidataId: qid,
        validQid: false,
        nameMatches: false,
        countryMatches: false,
        distanceKm: null,
        hasSitelink: false,
        imageRejected: false,
      };
    }
    const countries = claimEntityIds(entity, "P17");
    const countryQid = expected.countryCode
      ? COUNTRY_QIDS[expected.countryCode]
      : null;
    const coordinate = claimCoordinate(entity);
    const image = claimMediaFilename(entity, "P18");
    return {
      wikidataId: qid,
      validQid: true,
      nameMatches: namesMatch(expected, entity),
      countryMatches:
        !countryQid || countries.length === 0 || countries.includes(countryQid),
      distanceKm:
        coordinate && expected.latitude != null && expected.longitude != null
          ? distanceKm(coordinate, {
              latitude: expected.latitude,
              longitude: expected.longitude,
            })
          : null,
      hasSitelink: Boolean(
        entity.sitelinks?.[`${locale}wiki`]?.title ??
          entity.sitelinks?.enwiki?.title,
      ),
      imageRejected: image
        ? !isRelevantTourismImage(image, null, null, null)
        : false,
    };
  });
}
