/**
 * Download and normalize the official UNESCO World Heritage List (XML)
 * for the European coverage of this map.
 *
 * Official source:
 * https://whc.unesco.org/en/list/xml/
 *
 * Pipeline:
 * 1. download official XML
 * 2. normalize rows
 * 3. validate coordinates
 * 4. resolve containing European territory (GISCO geometries)
 * 5. verify allowed map country
 * 6. verify European perimeter (not overseas / Anatolia / Maghreb / …)
 * 7. atomic write of local JSON only after full validation
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  buildEuropeanTerritoryIndex,
  buildWorldCountryIndex,
  GISCO_COUNTRIES_10M_URL,
  isAllowedUnescoMapCountry,
  resolveEuropeanTerritory,
  type EuropeanTerritoryEntry,
  type GiscoCountryFeatureCollection,
  type WorldCountryEntry,
} from "../lib/tourism/unescoEuropeCoverage";
import {
  summarizeUnescoSites,
  validateUnescoWorldHeritageSites,
  type UnescoDangerStatus,
  type UnescoSiteCategory,
  type UnescoWorldHeritageSite,
  type UnescoWorldHeritageDataset,
} from "../lib/tourism/unescoWorldHeritage";

const OFFICIAL_XML_URL = "https://whc.unesco.org/en/list/xml/";
const FETCH_TIMEOUT_MS = 30_000;
const GISCO_TIMEOUT_MS = 120_000;
const USER_AGENT =
  "EUInteractiveMap/0.1 (educational; UNESCO list import; contact: local-dev)";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_PATH = path.join(DATA_DIR, "unesco-world-heritage-europe.json");
const TEMP_DOWNLOAD_PATH = path.join(
  DATA_DIR,
  `.unesco-world-heritage.${process.pid}.download.xml`,
);
const GISCO_CACHE_PATH = path.join(
  DATA_DIR,
  ".gisco-countries-10m-2024.geojson",
);

type ExclusionReason =
  | "invalid-coordinates"
  | "outside-european-territory"
  | "forbidden-or-disallowed-country";

type ExclusionStat = {
  reason: ExclusionReason;
  resolvedOrHint: string;
  count: number;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&amp;/g, "&");
}

function stripHtml(value: string): string {
  return decodeXmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(block: string, tag: string): string | null {
  const match = block.match(
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"),
  );
  if (!match) return null;
  const raw = match[1].trim();
  return raw.length > 0 ? raw : null;
}

function mapIsoToMapCode(iso: string): string | null {
  const upper = iso.trim().toUpperCase();
  if (!upper) return null;
  if (upper === "GR") return "EL";
  if (upper === "GB") return "UK";
  return upper;
}

function parseCategory(raw: string | null): UnescoSiteCategory | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "cultural") return "cultural";
  if (normalized === "natural") return "natural";
  if (normalized === "mixed") return "mixed";
  return null;
}

function parseCriteria(raw: string | null): string[] {
  if (!raw) return [];
  const matches = raw.match(/\(([ivx]+)\)/gi);
  if (!matches) return [];
  return matches.map((item) => item.toLowerCase());
}

function parseYearsList(raw: string | null): number[] {
  if (!raw) return [];
  const years = [...raw.matchAll(/\b(19|20)\d{2}\b/g)].map((match) =>
    Number.parseInt(match[0], 10),
  );
  return [...new Set(years)].sort((a, b) => a - b);
}

function parseDanger(raw: string | null): {
  status: UnescoDangerStatus;
  years: number[];
} {
  if (!raw) return { status: "not-in-danger", years: [] };
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "0") {
    return { status: "not-in-danger", years: [] };
  }
  const years = parseYearsList(trimmed);
  if (/^Y\b/i.test(trimmed)) {
    return { status: "in-danger", years };
  }
  return { status: "not-in-danger", years };
}

function parsePois(row: string): Array<{
  latitude: number;
  longitude: number;
  iso2: string | null;
}> {
  const pois: Array<{
    latitude: number;
    longitude: number;
    iso2: string | null;
  }> = [];
  const geo = tagValue(row, "geolocations");
  if (!geo) return pois;

  for (const match of geo.matchAll(/<poi>([\s\S]*?)<\/poi>/gi)) {
    const block = match[1];
    const lat = Number.parseFloat(tagValue(block, "latitude") ?? "");
    const lon = Number.parseFloat(tagValue(block, "longitude") ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const iso2 = mapIsoToMapCode(tagValue(block, "iso2") ?? "");
    pois.push({ latitude: lat, longitude: lon, iso2 });
  }
  return pois;
}

function pickRepresentativePoint(
  row: string,
  pois: Array<{ latitude: number; longitude: number; iso2: string | null }>,
  territoryIndex: readonly EuropeanTerritoryEntry[],
  worldIndex: readonly WorldCountryEntry[],
): {
  latitude: number;
  longitude: number;
  resolvedCountryCode: string;
} | null {
  const candidates: Array<{ latitude: number; longitude: number }> = [];

  for (const poi of pois) {
    candidates.push({ latitude: poi.latitude, longitude: poi.longitude });
  }

  const lat = Number.parseFloat(tagValue(row, "latitude") ?? "");
  const lon = Number.parseFloat(tagValue(row, "longitude") ?? "");
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    candidates.push({ latitude: lat, longitude: lon });
  }

  // Prefer a point that itself lies in European coverage (transboundary rule).
  for (const candidate of candidates) {
    const resolved = resolveEuropeanTerritory(
      candidate.longitude,
      candidate.latitude,
      territoryIndex,
      worldIndex,
    );
    if (resolved && isAllowedUnescoMapCountry(resolved)) {
      return {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        resolvedCountryCode: resolved,
      };
    }
  }

  return null;
}

function parseRow(
  row: string,
  importedAt: string,
  territoryIndex: readonly EuropeanTerritoryEntry[],
  worldIndex: readonly WorldCountryEntry[],
): {
  site: UnescoWorldHeritageSite | null;
  exclusion?: { reason: ExclusionReason; hint: string };
} {
  const idRaw = tagValue(row, "id_number");
  const unescoId = idRaw ? Number.parseInt(idRaw, 10) : NaN;
  if (!Number.isInteger(unescoId)) {
    return {
      site: null,
      exclusion: { reason: "invalid-coordinates", hint: "bad-id" },
    };
  }

  const name = stripHtml(tagValue(row, "site") ?? "");
  if (!name) {
    return {
      site: null,
      exclusion: { reason: "invalid-coordinates", hint: "missing-name" },
    };
  }

  const category = parseCategory(tagValue(row, "category"));
  if (!category) {
    return {
      site: null,
      exclusion: { reason: "invalid-coordinates", hint: "bad-category" },
    };
  }

  const pois = parsePois(row);
  const primaryLat = Number.parseFloat(tagValue(row, "latitude") ?? "");
  const primaryLon = Number.parseFloat(tagValue(row, "longitude") ?? "");
  const hasAnyCoord =
    pois.length > 0 ||
    (Number.isFinite(primaryLat) && Number.isFinite(primaryLon));

  if (!hasAnyCoord) {
    return {
      site: null,
      exclusion: { reason: "invalid-coordinates", hint: `id:${unescoId}` },
    };
  }

  const point = pickRepresentativePoint(
    row,
    pois,
    territoryIndex,
    worldIndex,
  );
  if (!point) {
    const isoHint =
      mapIsoToMapCode(tagValue(row, "iso_code")?.split(",")[0] ?? "") ??
      (Number.isFinite(primaryLon) && Number.isFinite(primaryLat)
        ? `${primaryLon.toFixed(2)},${primaryLat.toFixed(2)}`
        : "unknown");
    return {
      site: null,
      exclusion: {
        reason: "outside-european-territory",
        hint: isoHint,
      },
    };
  }

  if (!isAllowedUnescoMapCountry(point.resolvedCountryCode)) {
    return {
      site: null,
      exclusion: {
        reason: "forbidden-or-disallowed-country",
        hint: point.resolvedCountryCode,
      },
    };
  }

  const isoCodes = (tagValue(row, "iso_code") ?? "")
    .split(",")
    .map((code) => mapIsoToMapCode(code))
    .filter((code): code is string => Boolean(code));

  const countryCodes = [...new Set(isoCodes)];
  if (countryCodes.length === 0) {
    for (const poi of pois) {
      if (poi.iso2) countryCodes.push(poi.iso2);
    }
  }
  const uniqueCountries = [...new Set(countryCodes)];
  if (uniqueCountries.length === 0) {
    uniqueCountries.push(point.resolvedCountryCode);
  }

  const stateParties = (tagValue(row, "states") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const inscribed = Number.parseInt(tagValue(row, "date_inscribed") ?? "", 10);
  if (!Number.isInteger(inscribed)) {
    return {
      site: null,
      exclusion: { reason: "invalid-coordinates", hint: `id:${unescoId}` },
    };
  }

  const danger = parseDanger(tagValue(row, "danger"));
  const transnational = tagValue(row, "transnational") === "1";
  const serial = pois.length > 1;
  const officialUrl =
    tagValue(row, "http_url") ??
    `https://whc.unesco.org/en/list/${unescoId}`;

  if (!officialUrl.startsWith("https://whc.unesco.org/")) {
    return {
      site: null,
      exclusion: { reason: "invalid-coordinates", hint: `id:${unescoId}` },
    };
  }

  const shortDescriptionRaw = tagValue(row, "short_description");
  const justificationRaw = tagValue(row, "justification");

  return {
    site: {
      id: `unesco-${unescoId}`,
      unescoId,
      canonicalName: name,
      countryCodes: uniqueCountries,
      stateParties:
        stateParties.length > 0 ? stateParties : uniqueCountries.slice(),
      category,
      latitude: point.latitude,
      longitude: point.longitude,
      inscriptionYear: inscribed,
      extensionYears: parseYearsList(tagValue(row, "secondary_dates")),
      criteria: parseCriteria(tagValue(row, "criteria_txt")),
      areaHectares: null,
      bufferZoneHectares: null,
      dangerStatus: danger.status,
      dangerYears: danger.years,
      transboundary: transnational || uniqueCountries.length > 1,
      serial,
      officialUrl,
      region: tagValue(row, "regions"),
      location: tagValue(row, "location"),
      shortDescription: shortDescriptionRaw
        ? stripHtml(shortDescriptionRaw)
        : null,
      justification: justificationRaw ? stripHtml(justificationRaw) : null,
      importedAt,
      resolvedCountryCode: point.resolvedCountryCode,
      resolvedEuropeanTerritory: true,
    },
  };
}

function curlDownload(url: string, outPath: string, timeoutMs: number): boolean {
  const curlBin = process.platform === "win32" ? "curl.exe" : "curl";
  const curlResult = spawnSync(
    curlBin,
    [
      "-sL",
      "-A",
      USER_AGENT,
      "-H",
      "Accept: application/xml,application/json,text/xml,*/*",
      "--max-time",
      String(Math.ceil(timeoutMs / 1000)),
      "-o",
      outPath,
      url,
    ],
    { encoding: "utf8" },
  );
  return curlResult.status === 0 && fs.existsSync(outPath);
}

