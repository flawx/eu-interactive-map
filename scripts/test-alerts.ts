import assert from "node:assert/strict";
import {
  normalizeGdacsFeature,
  normalizeMeteoalarmFeature,
} from "../lib/alerts/normalization";
import { deduplicateAlerts } from "../lib/alerts/deduplication";
import {
  buildCopernicusTileUrl,
  parseCopernicusCapabilities,
} from "../lib/alerts/copernicusFlood";
import {
  parseOpenMeteoWind,
  validateWindCoordinates,
  windOriginToFlowDirection,
} from "../lib/alerts/wind";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  countActiveMapLayers,
  migrateMapLayerPreferences,
} from "../lib/map/mapLayerPreferences";
import { buildLocalSearchIndex, searchLocalIndex } from "../lib/search/mapSearch";
import {
  buildAlertFeatureCollection,
  buildFloodEventMarkerCollection,
  filterVisibleAlerts,
} from "../components/map/alertMapLayers";
import { supportedLocales } from "../lib/i18n/config";
import { getMessages } from "../lib/i18n/messages";
import { getAlertFreshness, isBeyondExpiryGrace } from "../lib/alerts/staleness";
import { ALERT_SOURCES } from "../lib/alerts/sourceRegistry";
import {
  geometryIntersectsProjectEurope,
  isCountryAllowedInProject,
} from "../lib/alerts/geography";
import {
  parseGfmCapabilities,
  resolveLatestAvailableGfmTime,
} from "../lib/alerts/providers/copernicusGfmCapabilities";
import {
  tileBounds4326,
  tileIntersectsProjectEurope,
  validateTileCoordinates,
} from "../lib/alerts/providers/copernicusFloodTiles";
import {
  filterAlertsByActivityMode,
} from "../lib/alerts/activityMode";

const now = new Date("2026-07-28T12:00:00Z");

function meteoFeature(
  id: string,
  country: string,
  level: string,
  awareness: string,
  geometry: GeoJSON.Geometry = {
    type: "Polygon",
    coordinates: [[[2, 48], [3, 48], [3, 49], [2, 48]]],
  },
  overrides: Record<string, unknown> = {},
) {
  return {
    type: "Feature",
    id,
    geometry,
    properties: {
      country,
      message: {
        identifier: id,
        headline: `${awareness} warning`,
        awareness_type: awareness,
        awareness_level: level,
        sent: "2026-07-28T11:30:00Z",
        onset: "2026-07-28T12:00:00Z",
        expires: "2026-07-28T18:00:00Z",
        senderName: "National weather service",
        ...overrides,
      },
    },
  };
}

const yellow = normalizeMeteoalarmFeature(
  meteoFeature("fr-yellow", "FR", "2; yellow; Moderate", "10; Rain"),
  now.toISOString(),
)!;
const orange = normalizeMeteoalarmFeature(
  meteoFeature("de-orange", "DE", "3; orange; Severe", "1; Wind"),
  now.toISOString(),
)!;
const red = normalizeMeteoalarmFeature(
  meteoFeature(
    "es-red",
    "ES",
    "4; red; Extreme",
    "3; Thunderstorm",
    {
      type: "MultiPolygon",
      coordinates: [
        [[[-4, 40], [-3, 40], [-3, 41], [-4, 40]]],
        [[[-2, 39], [-1, 39], [-1, 40], [-2, 39]]],
      ],
    },
  ),
  now.toISOString(),
)!;
assert.equal(yellow.severity, "moderate");
assert.equal(orange.severity, "severe");
assert.equal(red.severity, "extreme");
assert.equal(red.hazard, "thunderstorm");
assert.equal(red.geometry?.type, "MultiPolygon");

const cancelled = normalizeMeteoalarmFeature(
  meteoFeature("cancelled", "FR", "2; yellow; Moderate", "10; Rain", undefined, {
    msgType: "Cancel",
  }),
  now.toISOString(),
)!;
assert.equal(cancelled.status, "cancelled");
assert.equal(
  isBeyondExpiryGrace("2026-07-28T10:00:00Z", now),
  true,
);
assert.equal(
  getAlertFreshness(
    { updatedAt: "2026-07-28T11:58:00Z", expiresAt: null },
    ALERT_SOURCES.meteoalarm,
    now,
  ),
  "fresh",
);

