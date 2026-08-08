/**
 * Module-level thumbnail failure cache + in-flight dedupe (client).
 * Survives React remounts within the same JS realm.
 */

export type ThumbnailFailureReason =
  | "http_404"
  | "http_429"
  | "http_5xx"
  | "timeout"
  | "invalid_content"
  | "network"
  | "unknown";

type NegativeEntry = {
  retryAfter: number;
  reason: ThumbnailFailureReason;
};

const negativeCache = new Map<string, NegativeEntry>();
const inFlight = new Map<string, Promise<ImageBitmap | null>>();

const RETRY_MS: Record<ThumbnailFailureReason, number> = {
  http_404: 24 * 60 * 60_000,
  http_429: 45 * 60_000,
  http_5xx: 20 * 60_000,
  timeout: 15 * 60_000,
  invalid_content: 24 * 60 * 60_000,
  network: 10 * 60_000,
  unknown: 10 * 60_000,
};

export function classifyThumbnailHttpStatus(
  status: number,
): ThumbnailFailureReason {
  if (status === 404) return "http_404";
  if (status === 429) return "http_429";
  if (status >= 500) return "http_5xx";
  return "unknown";
}

export function rememberThumbnailFailure(
  url: string,
  reason: ThumbnailFailureReason,
) {
  negativeCache.set(url, {
    reason,
    retryAfter: Date.now() + RETRY_MS[reason],
  });
}

export function isThumbnailNegativelyCached(url: string): boolean {
  const entry = negativeCache.get(url);
  if (!entry) return false;
  if (entry.retryAfter <= Date.now()) {
    negativeCache.delete(url);
    return false;
  }
  return true;
}

export function getInFlightThumbnail(
  url: string,
): Promise<ImageBitmap | null> | undefined {
  return inFlight.get(url);
}

export function setInFlightThumbnail(
  url: string,
  promise: Promise<ImageBitmap | null>,
) {
  inFlight.set(url, promise);
  void promise.finally(() => {
    if (inFlight.get(url) === promise) inFlight.delete(url);
  });
}

/**
 * Controlled thumbnail fetch — avoids map.loadImage / <img> network console spam.
 * Returns null on failure (never rejects for HTTP errors).
 */
export async function fetchMapThumbnailBitmap(
  url: string,
  signal?: AbortSignal,
): Promise<ImageBitmap | null> {
  if (isThumbnailNegativelyCached(url)) return null;

  const existing = getInFlightThumbnail(url);
  if (existing) return existing;

  const task = (async () => {
    try {
      const response = await fetch(url, {
        signal,
        cache: "force-cache",
      });
      if (!response.ok) {
        rememberThumbnailFailure(
          url,
          classifyThumbnailHttpStatus(response.status),
        );
        return null;
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        rememberThumbnailFailure(url, "invalid_content");
        return null;
      }
      return await createImageBitmap(blob);
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name?: string }).name === "AbortError")
      ) {
        return null;
      }
      rememberThumbnailFailure(url, "timeout");
      return null;
    }
  })();

  setInFlightThumbnail(url, task);
  return task;
}
