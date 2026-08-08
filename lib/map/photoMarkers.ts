import type { Map as MapLibreMap } from "maplibre-gl";
import {
  MAP_MARKER_THUMB_SIZE,
  PHOTO_MARKER_ACCENTS,
  photoMarkerImageId,
  sameOriginThumbnailProxyUrl,
  type PhotoMarkerCategory,
} from "@/lib/map/mapMarkerThumbnail";

type EnsureOptions = {
  category: PhotoMarkerCategory;
  entityId: string;
  remoteUrl: string;
  signal?: AbortSignal;
};

type RegistryEntry = {
  imageId: string;
  remoteUrl: string;
  status: "loading" | "ready" | "failed";
};

const PIXEL_RATIO = 2;

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError")
  );
}

function drawRoundedPhoto(
  source: CanvasImageSource,
  category: PhotoMarkerCategory,
): ImageData {
  const display = MAP_MARKER_THUMB_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = display * PIXEL_RATIO;
  canvas.height = display * PIXEL_RATIO;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas_unavailable");
  }
  ctx.scale(PIXEL_RATIO, PIXEL_RATIO);
  const accent = PHOTO_MARKER_ACCENTS[category];
  const radius = 8;
  const inset = 3;
  const size = display;

  ctx.beginPath();
  roundedRect(ctx, 1, 1, size - 2, size - 2, radius);
  ctx.fillStyle = accent.ring;
  ctx.fill();

  ctx.beginPath();
  roundedRect(ctx, inset, inset, size - inset * 2, size - inset * 2, radius - 2);
  ctx.clip();

  const sw =
    "naturalWidth" in source && typeof source.naturalWidth === "number"
      ? source.naturalWidth
      : size;
  const sh =
    "naturalHeight" in source && typeof source.naturalHeight === "number"
      ? source.naturalHeight
      : size;
  const scale = Math.max((size - inset * 2) / sw, (size - inset * 2) / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = inset + (size - inset * 2 - dw) / 2;
  const dy = inset + (size - inset * 2 - dh) / 2;
  ctx.drawImage(source as CanvasImageSource, dx, dy, dw, dh);

  ctx.beginPath();
  roundedRect(ctx, inset, inset, size - inset * 2, size - inset * 2, radius - 2);
  ctx.strokeStyle = accent.border;
  ctx.lineWidth = 2;
  ctx.stroke();

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function loadHtmlImage(
  url: string,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    const onAbort = () => {
      image.src = "";
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    image.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve(image);
    };
    image.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("image_load_failed"));
    };
    image.src = url;
  });
}

/**
 * Shared MapLibre photo-marker image registry.
 * Distinguishes downloaded thumbnails from style-bound map.hasImage().
 */