const overlap = deduplicateAlerts([yellow, orange, red]);
assert.equal(overlap.length, 3, "overlapping alerts must remain separate");
const yellowUpdate = { ...yellow, title: "Updated", updatedAt: "2026-07-28T11:45:00Z" };
assert.equal(deduplicateAlerts([yellow, yellowUpdate])[0]?.title, "Updated");

const floodGreen = normalizeGdacsFeature(
  {
    type: "Feature",
    id: "FL1",
    geometry: { type: "Point", coordinates: [10, 45] },
    properties: {
      eventtype: "FL",
      eventid: "FL1",
      name: "European flood",
      countrycode: "ITA",
      alertlevel: "green",
      fromdate: "2026-07-27T00:00:00Z",
    },
  },
  "FL",
  now.toISOString(),
)!;
assert.equal(floodGreen.severity, "minor");
assert.deepEqual(floodGreen.countryCodes, ["IT"]);

const cyclone = normalizeGdacsFeature(
  {
    type: "Feature",
    id: "TC1",
    geometry: { type: "Point", coordinates: [-15, 40] },
    properties: {
      eventtype: "TC",
      eventid: "TC1",
      name: "Test cyclone",
      countrycode: "PRT",
      alertlevel: "orange",
      trackgeometry: { type: "LineString", coordinates: [[-18, 38], [-15, 40]] },
      forecastgeometry: { type: "LineString", coordinates: [[-15, 40], [-12, 43]] },
    },
  },
  "TC",
  now.toISOString(),
)!;
assert.equal(cyclone.severity, "severe");
assert.equal((cyclone.metadata.trackGeometry as GeoJSON.Geometry).type, "LineString");

const outsideEurope = normalizeGdacsFeature(
  {
    type: "Feature",
    id: "FL2",
    geometry: { type: "Point", coordinates: [120, -10] },
    properties: { eventtype: "FL", eventid: "FL2", countrycode: "IDN" },
  },
  "FL",
  now.toISOString(),
);
assert.equal(outsideEurope, null);
assert.equal(
  normalizeGdacsFeature(
    {
      type: "Feature",
      id: "FL-TN",
      geometry: { type: "Point", coordinates: [10, 36] },
      properties: {
        eventtype: "FL",
        eventid: "FL-TN",
        countrycode: "TUN",
      },
    },
    "FL",
    now.toISOString(),
  ),
  null,
);
for (const country of ["FR", "ESP", "ISL"]) {
  assert.equal(isCountryAllowedInProject(country), true);
}
for (const country of ["CHN", "USA", "PHL", "AUS"]) {
  assert.equal(isCountryAllowedInProject(country), false);
}
assert.equal(
  geometryIntersectsProjectEurope({
    type: "Polygon",
    coordinates: [[[-180, -80], [180, -80], [180, 80], [-180, 80], [-180, -80]]],
  }),
  false,
  "a world bounding box is not evidence of a European event",
);

const visible = filterVisibleAlerts([yellow, orange, red, floodGreen, cyclone], {
  weather: true,
  floods: true,
  storms: true,
  earthquakes: false,
  volcanoes: false,
  earthquakeFilters: {
    minor: false,
    moderate: true,
    strong: true,
    major: true,
  },
  volcanoFilters: {
    unrest: true,
    eruption: true,
    ashEmission: true,
  },
  weatherFilters: {
    heavyRain: true,
    flood: true,
    strongWind: true,
    thunderstorm: false,
    hail: true,
    snowIce: true,
    coastal: true,
    other: true,
  },
});
assert(!visible.some((alert) => alert.id === red.id));
assert.equal(buildAlertFeatureCollection(visible).features.length, 4);
assert.equal(buildFloodEventMarkerCollection(visible).features.length, 1);

const capabilities = `
  <Layer><Name>mapserver:gfm_observed_flood_extent_group_layer</Name>
  <Dimension name="time" default="2026-07-28T00:00:00Z" units="ISO8601">2022-01-01T00:00:00Z/2026-07-28T12:00:00Z/PT12H</Dimension></Layer>`;
const status = parseCopernicusCapabilities(capabilities, now);
assert.equal(status.available, true);
assert.equal(status.acquisitionTime, "2026-07-28T12:00:00Z");
assert.equal(parseCopernicusCapabilities("<xml/>", now).available, false);
assert.throws(() => buildCopernicusTileUrl(4, 2, 3, "invalid"));
assert.match(
  buildCopernicusTileUrl(4, 2, 3, "2026-07-28T00:00:00Z"),
  /gfm_observed_flood_extent_group_layer/,
);
const parsedCapabilities = parseGfmCapabilities(capabilities);
assert.equal(
  resolveLatestAvailableGfmTime(parsedCapabilities, now),
  "2026-07-28T12:00:00Z",
);
assert.equal(validateTileCoordinates(15, 18753, 9586), true);
assert.equal(tileIntersectsProjectEurope(15, 18753, 9586), true);
assert(tileBounds4326(5, 15, 10).west < tileBounds4326(5, 15, 10).east);
assert.equal(tileIntersectsProjectEurope(5, 2, 10), false);

