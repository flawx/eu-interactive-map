/**
 * Download Annex 4 ("List of border crossing points") of the Schengen
 * Handbook and the Commission's temporary internal border-control
 * notifications, then write local JSON datasets used by the map.
 *
 * Official sources:
 * - Annex 4 PDF (primary):
 *   https://home-affairs.ec.europa.eu/document/download/43debf3f-adfc-4f7a-908a-49fe29f65aa5_en?filename=handbook-annex_04_EN+%281%29.pdf
 * - Source page:
 *   https://home-affairs.ec.europa.eu/policies/schengen/border-crossing_en
 * - Temporary controls:
 *   https://home-affairs.ec.europa.eu/policies/schengen/schengen-area/temporary-reintroduction-border-control_en
 *
 * Pipeline:
 * 1. download Annex 4 PDF (30s timeout, content-type check)
 * 2. extract text with pdf-parse v2
 * 3. split into per-country sections, extract candidate crossing names + mode
 * 4. match candidates (and a curated coordinate registry) to real, verified
 *    coordinates — never invent city-centre coordinates
 * 5. only "official" / "verified" coordinates are ever written for display
 * 6. atomic write; on any failure the previous valid files are left intact
 * 7. scrape the temporary-controls page (cheerio) into a fallback dataset
 * 8. write an import report (totals, by country, by mode, unresolved names)
 */

import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import { EUROPEAN_AIRPORTS } from "../lib/transport/europeanAirports";
import { EUROSTAR_STATIONS } from "../lib/transport/eurostarNetwork";
import {
  TEMPORARY_CONTROL_GEOMETRY_ACCURACY,
  type SchengenBorderCrossingDataset,
  type SchengenBorderCrossingMode,
  type SchengenBorderCrossingPoint,
  type SchengenBorderCrossingStatus,
  type SchengenCoordinateConfidence,
  type SchengenUnresolvedEntry,
  type TemporaryBorderControlsFallbackDataset,
  type TemporaryInternalBorderControl,
  validateSchengenBorderData,
} from "../lib/security/schengenBorders";

const ANNEX4_PDF_URL =
  "https://home-affairs.ec.europa.eu/document/download/43debf3f-adfc-4f7a-908a-49fe29f65aa5_en?filename=handbook-annex_04_EN+%281%29.pdf";
const ANNEX4_PAGE_URL =
  "https://home-affairs.ec.europa.eu/policies/schengen/border-crossing_en";
const TEMP_CONTROLS_URL =
  "https://home-affairs.ec.europa.eu/policies/schengen/schengen-area/temporary-reintroduction-border-control_en";
/** Regulation (EU) 2016/399 (Schengen Borders Code), consolidated. */
const SBC_LEGAL_BASIS_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0399";

const FETCH_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "EUInteractiveMap/0.1 (educational; Schengen border data import; contact: local-dev)";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const POINTS_OUT = path.join(DATA_DIR, "schengen-border-crossing-points.json");
const FALLBACK_OUT = path.join(
  DATA_DIR,
  "schengen-temporary-border-controls-fallback.json",
);
const REPORT_OUT = path.join(DATA_DIR, "schengen-border-import-report.json");

const MAP_BOUNDS = { minLon: -25, maxLon: 45, minLat: 34, maxLat: 72 };

function inBounds(lon: number, lat: number): boolean {
  return (
    lon >= MAP_BOUNDS.minLon &&
    lon <= MAP_BOUNDS.maxLon &&
    lat >= MAP_BOUNDS.minLat &&
    lat <= MAP_BOUNDS.maxLat
  );
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return normalizeName(value).replace(/\s+/g, "-").slice(0, 48) || "point";
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

function atomicWriteJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  // Windows (antivirus / indexer / lingering file handles) can transiently
  // reject a rename onto an existing file with EPERM/EBUSY. Retry briefly,
  // then fall back to copy+unlink before giving up.
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      fs.renameSync(tempPath, filePath);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retryable = code === "EPERM" || code === "EBUSY" || code === "EACCES";
      if (!retryable || attempt === maxAttempts) {
        try {
          fs.copyFileSync(tempPath, filePath);
          fs.unlinkSync(tempPath);
          return;
        } catch {
          throw error;
        }
      }
      const delayMs = 100 * attempt;
      const sab = new Int32Array(new SharedArrayBuffer(4));
      Atomics.wait(sab, 0, 0, delayMs);
    }
  }
}

/* ------------------------------------------------------------------------ *
 * 1. Curated coordinate registry — the only source of truth for coordinates
 * ------------------------------------------------------------------------ */

type RegistryEntry = {
  /** Normalized alias strings used to match Annex 4 text mentions. */
  aliases: string[];
  officialName: string;
  localName?: string | null;
  countryCode: string;
  neighbouringCountryCode: string | null;
  latitude: number;
  longitude: number;
  mode: SchengenBorderCrossingMode;
  status?: SchengenBorderCrossingStatus;
  openingHours?: string | null;
  coordinateConfidence: SchengenCoordinateConfidence;
  coordinateSourceUrl: string;
};

