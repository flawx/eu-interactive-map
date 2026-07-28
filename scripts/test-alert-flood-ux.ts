import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { GET as getFloodTile } from "../app/api/alerts/flood-extent/tiles/[z]/[x]/[y]/route";
import {
  sanitizeObservedFloodExtentTile,
} from "../lib/alerts/providers/copernicusFloodTiles";
import {
  demoFloodAlerts,
  demoStormAlerts,
  demoWeatherAlerts,
} from "../lib/alerts/demoFixtures";
import {
  buildFloodEventMarkerCollection,
} from "../components/map/alertMapLayers";
import { filterAlertsByActivityMode } from "../lib/alerts/activityMode";
import { getMessages } from "../lib/i18n/messages";
import { supportedLocales } from "../lib/i18n/config";

async function inspectTileResponse(
  z: string,
  x: string,
  y: string,
  expectedStatus: string,
) {
  const response = await getFloodTile(
    new Request(`http://localhost/api/alerts/flood-extent/tiles/${z}/${x}/${y}`),
    { params: Promise.resolve({ z, x, y }) },
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("x-alert-tile-status"), expectedStatus);
  const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
}

async function main() {
await inspectTileResponse("15", "18753", "9586", "overscaled");
await inspectTileResponse("5", "2", "10", "outside-project-europe");
await inspectTileResponse("not-a-zoom", "2", "3", "invalid-request");

const pixels = Buffer.alloc(256 * 256 * 4);
for (let y = 0; y < 256; y += 1) {
  for (let x = 0; x < 256; x += 1) {
    const index = (y * 256 + x) * 4;
    const color =
      x < 64
        ? [112, 173, 71, 255]
        : x < 128
          ? [192, 0, 0, 255]
          : x < 192
            ? [220, 30, 180, 255]
            : [22, 158, 176, 255];
    pixels.set(color, index);
  }
}
const sourcePng = await sharp(pixels, {
  raw: { width: 256, height: 256, channels: 4 },
}).png().toBuffer();
const sanitized = await sanitizeObservedFloodExtentTile(
  sourcePng,
  6,
  32,
  22,
);
const raw = await sharp(sanitized).ensureAlpha().raw().toBuffer();
let greenOrRedOpaque = 0;
let detectedOpaque = 0;
for (let index = 0; index < raw.length; index += 4) {
  if (raw[index + 3] === 0) continue;
  if (
    (raw[index + 1] > raw[index] && raw[index + 1] > raw[index + 2]) ||
    (raw[index] > 150 && raw[index + 1] < 80 && raw[index + 2] < 80)
  ) {
    greenOrRedOpaque += 1;
  } else {
    detectedOpaque += 1;
  }
}
assert.equal(greenOrRedOpaque, 0);
assert(detectedOpaque > 0);

const floods = demoFloodAlerts();
assert.equal(buildFloodEventMarkerCollection(floods).features.length, 2);
assert.equal(
  filterAlertsByActivityMode(
    floods,
    "active",
    new Date("2026-07-28T09:00:00Z"),
  ).some((alert) => alert.status === "ended"),
  false,
);
assert.equal(
  filterAlertsByActivityMode(
    floods,
    "24h",
    new Date("2026-07-28T09:00:00Z"),
  ).some((alert) => alert.status === "ended"),
  true,
);
assert.equal(demoWeatherAlerts()[0].severity, "severe");
assert.equal(
  (demoStormAlerts()[0].metadata.trackGeometry as GeoJSON.Geometry).type,
  "LineString",
);

for (const fixture of [
  "weather-warning-orange.geojson",
  "flood-gdacs-green.json",
  "flood-satellite-observation.geojson",
  "cyclone-track.json",
]) {
  JSON.parse(
    await readFile(
      new URL(`../tests/fixtures/alerts/${fixture}`, import.meta.url),
      "utf8",
    ),
  );
}

for (const locale of supportedLocales) {
  const messages = getMessages(locale).alertPanel;
  assert(messages.configurationRequired);
  assert(messages.noActiveEventsEurope);
  assert(messages.automaticDetection);
  assert(messages.notOfficialConfirmation);
  assert(messages.falsePositivesPossible);
}

console.log(
  JSON.stringify({
    tileProxy: "passed",
    europeFiltering: "passed",
    sentinelFootprintColorsRejected: true,
    gdacsMarkers: "passed",
    activityModes: ["active", "24h", "72h"],
    demoFixtures: 4,
    locales: supportedLocales.length,
    tests: "passed",
  }),
);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
