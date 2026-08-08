import assert from "node:assert/strict";
import {
  classifyThumbnailHttpStatus,
  fetchMapThumbnailBitmap,
  isAbortError,
  isNetworkFetchError,
  isThumbnailNegativelyCached,
  rememberThumbnailFailure,
} from "../lib/map/fetchMapThumbnail";
import { buildTomTomRouteUrl } from "../lib/routing/providers/tomTomRouting";
import {
  DEFAULT_ROUTE_AVOID,
  type RoutingRequest,
} from "../lib/routing/types";

function baseRequest(): RoutingRequest {
  return {
    origin: {
      latitude: 44.8378,
      longitude: -0.5792,
      name: "Bordeaux",
      countryCode: "FR",
    },
    destination: {
      latitude: 48.8566,
      longitude: 2.3522,
      name: "Paris",
      countryCode: "FR",
    },
    waypoints: [],
    mode: "car",
    preference: "fastest",
    departureTime: "now",
    alternatives: 1,
    avoid: { ...DEFAULT_ROUTE_AVOID },
    vehicleProfile: null,
    locale: "en",
  };
}

async function main() {
  const url = buildTomTomRouteUrl(baseRequest(), "test-api-key-xyz");
  assert.match(url, /[?&]key=test-api-key-xyz/);
  assert.doesNotMatch(url, /TomTom-Api-Key/i);
  assert.match(
    url,
    /^https:\/\/api\.tomtom\.com\/routing\/1\/calculateRoute\//,
  );

  assert.equal(classifyThumbnailHttpStatus(404), "http_404");
  assert.equal(classifyThumbnailHttpStatus(429), "http_429");
  assert.equal(classifyThumbnailHttpStatus(502), "http_5xx");

  const sample = "https://example.test/thumb-a";
  rememberThumbnailFailure(sample, "http_404");
  assert.equal(isThumbnailNegativelyCached(sample), true);

  assert.equal(isNetworkFetchError(new TypeError("Failed to fetch")), true);
  assert.equal(isNetworkFetchError(new TypeError("Load failed")), true);
  assert.equal(isNetworkFetchError(new Error("Failed to fetch")), false);
  assert.equal(
    isAbortError(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    ),
    true,
  );
  assert.equal(
    isNetworkFetchError(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    ),
    false,
  );

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  try {
    const bitmap = await fetchMapThumbnailBitmap(
      "https://example.test/network-fail.png",
    );
    assert.equal(bitmap, null);
    assert.equal(
      isThumbnailNegativelyCached("https://example.test/network-fail.png"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = (async () =>
    new Response("not-an-image", {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    })) as typeof fetch;
  try {
    const bitmap = await fetchMapThumbnailBitmap(
      "https://example.test/http-502.png",
    );
    assert.equal(bitmap, null);
    assert.equal(
      isThumbnailNegativelyCached("https://example.test/http-502.png"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = (async (_input, init) => {
    if (init?.signal?.aborted) {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    }
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  try {
    const bitmap = await fetchMapThumbnailBitmap(
      "https://example.test/aborted.png",
      controller.signal,
    );
    assert.equal(bitmap, null);
    // Abort must not poison the negative cache.
    assert.equal(
      isThumbnailNegativelyCached("https://example.test/aborted.png"),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log("test-media-routing-stability: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
