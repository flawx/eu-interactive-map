import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  areEarthquakesCompatible,
  earthquakeMatchMetrics,
  mergeEarthquakeProviders,
} from "../lib/alerts/earthquakeDeduplication";
import {
  earthquakeMagnitudeBand,
  filterEarthquakesByTimeMode,
  filterVolcanoesByTimeMode,
} from "../lib/alerts/geologicalActivity";
import {
  normalizeEmscEarthquake,
  normalizeGdacsGeological,
  normalizeUsgsEarthquake,
} from "../lib/alerts/providers/geologicalHazards";
import {
  buildGeologicalAlertCollection,
  filterVisibleAlerts,
} from "../components/map/alertMapLayers";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  countActiveMapLayers,
  migrateMapLayerPreferences,
} from "../lib/map/mapLayerPreferences";
import { buildLocalSearchIndex } from "../lib/search/mapSearch";
import { getMessages } from "../lib/i18n/messages";
import { supportedLocales } from "../lib/i18n/config";
import type { NormalizedAlert } from "../lib/alerts/types";

const FIXTURE_DIRECTORY = new URL("../tests/fixtures/alerts/", import.meta.url);
const fetchedAt = "2026-07-28T09:00:00Z";

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(name, FIXTURE_DIRECTORY), "utf8"),
  ) as unknown;
}

function shiftEarthquake(
  alert: NormalizedAlert,
  values: {
    id: string;
    seconds?: number;
    longitude?: number;
    latitude?: number;
    magnitude?: number;
  },
): NormalizedAlert {
  const eventAt = new Date(
    Date.parse(alert.onsetAt ?? fetchedAt) + (values.seconds ?? 0) * 1000,
  ).toISOString();
  const longitude = values.longitude ?? alert.centroid!.longitude;
  const latitude = values.latitude ?? alert.centroid!.latitude;
  const magnitude =
    values.magnitude ??
    (typeof alert.metadata.magnitude === "number"
      ? alert.metadata.magnitude
      : 4.8);
  return {
    ...alert,
    id: values.id,
    sourceEventId: values.id,
    onsetAt: eventAt,
    effectiveAt: eventAt,
    centroid: { longitude, latitude },
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    metadata: {
      ...alert.metadata,
      magnitude,
    },
  };
}

