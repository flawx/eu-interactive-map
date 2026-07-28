import * as cheerio from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  distanceKm,
} from "../lib/enrichment/wikimediaEntityResolver";
import type {
  EuropeanHeritageLabelDataset,
  EuropeanHeritageLabelEntityIdentityType,
} from "../lib/tourism/europeanHeritageLabel";

type Claim = {
  mainsnak?: { datavalue?: { value?: unknown } };
};

type Entity = {
  id?: string;
  missing?: string;
  labels?: Record<string, { value?: string }>;
  aliases?: Record<string, Array<{ value?: string }>>;
  descriptions?: Record<string, { value?: string }>;
  sitelinks?: Record<string, { title?: string }>;
  claims?: Record<string, Claim[]>;
};

type Candidate = {
  qid: string;
  label: string;
  distanceKm: number | null;
  countries: string[];
  types: Array<{ qid: string; label: string }>;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
};

const DATA_PATH = "data/european-heritage-label-sites.json";
const USER_AGENT = "EUInteractiveMap/0.2 (EHL identity repair; local-dev)";
const REJECTED_TYPES = new Set(["Q5", "Q4167410", "Q11424", "Q7366"]);
const COUNTRY_QIDS: Record<string, string> = {
  AT: "Q40", BE: "Q31", BG: "Q219", HR: "Q224", CY: "Q229",
  CZ: "Q213", DK: "Q35", EE: "Q191", FI: "Q33", FR: "Q142",
  DE: "Q183", EL: "Q41", HU: "Q28", IE: "Q27", IT: "Q38",
  LV: "Q211", LT: "Q37", LU: "Q32", MT: "Q233", NL: "Q55",
  PL: "Q36", PT: "Q45", RO: "Q218", SK: "Q214", SI: "Q215",
  ES: "Q29", SE: "Q34",
};
const COMPATIBLE_TYPE = /\b(abbey|archaeological|archive|architectural|building|castle|cathedral|cemetery|chapel|church|city|cultural|district|estate|fort|garden|hall|heritage|historic|hospital|house|industrial|landscape|memorial|monastery|monument|museum|palace|park|prison|religious|settlement|site|synagogue|theatre|town|university|village)\b/i;
const CURATED_HIGH_LOCATION_QIDS: Record<string, string> = {
  "ehl-hambach-castle-germany-loc-1": "Q523286",
  "ehl-robert-schumans-house-scy-chazelles-france-loc-1": "Q3279544",
  "ehl-the-historic-gdansk-shipyard-poland-loc-1": "Q1736541",
  "ehl-village-of-schengen-luxembourg-loc-1": "Q3916795",
  "ehl-ventotene-italy-loc-1": "Q128230",
  "ehl-leipzigs-musical-heritage-sites-germany-loc-1": "Q170402",
  "ehl-leipzigs-musical-heritage-sites-germany-loc-2": "Q519613",
};

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(the|a|an|of|and|in|at|le|la|les|de|des|du|der|die|das)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function claimIds(entity: Entity, property: string): string[] {
  return (entity.claims?.[property] ?? [])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter(
      (value): value is { id: string } =>
        Boolean(value) &&
        typeof value === "object" &&
        "id" in value! &&
        typeof value.id === "string",
    )
    .map((value) => value.id);
}

function coordinate(entity: Entity): { latitude: number; longitude: number } | null {
  const value = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
  if (
    !value ||
    typeof value !== "object" ||
    !("latitude" in value) ||
    !("longitude" in value) ||
    typeof value.latitude !== "number" ||
    typeof value.longitude !== "number"
  ) {
    return null;
  }
  return { latitude: value.latitude, longitude: value.longitude };
}

function entityNames(entity: Entity): string[] {
  return [
    ...Object.values(entity.labels ?? {}).map((item) => item.value ?? ""),
    ...Object.values(entity.aliases ?? {}).flatMap((items) =>
      items.map((item) => item.value ?? ""),
    ),
    ...Object.values(entity.sitelinks ?? {}).map((item) => item.title ?? ""),
  ].filter(Boolean);
}

