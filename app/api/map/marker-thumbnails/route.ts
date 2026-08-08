import type { Locale } from "@/lib/i18n/config";
import {
  resolveMarkerThumbnails,
  type MarkerThumbnailRequest,
} from "@/lib/map/resolveMarkerThumbnails";
import type { PhotoMarkerCategory } from "@/lib/map/mapMarkerThumbnail";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set<PhotoMarkerCategory>([
  "capital",
  "tourist",
  "unesco",
  "ehl",
  "civil",
]);

function parseLocale(value: string | null): Locale {
  return (value || "en") as Locale;
}

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
  for (const item of items.slice(0, 40)) {
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const results = await resolveMarkerThumbnails(
      requests,
      parseLocale(body?.locale ?? null),
      controller.signal,
    );
    return Response.json(
      { results },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch {
    return Response.json({ results: [] }, { status: 200 });
  } finally {
    clearTimeout(timeout);
  }
}
