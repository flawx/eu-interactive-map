import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import {
  getActiveTemporaryControls,
  SCHENGEN_TEMPORARY_CONTROLS_FALLBACK,
  type BorderCrossingMode,
  type TemporaryInternalBorderControl,
} from "@/lib/security/schengenBorders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEMP_CONTROLS_URL =
  "https://home-affairs.ec.europa.eu/policies/schengen/schengen-area/temporary-reintroduction-border-control_en";
const FETCH_TIMEOUT_MS = 15_000;
const CACHE_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = "EUInteractiveMap/0.1 (educational; Schengen temporary controls)";

type CacheEntry = {
  controls: TemporaryInternalBorderControl[];
  fetchedAt: string;
  cachedAt: number;
  source: "live" | "fallback";
};

let memoryCache: CacheEntry | null = null;

function parseDuration(duration: string): { startAt: string; endAt: string } | null {
  const m = duration
    .replace(/\s+/g, " ")
    .trim()
    .match(/(\d{2})\/(\d{2})\/(\d{4})\s*[–-]\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return {
    startAt: `${m[3]}-${m[2]}-${m[1]}`,
    endAt: `${m[6]}-${m[5]}-${m[4]}`,
  };
}

function modesFromScope(scope: string): BorderCrossingMode[] {
  const modes = new Set<BorderCrossingMode>();
  const s = scope.toLowerCase();
  if (s.includes("land")) modes.add("road");
  if (s.includes("air")) modes.add("air");
  if (s.includes("sea") || s.includes("port") || s.includes("ferry")) {
    modes.add("sea");
  }
  if (s.includes("river")) modes.add("river");
  if (s.includes("rail")) modes.add("rail");
  if (modes.size === 0) modes.add("road");
  return [...modes];
}

function affectedFromScope(scope: string, implementing: string): string[] {
  const names: Record<string, string> = {
    france: "FR",
    germany: "DE",
    belgium: "BE",
    netherlands: "NL",
    luxembourg: "LU",
    switzerland: "CH",
    "swiss confederation": "CH",
    spain: "ES",
    italy: "IT",
    austria: "AT",
    "czech republic": "CZ",
    czechia: "CZ",
    poland: "PL",
    lithuania: "LT",
    denmark: "DK",
    slovenia: "SI",
    hungary: "HU",
    "slovak republic": "SK",
    slovakia: "SK",
  };
  const found = new Set<string>();
  const lower = scope.toLowerCase();
  for (const [name, code] of Object.entries(names)) {
    if (lower.includes(name) && code !== implementing) found.add(code);
  }
  return [...found];
}

function countryCodeFromName(name: string): string | null {
  const map: Record<string, string> = {
    italy: "IT",
    austria: "AT",
    "the netherlands": "NL",
    netherlands: "NL",
    norway: "NO",
    poland: "PL",
    germany: "DE",
    sweden: "SE",
    france: "FR",
  };
  return map[name.trim().toLowerCase()] ?? null;
}

async function fetchLiveControls(): Promise<TemporaryInternalBorderControl[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(TEMP_CONTROLS_URL, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      next: { revalidate: 21_600 },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const fetchedAt = new Date().toISOString();
    const controls: TemporaryInternalBorderControl[] = [];

    $("table").each((_, table) => {
      const headers = $(table)
        .find("th")
        .map((__, th) => $(th).text().trim().toLowerCase())
        .get();
      if (
        !headers.some((h) => h.includes("country")) ||
        !headers.some((h) => h.includes("duration"))
      ) {
        return;
      }

      $(table)
        .find("tr")
        .each((__, tr) => {
          const cells = $(tr)
            .find("td")
            .map((___, td) => $(td).text().replace(/\s+/g, " ").trim())
            .get();
          if (cells.length < 3) return;
          const [country, duration, reasonScope] = cells;
          const code = countryCodeFromName(country);
          const dates = parseDuration(duration);
          if (!code || !dates) return;
          controls.push({
            id: `tbc-${code.toLowerCase()}-${dates.startAt}`,
            implementingCountryCode: code,
            affectedCountryCodes: affectedFromScope(reasonScope, code),
            modes: modesFromScope(reasonScope),
            startAt: dates.startAt,
            endAt: dates.endAt,
            scope: reasonScope.slice(0, 500),
            officialReason: reasonScope.slice(0, 500),
            authorisedCrossingNames: [],
            officialSourceUrl: TEMP_CONTROLS_URL,
            fetchedAt,
            geometryAccuracy: "notified-scope",
          });
        });
    });

    if (controls.length === 0) throw new Error("empty parse");
    return controls;
  } finally {
    clearTimeout(timer);
  }
}

function readFallbackFile(): TemporaryInternalBorderControl[] {
  try {
    const filePath = path.join(
      process.cwd(),
      "data",
      "schengen-temporary-border-controls-fallback.json",
    );
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    const controls = Array.isArray(parsed)
      ? (parsed as TemporaryInternalBorderControl[])
      : ((parsed as { controls?: TemporaryInternalBorderControl[] }).controls ??
        []);
    return controls.map((control) => ({
      ...control,
      geometryAccuracy: "notified-scope" as const,
    }));
  } catch {
    return [...SCHENGEN_TEMPORARY_CONTROLS_FALLBACK];
  }
}

export async function GET() {
  const now = Date.now();
  if (memoryCache && now - memoryCache.cachedAt < CACHE_MS) {
    const active = getActiveTemporaryControls(memoryCache.controls);
    const ageHours =
      (now - Date.parse(memoryCache.fetchedAt)) / (1000 * 60 * 60);
    return Response.json(
      {
        controls: active,
        cached: true,
        source: memoryCache.source,
        fetchedAt: memoryCache.fetchedAt,
        staleOver24h: ageHours > 24,
        geometryAccuracy: "notified-scope",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  }

  try {
    const live = await fetchLiveControls();
    memoryCache = {
      controls: live,
      fetchedAt: live[0]?.fetchedAt ?? new Date().toISOString(),
      cachedAt: now,
      source: "live",
    };
    const active = getActiveTemporaryControls(live);
    return Response.json(
      {
        controls: active,
        cached: false,
        source: "live",
        fetchedAt: memoryCache.fetchedAt,
        staleOver24h: false,
        geometryAccuracy: "notified-scope",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    const fallback = readFallbackFile();
    const fetchedAt =
      fallback[0]?.fetchedAt ?? new Date().toISOString();
    memoryCache = {
      controls: fallback,
      fetchedAt,
      cachedAt: now,
      source: "fallback",
    };
    const active = getActiveTemporaryControls(fallback);
    const ageHours = (now - Date.parse(fetchedAt)) / (1000 * 60 * 60);
    return Response.json(
      {
        controls: active,
        cached: true,
        source: "fallback",
        fetchedAt,
        staleOver24h: ageHours > 24,
        geometryAccuracy: "notified-scope",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  }
}
