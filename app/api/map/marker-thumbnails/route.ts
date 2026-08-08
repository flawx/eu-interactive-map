import {
  resolveMarkerThumbnailsFromCatalog,
  type MarkerThumbnailRequest,
} from "@/lib/map/resolveMarkerThumbnails";
import type { PhotoMarkerCategory } from "@/lib/map/mapMarkerThumbnail";
import { getCatalogVersion } from "@/lib/map/mapMarkerThumbnailCatalog";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set<PhotoMarkerCategory>([
  "capital",
  "tourist",
  "unesco",
  "ehl",
  "civil",
]);

const MAX_BATCH = 200;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    locale?: string;
    items?: Array<{
      category?: string;
      id?: string;
      locationId?: string | null;
    }>;
  } | null;

  const items = Array.isArray(body?.items) ? body.items : [];
  const requests: MarkerThumbnailRequest[] = [];
  for (const item of items.slice(0, MAX_BATCH)) {
    if (!item?.id || typeof item.id !== "string") continue;
    if (!item.category || !CATEGORIES.has(item.category as PhotoMarkerCategory)) {
      continue;
    }
    requests.push({
      category: item.category as PhotoMarkerCategory,
      id: item.id,
      locationId:
        typeof item.locationId === "string" ? item.locationId : null,
    });
  }

  // Catalog lookup only — no Wikidata/Wikipedia/Commons network I/O.
  const { results, stats } = resolveMarkerThumbnailsFromCatalog(requests);

  return Response.json(
    {
      results,
      catalogVersion: getCatalogVersion(),
      stats,
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        "X-Catalog-Version": String(getCatalogVersion()),
        "X-Batch-Duration-Ms": String(stats.durationMs),
      },
    },
  );
}
