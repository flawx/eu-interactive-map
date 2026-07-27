import "server-only";

import type { TransportImage } from "@/lib/transport/transportDetails";

const USER_AGENT = "EUInteractiveMap/0.1 (educational; contact: local-dev)";
const FETCH_TIMEOUT_MS = 10_000;

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

function isExcludedPhoto(title: string | null, url: string): boolean {
  const haystack = `${title ?? ""} ${url}`.toLowerCase();
  return PHOTO_EXCLUSION_TERMS.some((term) => haystack.includes(term));
}

async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal,
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchWikidataWikipediaUrl(
  wikidataId: string,
  locale: string,
  signal: AbortSignal,
): Promise<string | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikidataId)}.json`;
  const json = (await fetchJson(url, signal)) as {
    entities?: Record<
      string,
      {
        sitelinks?: Record<string, { url?: string }>;
        claims?: Record<string, Array<{ mainsnak?: { datavalue?: { value?: unknown } } }>>;
      }
    >;
  } | null;
  if (!json?.entities?.[wikidataId]) return null;
  const entity = json.entities[wikidataId];
  const sitelinks = entity.sitelinks ?? {};
  const preferred =
    sitelinks[`${locale}wiki`]?.url ??
    sitelinks.enwiki?.url ??
    sitelinks.frwiki?.url ??
    null;
  return preferred;
}

export async function fetchWikidataOpenedYear(
  wikidataId: string,
  signal: AbortSignal,
): Promise<number | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikidataId)}.json`;
  const json = (await fetchJson(url, signal)) as {
    entities?: Record<
      string,
      {
        claims?: Record<
          string,
          Array<{
            mainsnak?: {
              datavalue?: { value?: { time?: string } | string };
            };
          }>
        >;
      }
    >;
  } | null;
  const claims = json?.entities?.[wikidataId]?.claims?.P1619 ??
    json?.entities?.[wikidataId]?.claims?.P571;
  const raw = claims?.[0]?.mainsnak?.datavalue?.value;
  const time =
    typeof raw === "object" && raw && "time" in raw
      ? raw.time
      : typeof raw === "string"
        ? raw
        : null;
  if (!time) return null;
  const year = Number.parseInt(time.replace(/^\+/, "").slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export async function fetchCommonsImagesForSearch(
  searchTerms: string[],
  signal: AbortSignal,
  limit = 5,
): Promise<TransportImage[]> {
  const images: TransportImage[] = [];
  const seen = new Set<string>();

  for (const term of searchTerms) {
    if (images.length >= limit || signal.aborted) break;
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(term)}&srnamespace=6&srlimit=8&format=json&origin=*`;
    const searchJson = (await fetchJson(searchUrl, signal)) as {
      query?: { search?: Array<{ title: string }> };
    } | null;
    const titles = (searchJson?.query?.search ?? [])
      .map((item) => item.title)
      .filter(Boolean)
      .slice(0, 6);
    if (!titles.length) continue;

    const infoUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles.join("|"))}&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=1280&format=json&origin=*`;
    const infoJson = (await fetchJson(infoUrl, signal)) as {
      query?: {
        pages?: Record<
          string,
          {
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
          }
        >;
      };
    } | null;

    for (const page of Object.values(infoJson?.query?.pages ?? {})) {
      if (images.length >= limit) break;
      const info = page.imageinfo?.[0];
      if (!info?.url || !info.mime?.startsWith("image/")) continue;
      if (isExcludedPhoto(page.title ?? null, info.url)) continue;
      if (seen.has(info.url)) continue;
      seen.add(info.url);
      const meta = info.extmetadata ?? null;
      const author =
        metadataValue(meta, "Artist") ?? metadataValue(meta, "Credit");
      const license =
        metadataValue(meta, "LicenseShortName") ??
        metadataValue(meta, "License");
      if (!author || !license) continue;
      images.push({
        url: info.url,
        thumbnailUrl: info.thumburl ?? null,
        width: info.width ?? null,
        height: info.height ?? null,
        title: page.title ?? null,
        author,
        license,
        licenseUrl: metadataValue(meta, "LicenseUrl"),
        sourceUrl: info.descriptionurl ?? null,
      });
    }
  }

  return images;
}

export function withTimeoutSignal(parent?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  parent?.addEventListener("abort", () => {
    clearTimeout(timer);
    controller.abort();
  });
  return controller.signal;
}