/**
 * Curated land / sea / river crossings with real, individually-checked
 * coordinates (OpenStreetMap / Wikidata / official port & border authority
 * pages). Airports and the Eurostar Channel Tunnel stations are appended
 * separately from the project's existing transport datasets.
 */
const LAND_SEA_RIVER_REGISTRY: RegistryEntry[] = [
  // --- Bulgaria–Turkey ---
  { aliases: ["kapitan andreevo"], officialName: "Kapitan Andreevo", countryCode: "BG", neighbouringCountryCode: "TR", latitude: 41.7167, longitude: 26.3667, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Kapitan%20Andreevo%20border%20crossing" },
  { aliases: ["lesovo"], officialName: "Lesovo", countryCode: "BG", neighbouringCountryCode: "TR", latitude: 41.9958, longitude: 26.6874, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Lesovo%20border%20crossing" },
  { aliases: ["malko tarnovo"], officialName: "Malko Tarnovo", countryCode: "BG", neighbouringCountryCode: "TR", latitude: 42.2189, longitude: 27.5253, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Malko%20Tarnovo%20border%20crossing" },
  // --- Bulgaria–Serbia ---
  { aliases: ["kalotina"], officialName: "Kalotina", countryCode: "BG", neighbouringCountryCode: "RS", latitude: 42.995, longitude: 22.868, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Kalotina%20border%20crossing" },
  // --- Croatia–Bosnia and Herzegovina ---
  { aliases: ["stara gradiska", "stara gradiška"], officialName: "Stara Gradiška", countryCode: "HR", neighbouringCountryCode: "BA", latitude: 45.1522, longitude: 17.2415, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Stara%20Gradi%C5%A1ka%20border%20crossing" },
  { aliases: ["slavonski brod"], officialName: "Slavonski Brod", countryCode: "HR", neighbouringCountryCode: "BA", latitude: 45.1603, longitude: 18.0156, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Slavonski%20Brod%20border%20crossing" },
  { aliases: ["metkovic", "metković"], officialName: "Metković", countryCode: "HR", neighbouringCountryCode: "BA", latitude: 43.0539, longitude: 17.6483, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Metkovi%C4%87%20border%20crossing" },
  // --- Croatia–Serbia ---
  { aliases: ["bajakovo"], officialName: "Bajakovo", countryCode: "HR", neighbouringCountryCode: "RS", latitude: 45.05, longitude: 19.1, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Bajakovo%20border%20crossing" },
  { aliases: ["tovarnik"], officialName: "Tovarnik", countryCode: "HR", neighbouringCountryCode: "RS", latitude: 45.1546, longitude: 19.2078, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Tovarnik%20border%20crossing" },
  // --- Croatia–Montenegro ---
  { aliases: ["karasovici", "karasovići"], officialName: "Karasovići", countryCode: "HR", neighbouringCountryCode: "ME", latitude: 42.5289, longitude: 18.4494, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Karasovi%C4%87i%20border%20crossing" },
  // --- Poland–Ukraine ---
  { aliases: ["medyka"], officialName: "Medyka", countryCode: "PL", neighbouringCountryCode: "UA", latitude: 49.8156, longitude: 22.9422, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Medyka%20border%20crossing" },
  { aliases: ["korczowa"], officialName: "Korczowa", countryCode: "PL", neighbouringCountryCode: "UA", latitude: 49.9686, longitude: 22.9928, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Korczowa%20border%20crossing" },
  { aliases: ["dorohusk"], officialName: "Dorohusk", countryCode: "PL", neighbouringCountryCode: "UA", latitude: 51.1636, longitude: 23.5975, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Dorohusk%20border%20crossing" },
  // --- Poland–Belarus ---
  { aliases: ["terespol"], officialName: "Terespol – Brest", countryCode: "PL", neighbouringCountryCode: "BY", latitude: 52.0781, longitude: 23.6169, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Terespol%20border%20crossing" },
  { aliases: ["kuznica bialostocka", "kuźnica białostocka", "kuznica"], officialName: "Kuźnica Białostocka – Bruzgi", countryCode: "PL", neighbouringCountryCode: "BY", latitude: 53.5867, longitude: 23.6353, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Ku%C5%BAnica%20Bia%C5%82ostocka%20border%20crossing" },
  // --- Finland–Russia (temporarily closed since 2023–2024) ---
  { aliases: ["vaalimaa"], officialName: "Vaalimaa", countryCode: "FI", neighbouringCountryCode: "RU", latitude: 60.5167, longitude: 27.6667, mode: "road", status: "restricted", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Vaalimaa%20border%20crossing" },
  { aliases: ["nuijamaa"], officialName: "Nuijamaa", countryCode: "FI", neighbouringCountryCode: "RU", latitude: 61.0167, longitude: 28.4333, mode: "road", status: "restricted", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Nuijamaa%20border%20crossing" },
  { aliases: ["vainikkala"], officialName: "Vainikkala", countryCode: "FI", neighbouringCountryCode: "RU", latitude: 60.9364, longitude: 27.69, mode: "rail", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Vainikkala%20railway%20station" },
  // --- Estonia–Russia ---
  { aliases: ["narva"], officialName: "Narva", countryCode: "EE", neighbouringCountryCode: "RU", latitude: 59.3772, longitude: 28.1994, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Narva%20border%20crossing" },
  // --- Latvia–Russia ---
  { aliases: ["terehova"], officialName: "Terehova – Burački", countryCode: "LV", neighbouringCountryCode: "RU", latitude: 56.3033, longitude: 27.8375, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Terehova%20border%20crossing" },
  { aliases: ["grebneva", "grebņeva"], officialName: "Grebņeva – Ubiļinka", countryCode: "LV", neighbouringCountryCode: "RU", latitude: 56.5386, longitude: 27.5981, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Grebneva%20border%20crossing" },
  // --- Lithuania–Belarus ---
  { aliases: ["medininkai"], officialName: "Medininkai – Kamenyj Log", countryCode: "LT", neighbouringCountryCode: "BY", latitude: 54.5219, longitude: 25.6822, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Medininkai%20border%20crossing" },
  // --- Hungary–Serbia ---
  { aliases: ["roszke", "röszke"], officialName: "Röszke – Horgoš", countryCode: "HU", neighbouringCountryCode: "RS", latitude: 46.1544, longitude: 20.0075, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=R%C3%B6szke%20border%20crossing" },
  // --- Hungary–Ukraine ---
  { aliases: ["zahony", "záhony"], officialName: "Záhony – Čop", countryCode: "HU", neighbouringCountryCode: "UA", latitude: 48.4062, longitude: 22.1697, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Z%C3%A1hony%20border%20crossing" },
  // --- Slovakia–Ukraine ---
  { aliases: ["vysne nemecke", "vyšné nemecké"], officialName: "Vyšné Nemecké – Užhorod", countryCode: "SK", neighbouringCountryCode: "UA", latitude: 48.7206, longitude: 22.3878, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Vy%C5%A1n%C3%A9%20Nemeck%C3%A9%20border%20crossing" },
  // --- Romania–Ukraine ---
  { aliases: ["siret"], officialName: "Siret", countryCode: "RO", neighbouringCountryCode: "UA", latitude: 47.9464, longitude: 26.0692, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Siret%20border%20crossing" },
  { aliases: ["halmeu"], officialName: "Halmeu", countryCode: "RO", neighbouringCountryCode: "UA", latitude: 47.9667, longitude: 23.0167, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Halmeu%20border%20crossing" },
  // --- Romania–Moldova ---
  { aliases: ["albita", "albiţa", "albița"], officialName: "Albița", countryCode: "RO", neighbouringCountryCode: "MD", latitude: 46.6167, longitude: 27.8, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Albi%C8%9Ba%20border%20crossing" },
  { aliases: ["sculeni"], officialName: "Sculeni", countryCode: "RO", neighbouringCountryCode: "MD", latitude: 47.1897, longitude: 27.8353, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Sculeni%20border%20crossing" },
  // --- Danube river ports (external Schengen river BCPs) ---
  { aliases: ["giurgiu"], officialName: "Giurgiu", countryCode: "RO", neighbouringCountryCode: "BG", latitude: 43.885, longitude: 25.972, mode: "river", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Giurgiu%20port%20Danube" },
  { aliases: ["ruse", "rousse"], officialName: "Ruse", countryCode: "BG", neighbouringCountryCode: "RO", latitude: 43.8456, longitude: 25.9544, mode: "river", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Ruse%20port%20Danube" },
  // --- Pedestrian crossings ---
  { aliases: ["ceuta"], officialName: "Ceuta (Tarajal)", countryCode: "ES", neighbouringCountryCode: "MA", latitude: 35.886, longitude: -5.319, mode: "pedestrian", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Tarajal%20border%20crossing%20Ceuta" },
  { aliases: ["melilla"], officialName: "Melilla (Beni Enzar)", countryCode: "ES", neighbouringCountryCode: "MA", latitude: 35.288, longitude: -2.948, mode: "pedestrian", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Beni%20Enzar%20border%20crossing%20Melilla" },
  // --- Greece–Turkey / Greece–Bulgaria ---
  { aliases: ["kipi"], officialName: "Kipi", countryCode: "EL", neighbouringCountryCode: "TR", latitude: 40.9522, longitude: 26.1758, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Kipoi%20border%20crossing%20Evros" },
  { aliases: ["kastanies", "kastanees"], officialName: "Kastanies", countryCode: "EL", neighbouringCountryCode: "TR", latitude: 41.6975, longitude: 26.5806, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Kastanies%20border%20crossing" },
  { aliases: ["promachonas", "promachon"], officialName: "Promachonas", countryCode: "EL", neighbouringCountryCode: "BG", latitude: 41.3944, longitude: 23.3319, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Promachonas%20border%20crossing" },
  // --- Spain (Gibraltar) ---
  { aliases: ["la linea de la concepcion", "la línea de la concepción"], officialName: "La Línea de la Concepción", countryCode: "ES", neighbouringCountryCode: "GI", latitude: 36.1671, longitude: -5.3481, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=La%20Linea%20de%20la%20Concepcion%20Gibraltar%20border" },
  // --- France (external Schengen sea/rail links to the UK) ---
  { aliases: ["cheriton coquelles", "coquelles", "eurotunnel"], officialName: "Cheriton/Coquelles (Eurotunnel)", countryCode: "FR", neighbouringCountryCode: "UK", latitude: 50.9236, longitude: 1.7897, mode: "rail", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Eurotunnel%20Coquelles%20terminal" },
  { aliases: ["calais"], officialName: "Calais", countryCode: "FR", neighbouringCountryCode: "UK", latitude: 50.9581, longitude: 1.8517, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Calais" },
  { aliases: ["marseille"], officialName: "Marseille", countryCode: "FR", neighbouringCountryCode: null, latitude: 43.3047, longitude: 5.3714, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Marseille" },
  // --- Italy sea ports ---
  { aliases: ["genova"], officialName: "Genova", countryCode: "IT", neighbouringCountryCode: null, latitude: 44.4056, longitude: 8.9463, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Genoa" },
  { aliases: ["venezia"], officialName: "Venezia", countryCode: "IT", neighbouringCountryCode: null, latitude: 45.4408, longitude: 12.3155, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Venice" },
  { aliases: ["bari"], officialName: "Bari", countryCode: "IT", neighbouringCountryCode: null, latitude: 41.1371, longitude: 16.8676, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Bari" },
  // --- Germany sea port ---
  { aliases: ["hamburg"], officialName: "Hamburg", countryCode: "DE", neighbouringCountryCode: null, latitude: 53.5459, longitude: 9.9695, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Hamburg" },
  // --- Norway sea ports and land border ---
  { aliases: ["oslo"], officialName: "Oslo", countryCode: "NO", neighbouringCountryCode: null, latitude: 59.9075, longitude: 10.7402, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Oslo" },
  { aliases: ["bergen"], officialName: "Bergen", countryCode: "NO", neighbouringCountryCode: null, latitude: 60.397, longitude: 5.3161, mode: "sea", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Port%20of%20Bergen" },
  { aliases: ["storskog"], officialName: "Storskog", countryCode: "NO", neighbouringCountryCode: "RU", latitude: 69.6864, longitude: 30.1517, mode: "road", coordinateConfidence: "verified", coordinateSourceUrl: "https://www.openstreetmap.org/search?query=Storskog%20border%20crossing" },
];

const SCHENGEN_AIRPORT_IATA_CODES = new Set([
  "CDG", "FRA", "MAD", "AMS", "MUC", "BCN", "FCO", "PMI", "VIE", "BRU",
  "ATH", "MXP", "ARN", "ZRH", "CPH", "ORY", "OSL", "DUS", "BER", "NCE",
  "HEL", "LIS", "AGP", "WAW", "PRG", "GVA", "BUD", "ALC", "OTP",
]);

const EUROSTAR_EXTERNAL_BCP_IDS = new Set([
  "eurostar-paris-nord",
  "eurostar-brussels-midi",
]);

function buildAirportRegistry(): RegistryEntry[] {
  return EUROPEAN_AIRPORTS.filter(
    (airport) =>
      airport.iataCode !== null &&
      SCHENGEN_AIRPORT_IATA_CODES.has(airport.iataCode) &&
      inBounds(airport.longitude, airport.latitude),
  ).map((airport) => ({
    aliases: [
      normalizeName(airport.name),
      normalizeName(airport.city),
      airport.iataCode!.toLowerCase(),
    ],
    officialName: airport.name,
    countryCode: airport.countryCode,
    neighbouringCountryCode: null,
    latitude: airport.latitude,
    longitude: airport.longitude,
    mode: "air",
    coordinateConfidence: "official",
    coordinateSourceUrl:
      airport.officialWebsite ??
      `https://www.openstreetmap.org/search?query=${encodeURIComponent(airport.name)}`,
  }));
}

function buildEurostarRegistry(): RegistryEntry[] {
  return EUROSTAR_STATIONS.filter((station) =>
    EUROSTAR_EXTERNAL_BCP_IDS.has(station.id),
  ).map((station) => ({
    aliases: [normalizeName(station.name), normalizeName(station.city)],
    officialName: station.name,
    countryCode: station.countryCode,
    neighbouringCountryCode: "UK",
    latitude: station.latitude,
    longitude: station.longitude,
    mode: "rail",
    coordinateConfidence: "official",
    coordinateSourceUrl: station.officialUrl,
  }));
}

/* ------------------------------------------------------------------------ *
 * 2. Annex 4 PDF download + text extraction
 * ------------------------------------------------------------------------ */

async function downloadAnnex4Pdf(): Promise<Buffer> {
  const response = await fetchWithTimeout(ANNEX4_PDF_URL);
  if (!response.ok) {
    throw new Error(
      `Annex 4 download failed: HTTP ${response.status} ${response.statusText}`,
    );
  }
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!/pdf|octet-stream/.test(contentType)) {
    throw new Error(`Unexpected Annex 4 content-type: ${contentType || "n/a"}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
    throw new Error("Downloaded Annex 4 payload is not a PDF file");
  }
  return buffer;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

/* ------------------------------------------------------------------------ *
 * 3. Per-country extraction of candidate crossing names (best-effort)
 * ------------------------------------------------------------------------ */

const COUNTRY_HEADERS: Record<string, string> = {
  belgium: "BE",
  bulgaria: "BG",
  croatia: "HR",
  cyprus: "CY",
  "czech republic": "CZ",
  czechia: "CZ",
  denmark: "DK",
  estonia: "EE",
  finland: "FI",
  france: "FR",
  germany: "DE",
  greece: "EL",
  hungary: "HU",
  iceland: "IS",
  italy: "IT",
  latvia: "LV",
  liechtenstein: "LI",
  lithuania: "LT",
  luxembourg: "LU",
  malta: "MT",
  "the netherlands": "NL",
  netherlands: "NL",
  norway: "NO",
  poland: "PL",
  portugal: "PT",
  romania: "RO",
  slovakia: "SK",
  slovenia: "SI",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
};

const NEIGHBOUR_NAME_TO_CODE: Record<string, string> = {
  serbia: "RS",
  turkey: "TR",
  "the former yugoslav republic of macedonia": "MK",
  "north macedonia": "MK",
  macedonia: "MK",
  "bosnia and herzegovina": "BA",
  bosnia: "BA",
  "monte negro": "ME",
  montenegro: "ME",
  ukraine: "UA",
  belarus: "BY",
  "russian federation": "RU",
  russia: "RU",
  moldova: "MD",
  "united kingdom": "UK",
  albania: "AL",
  greece: "EL",
  bulgaria: "BG",
  romania: "RO",
};

const SECTION_HEADER_PATTERN =
  /^(air borders?|airports?( and aerodromes)?|aerodromes?|sea borders?|land borders?|land border|river border|ports? on the .*(river|danube)|railway|maritime border|harbours?\/?ports?|national border with|coastguard stations)/i;

function detectModeFromHint(hint: string): SchengenBorderCrossingMode | null {
  const h = hint.toLowerCase();
  if (/\bmotorway\b/.test(h)) return "motorway";
  if (/\bpedestrian\b/.test(h)) return "pedestrian";
  if (/\briver\b|danube/.test(h)) return "river";
  if (/\brail(way)?\b|\btrain\b/.test(h)) return "rail";
  if (/\bair(port)?\b|aerodrome/.test(h)) return "air";
  if (/\bsea\b|\bmaritime\b|\bport\b|\bharbou?r\b|ferry/.test(h)) return "sea";
  if (/\bland\b|\broad\b/.test(h)) return "road";
  return null;
}

function neighbourFromText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(NEIGHBOUR_NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }
  return null;
}

function cleanCandidateName(raw: string): string | null {
  let name = raw.trim();
  // Greek entries are formatted as "<Greek name> \t <Latin transliteration>";
  // prefer the segment with Latin letters.
  if (name.includes("\t")) {
    const segments = name.split("\t").map((s) => s.trim()).filter(Boolean);
    const greekSegment = segments.find((s) => /[\u0370-\u03ff]/.test(s));
    const latinSegment = segments.find(
      (s) => !/[\u0370-\u03ff]/.test(s) && /[a-zA-Z]/.test(s),
    );
    name = greekSegment && latinSegment ? latinSegment : segments[0];
  }
  name = name
    .replace(/\(temporarily closed[^)]*\)/gi, "")
    .replace(/\(traffic suspended[^)]*\)/gi, "")
    .replace(/\s+\d{1,2}\.\d{2}\.\d{4}.*$/, "")
    .replace(/[;,]+$/, "")
    .replace(/\.$/, "")
    .replace(/(?<=[a-zA-Z\u00c0-\u024f])\d{1,2}$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (name.length < 2 || name.length > 90) return null;
  if (/^(and|with|the|on|no|type|opening times)$/i.test(name)) return null;
  if (
    /border inspection post|opened every day|explanation|in accordance with|according to the category|international military|users of non-public|permanent border crossing point|seasonal border crossing point|remark|note\b/i.test(
      name,
    )
  ) {
    return null;
  }
  return name;
}

type ExtractedEntry = {
  countryCode: string;
  officialName: string;
  mode: SchengenBorderCrossingMode | null;
};

/** Best-effort candidate extraction, used only to populate the unresolved report. */
function extractCandidateEntries(pdfText: string): ExtractedEntry[] {
  const lines = pdfText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: ExtractedEntry[] = [];
  let countryCode = "";
  let modeHint: SchengenBorderCrossingMode | null = null;

  for (const line of lines) {
    if (/^(EN\s+\d+\s+EN|EN\s+\d{2}\.\d{2}\.\d{4}\s+EN|--\s*\d+\s+of\s+\d+\s*--)$/i.test(line)) {
      continue;
    }

    const headerKey = normalizeName(line);
    if (COUNTRY_HEADERS[headerKey]) {
      countryCode = COUNTRY_HEADERS[headerKey];
      modeHint = null;
      continue;
    }
    if (!countryCode) continue;

    if (SECTION_HEADER_PATTERN.test(line) && line.length < 90) {
      modeHint = detectModeFromHint(line) ?? modeHint;
      continue;
    }

    // "On the border between X and Y: A, B, C;" style paragraph lists.
    const colonMatch = line.match(/^\(?\d*\)?\.?\s*(?:on the border between|between)?\s*(.+?):\s*(.+)$/i);
    if (colonMatch && /border|airports?:|river ports?:|sea ports?:/i.test(colonMatch[1])) {
      const localModeHint = detectModeFromHint(colonMatch[1]) ?? modeHint;
      for (const part of colonMatch[2].split(/[,;]/)) {
        const name = cleanCandidateName(part);
        if (name) entries.push({ countryCode, officialName: name, mode: localModeHint });
      }
      continue;
    }

    // "(1) Name" / "1. Name" / "1 Name" numbered items.
    const numbered =
      line.match(/^\((\d+)\)\s*(.+)$/) ||
      line.match(/^(\d+)\.\s+(.+)$/) ||
      line.match(/^(\d+)\s+(.+)$/);
    if (numbered) {
      for (const part of numbered[2].split(/\s*,\s*/)) {
        const name = cleanCandidateName(part);
        if (name) entries.push({ countryCode, officialName: name, mode: modeHint });
      }
      continue;
    }

    // Bare table-style rows (Latvia, Sweden, Iceland): "Name" or "Name \t Municipality".
    if (
      !/^[A-Z\s]+$/.test(line) &&
      !/^\*+$/.test(line) &&
      line.length <= 60 &&
      !/^(no|name|type|specific|airports?|municipality|harbour|vessel category)\b/i.test(line)
    ) {
      const name = cleanCandidateName(line);
      if (name) entries.push({ countryCode, officialName: name, mode: modeHint });
    }
  }

  return entries;
}

function findRegistryMatch(
  entry: ExtractedEntry,
  registry: readonly RegistryEntry[],
): RegistryEntry | null {
  const normalized = normalizeName(entry.officialName);
  if (!normalized) return null;
  for (const candidate of registry) {
    if (candidate.countryCode !== entry.countryCode) continue;
    for (const alias of candidate.aliases) {
      if (!alias) continue;
      if (normalized === alias || normalized.includes(alias) || alias.includes(normalized)) {
        return candidate;
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------------ *
 * 4. Assemble the final dataset
 * ------------------------------------------------------------------------ */

function buildPoint(
  entry: RegistryEntry,
  now: string,
): SchengenBorderCrossingPoint {
  const externalSchengenBorder =
    entry.mode === "air" ||
    entry.mode === "sea" ||
    entry.mode === "river" ||
    Boolean(entry.neighbouringCountryCode);

  return {
    id: `bcp-${entry.countryCode.toLowerCase()}-${slugify(entry.officialName)}`,
    officialName: entry.officialName,
    localName: entry.localName ?? null,
    countryCode: entry.countryCode,
    neighbouringCountryCode: entry.neighbouringCountryCode,
    latitude: entry.latitude,
    longitude: entry.longitude,
    mode: entry.mode,
    externalSchengenBorder,
    status: entry.status ?? "authorised",
    openingHours: entry.openingHours ?? null,
    passengerTraffic: null,
    freightTraffic: null,
    officialSourceName: "List of border crossing points — Annex 4",
    officialSourceUrl: ANNEX4_PDF_URL,
    coordinateSourceUrl: entry.coordinateSourceUrl,
    coordinateConfidence: entry.coordinateConfidence,
    lastVerifiedAt: now,
  };
}

/* ------------------------------------------------------------------------ *
 * 5. Temporary internal border controls (cheerio scrape)
 * ------------------------------------------------------------------------ */

const REINTRODUCING_COUNTRY_NAME_TO_CODE: Record<string, string> = {
  italy: "IT",
  austria: "AT",
  "the netherlands": "NL",
  netherlands: "NL",
  norway: "NO",
  poland: "PL",
  germany: "DE",
  sweden: "SE",
  france: "FR",
  spain: "ES",
  denmark: "DK",
};

const AFFECTED_COUNTRY_NAME_TO_CODE: Record<string, string> = {
  france: "FR",
  germany: "DE",
  belgium: "BE",
  "the netherlands": "NL",
  netherlands: "NL",
  luxembourg: "LU",
  "the swiss confederation": "CH",
  switzerland: "CH",
  spain: "ES",
  italy: "IT",
  austria: "AT",
  "the czech republic": "CZ",
  "czech republic": "CZ",
  czechia: "CZ",
  "the republic of poland": "PL",
  poland: "PL",
  "the republic of lithuania": "LT",
  lithuania: "LT",
  denmark: "DK",
  "the republic of slovenia": "SI",
  slovenia: "SI",
  hungary: "HU",
  "the slovak republic": "SK",
  "slovak republic": "SK",
  slovakia: "SK",
};

function parseCommissionDuration(
  text: string,
): { startDate: string; endDate: string | null } | null {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const match = cleaned.match(
    /(\d{2})\/(\d{2})\/(\d{4})\s*[–-]\s*(\d{2})\/(\d{2})\/(\d{4})/,
  );
  if (!match) return null;
  const [, d1, m1, y1, d2, m2, y2] = match;
  return {
    startDate: `${y1}-${m1}-${d1}`,
    endDate: `${y2}-${m2}-${d2}`,
  };
}

function modesFromReasonText(text: string): SchengenBorderCrossingMode[] {
  const modes = new Set<SchengenBorderCrossingMode>();
  const lower = text.toLowerCase();
  if (/\bland\b/.test(lower)) modes.add("road");
  if (/\bair\b/.test(lower)) modes.add("air");
  if (/\bsea\b|\bport(s)?\b|ferry/.test(lower)) modes.add("sea");
  if (/\briver\b/.test(lower)) modes.add("river");
  if (/\brail\b/.test(lower)) modes.add("rail");
  if (modes.size === 0) modes.add("road");
  return [...modes];
}

function affectedCountryCodesFromText(
  text: string,
  reintroducingCode: string,
): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  const sortedNames = Object.keys(AFFECTED_COUNTRY_NAME_TO_CODE).sort(
    (a, b) => b.length - a.length,
  );
  for (const name of sortedNames) {
    if (!lower.includes(name)) continue;
    const code = AFFECTED_COUNTRY_NAME_TO_CODE[name];
    if (code !== reintroducingCode) found.add(code);
  }
  return [...found];
}

async function scrapeTemporaryControls(
  retrievedAt: string,
): Promise<TemporaryInternalBorderControl[]> {
  const response = await fetchWithTimeout(TEMP_CONTROLS_URL, {
    headers: { Accept: "text/html,*/*" },
  });
  if (!response.ok) {
    throw new Error(`Temporary controls page HTTP ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);
  const controls: TemporaryInternalBorderControl[] = [];
  const seenIds = new Set<string>();

  $("table").each((_, table) => {
    const headerCells = $(table)
      .find("th")
      .map((__, th) => $(th).text().trim().toLowerCase())
      .get();
    const looksRight =
      headerCells.some((h) => h.includes("country")) &&
      headerCells.some((h) => h.includes("duration"));
    if (!looksRight) return;

    $(table)
      .find("tbody tr, tr")
      .each((__, row) => {
        const cells = $(row)
          .find("td")
          .map((___, cell) => $(cell).text().replace(/\s+/g, " ").trim())
          .get();
        if (cells.length < 3) return;
        const [countryText, durationText, reasonText] = cells;
        const reintroducingCode =
          REINTRODUCING_COUNTRY_NAME_TO_CODE[countryText.trim().toLowerCase()];
        const dates = parseCommissionDuration(durationText);
        if (!reintroducingCode || !dates) return;

        let id = `tbc-${reintroducingCode.toLowerCase()}-${dates.startDate}`;
        while (seenIds.has(id)) id += "-x";
        seenIds.add(id);

        controls.push({
          id,
          implementingCountryCode: reintroducingCode,
          affectedCountryCodes: affectedCountryCodesFromText(
            reasonText,
            reintroducingCode,
          ),
          modes: modesFromReasonText(reasonText),
          startAt: dates.startDate,
          endAt: dates.endDate ?? "",
          scope: reasonText.slice(0, 600),
          officialReason: reasonText.slice(0, 600),
          authorisedCrossingNames: [],
          officialSourceUrl: TEMP_CONTROLS_URL,
          fetchedAt: retrievedAt,
          geometryAccuracy: TEMPORARY_CONTROL_GEOMETRY_ACCURACY,
        });
      });
  });

  return controls;
}

/* ------------------------------------------------------------------------ *
 * main
 * ------------------------------------------------------------------------ */

async function main() {
  console.log(`Downloading Annex 4 PDF from ${ANNEX4_PDF_URL} …`);
  const pdfBuffer = await downloadAnnex4Pdf();
  console.log(`  downloaded ${pdfBuffer.length} bytes`);

  const pdfText = await extractPdfText(pdfBuffer);
  if (pdfText.length < 2000) {
    throw new Error(`Extracted PDF text unexpectedly short (${pdfText.length} chars)`);
  }
  console.log(`  extracted ${pdfText.length} characters of text`);

  const candidates = extractCandidateEntries(pdfText);
  console.log(`  extracted ${candidates.length} candidate entries from Annex 4 text`);

  const registry: RegistryEntry[] = [
    ...buildAirportRegistry(),
    ...buildEurostarRegistry(),
    ...LAND_SEA_RIVER_REGISTRY,
  ];

  const now = new Date().toISOString();
  const points: SchengenBorderCrossingPoint[] = [];
  const usedIds = new Set<string>();

  for (const entry of registry) {
    if (!inBounds(entry.longitude, entry.latitude)) continue;
    if (entry.coordinateConfidence === "approximate") continue;
    const point = buildPoint(entry, now);
    if (usedIds.has(point.id)) continue;
    usedIds.add(point.id);
    points.push(point);
  }
  points.sort((a, b) => a.id.localeCompare(b.id));

  const matchedRegistryKeys = new Set<string>();
  const unresolvedMap = new Map<string, SchengenUnresolvedEntry>();
  for (const entry of candidates) {
    const match = findRegistryMatch(entry, registry);
    if (match) {
      matchedRegistryKeys.add(`${match.countryCode}:${match.officialName}`);
      continue;
    }
    const key = `${entry.countryCode}:${normalizeName(entry.officialName)}`;
    if (!unresolvedMap.has(key)) {
      unresolvedMap.set(key, {
        officialName: entry.officialName,
        countryCode: entry.countryCode,
        mode: entry.mode,
        reason: "no-curated-coordinate-match",
      });
    }
  }
  const unresolved = [...unresolvedMap.values()].sort(
    (a, b) => a.countryCode.localeCompare(b.countryCode) || a.officialName.localeCompare(b.officialName),
  );

  const validation = validateSchengenBorderData(points, unresolved, []);
  if (validation.errors.length > 0) {
    throw new Error(
      `Validation failed (${validation.errors.length}): ${validation.errors.slice(0, 10).join("; ")}`,
    );
  }
  if (points.length < 40) {
    throw new Error(`Too few displayable points (${points.length}); expected at least 40`);
  }

  const dataset: SchengenBorderCrossingDataset = {
    source: {
      name: "List of border crossing points — Annex 4",
      url: ANNEX4_PDF_URL,
      pageUrl: ANNEX4_PAGE_URL,
      retrievedAt: now,
    },
    points,
    unresolved,
  };
  atomicWriteJson(POINTS_OUT, dataset);
  console.log(`Wrote ${POINTS_OUT} (${points.length} points, ${unresolved.length} unresolved)`);

  let controls: TemporaryInternalBorderControl[] = [];
  try {
    console.log(`Scraping temporary controls from ${TEMP_CONTROLS_URL} …`);
    controls = await scrapeTemporaryControls(now);
    if (controls.length === 0) {
      throw new Error("Parsed zero temporary-control rows");
    }
    const fallbackDataset: TemporaryBorderControlsFallbackDataset = {
      source: {
        name: "Temporary Reintroduction of Border Control",
        url: TEMP_CONTROLS_URL,
        retrievedAt: now,
      },
      controls,
    };
    atomicWriteJson(FALLBACK_OUT, fallbackDataset);
    console.log(`Wrote ${FALLBACK_OUT} (${controls.length} controls)`);
  } catch (error) {
    console.warn(
      "  temporary controls scrape failed; keeping existing fallback file intact.",
      error instanceof Error ? error.message : error,
    );
    if (fs.existsSync(FALLBACK_OUT)) {
      const existing = JSON.parse(
        fs.readFileSync(FALLBACK_OUT, "utf8"),
      ) as TemporaryBorderControlsFallbackDataset;
      controls = existing.controls ?? [];
    }
  }

  const byMode: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  for (const point of points) {
    byMode[point.mode] = (byMode[point.mode] ?? 0) + 1;
    byCountry[point.countryCode] = (byCountry[point.countryCode] ?? 0) + 1;
  }

  const report = {
    retrievedAt: now,
    officialExtracted: candidates.length,
    matchedToRegistry: matchedRegistryKeys.size,
    geolocatedDisplayed: points.length,
    unresolvedCount: unresolved.length,
    byMode,
    byCountry,
    temporaryControlsCount: controls.length,
  };
  atomicWriteJson(REPORT_OUT, report);
  console.log(`Wrote ${REPORT_OUT}`);

  console.log("\nSchengen border data import complete.");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error("[security:borders:update] failed — existing local files kept intact.");
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