export class PhotoMarkerRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  private readonly pending = new Map<string, Promise<string | null>>();
  /** Decoded ImageData kept so we can re-add after style reload. */
  private readonly imageDataCache = new Map<string, ImageData>();
  private readonly remoteByImageId = new Map<string, string>();
  private queue: Array<() => void> = [];
  private active = 0;
  private readonly concurrency: number;

  constructor(concurrency = 6) {
    this.concurrency = concurrency;
  }

  clear() {
    this.entries.clear();
    this.pending.clear();
    this.imageDataCache.clear();
    this.remoteByImageId.clear();
    this.queue = [];
    this.active = 0;
  }

  /** Allow retry after upstream/proxy fixes (do not wipe ready ImageData). */
  clearFailures() {
    for (const [imageId, entry] of this.entries) {
      if (entry.status === "failed") {
        this.entries.delete(imageId);
        this.pending.delete(imageId);
      }
    }
  }

  /** Style was replaced — MapLibre images are gone, keep downloaded bitmaps. */
  clearMapBindings() {
    for (const [imageId, entry] of this.entries) {
      if (entry.status === "ready") {
        this.entries.set(imageId, { ...entry, status: "loading" });
      }
    }
  }

  /** Re-add cached bitmaps after style changes without re-downloading. */
  rebindReadyImages(map: MapLibreMap): number {
    let added = 0;
    for (const [imageId, imageData] of this.imageDataCache) {
      if (map.hasImage(imageId)) {
        this.entries.set(imageId, {
          imageId,
          remoteUrl: this.remoteByImageId.get(imageId) ?? "",
          status: "ready",
        });
        continue;
      }
      try {
        map.addImage(imageId, imageData, { pixelRatio: PIXEL_RATIO });
        this.entries.set(imageId, {
          imageId,
          remoteUrl: this.remoteByImageId.get(imageId) ?? "",
          status: "ready",
        });
        added += 1;
      } catch {
        // Ignore invalid bitmaps.
      }
    }
    return added;
  }

  has(category: PhotoMarkerCategory, entityId: string): boolean {
    const entry = this.entries.get(photoMarkerImageId(category, entityId));
    return entry?.status === "ready";
  }

  failed(category: PhotoMarkerCategory, entityId: string): boolean {
    const entry = this.entries.get(photoMarkerImageId(category, entityId));
    return entry?.status === "failed";
  }

  async ensure(
    map: MapLibreMap,
    options: EnsureOptions,
  ): Promise<string | null> {
    const imageId = photoMarkerImageId(options.category, options.entityId);
    if (map.hasImage(imageId)) {
      this.entries.set(imageId, {
        imageId,
        remoteUrl: options.remoteUrl,
        status: "ready",
      });
      return imageId;
    }

    const cachedData = this.imageDataCache.get(imageId);
    if (cachedData) {
      try {
        map.addImage(imageId, cachedData, { pixelRatio: PIXEL_RATIO });
        this.entries.set(imageId, {
          imageId,
          remoteUrl: options.remoteUrl,
          status: "ready",
        });
        return imageId;
      } catch {
        // Fall through to reload.
      }
    }

    const existing = this.entries.get(imageId);
    if (existing?.status === "failed") return null;

    const pending = this.pending.get(imageId);
    if (pending) return pending;

    const task = this.enqueue(async () => {
      if (options.signal?.aborted) {
        return null;
      }
      this.entries.set(imageId, {
        imageId,
        remoteUrl: options.remoteUrl,
        status: "loading",
      });
      try {
        const proxyUrl = sameOriginThumbnailProxyUrl(
          options.remoteUrl,
          typeof window !== "undefined" ? window.location.origin : undefined,
        );
        // Always absolute for Image()/MapLibre.
        const absoluteUrl = proxyUrl.startsWith("http")
          ? proxyUrl
          : new URL(proxyUrl, window.location.origin).href;
        const image = await loadHtmlImage(absoluteUrl, options.signal);
        const imageData = drawRoundedPhoto(image, options.category);
        this.imageDataCache.set(imageId, imageData);
        this.remoteByImageId.set(imageId, options.remoteUrl);
        if (map.hasImage(imageId)) {
          map.removeImage(imageId);
        }
        map.addImage(imageId, imageData, { pixelRatio: PIXEL_RATIO });
        this.entries.set(imageId, {
          imageId,
          remoteUrl: options.remoteUrl,
          status: "ready",
        });
        return imageId;
      } catch (error) {
        if (isAbortError(error)) {
          // Do not permanently fail aborted loads.
          this.entries.delete(imageId);
          return null;
        }
        this.entries.set(imageId, {
          imageId,
          remoteUrl: options.remoteUrl,
          status: "failed",
        });
        return null;
      } finally {
        this.pending.delete(imageId);
      }
    });

    this.pending.set(imageId, task);
    return task;
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.active += 1;
        work()
          .then(resolve, reject)
          .finally(() => {
            this.active -= 1;
            const next = this.queue.shift();
            if (next) next();
          });
      };
      if (this.active < this.concurrency) {
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

export const sharedPhotoMarkerRegistry = new PhotoMarkerRegistry(6);
export { isAbortError as isPhotoMarkerAbortError };
