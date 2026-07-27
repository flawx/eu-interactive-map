/**
 * Download and normalize the official UNESCO World Heritage List (XML)
 * for the European coverage of this map.
 *
 * Official source:
 * https://whc.unesco.org/en/list/xml/
 *
 * Atomic write: temp file → validate → replace final JSON only on success.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  isPointInUnescoEuropeCoverage,
  summarizeUnescoSites,
  validateUnescoWorldHeritageSites,
  type UnescoDangerStatus,
  type UnescoSiteCategory,
  type UnescoWorldHeritageSite,
  type UnescoWorldHeritageDataset,
} from "../lib/tourism/unescoWorldHeritage";

const OFFICIAL_XML_URL = "https://whc.unesco.org/en/list/xml/";
const FETCH_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "EUInteractiveMap/0.1 (educational; UNESCO list import; contact: local-dev)";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_PATH = path.join(DATA_DIR, "unesco-world-heritage-europe.json");
const TEMP_DOWNLOAD_PATH = path.join(
  DATA_DIR,
  `.unesco-world-heritage.${process.pid}.download.xml`,
);

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 10)),
    );
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
  // Active danger entries typically start with "Y"
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
): { latitude: number; longitude: number } | null {
  const europeanPois = pois.filter((poi) =>
    isPointInUnescoEuropeCoverage(poi.longitude, poi.latitude),
  );
  if (europeanPois.length > 0) {
    const lat =
      europeanPois.reduce((sum, poi) => sum + poi.latitude, 0) /
      europeanPois.length;
    const lon =
      europeanPois.reduce((sum, poi) => sum + poi.longitude, 0) /
      europeanPois.length;
    return { latitude: lat, longitude: lon };
  }

  const lat = Number.parseFloat(tagValue(row, "latitude") ?? "");
  const lon = Number.parseFloat(tagValue(row, "longitude") ?? "");
  if (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    isPointInUnescoEuropeCoverage(lon, lat)
  ) {
    return { latitude: lat, longitude: lon };
  }

  return null;
}

function parseRow(
  row: string,
  importedAt: string,
): UnescoWorldHeritageSite | null {
  const idRaw = tagValue(row, "id_number");
  const unescoId = idRaw ? Number.parseInt(idRaw, 10) : NaN;
  if (!Number.isInteger(unescoId)) return null;

  const name = stripHtml(tagValue(row, "site") ?? "");
  if (!name) return null;

  const category = parseCategory(tagValue(row, "category"));
  if (!category) return null;

  const pois = parsePois(row);
  const point = pickRepresentativePoint(row, pois);
  if (!point) return null;

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
  if (uniqueCountries.length === 0) return null;

  const stateParties = (tagValue(row, "states") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const inscribed = Number.parseInt(tagValue(row, "date_inscribed") ?? "", 10);
  if (!Number.isInteger(inscribed)) return null;

  const danger = parseDanger(tagValue(row, "danger"));
  const transnational = tagValue(row, "transnational") === "1";
  const serial = pois.length > 1;
  const officialUrl =
    tagValue(row, "http_url") ??
    `https://whc.unesco.org/en/list/${unescoId}`;

  if (!officialUrl.startsWith("https://whc.unesco.org/")) {
    return null;
  }

  const shortDescriptionRaw = tagValue(row, "short_description");
  const justificationRaw = tagValue(row, "justification");

  return {
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
  };
}

async function downloadOfficialXml(): Promise<{
  text: string;
  contentType: string | null;
}> {
  // Prefer curl: Cloudflare often blocks bare Node fetch with 403.
  const curlBin = process.platform === "win32" ? "curl.exe" : "curl";
  const curlResult = spawnSync(
    curlBin,
    [
      "-sL",
      "-A",
      USER_AGENT,
      "-H",
      "Accept: application/xml,text/xml,*/*",
      "--max-time",
      String(Math.ceil(FETCH_TIMEOUT_MS / 1000)),
      "-o",
      TEMP_DOWNLOAD_PATH,
      "-w",
      "%{content_type}",
      OFFICIAL_XML_URL,
    ],
    { encoding: "utf8" },
  );

  if (curlResult.status === 0 && fs.existsSync(TEMP_DOWNLOAD_PATH)) {
    const text = fs.readFileSync(TEMP_DOWNLOAD_PATH, "utf8");
    fs.unlinkSync(TEMP_DOWNLOAD_PATH);
    if (text.includes("<query") && text.includes("<row>")) {
      return {
        text,
        contentType: (curlResult.stdout || "text/xml").trim() || "text/xml",
      };
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

function writeAtomically(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, contents, "utf8");
  fs.renameSync(tempPath, filePath);
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

  const sites: UnescoWorldHeritageSite[] = [];
  for (const row of rows) {
    const parsed = parseRow(row, importedAt);
    if (parsed) sites.push(parsed);
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

  console.log("UNESCO World Heritage import complete.");
  console.log(`  content-type : ${contentType ?? "n/a"}`);
  console.log(`  source rows  : ${rows.length}`);
  console.log(`  europe sites : ${summary.total}`);
  console.log(`  cultural     : ${summary.cultural}`);
  console.log(`  natural      : ${summary.natural}`);
  console.log(`  mixed        : ${summary.mixed}`);
  console.log(`  in danger    : ${summary.inDanger}`);
  console.log(`  transboundary: ${summary.transboundary}`);
  console.log(`  serial       : ${summary.serial}`);
  console.log(`  written to   : ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error("[unesco:update] failed — existing local file kept intact.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
