/**
 * Pre-resolve map marker thumbnails into data/map-marker-thumbnails.json.
 *
 * Usage:
 *   npm run thumbnails:update
 *   npm run thumbnails:update -- --force
 *   npm run thumbnails:update -- --only=capital,tourist
 *   npm run thumbnails:update -- --limit=50
 */

import fs from "fs";
import path from "path";
import {
  listAllCatalogTargets,
  resolveMarkerThumbnailRemote,
} from "../lib/map/resolveMarkerThumbnails";
import {
  MAP_MARKER_THUMBNAIL_CATALOG_VERSION,
  type MapMarkerThumbnailCatalogFile,
  type StoredMapThumbnail,
} from "../lib/map/mapMarkerThumbnailCatalog";
import type { PhotoMarkerCategory } from "../lib/map/mapMarkerThumbnail";

const ROOT = process.cwd();
const OUTPUT_PATH = path.join(ROOT, "data", "map-marker-thumbnails.json");
const CONCURRENCY = 1;
const DELAY_MS = 800;

function parseArgs(argv: string[]) {
  const force = argv.includes("--force");
  const onlyArg = argv.find((arg) => arg.startsWith("--only="));
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const only = onlyArg
    ? new Set(
        onlyArg
          .slice("--only=".length)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : null;
  const limit = limitArg
    ? Number.parseInt(limitArg.slice("--limit=".length), 10)
    : null;
  return {
    force,
    only,
    limit: Number.isFinite(limit) ? limit : null,
  };
}

function readExistingCatalog(): MapMarkerThumbnailCatalogFile {
  if (!fs.existsSync(OUTPUT_PATH)) {
    return {
      version: MAP_MARKER_THUMBNAIL_CATALOG_VERSION,
      updatedAt: new Date(0).toISOString(),
      entries: {},
    };
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(OUTPUT_PATH, "utf8"),
    ) as MapMarkerThumbnailCatalogFile;
    return {
      version: parsed.version ?? MAP_MARKER_THUMBNAIL_CATALOG_VERSION,
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      entries: parsed.entries ?? {},
    };
  } catch {
    return {
      version: MAP_MARKER_THUMBNAIL_CATALOG_VERSION,
      updatedAt: new Date(0).toISOString(),
      entries: {},
    };
  }
}

function writeCatalogAtomic(catalog: MapMarkerThumbnailCatalogFile) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  const tempPath = `${OUTPUT_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, OUTPUT_PATH);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function entryStillValid(entry: StoredMapThumbnail | undefined): boolean {
  if (!entry) return false;
  // Keep only successfully resolved URLs. Known-missing are retried later
  // (rate-limits often produce transient empties on first pass).
  return Boolean(entry.thumbnailUrl || entry.originalUrl);
}

async function main() {
  const { force, only, limit } = parseArgs(process.argv.slice(2));
  const existing = readExistingCatalog();
  const entries: Record<string, StoredMapThumbnail> = {
    ...existing.entries,
  };

  let targets = listAllCatalogTargets();
  if (only && only.size > 0) {
    targets = targets.filter((target) => only.has(target.category));
  }

  const pending = force
    ? targets
    : targets.filter((target) => !entryStillValid(entries[target.key]));

  const work = typeof limit === "number" ? pending.slice(0, limit) : pending;

  console.log(
    JSON.stringify(
      {
        catalogPath: OUTPUT_PATH,
        force,
        only: only ? [...only] : null,
        targets: targets.length,
        alreadyResolved: targets.length - pending.length,
        toResolve: work.length,
        concurrency: CONCURRENCY,
      },
      null,
      2,
    ),
  );

  let resolved = 0;
  let withUrl = 0;
  let missing = 0;
  let failures = 0;
  let index = 0;
  let consecutiveMisses = 0;

  async function worker() {
    while (index < work.length) {
      const current = work[index];
      index += 1;
      if (!current) continue;
      try {
        const result = await resolveMarkerThumbnailRemote(
          current,
          "en",
        );
        resolved += 1;
        if (result.stored.thumbnailUrl || result.stored.originalUrl) {
          entries[current.key] = result.stored;
          withUrl += 1;
          consecutiveMisses = 0;
        } else {
          // Do not persist misses — rate-limits produce transient empties.
          missing += 1;
          consecutiveMisses += 1;
          if (consecutiveMisses >= 3) {
            const waitMs = Math.min(180_000, 20_000 * consecutiveMisses);
            console.warn(
              `rate-limit backoff ${waitMs}ms after ${consecutiveMisses} misses`,
            );
            await sleep(waitMs);
            consecutiveMisses = 0;
          }
        }
        if (resolved % 10 === 0 || resolved === work.length) {
          console.log(
            `progress ${resolved}/${work.length} withUrl=${withUrl} missing=${missing} last=${current.key}`,
          );
          writeCatalogAtomic({
            version: MAP_MARKER_THUMBNAIL_CATALOG_VERSION,
            updatedAt: new Date().toISOString(),
            entries,
          });
        }
      } catch (error) {
        failures += 1;
        console.warn(`failed ${current.key}`, error);
      }
      await sleep(DELAY_MS);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, Math.max(work.length, 1)) }, () =>
      worker(),
    ),
  );

  const catalog: MapMarkerThumbnailCatalogFile = {
    version: MAP_MARKER_THUMBNAIL_CATALOG_VERSION,
    updatedAt: new Date().toISOString(),
    entries,
  };
  writeCatalogAtomic(catalog);

  const byCategory: Record<
    PhotoMarkerCategory,
    { total: number; withUrl: number }
  > = {
    capital: { total: 0, withUrl: 0 },
    tourist: { total: 0, withUrl: 0 },
    unesco: { total: 0, withUrl: 0 },
    ehl: { total: 0, withUrl: 0 },
    civil: { total: 0, withUrl: 0 },
  };
  for (const target of targets) {
    const entry = entries[target.key];
    byCategory[target.category].total += 1;
    if (entry?.thumbnailUrl || entry?.originalUrl) {
      byCategory[target.category].withUrl += 1;
    }
  }

  console.log(
    JSON.stringify(
      {
        written: OUTPUT_PATH,
        entries: Object.keys(entries).length,
        resolvedThisRun: resolved,
        withUrlThisRun: withUrl,
        missingThisRun: missing,
        failures,
        byCategory,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
