import { searchTomTomLocations } from "@/lib/search/providers/tomTomSearch";
import { searchNominatimLocations } from "@/lib/search/providers/nominatimSearch";
import { mergeUnifiedLocationResults } from "@/lib/search/unifiedLocationSearch";
import {
  buildLocalSearchIndex,
  flattenSearchGroups,
  searchLocalIndex,
} from "@/lib/search/mapSearch";
import { supportedLocales, type Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isLocale(value: string): value is Locale {
  return (supportedLocales as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const langRaw = (searchParams.get("lang") ?? "en").trim();
  const locale: Locale = isLocale(langRaw) ? langRaw : "en";
  const limit = Math.min(
    12,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "8", 10) || 8),
  );
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const localIndex = buildLocalSearchIndex(locale, [], [], []);
  const localHits = flattenSearchGroups(searchLocalIndex(q, localIndex, limit));

  let external = await searchTomTomLocations({
    query: q,
    locale,
    limit,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    signal: request.signal,
  });

  // Fallback when TomTom Search product is not enabled on the API key (403).
  if (external.length === 0) {
    external = await searchNominatimLocations({
      query: q,
      locale,
      limit,
      signal: request.signal,
    });
  }

  const results = mergeUnifiedLocationResults(localHits, external, limit);

  return Response.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      },
    },
  );
}
