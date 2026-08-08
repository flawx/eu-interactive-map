import assert from "node:assert/strict";
import {
  classifyThumbnailHttpStatus,
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

  console.log("test-media-routing-stability: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