async function main() {
  const usgsFixture = await fixture("earthquake-moderate-europe.json");
  const emscFixture = await fixture("earthquake-felt-emsc.json");
  const gdacsFixture = await fixture("earthquake-major-gdacs.json");
  const volcanoFixture = await fixture("volcano-active-gdacs.json");
  const ashFixture = await fixture("volcano-ash-emission.json");

  const usgs = normalizeUsgsEarthquake(usgsFixture, fetchedAt);
  const emsc = normalizeEmscEarthquake(emscFixture, fetchedAt);
  const gdacs = normalizeGdacsGeological(gdacsFixture, "EQ", fetchedAt);
  const volcano = normalizeGdacsGeological(volcanoFixture, "VO", fetchedAt);
  const ash = normalizeGdacsGeological(ashFixture, "VO", fetchedAt);
  assert(usgs && emsc && gdacs && volcano && ash);
  assert.equal(usgs.category, "earthquake");
  assert.equal(usgs.metadata.magnitude, 4.8);
  assert.equal(usgs.metadata.depthKilometers, 18);
  assert.equal(usgs.metadata.reviewStatus, "reviewed");
  assert.equal(usgs.metadata.feltReports, 47);
  assert.equal(usgs.metadata.tsunamiFlag, false);
  assert.equal(emsc.source, "emsc");
  assert.equal(gdacs.metadata.gdacsSeverity, "orange");
  assert.equal(volcano.metadata.activityType, "eruption");
  assert.equal(ash.metadata.activityType, "ash_emission");

  const automatic = normalizeUsgsEarthquake(
    {
      ...(usgsFixture as Record<string, unknown>),
      properties: {
        ...((usgsFixture as Record<string, unknown>).properties as Record<string, unknown>),
        status: "automatic",
        mag: null,
        tsunami: 1,
      },
      geometry: { type: "Point", coordinates: [22.1, 36.9] },
    },
    fetchedAt,
  );
  assert(automatic);
  assert.equal(automatic.metadata.reviewStatus, "automatic");
  assert.equal(automatic.metadata.magnitude, null);
  assert.equal(automatic.metadata.depthKilometers, null);
  assert.equal(automatic.metadata.tsunamiFlag, true);

  const outside = normalizeUsgsEarthquake(
    {
      ...(usgsFixture as Record<string, unknown>),
      id: "outside",
      geometry: { type: "Point", coordinates: [-118.2, 34.1, 8] },
    },
    fetchedAt,
  );
  assert.equal(outside, null);
  const outsideVolcano = normalizeGdacsGeological(
    {
      ...(volcanoFixture as Record<string, unknown>),
      geometry: { type: "Point", coordinates: [123.7, 13.2] },
      properties: {
        ...((volcanoFixture as Record<string, unknown>).properties as Record<string, unknown>),
        eventid: "outside-volcano",
        country: "Philippines",
        iso3: "PHL",
        affectedcountries: [{ iso2: "PH", iso3: "PHL" }],
      },
    },
    "VO",
    fetchedAt,
  );
  assert.equal(outsideVolcano, null);

  const compatibleEmsc = shiftEarthquake(emsc, {
    id: "emsc-compatible",
    seconds: 45,
    longitude: usgs.centroid!.longitude + 0.01,
    latitude: usgs.centroid!.latitude,
    magnitude: 4.7,
  });
  assert(areEarthquakesCompatible(usgs, compatibleEmsc));
  const metrics = earthquakeMatchMetrics(usgs, compatibleEmsc);
  assert(metrics && metrics.timeSeconds <= 120);
  const distinct = shiftEarthquake(compatibleEmsc, {
    id: "close-but-distinct",
    seconds: 180,
  });
  assert.equal(areEarthquakesCompatible(usgs, distinct), false);

  const compatibleGdacs = shiftEarthquake(gdacs, {
    id: "gdacs-compatible",
    seconds: 30,
    longitude: usgs.centroid!.longitude + 0.02,
    latitude: usgs.centroid!.latitude,
    magnitude: 4.9,
  });
  const merged = mergeEarthquakeProviders(
    [usgs],
    [compatibleEmsc],
    [compatibleGdacs],
  );
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].metadata.providerEventIds, {
    usgs: usgs.sourceEventId,
    emsc: compatibleEmsc.sourceEventId,
    gdacs: compatibleGdacs.sourceEventId,
  });
  const ambiguous = mergeEarthquakeProviders(
    [usgs],
    [compatibleEmsc, shiftEarthquake(compatibleEmsc, { id: "second-candidate", seconds: 1 })],
    [],
  );
  assert.equal(ambiguous.length, 3, "ambiguous candidates must remain separate");

  assert.equal(earthquakeMagnitudeBand(3.2), "minor");
  assert.equal(earthquakeMagnitudeBand(4.8), "moderate");
  assert.equal(earthquakeMagnitudeBand(5.4), "strong");
  assert.equal(earthquakeMagnitudeBand(6.1), "major");
  assert.equal(earthquakeMagnitudeBand(null), null);

  const recent = { ...usgs, onsetAt: "2026-07-28T08:30:00Z" };
  const olderMinor = {
    ...shiftEarthquake(usgs, { id: "older-minor", magnitude: 3.2 }),
    onsetAt: "2026-07-26T08:30:00Z",
    effectiveAt: "2026-07-26T08:30:00Z",
    metadata: {
      ...usgs.metadata,
      magnitude: 3.2,
      feltReports: null,
    },
  };
  assert.equal(filterEarthquakesByTimeMode([recent], "1h", new Date(fetchedAt)).length, 1);
  assert.equal(filterEarthquakesByTimeMode([olderMinor], "7d", new Date(fetchedAt)).length, 0);
  assert.equal(filterEarthquakesByTimeMode([recent], "24h", new Date(fetchedAt)).length, 1);
  assert.equal(filterVolcanoesByTimeMode([volcano], "ongoing", new Date(fetchedAt)).length, 1);
  assert.equal(
    filterVolcanoesByTimeMode([{ ...volcano, status: "ended", updatedAt: "2026-06-01T00:00:00Z" }], "30d", new Date(fetchedAt)).length,
    0,
  );

  const visible = filterVisibleAlerts([usgs, volcano, ash], {
    weather: false,
    floods: false,
    storms: false,
    earthquakes: true,
    volcanoes: true,
    earthquakeFilters: {
      minor: false,
      moderate: true,
      strong: true,
      major: true,
    },
    volcanoFilters: {
      unrest: true,
      eruption: true,
      ashEmission: false,
    },
    weatherFilters: {
      heavyRain: true,
      flood: true,
      strongWind: true,
      thunderstorm: true,
      hail: true,
      snowIce: true,
      coastal: true,
      other: true,
    },
  });
  assert.deepEqual(visible.map((alert) => alert.id), [usgs.id, volcano.id]);
  const collection = buildGeologicalAlertCollection(visible);
  assert.equal(collection.features.length, 2);
  assert.equal(collection.features[0].properties?.label, "M4.8 · 18 km south of Kalamata");

  const migrated = migrateMapLayerPreferences({});
  assert.equal(migrated.recentEarthquakes, false);
  assert.equal(migrated.earthquakeMinor, false);
  assert.equal(migrated.earthquakeModerate, true);
  assert.equal(migrated.majorVolcanicActivity, false);
  const baseCount = countActiveMapLayers(DEFAULT_MAP_LAYER_PREFERENCES);
  assert.equal(
    countActiveMapLayers({
      ...DEFAULT_MAP_LAYER_PREFERENCES,
      recentEarthquakes: true,
      earthquakeMinor: true,
      earthquakeModerate: true,
      earthquakeStrong: true,
      earthquakeMajor: true,
    }),
    baseCount + 1,
    "earthquake subfilters must not increase the main-layer counter",
  );

  const index = buildLocalSearchIndex("en", [], [], [usgs, volcano]);
  assert(index.some((item) => item.type === "earthquake_alert"));
  assert(index.some((item) => item.type === "volcano_alert"));
  assert(index.some((item) => String(item.metadata.searchText).includes("4.8")));

  for (const locale of supportedLocales) {
    const messages = getMessages(locale);
    assert(messages.legend.groupGeologicalRisks.trim());
    assert(messages.legend.recentEarthquakes.trim());
    assert(messages.legend.majorVolcanicActivity.trim());
  }

  const mapContainer = await readFile(
    new URL("../components/map/MapContainer.tsx", import.meta.url),
    "utf8",
  );
  const detailsPanel = await readFile(
    new URL("../components/alerts/AlertDetailsPanel.tsx", import.meta.url),
    "utf8",
  );
  assert(mapContainer.includes("cluster: true"));
  assert(mapContainer.includes("GEOLOGICAL_LABEL_LAYER_ID"));
  assert(detailsPanel.includes("t.magnitudeWarning"));
  assert(detailsPanel.includes("t.volcanoAuthorityWarning"));
  assert(!detailsPanel.includes("aftershock prediction"));

  console.log(
    JSON.stringify({
      providers: ["USGS", "EMSC", "GDACS"],
      europeFiltering: "passed",
      deduplication: "passed",
      magnitudeBands: ["minor", "moderate", "strong", "major"],
      temporalFilters: ["1h", "24h", "7d", "ongoing", "72h", "30d"],
      fixtures: 5,
      locales: supportedLocales.length,
      tests: "passed",
    }),
  );
}

void main();