function entityLabel(entity: Entity): string {
  return entity.labels?.en?.value ??
    entity.labels?.fr?.value ??
    Object.values(entity.labels ?? {})[0]?.value ??
    entity.id ??
    "";
}

async function fetchText(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "text/html,application/json", "User-Agent": USER_AGENT },
      });
      if (response.ok) return response.text();
      if (![429, 502, 503, 504].includes(response.status)) return null;
    } catch {
      // Retry official and Wikimedia transient failures.
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  return null;
}

async function fetchJson(url: string): Promise<unknown | null> {
  const text = await fetchText(url);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function searchQids(search: string): Promise<string[]> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const params = new URLSearchParams({
      action: "wbsearchentities",
      format: "json",
      language: "en",
      uselang: "en",
      type: "item",
      limit: "12",
      search,
      origin: "*",
    });
    const data = (await fetchJson(
      `https://www.wikidata.org/w/api.php?${params.toString()}`,
    )) as { search?: Array<{ id?: string }> } | null;
    const qids = (data?.search ?? [])
      .map((item) => item.id)
      .filter((qid): qid is string => Boolean(qid));
    if (qids.length > 0) return qids;
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  return [];
}

async function fetchEntities(qids: string[]): Promise<Map<string, Entity>> {
  const result = new Map<string, Entity>();
  const unique = [...new Set(qids)];
  for (let pass = 0; pass < 3; pass += 1) {
    const pending = unique.filter((qid) => !result.has(qid));
    for (let index = 0; index < pending.length; index += 15) {
      const params = new URLSearchParams({
        action: "wbgetentities",
        format: "json",
        ids: pending.slice(index, index + 15).join("|"),
        props: "labels|aliases|descriptions|sitelinks|claims",
        languages: "en|fr|de|it|es|nl|pl",
        origin: "*",
      });
      const data = (await fetchJson(
        `https://www.wikidata.org/w/api.php?${params.toString()}`,
      )) as { entities?: Record<string, Entity> } | null;
      for (const [qid, entity] of Object.entries(data?.entities ?? {})) {
        if (!entity.missing) result.set(qid, entity);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return result;
}

function officialSummary(html: string): string | null {
  const $ = cheerio.load(html);
  const ignored = /feedback|captcha|accessib|cookie|last updated|find out more/i;
  const paragraphs = $("main p, article p")
    .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
    .get()
    .filter((text) => text.length >= 80 && !ignored.test(text));
  const unique = [...new Set(paragraphs)];
  if (unique.length === 0) return null;
  return unique.slice(0, 4).join("\n\n").slice(0, 1_800);
}

function identityType(
  transnational: boolean,
  serial: boolean,
  hasExactEntity: boolean,
): EuropeanHeritageLabelEntityIdentityType {
  if (transnational) return "transnational-network";
  if (serial) return "serial-site";
  return hasExactEntity ? "single-entity" : "official-only";
}

async function inventory(dataset: EuropeanHeritageLabelDataset): Promise<void> {
  await mkdir("tmp", { recursive: true });
  const anomalies = dataset.sites.map((site) => ({
    siteId: site.id,
    canonicalName: site.canonicalName,
    awardYear: site.awardYear,
    countryCodes: site.countryCodes,
    transnational: site.transnational,
    serial: site.serial,
    officialCommissionUrl: site.officialCommissionUrl,
    currentQid: site.wikidataId,
    locations: site.locations.map((location) => ({
      id: location.id,
      name: location.name,
      countryCode: location.countryCode,
      latitude: location.latitude,
      longitude: location.longitude,
      wikidataId: location.wikidataId ?? null,
      officialUrl: location.officialUrl ?? null,
    })),
    rejectionReasons: site.wikidataId ? ["unverified_qid"] : ["missing_qid"],
  }));
  await writeFile(
    "tmp/ehl-entity-anomalies.json",
    `${JSON.stringify(anomalies, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({ anomalies: anomalies.length }, null, 2));
}

async function repair(dataset: EuropeanHeritageLabelDataset): Promise<void> {
  const locationSearches = new Map<string, string[]>();
  const locations = dataset.sites.flatMap((site) => site.locations);
  for (let index = 0; index < locations.length; index += 3) {
    await Promise.all(
      locations.slice(index, index + 3).map(async (location) => {
        locationSearches.set(location.id, await searchQids(location.name));
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const entities = await fetchEntities([...locationSearches.values()].flat());
  const typeEntities = await fetchEntities(
    [...entities.values()].flatMap((entity) => claimIds(entity, "P31")),
  );
  const reviews: Array<{
    site: string;
    location: string;
    candidateQid: string;
    distanceKm: number | null;
    country: string;
    types: Array<{ qid: string; label: string }>;
    reason: string;
  }> = [];

  const candidatesByLocation = new Map<string, Candidate>();
  for (const site of dataset.sites) {
    for (const location of site.locations) {
      const expectedName = normalize(location.name);
      const expectedCountry = COUNTRY_QIDS[location.countryCode];
      const candidates = (locationSearches.get(location.id) ?? []).flatMap((qid) => {
        const entity = entities.get(qid);
        if (!entity) return [];
        const typeQids = claimIds(entity, "P31");
        if (typeQids.some((type) => REJECTED_TYPES.has(type))) return [];
        const names = entityNames(entity).map(normalize);
        const exactName = names.includes(expectedName);
        const point = coordinate(entity);
        const candidateDistance = point
          ? distanceKm(point, {
              latitude: location.latitude,
              longitude: location.longitude,
            })
          : null;
        const countries = claimIds(entity, "P17");
        const countryMatches =
          Boolean(expectedCountry) && countries.includes(expectedCountry);
        const types = typeQids.map((type) => ({
          qid: type,
          label: entityLabel(typeEntities.get(type) ?? { id: type }),
        }));
        const typeText = [
          ...types.map((type) => type.label),
          ...Object.values(entity.descriptions ?? {}).map((item) => item.value ?? ""),
        ].join(" ");
        const typeMatches = COMPATIBLE_TYPE.test(typeText);
        const hasWikipediaPage = Boolean(
          entity.sitelinks?.enwiki?.title ?? entity.sitelinks?.frwiki?.title,
        );
        const withinDistance =
          candidateDistance != null && candidateDistance <= 10;
        const high =
          exactName && countryMatches && withinDistance && typeMatches &&
          hasWikipediaPage;
        const medium =
          !high && exactName && withinDistance && hasWikipediaPage &&
          (countryMatches || countries.length === 0);
        return [{
          qid,
          label: entityLabel(entity),
          distanceKm:
            candidateDistance == null
              ? null
              : Math.round(candidateDistance * 10) / 10,
          countries,
          types,
          confidence: high ? "HIGH" as const : medium ? "MEDIUM" as const : "LOW" as const,
          reason: high
            ? "official_location_exact_name_country_coordinates_type"
            : medium
              ? "exact_location_but_country_or_type_requires_review"
              : "candidate_failed_structured_validation",
        }];
      });
      const high = candidates.filter((candidate) => candidate.confidence === "HIGH");
      const medium = candidates.filter((candidate) => candidate.confidence === "MEDIUM");
      const selected =
        high.length === 1
          ? high[0]
          : medium.sort(
              (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
            )[0] ?? null;
      if (high.length === 1 && selected) {
        candidatesByLocation.set(location.id, selected);
      } else if (selected || high.length > 1) {
        const review = selected ?? high[0];
        reviews.push({
          site: site.id,
          location: location.id,
          candidateQid: review.qid,
          distanceKm: review.distanceKm,
          country: location.countryCode,
          types: review.types,
          reason:
            high.length > 1
              ? `multiple_high_candidates:${high.map((item) => item.qid).join(",")}`
              : review.reason,
        });
      }
    }
  }

  const summaries = new Map<string, string | null>();
  for (let index = 0; index < dataset.sites.length; index += 4) {
    await Promise.all(
      dataset.sites.slice(index, index + 4).map(async (site) => {
        const html = await fetchText(site.officialCommissionUrl);
        summaries.set(site.id, html ? officialSummary(html) : null);
      }),
    );
  }

  let logicalQids = 0;
  let locationQids = 0;
  for (const site of dataset.sites) {
    for (const location of site.locations) {
      const candidate = candidatesByLocation.get(location.id);
      location.wikidataId = candidate?.qid ?? null;
      location.officialUrl = null;
      if (candidate) locationQids += 1;
    }
    const soleLocation = site.locations.length === 1 ? site.locations[0] : null;
    const locationQid = soleLocation?.wikidataId ?? null;
    const logicalNameMatches =
      soleLocation != null &&
      (normalize(site.canonicalName).includes(normalize(soleLocation.name)) ||
        normalize(soleLocation.name).includes(normalize(site.canonicalName)));
    const canUseLogicalQid =
      !site.serial && !site.transnational && Boolean(locationQid) &&
      logicalNameMatches;
    site.wikidataId = canUseLogicalQid ? locationQid : null;
    if (site.wikidataId) logicalQids += 1;
    site.entityIdentityType = identityType(
      site.transnational,
      site.serial,
      canUseLogicalQid,
    );
    site.officialSummary = summaries.get(site.id) ?? null;
  }

  await writeFile(DATA_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  await writeFile(
    "tmp/ehl-entity-repair-review.json",
    `${JSON.stringify(reviews, null, 2)}\n`,
    "utf8",
  );
  const classifications = Object.fromEntries(
    ["single-entity", "serial-site", "transnational-network", "official-only"]
      .map((type) => [
        type,
        dataset.sites.filter((site) => site.entityIdentityType === type).length,
      ]),
  );
  console.log(JSON.stringify({
    searchesWithCandidates: [...locationSearches.values()]
      .filter((qids) => qids.length > 0).length,
    candidateEntitiesLoaded: entities.size,
    logicalQids,
    locationQids,
    medium: reviews.length,
    classifications,
    sitesWithoutOfficialSummary: dataset.sites
      .filter((site) => !site.officialSummary)
      .map((site) => site.id),
  }, null, 2));
}

async function applyCurated(dataset: EuropeanHeritageLabelDataset): Promise<void> {
  let logicalQids = 0;
  let locationQids = 0;
  for (const site of dataset.sites) {
    for (const location of site.locations) {
      location.wikidataId = CURATED_HIGH_LOCATION_QIDS[location.id] ?? null;
      location.officialUrl ??= null;
      if (location.wikidataId) locationQids += 1;
    }
    const soleLocation = site.locations.length === 1 ? site.locations[0] : null;
    site.wikidataId =
      !site.serial && !site.transnational
        ? soleLocation?.wikidataId ?? null
        : null;
    if (site.wikidataId) logicalQids += 1;
    site.entityIdentityType = identityType(
      site.transnational,
      site.serial,
      Boolean(site.wikidataId),
    );
  }
  await writeFile(DATA_PATH, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    logicalQids,
    locationQids,
    classifications: Object.fromEntries(
      ["single-entity", "serial-site", "transnational-network", "official-only"]
        .map((type) => [
          type,
          dataset.sites.filter((site) => site.entityIdentityType === type).length,
        ]),
    ),
  }, null, 2));
}

async function main(): Promise<void> {
  const dataset = JSON.parse(
    await readFile(DATA_PATH, "utf8"),
  ) as EuropeanHeritageLabelDataset;
  if (process.argv.includes("--inventory")) {
    await inventory(dataset);
    return;
  }
  if (process.argv.includes("--repair")) {
    await repair(dataset);
    return;
  }
  if (process.argv.includes("--apply-curated")) {
    await applyCurated(dataset);
    return;
  }
  throw new Error("Use --inventory, --repair or --apply-curated");
}

void main();