assert.equal(windOriginToFlowDirection(0), 180);
assert.equal(windOriginToFlowDirection(90), 270);
assert.equal(windOriginToFlowDirection(180), 0);
assert.equal(windOriginToFlowDirection(270), 90);
assert.throws(() => validateWindCoordinates([]));
assert.throws(() => validateWindCoordinates([{ latitude: 91, longitude: 0 }]));
assert.equal(validateWindCoordinates([{ latitude: 45, longitude: 5 }]).length, 1);
const wind = parseOpenMeteoWind(
  {
    latitude: 45,
    longitude: 5,
    hourly: {
      time: ["2026-07-28T12:00:00Z"],
      wind_speed_10m: [35],
      wind_direction_10m: [270],
      wind_gusts_10m: [52],
    },
  },
  now.toISOString(),
)!;
assert.equal(wind.speedKmh, 35);
assert.equal(wind.gustKmh, 52);
const incompleteWind = parseOpenMeteoWind(
  {
    latitude: 45,
    longitude: 5,
    hourly: { time: ["2026-07-28T12:00:00Z"] },
  },
  now.toISOString(),
)!;
assert.equal(incompleteWind.speedKmh, null);
assert.equal(incompleteWind.directionDegrees, null);
assert.equal(incompleteWind.gustKmh, null);

const base = countActiveMapLayers(DEFAULT_MAP_LAYER_PREFERENCES);
const weatherOn = countActiveMapLayers({
  ...DEFAULT_MAP_LAYER_PREFERENCES,
  officialWeatherWarnings: true,
});
const filtersOff = countActiveMapLayers({
  ...DEFAULT_MAP_LAYER_PREFERENCES,
  officialWeatherWarnings: true,
  weatherHeavyRain: false,
  weatherFlood: false,
});
assert.equal(weatherOn, base + 1);
assert.equal(filtersOff, weatherOn, "weather filters are not main layers");
assert.equal(
  countActiveMapLayers({ ...DEFAULT_MAP_LAYER_PREFERENCES, wildfireWind: true }),
  base,
  "wildfire wind is a dependent visual option",
);
const migrated = migrateMapLayerPreferences({
  euroArea: false,
  officialWeatherWarnings: true,
});
assert.equal(migrated.euroArea, false);
assert.equal(migrated.officialWeatherWarnings, true);
assert.equal(migrated.weatherHeavyRain, true);
assert.equal(migrated.weatherFlood, true);
assert.equal(migrated.weatherStrongWind, true);
assert.equal(migrated.weatherThunderstorm, true);
assert.equal(migrated.weatherHail, true);
assert.equal(migrated.weatherSnowIce, true);
assert.equal(migrated.weatherCoastal, true);
assert.equal(migrated.weatherOther, true);
assert.equal(
  filterAlertsByActivityMode(
    [
      floodGreen,
      { ...floodGreen, id: "ended", status: "ended", updatedAt: "2026-07-28T02:00:00Z" },
    ],
    "24h",
    now,
  ).length,
  2,
);

const search = buildLocalSearchIndex("en", [], [], [yellow, floodGreen, cyclone]);
assert.equal(searchLocalIndex("rain", search).flatMap((group) => group.results).some((item) => item.alertId === yellow.id), true);
assert.equal(searchLocalIndex("cyclone", search).flatMap((group) => group.results).some((item) => item.alertId === cyclone.id), true);

for (const locale of supportedLocales) {
  const messages = getMessages(locale);
  assert(messages.legend.groupFloodsSevereWeather);
  assert(messages.alertPanel.windModeledWarning);
  assert(messages.alertPanel.observationNotForecast);
}

console.log(
  JSON.stringify({
    meteoalarmCountriesTested: 3,
    meteoalarmSeverities: ["moderate", "severe", "extreme"],
    gdacsFloods: true,
    gdacsCyclones: true,
    copernicus: true,
    windDirections: [0, 90, 180, 270],
    locales: supportedLocales.length,
    tests: "passed",
  }),
);
