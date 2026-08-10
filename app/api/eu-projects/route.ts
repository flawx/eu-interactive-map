/**
 * EU-funded projects — viewport / filter query endpoint.
 *
 * Server-only: the curated fixture dataset (`lib/europe/euProjects/fixtureProjects.ts`)
 * is scanned in-memory (see `queryFixture.ts` header for the production-scale
 * plan). The browser must never call Kohesio directly; all filtering happens
 * here so the client only ever receives a small, already-filtered
 * GeoJSON FeatureCollection.
 *
 * GET params:
 *   bbox       "minLng,minLat,maxLng,maxLat" (required for spatial filtering;
 *              omitted = whole in-scope dataset, still capped by `limit`)
 *   category   single category or comma-separated list (EuProjectCategory)
 *   status     single status or comma-separated list (EntityStatus)
 *   minBudget  number, EUR
 *   limit      max features returned (default 200, capped at 500)
 *   cursor     offset for pagination
 *   majorOnly  "true" to restrict to `isMajor` projects (low-zoom overview)
 */
import { toFeatureCollection } from "@/lib/europe/euProjects/entities";
import { parseBboxParam, queryEuProjects } from "@/lib/europe/euProjects/queryFixture";
import type {
  EuProjectCategory,
  EuProjectFilters,
} from "@/lib/europe/euProjects/types";
import { EU_PROJECT_CATEGORIES } from "@/lib/europe/euProjects/types";
import type { EntityStatus } from "@/lib/map/dataLayers/entityStatus";

const VALID_STATUSES = new Set<EntityStatus>([
  "proposed",
  "study",
  "planned",
  "approved",
  "under_construction",
  "ongoing",
  "operational",
  "completed",
  "suspended",
  "cancelled",
  "abandoned",
  "unknown",
]);

const VALID_CATEGORIES = new Set<EuProjectCategory>(EU_PROJECT_CATEGORIES);

function parseCsv<T extends string>(
  raw: string | null,
  isValid: (value: string) => value is T,
): T[] | undefined {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is T => isValid(value));
  return values.length > 0 ? values : undefined;
}

function isCategory(value: string): value is EuProjectCategory {
  return VALID_CATEGORIES.has(value as EuProjectCategory);
}

function isStatus(value: string): value is EntityStatus {
  return VALID_STATUSES.has(value as EntityStatus);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const bbox = parseBboxParam(searchParams.get("bbox"));
  if (searchParams.get("bbox") && !bbox) {
    return Response.json(
      { error: "invalid_bbox", message: "bbox must be minLng,minLat,maxLng,maxLat" },
      { status: 400 },
    );
  }

  const limitParam = searchParams.get("limit");
  const cursorParam = searchParams.get("cursor");
  const minBudgetParam = searchParams.get("minBudget");

  const filters: EuProjectFilters = {
    bbox,
    category: parseCsv(searchParams.get("category"), isCategory),
    status: parseCsv(searchParams.get("status"), isStatus),
    minBudget: minBudgetParam ? Number.parseFloat(minBudgetParam) : undefined,
    majorOnly: searchParams.get("majorOnly") === "true",
    limit: limitParam ? Number.parseInt(limitParam, 10) : undefined,
    cursor: cursorParam ? Number.parseInt(cursorParam, 10) : undefined,
  };

  const { projects, meta } = queryEuProjects(filters);
  const collection = toFeatureCollection(projects);

  return Response.json(
    { ...collection, meta },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
