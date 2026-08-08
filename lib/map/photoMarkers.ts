import type { Map as MapLibreMap } from "maplibre-gl";
import {
  MAP_MARKER_THUMB_SIZE,
  PHOTO_MARKER_ACCENTS,
  photoMarkerImageId,
  sameOriginThumbnailProxyUrl,
  type PhotoMarkerCategory,
} from "@/lib/map/mapMarkerThumbnail";
import {
  fetchMapThumbnailBitmap,
  isThumbnailNegativelyCached,
} from "@/lib/map/fetchMapThumbnail";

type EnsureOptions = {
  category: PhotoMarkerCategory;
  entityId: string;
  remoteUrl: string;
  signal?: AbortSignal;
  /** Visible markers take the high-concurrency lane. */
  priority?: "visible" | "prefetch";
};

type RegistryEntry = {
  imageId: string;
  remoteUrl: string;
  status: "loading" | "ready" | "failed";
  failedUntil?: number;
};

const PIXEL_RATIO = 2;
const FAILURE_COOLDOWN_MS = 5 * 60_000;

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
      : "width" in source && typeof source.width === "number"
        ? source.width
        : size;
  const sh =
    "naturalHeight" in source && typeof source.naturalHeight === "number"
      ? source.naturalHeight
      : "height" in source && typeof source.height === "number"
        ? source.height
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

type QueueItem = {
  priority: "visible" | "prefetch";
  run: () => void;
};

/**
 * Shared MapLibre photo-marker image registry.
 * Distinguishes downloaded thumbnails from style-bound map.hasImage().
 */
export class PhotoMarkerRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  private readonly pending = new Map<string, Promise<string | null>>();
  private readonly imageDataCache = new Map<string, ImageData>();
  private readonly remoteByImageId = new Map<string, string>();
  private queue: QueueItem[] = [];
  private active = 0;
  private readonly visibleConcurrency: number;
  private readonly prefetchConcurrency: number;

  constructor(visibleConcurrency = 8, prefetchConcurrency = 3) {
    this.visibleConcurrency = visibleConcurrency;
    this.prefetchConcurrency = prefetchConcurrency;
  }

  clear() {
    this.entries.clear();
    this.pending.clear();
    this.imageDataCache.clear();
    this.remoteByImageId.clear();
    this.queue = [];
    this.active = 0;
  }

  clearFailures() {
    const now = Date.now();
    for (const [imageId, entry] of this.entries) {
      if (
        entry.status === "failed" &&
        (!entry.failedUntil || entry.failedUntil <= now)
      ) {
        this.entries.delete(imageId);
        this.pending.delete(imageId);
      }
    }
  }

  clearMapBindings() {
    for (const [imageId, entry] of this.entries) {
      if (entry.status === "ready") {
        this.entries.set(imageId, { ...entry, status: "loading" });
      }
    }
  }

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
    if (entry?.status !== "failed") return false;
    if (entry.failedUntil && entry.failedUntil <= Date.now()) {
      this.entries.delete(photoMarkerImageId(category, entityId));
      return false;
    }
    return true;
  }

  async ensure(
    map: MapLibreMap,
    options: EnsureOptions,
  ): Promise<string | null> {
    const imageId = photoMarkerImageId(options.category, options.entityId);
    const priority = options.priority ?? "visible";
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
    if (existing?.status === "failed") {
      if (existing.failedUntil && existing.failedUntil > Date.now()) {
        return null;
      }
      this.entries.delete(imageId);
    }

    const pending = this.pending.get(imageId);
    if (pending) return pending;

    const task = this.enqueue(priority, async () => {
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
        const absoluteUrl = proxyUrl.startsWith("http")
          ? proxyUrl
          : new URL(proxyUrl, window.location.origin).href;

        if (isThumbnailNegativelyCached(absoluteUrl)) {
          this.entries.set(imageId, {
            imageId,
            remoteUrl: options.remoteUrl,
            status: "failed",
            failedUntil: Date.now() + FAILURE_COOLDOWN_MS,
          });
          return null;
        }

        const bitmap = await fetchMapThumbnailBitmap(
          absoluteUrl,
          options.signal,
        );
        if (!bitmap) {
          this.entries.set(imageId, {
            imageId,
            remoteUrl: options.remoteUrl,
            status: "failed",
            failedUntil: Date.now() + FAILURE_COOLDOWN_MS,
          });
          return null;
        }

        try {
          const imageData = drawRoundedPhoto(bitmap, options.category);
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
        } finally {
          bitmap.close();
        }
      } catch (error) {
        if (isAbortError(error)) {
          this.entries.delete(imageId);
          return null;
        }
        this.entries.set(imageId, {
          imageId,
          remoteUrl: options.remoteUrl,
          status: "failed",
          failedUntil: Date.now() + FAILURE_COOLDOWN_MS,
        });
        return null;
      } finally {
        this.pending.delete(imageId);
      }
    });

    this.pending.set(imageId, task);
    return task;
  }

  private currentLimit(): number {
    const hasVisibleQueued = this.queue.some(
      (item) => item.priority === "visible",
    );
    return hasVisibleQueued || this.active < this.visibleConcurrency
      ? this.visibleConcurrency
      : this.prefetchConcurrency;
  }

  private enqueue<T>(
    priority: "visible" | "prefetch",
    work: () => Promise<T>,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.active += 1;
        work()
          .then(resolve, reject)
          .finally(() => {
            this.active -= 1;
            this.pump();
          });
      };
      if (priority === "visible") {
        this.queue.unshift({ priority, run });
      } else {
        this.queue.push({ priority, run });
      }
      this.pump();
    });
  }

  private pump() {
    while (this.queue.length > 0 && this.active < this.currentLimit()) {
      const visibleIndex = this.queue.findIndex(
        (item) => item.priority === "visible",
      );
      const index = visibleIndex >= 0 ? visibleIndex : 0;
      const next = this.queue.splice(index, 1)[0];
      if (next) next.run();
    }
  }
}

export const sharedPhotoMarkerRegistry = new PhotoMarkerRegistry(8, 3);
export { isAbortError as isPhotoMarkerAbortError };
