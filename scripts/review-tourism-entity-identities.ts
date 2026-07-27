import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  auditExpectedEntities,
  distanceKm,
  type ExpectedEntity,
} from "../lib/enrichment/wikimediaEntityResolver";
import { EUROPEAN_MOUNTAIN_PLACES } from "../lib/tourism/europeanMountainDestinations";
import { MAJOR_TOURIST_PLACES } from "../lib/tourism/majorTouristPlaces";

type DatasetName =
  | "europeanMountainDestinations"
  | "majorTouristPlaces";

type LocalEntry = {
  dataset: DatasetName;
  id: string;
  canonicalName: string;
  aliases: string[];
  countryCode: string;
  latitude: number;
  longitude: number;
  category: string;
  currentQid: string | null;
  rejectionReasons: string[];
  thresholdKm: number;
};

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

type CandidateReview = {
  entry: LocalEntry;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  candidate: {
    qid: string;
    label: string;
    distanceKm: number | null;
    countries: string[];
    types: Array<{ qid: string; label: string }>;
    wikipediaTitles: { en: string | null; fr: string | null };
  } | null;
  reason: string;
};

const USER_AGENT = "EUInteractiveMap/0.2 (entity repair review; local-dev)";

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

const REJECTED_TYPES = new Set(["Q5", "Q4167410", "Q11424", "Q7366"]);

const TYPE_PATTERNS: Record<string, RegExp> = {
  ski_resort: /\b(ski|winter sports|skiing|resort|station de sports d'hiver)\b/i,
  mountain_destination: /\b(mountain|alpine|ski|resort|village|municipality|commune|valley|town)\b/i,
  iconic_peak: /\b(mountain|peak|summit|pic|volcano)\b/i,
  mountain_range: /\b(mountain range|mountains|massif|range|chaîne de montagnes)\b/i,
  landmark: /\b(monument|castle|palace|building|tower|cathedral|church|bridge|gate|fort|architectural|archaeological site|amphitheatre)\b/i,
  historic_area: /\b(historic|old town|old city|quarter|district|urban|city|town|archaeological site|world heritage)\b/i,
  museum: /\b(museum|gallery)\b/i,
  park_garden: /\b(park|garden|botanical)\b/i,
  natural_landscape: /\b(natural|lake|cliff|valley|park|forest|waterfall|fjord|cave|landscape|mountain|volcano|geological)\b/i,
  coastal_destination: /\b(island|coast|coastal|seaside|beach|archipelago|resort|municipality|town|village)\b/i,
};

function thresholdFor(dataset: DatasetName, category: string): number {
  if (dataset === "europeanMountainDestinations") {
    if (category === "ski_resort") return 35;
    if (category === "iconic_peak") return 15;
    if (category === "mountain_range") return 120;
    return 30;
  }
  if (category === "natural_landscape" || category === "coastal_destination") {
    return 80;
  }
  if (category === "mountain_destination") return 30;
  return 10;
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(the|le|la|les|l|de|des|du|d|of|di|del|der|die|das)\b/g, " ")
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

function names(entity: Entity): string[] {
  return [
    ...Object.values(entity.labels ?? {}).map((item) => item.value ?? ""),
    ...Object.values(entity.aliases ?? {}).flatMap((items) =>
      items.map((item) => item.value ?? ""),
    ),
    ...Object.values(entity.sitelinks ?? {}).map((item) => item.title ?? ""),
  ].filter(Boolean);
}

function label(entity: Entity): string {
  return (
    entity.labels?.en?.value ??
    entity.labels?.fr?.value ??
    Object.values(entity.labels ?? {})[0]?.value ??
    entity.id ??
    ""
  );
}

async function fetchJson(url: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      });
      if (response.ok) return response.json();
      if (![429, 502, 503, 504].includes(response.status)) return null;
    } catch {
      // Retry transient Wikimedia failures.
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  return null;
}

async function searchQids(term: string, language: "en" | "fr"): Promise<string[]> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language,
    uselang: language,
    type: "item",
    limit: "12",
    search: term,
    origin: "*",
  });
  const data = (await fetchJson(
    `https://www.wikidata.org/w/api.php?${params.toString()}`,
  )) as { search?: Array<{ id?: string }> } | null;
  return (data?.search ?? [])
    .map((item) => item.id)
    .filter((id): id is string => Boolean(id));
}

