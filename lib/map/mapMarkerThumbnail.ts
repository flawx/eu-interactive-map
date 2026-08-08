export type MapMarkerThumbnail = {
  url: string | null;
  source: string | null;
  width: number | null;
  height: number | null;
};

export type PhotoMarkerCategory =
  | "capital"
  | "tourist"
  | "unesco"
  | "ehl"
  | "civil";

export type MarkerThumbnailRequest = {
  category: PhotoMarkerCategory;
  id: string;
  /** EHL physical location id when distinct from site id. */
  locationId?: string | null;
};

export type PhotoMarkerAccent = {
  border: string;
  ring: string;
};

export const PHOTO_MARKER_ACCENTS: Record<PhotoMarkerCategory, PhotoMarkerAccent> =
  {
    capital: { border: "#ffffff", ring: "#1a73e8" },
    tourist: { border: "#ffffff", ring: "#16a34a" },
    unesco: { border: "#ffffff", ring: "#0ea5e9" },
    ehl: { border: "#ffffff", ring: "#c9a227" },
    civil: { border: "#ffffff", ring: "#64748b" },
  };

/** Local canvas marker bitmap size (not a Wikimedia hotlink width). */
export const MAP_MARKER_THUMB_SIZE = 96;
export const MAP_MARKER_DISPLAY_SIZE = 36;
export const MAP_MARKER_SELECTED_SIZE = 46;

/**
 * Wikimedia production thumbnail steps ($wgThumbnailSteps).
 * Direct hotlinks with other widths (e.g. 96px) return HTTP 400.
 * @see https://w.wiki/GHai
 */
export const WIKIMEDIA_THUMB_STEPS = [
  20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840,
] as const;

/** Smallest allowed Commons width suitable for ~36–96px map icons. */
export const MAP_MARKER_WIKIMEDIA_FETCH_SIZE = 120;

/** Snap a desired width to the next Wikimedia-allowed thumbnail step. */
export function nearestWikimediaThumbWidth(desired: number): number {
  const target = Number.isFinite(desired) ? desired : MAP_MARKER_WIKIMEDIA_FETCH_SIZE;
  for (const step of WIKIMEDIA_THUMB_STEPS) {
    if (step >= target) return step;
  }
  return WIKIMEDIA_THUMB_STEPS[WIKIMEDIA_THUMB_STEPS.length - 1]!;
}

/** Stable MapLibre image id for a photo marker. */
export function photoMarkerImageId(
  category: PhotoMarkerCategory,
  entityId: string,
): string {
  return `photo-marker:${category}:${entityId}`;
}

/**
 * Prefer a small Wikimedia thumb when possible.
 * Avoids loading multi‑megapixel originals for a ~36px map icon.
 * Always uses an allowed Wikimedia thumbnail step (never 96px).
 */
export function toOptimizedMarkerThumbnailUrl(
  imageUrl: string | null | undefined,
  size = MAP_MARKER_WIKIMEDIA_FETCH_SIZE,
): string | null {
  if (!imageUrl) return null;
  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.endsWith("wikimedia.org")) {
      return imageUrl;
    }
    // Drop tracking query params that break some Commons thumb fetches.
    parsed.search = "";
    parsed.hash = "";
    const thumbWidth = nearestWikimediaThumbWidth(size);
    // Already a sized thumb: .../thumb/.../1280px-Name.jpg
    const thumbMatch = parsed.pathname.match(
      /^(.*\/thumb\/.+\/)\d+px-(.+)$/,
    );
    if (thumbMatch) {
      parsed.pathname = `${thumbMatch[1]}${thumbWidth}px-${thumbMatch[2]}`;
      return parsed.toString();
    }
    // Original commons path: /wikipedia/commons/a/ab/Name.jpg → thumb path
    const originalMatch = parsed.pathname.match(
      /^(\/wikipedia\/(?:commons|en)\/)([0-9a-f]\/[0-9a-f]{2}\/.+)$/i,
    );
    if (originalMatch) {
      const fileName = originalMatch[2].split("/").pop();
      if (fileName) {
        parsed.pathname = `${originalMatch[1]}thumb/${originalMatch[2]}/${thumbWidth}px-${fileName}`;
        return parsed.toString();
      }
    }
    return parsed.toString();
  } catch {
    return imageUrl;
  }
}

/**
 * Build a Commons Special:FilePath URL that rounds to an allowed width.
 * More resilient than hand-built /thumb/.../NNpx- URLs for odd filenames.
 */
export function toCommonsFilePathThumbnailUrl(
  imageUrl: string | null | undefined,
  size = MAP_MARKER_WIKIMEDIA_FETCH_SIZE,
): string | null {
  if (!imageUrl) return null;
  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.endsWith("wikimedia.org")) return null;
    let fileName: string | null = null;
    const specialMatch = parsed.pathname.match(
      /\/wiki\/Special:FilePath\/(.+)$/i,
    );
    if (specialMatch) {
      fileName = decodeURIComponent(specialMatch[1]);
    } else {
      const thumbMatch = parsed.pathname.match(
        /\/thumb\/.+\/\d+px-(.+)$/i,
      );
      if (thumbMatch) {
        fileName = decodeURIComponent(thumbMatch[1]);
      } else {
        const originalMatch = parsed.pathname.match(
          /\/(?:commons|en)\/[0-9a-f]\/[0-9a-f]{2}\/(.+)$/i,
        );
        if (originalMatch) {
          fileName = decodeURIComponent(originalMatch[1]);
        }
      }
    }
    if (!fileName) return null;
    const width = nearestWikimediaThumbWidth(size);
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`;
  } catch {
    return null;
  }
}

export function sameOriginThumbnailProxyUrl(
  remoteUrl: string,
  origin?: string | null,
): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const params = new URLSearchParams({
    url: remoteUrl,
    size: String(MAP_MARKER_WIKIMEDIA_FETCH_SIZE),
  });
  return `${base}/api/media/map-thumbnail?${params.toString()}`;
}

export function markerThumbnailKey(
  category: PhotoMarkerCategory,
  id: string,
  locationId?: string | null,
): string {
  return locationId ? `${category}:${id}:${locationId}` : `${category}:${id}`;
}

export function emptyMarkerThumbnail(): MapMarkerThumbnail {
  return { url: null, source: null, width: null, height: null };
}

export function markerThumbnailFromResolvedImage(image: {
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  sourceUrl: string | null;
}): MapMarkerThumbnail {
  const optimized =
    toOptimizedMarkerThumbnailUrl(image.thumbnailUrl) ??
    toOptimizedMarkerThumbnailUrl(image.url) ??
    image.thumbnailUrl ??
    image.url;
  return {
    url: optimized,
    source: image.sourceUrl,
    width: image.width,
    height: image.height,
  };
}
