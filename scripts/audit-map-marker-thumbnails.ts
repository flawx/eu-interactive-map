/**
 * Audit a sample of catalog thumbnail URLs against Wikimedia (low concurrency).
 * Usage: npm run thumbnails:audit
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type CatalogEntry = {
  category?: string;
  id?: string;
  url?: string | null;
  thumbnailUrl?: string | null;
};

const CONCURRENCY = 3;
const TIMEOUT_MS = 4_000;
const SAMPLE_LIMIT = 40;

function loadCatalog(): CatalogEntry[] {
  const candidates = [
    resolve(process.cwd(), "data/map-marker-thumbnails.json"),
    resolve(process.cwd(), "public/data/map-marker-thumbnails.json"),
    resolve(process.cwd(), "lib/map/map-marker-thumbnails.json"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (Array.isArray(raw)) return raw as CatalogEntry[];
    if (raw && typeof raw === "object" && Array.isArray((raw as { entries?: unknown }).entries)) {
      return (raw as { entries: CatalogEntry[] }).entries;
    }
    if (raw && typeof raw === "object") {
      return Object.values(raw as Record<string, CatalogEntry>);
    }
  }
  return [];
}

async function probe(url: string): Promise<"OK" | "404" | "429" | "5xx" | "timeout" | "invalid"> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "image/*",
        "User-Agent": "EUInteractiveMap/0.2 (thumbnail-audit; contact: local-dev)",
      },
      redirect: "follow",
    });
    if (response.status === 404) return "404";
    if (response.status === 429) return "429";
    if (response.status >= 500) return "5xx";
    if (!response.ok) return "invalid";
    const ct = response.headers.get("content-type") ?? "";
    if (!ct.startsWith("image/")) return "invalid";
    return "OK";
  } catch {
    return "timeout";
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const catalog = loadCatalog();
  const urls = catalog
    .map((entry) => entry.thumbnailUrl ?? entry.url ?? null)
    .filter((value): value is string => Boolean(value && value.startsWith("https://")))
    .filter((url, index, all) => all.indexOf(url) === index)
    .slice(0, SAMPLE_LIMIT);

  console.log(`Auditing ${urls.length} unique thumbnail URLs (limit ${SAMPLE_LIMIT}, concurrency ${CONCURRENCY})`);

  const counts = {
    OK: 0,
    "404": 0,
    "429": 0,
    "5xx": 0,
    timeout: 0,
    invalid: 0,
  };
  const permanent404: string[] = [];

  let index = 0;
  async function worker() {
    while (index < urls.length) {
      const current = urls[index++]!;
      const result = await probe(current);
      counts[result] += 1;
      if (result === "404") permanent404.push(current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker()),
  );

  console.log("");
  console.log("SUMMARY");
  for (const [key, value] of Object.entries(counts)) {
    console.log(`${key}: ${value}`);
  }
  if (permanent404.length) {
    console.log("");
    console.log("404 permanent (sample):");
    for (const url of permanent404.slice(0, 15)) {
      console.log(`- ${url}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