async function fetchEntities(qids: string[]): Promise<Map<string, Entity>> {
  const entities = new Map<string, Entity>();
  const unique = [...new Set(qids)];
  for (let index = 0; index < unique.length; index += 40) {
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: unique.slice(index, index + 40).join("|"),
      props: "labels|aliases|descriptions|sitelinks|claims",
      languages: "en|fr|de|it|es",
      origin: "*",
    });
    const data = (await fetchJson(
      `https://www.wikidata.org/w/api.php?${params.toString()}`,
    )) as { entities?: Record<string, Entity> } | null;
    for (const [qid, entity] of Object.entries(data?.entities ?? {})) {
      if (!entity.missing) entities.set(qid, entity);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return entities;
}

function buildEntries(): LocalEntry[] {
  return [
    ...EUROPEAN_MOUNTAIN_PLACES.map((place) => ({
      dataset: "europeanMountainDestinations" as const,
      id: place.id,
      canonicalName: place.canonicalName,
      aliases: [...place.aliases],
      countryCode: place.countryCodes[0] ?? "",
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
      currentQid: place.wikidataId,
      rejectionReasons: [] as string[],
      thresholdKm: thresholdFor("europeanMountainDestinations", place.category),
    })),
    ...MAJOR_TOURIST_PLACES.map((place) => ({
      dataset: "majorTouristPlaces" as const,
      id: place.id,
      canonicalName: place.canonicalName,
      aliases: [...place.aliases],
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
      currentQid: place.wikidataId,
      rejectionReasons: [] as string[],
      thresholdKm: thresholdFor("majorTouristPlaces", place.category),
    })),
  ];
}

function expected(entry: LocalEntry): ExpectedEntity {
  return {
    wikidataId: entry.currentQid,
    canonicalName: entry.canonicalName,
    aliases: entry.aliases,
    countryCode: entry.countryCode,
    latitude: entry.latitude,
    longitude: entry.longitude,
    expectedTypes: [entry.category],
    distanceThresholdKm: entry.thresholdKm,
  };
}

async function collectAnomalies(entries: LocalEntry[]): Promise<LocalEntry[]> {
  const audit = await auditExpectedEntities(entries.map(expected));
  return entries.flatMap((entry, index) => {
    const result = audit[index];
    const reasons: string[] = [];
    if (!entry.currentQid) reasons.push("missing_qid");
    else if (!result.validQid) reasons.push("invalid_qid");
    if (result.validQid && !result.nameMatches) reasons.push("name_mismatch");
    if (result.validQid && !result.countryMatches) reasons.push("country_mismatch");
    if (result.distanceKm != null && result.distanceKm > entry.thresholdKm) {
      reasons.push(`coordinate_mismatch_${Math.round(result.distanceKm)}km`);
    }
    if (result.validQid && !result.hasSitelink) reasons.push("missing_sitelink");
    return reasons.length ? [{ ...entry, rejectionReasons: reasons }] : [];
  });
}