async function downloadOfficialXml(): Promise<{
  text: string;
  contentType: string | null;
}> {
  if (curlDownload(OFFICIAL_XML_URL, TEMP_DOWNLOAD_PATH, FETCH_TIMEOUT_MS)) {
    const text = fs.readFileSync(TEMP_DOWNLOAD_PATH, "utf8");
    fs.unlinkSync(TEMP_DOWNLOAD_PATH);
    if (text.includes("<query") && text.includes("<row>")) {
      return { text, contentType: "text/xml" };
    }
  }

  if (fs.existsSync(TEMP_DOWNLOAD_PATH)) {
    fs.unlinkSync(TEMP_DOWNLOAD_PATH);
  }

  const response = await fetch(OFFICIAL_XML_URL, {
    headers: {
      Accept: "application/xml,text/xml,*/*",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `UNESCO XML download failed: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type");
  if (
    contentType &&
    !/xml|text\/plain|octet-stream/i.test(contentType)
  ) {
    throw new Error(`Unexpected content-type: ${contentType}`);
  }

  const text = await response.text();
  if (!text.includes("<query") || !text.includes("<row>")) {
    throw new Error("Downloaded payload is not the UNESCO list XML");
  }

  return { text, contentType };
}

async function loadGiscoCountries(): Promise<GiscoCountryFeatureCollection> {
  if (fs.existsSync(GISCO_CACHE_PATH)) {
    const cached = fs.readFileSync(GISCO_CACHE_PATH, "utf8");
    if (cached.includes("FeatureCollection") && cached.includes("CNTR_ID")) {
      console.log(`Using cached GISCO countries: ${GISCO_CACHE_PATH}`);
      return JSON.parse(cached) as GiscoCountryFeatureCollection;
    }
  }

  console.log(`Downloading GISCO countries from ${GISCO_COUNTRIES_10M_URL} …`);
  const tempPath = `${GISCO_CACHE_PATH}.${process.pid}.tmp`;
  if (!curlDownload(GISCO_COUNTRIES_10M_URL, tempPath, GISCO_TIMEOUT_MS)) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    throw new Error("Failed to download GISCO country geometries");
  }

  const text = fs.readFileSync(tempPath, "utf8");
  if (!text.includes("FeatureCollection") || !text.includes("CNTR_ID")) {
    fs.unlinkSync(tempPath);
    throw new Error("GISCO payload is not a country FeatureCollection");
  }

  fs.renameSync(tempPath, GISCO_CACHE_PATH);
  return JSON.parse(text) as GiscoCountryFeatureCollection;
}

function writeAtomically(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, contents, "utf8");
  fs.renameSync(tempPath, filePath);
}

function bumpExclusion(
  map: Map<string, ExclusionStat>,
  reason: ExclusionReason,
  hint: string,
): void {
  const key = `${reason}::${hint}`;
  const existing = map.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }
  map.set(key, { reason, resolvedOrHint: hint, count: 1 });
}

async function main() {
  console.log(`Downloading official UNESCO XML from ${OFFICIAL_XML_URL} …`);
  const { text, contentType } = await downloadOfficialXml();
  const importedAt = new Date().toISOString();
  const rows = [...text.matchAll(/<row>[\s\S]*?<\/row>/gi)].map(
    (match) => match[0],
  );

  if (rows.length < 100) {
    throw new Error(`Unexpectedly few rows in UNESCO XML (${rows.length})`);
  }

  const gisco = await loadGiscoCountries();
  const territoryIndex = buildEuropeanTerritoryIndex(gisco);
  const worldIndex = buildWorldCountryIndex(gisco);
  if (territoryIndex.length < 30) {
    throw new Error(
      `European territory index too small (${territoryIndex.length})`,
    );
  }
  console.log(
    `European territory index: ${territoryIndex.length} countries/territories`,
  );

  const sites: UnescoWorldHeritageSite[] = [];
  const exclusions = new Map<string, ExclusionStat>();
  let excludedCount = 0;

  for (const row of rows) {
    const parsed = parseRow(row, importedAt, territoryIndex, worldIndex);
    if (parsed.site) {
      sites.push(parsed.site);
      continue;
    }
    excludedCount += 1;
    if (parsed.exclusion) {
      bumpExclusion(
        exclusions,
        parsed.exclusion.reason,
        parsed.exclusion.hint,
      );
    }
  }

  sites.sort((a, b) => a.unescoId - b.unescoId);

  const dataset: UnescoWorldHeritageDataset = {
    source: {
      format: "xml",
      url: OFFICIAL_XML_URL,
      retrievedAt: importedAt,
      rowsInSource: rows.length,
    },
    sites,
  };

  const validationErrors = validateUnescoWorldHeritageSites(sites);
  if (validationErrors.length > 0) {
    throw new Error(
      `Validation failed (${validationErrors.length}): ${validationErrors.slice(0, 8).join("; ")}`,
    );
  }

  const summary = summarizeUnescoSites(sites);
  const payload = `${JSON.stringify(dataset, null, 2)}\n`;
  writeAtomically(OUTPUT_PATH, payload);

  const topExclusions = [...exclusions.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 40);

  console.log("UNESCO World Heritage import complete.");
  console.log(`  content-type : ${contentType ?? "n/a"}`);
  console.log(`  source rows  : ${rows.length}`);
  console.log(`  europe sites : ${summary.total}`);
  console.log(`  excluded     : ${excludedCount}`);
  console.log(`  cultural     : ${summary.cultural}`);
  console.log(`  natural      : ${summary.natural}`);
  console.log(`  mixed        : ${summary.mixed}`);
  console.log(`  in danger    : ${summary.inDanger}`);
  console.log(`  transboundary: ${summary.transboundary}`);
  console.log(`  serial       : ${summary.serial}`);
  console.log(`  written to   : ${OUTPUT_PATH}`);
  console.log("  top exclusions:");
  for (const item of topExclusions) {
    console.log(
      `    [${item.reason}] ${item.resolvedOrHint}: ${item.count}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error("[unesco:update] failed — existing local file kept intact.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