async function review(anomalies: LocalEntry[]): Promise<CandidateReview[]> {
  const searchResults = new Map<string, string[]>();
  for (let index = 0; index < anomalies.length; index += 4) {
    await Promise.all(
      anomalies.slice(index, index + 4).map(async (entry) => {
        const qids = new Set<string>();
        for (const qid of await searchQids(entry.canonicalName, "en")) {
          qids.add(qid);
        }
        if (qids.size === 0 && entry.aliases[0]) {
          for (const qid of await searchQids(entry.aliases[0], "fr")) {
            qids.add(qid);
          }
        }
        if (entry.currentQid) qids.add(entry.currentQid);
        searchResults.set(entry.id, [...qids]);
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const allCandidateQids = [...new Set([...searchResults.values()].flat())];
  const entities = await fetchEntities(allCandidateQids);
  const typeQids = [
    ...new Set(
      [...entities.values()].flatMap((entity) => claimIds(entity, "P31")),
    ),
  ];
  const typeEntities = await fetchEntities(typeQids);

  return anomalies.map((entry) => {
    const localNames = [entry.canonicalName, ...entry.aliases]
      .map(normalize)
      .filter(Boolean);
    const candidates = (searchResults.get(entry.id) ?? []).flatMap((qid) => {
      const entity = entities.get(qid);
      if (!entity) return [];
      const entityTypes = claimIds(entity, "P31");
      if (entityTypes.some((type) => REJECTED_TYPES.has(type))) return [];
      const entityNames = names(entity).map(normalize).filter(Boolean);
      const exactName = localNames.some((name) => entityNames.includes(name));
      const tokenName = localNames.some((localName) =>
        entityNames.some(
          (entityName) =>
            localName.length >= 5 &&
            entityName.length >= 5 &&
            (localName.includes(entityName) || entityName.includes(localName)),
        ),
      );
      const point = coordinate(entity);
      const candidateDistance = point
        ? distanceKm(point, {
            latitude: entry.latitude,
            longitude: entry.longitude,
          })
        : null;
      const countries = claimIds(entity, "P17");
      const expectedCountry = COUNTRY_QIDS[entry.countryCode];
      const countryMatches =
        Boolean(expectedCountry) && countries.includes(expectedCountry);
      const typeDetails = entityTypes.map((type) => ({
        qid: type,
        label: label(typeEntities.get(type) ?? { id: type }),
      }));
      const typeText = [
        ...typeDetails.map((type) => type.label),
        ...Object.values(entity.descriptions ?? {}).map((item) => item.value ?? ""),
      ].join(" ");
      const typeMatches = (TYPE_PATTERNS[entry.category] ?? /$^/).test(typeText);
      const withinDistance =
        candidateDistance != null && candidateDistance <= entry.thresholdKm;
      const pageIsDisambiguation = entityTypes.includes("Q4167410");
      const high =
        exactName &&
        countryMatches &&
        withinDistance &&
        typeMatches &&
        !pageIsDisambiguation;
      const medium =
        !high &&
        (exactName || tokenName) &&
        withinDistance &&
        (countryMatches || countries.length === 0) &&
        typeMatches &&
        !pageIsDisambiguation;
      return [{
        qid,
        entity,
        exactName,
        tokenName,
        countryMatches,
        candidateDistance,
        typeMatches,
        typeDetails,
        high,
        medium,
      }];
    });

    const high = candidates
      .filter((candidate) => candidate.high)
      .sort((a, b) => (a.candidateDistance ?? Infinity) - (b.candidateDistance ?? Infinity));
    const medium = candidates
      .filter((candidate) => candidate.medium)
      .sort((a, b) => (a.candidateDistance ?? Infinity) - (b.candidateDistance ?? Infinity));
    const selected = high.length === 1 ? high[0] : high[0] ?? medium[0] ?? null;
    const confidence: CandidateReview["confidence"] =
      high.length === 1 ? "HIGH" : selected?.medium || high.length > 1 ? "MEDIUM" : "LOW";
    const reason =
      high.length > 1
        ? `multiple_high_candidates:${high.map((item) => item.qid).join(",")}`
        : confidence === "HIGH"
          ? "exact_name_country_distance_and_type"
          : confidence === "MEDIUM"
            ? "candidate_requires_manual_identity_review"
            : "no_candidate_passed_structured_validation";
    return {
      entry,
      confidence,
      candidate: selected
        ? {
            qid: selected.qid,
            label: label(selected.entity),
            distanceKm:
              selected.candidateDistance == null
                ? null
                : Math.round(selected.candidateDistance * 10) / 10,
            countries: claimIds(selected.entity, "P17"),
            types: selected.typeDetails,
            wikipediaTitles: {
              en: selected.entity.sitelinks?.enwiki?.title ?? null,
              fr: selected.entity.sitelinks?.frwiki?.title ?? null,
            },
          }
        : null,
      reason,
    };
  });
}

async function main(): Promise<void> {
  await mkdir("tmp", { recursive: true });
  const retryLow = process.argv.includes("--retry-low");
  const anomalies = retryLow
    ? JSON.parse(
        await readFile("tmp/entity-anomalies-tourism.json", "utf8"),
      ) as LocalEntry[]
    : await collectAnomalies(buildEntries());
  if (!retryLow) {
    await writeFile(
      "tmp/entity-anomalies-tourism.json",
      `${JSON.stringify(anomalies, null, 2)}\n`,
      "utf8",
    );
  }
  let reviews: CandidateReview[];
  if (retryLow) {
    const previous = JSON.parse(
      await readFile("tmp/entity-repair-all-candidates.json", "utf8"),
    ) as CandidateReview[];
    const retried = await review(
      previous
        .filter((item) => item.confidence === "LOW")
        .map((item) => item.entry),
    );
    const byId = new Map(retried.map((item) => [item.entry.id, item]));
    reviews = previous.map((item) => byId.get(item.entry.id) ?? item);
  } else {
    reviews = await review(anomalies);
  }
  await writeFile(
    "tmp/entity-repair-review.json",
    `${JSON.stringify(reviews.filter((item) => item.confidence === "MEDIUM"), null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    "tmp/entity-repair-all-candidates.json",
    `${JSON.stringify(reviews, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({
    anomalies: anomalies.length,
    byDataset: Object.fromEntries(
      [...new Set(anomalies.map((item) => item.dataset))].map((dataset) => [
        dataset,
        anomalies.filter((item) => item.dataset === dataset).length,
      ]),
    ),
    high: reviews.filter((item) => item.confidence === "HIGH").length,
    medium: reviews.filter((item) => item.confidence === "MEDIUM").length,
    low: reviews.filter((item) => item.confidence === "LOW").length,
  }, null, 2));
}

void main();
