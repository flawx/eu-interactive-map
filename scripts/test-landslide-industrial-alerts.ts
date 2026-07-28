import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  classifyCemsActivation,
  cemsActivationToAlert,
  filterCemsActivationsByTime,
  parseCemsActivationRecord,
  parseCemsWkt,
} from "../lib/alerts/providers/copernicusEmergencyMapping";
import {
  buildNasaLhasaExportUrl,
  isLhasaTimestampStale,
  NASA_LHASA_MAX_ZOOM,
  NASA_LHASA_REFRESH_MS,
} from "../lib/alerts/providers/nasaLhasa";
import {
  buildCemsActivationMarkerCollection,
  buildCemsGeometryCollection,
  filterVisibleAlerts,
} from "../components/map/alertMapLayers";
import { demoCemsAlerts } from "../lib/alerts/demoFixtures";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  countActiveMapLayers,
  migrateMapLayerPreferences,
} from "../lib/map/mapLayerPreferences";
import { buildLocalSearchIndex } from "../lib/search/mapSearch";
import { supportedLocales } from "../lib/i18n/config";
import { getMessages } from "../lib/i18n/messages";
import {
  geometryIntersectsProjectEurope,
  isAlertInsideProjectEurope,
} from "../lib/alerts/geography";

const fixture = (name: string) =>
  JSON.parse(
    readFileSync(
      join(process.cwd(), "tests", "fixtures", "alerts", name),
      "utf8",
    ),
  ) as unknown;

const landslide = parseCemsActivationRecord(
  fixture("cems-landslide-activation.json"),
);
const industrial = parseCemsActivationRecord(
  fixture("cems-industrial-accident.json"),
);
const chemical = parseCemsActivationRecord(
  fixture("cems-chemical-accident.json"),
);
const explosion = parseCemsActivationRecord(fixture("cems-explosion.json"));
assert(landslide && industrial && chemical && explosion);
assert.equal(landslide.kind, "landslide");
assert.equal(industrial.kind, "industrial_accident");
assert.equal(chemical.kind, "chemical_accident");
assert.equal(explosion.kind, "explosion");
assert.equal(landslide.countryCodes[0], "FR");
assert.equal(landslide.aois[0].products[0].kind, "delineation");
assert.equal(landslide.aois[0].products[0].layers[0].format, "geojson");

assert.equal(classifyCemsActivation("fire", "Wildfire", "Factory fire"), null);
assert.equal(classifyCemsActivation("other", "Conflict", "Industrial district"), null);
assert.equal(
  classifyCemsActivation("industrial", "Technical accident", "Mine failure"),
  "technical_accident",
);
assert.equal(
  parseCemsWkt(
    "MULTIPOLYGON(((6 45,7 45,7 46,6 46,6 45)),((8 45,9 45,9 46,8 46,8 45)))",
  )?.type,
  "MultiPolygon",
);
assert.equal(parseCemsWkt("INVALID(1 2)"), null);
assert(geometryIntersectsProjectEurope(landslide.aois[0].geometry));
assert(
  !isAlertInsideProjectEurope({
    countryCodes: ["US"],
    centroid: { longitude: -100, latitude: 40 },
  }),
);

const infeasible = parseCemsActivationRecord({
  code: "EMSR995",
  name: "Landslide in Austria",
  category: "mass",
  subCategory: "Landslide",
  countries: ["Austria"],
  centroid: "POINT(14.2 47.5)",
  activationTime: "2026-07-28T07:00:00Z",
  aois: [{
    id: "AOI01",
    name: "Tyrol",
    extent: "POLYGON((14 47,15 47,15 48,14 48,14 47))",
    products: [{ id: "GRA", type: "GRA", feasible: false }],
  }],
});
assert.equal(infeasible?.aois[0].products.length, 0);

const stats = parseCemsActivationRecord({
  code: "EMSR996",
  name: "Chemical spill in France",
  category: "industrial",
  subCategory: "Chemical spill",
  countries: ["France"],
  centroid: "POINT(2.3 48.8)",
  activationTime: "2026-07-28T07:00:00Z",
  stats: [
    { name: "Affected area", unit: "ha", affected: 250 },
    { name: "Built-up", unit: "", affected: 4 },
    { name: "Estimated population", unit: "", affected: 1200 },
  ],
  aois: [],
  emarsReportUrl: "https://industry.eea.europa.eu/seveso/accidents/",
});
assert.equal(stats?.observedAreaSquareKilometers, 2.5);
assert.equal(stats?.affectedBuildings, 4);
assert.equal(stats?.affectedPopulation, 1200);
assert.equal(industrial.emarsReportUrl, null);
const recentClosed = {
  ...landslide,
  closed: true,
  updatedAt: "2026-07-28T08:00:00Z",
};
assert.equal(
  filterCemsActivationsByTime(
    [recentClosed],
    "ongoing",
    new Date("2026-07-28T09:00:00Z"),
  ).length,
  0,
);
assert.equal(
  filterCemsActivationsByTime(
    [recentClosed],
    "72h",
    new Date("2026-07-28T09:00:00Z"),
  ).length,
  1,
);

assert.equal(NASA_LHASA_REFRESH_MS, 30 * 60 * 1000);
assert.equal(NASA_LHASA_MAX_ZOOM, 10);
assert(isLhasaTimestampStale(null));
assert(
  buildNasaLhasaExportUrl(
    { west: 5, south: 44, east: 6, north: 45 },
    "high",
  ).includes("renderingRule="),
);
for (const name of [
  "landslide-lhasa-moderate.geojson",
  "landslide-lhasa-high.geojson",
]) {
  const collection = fixture(name) as GeoJSON.FeatureCollection;
  assert(
    collection.features.every((feature) =>
      geometryIntersectsProjectEurope(feature.geometry),
    ),
  );
}

const demos = demoCemsAlerts();
assert.equal(demos.length, 5);
assert(demos.some((alert) => alert.status === "ended"));
assert(demos.some((alert) => alert.hazard === "chemical_accident"));
assert(demos.some((alert) => alert.hazard === "explosion"));
assert(demos.every(isAlertInsideProjectEurope));
const visible = filterVisibleAlerts(demos, {
  weather: false,
  floods: false,
  storms: false,
  earthquakes: false,
  volcanoes: false,
  mappedLandslides: true,
  industrialIncidents: true,
  earthquakeFilters: { minor: false, moderate: true, strong: true, major: true },
  volcanoFilters: { unrest: true, eruption: true, ashEmission: true },
  industrialFilters: {
    industrial: true,
    chemical: true,
    explosion: true,
    technical: true,
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
assert.equal(visible.length, demos.length);
assert.equal(
  buildCemsActivationMarkerCollection(visible, "landslide").features.length,
  2,
);
assert.equal(
  buildCemsActivationMarkerCollection(visible, "industrial_incident").features
    .length,
  3,
);
assert(buildCemsGeometryCollection(visible, demos[0].id, "aoi").features.length);
assert.equal(
  cemsActivationToAlert(landslide, "2026-07-28T08:05:00Z").metadata
    .mappingActivationNotIncidentConfirmation,
  true,
);

const migrated = migrateMapLayerPreferences({});
assert.equal(migrated.landslideLikelihoodModerate, true);
assert.equal(migrated.landslideLikelihoodHigh, true);
const baseCount = countActiveMapLayers(DEFAULT_MAP_LAYER_PREFERENCES);
const industrialCount = countActiveMapLayers({
  ...DEFAULT_MAP_LAYER_PREFERENCES,
  majorIndustrialIncidents: true,
});
assert.equal(industrialCount, baseCount + 1);
assert.equal(
  countActiveMapLayers({
    ...DEFAULT_MAP_LAYER_PREFERENCES,
    majorIndustrialIncidents: true,
    chemicalAccidents: false,
  }),
  industrialCount,
);
const search = buildLocalSearchIndex("en", [], [], demos);
assert(search.some((item) => item.type === "landslide_activation"));
assert(search.some((item) => item.type === "industrial_incident_activation"));
for (const locale of supportedLocales) {
  const legend = getMessages(locale).legend;
  for (const key of [
    "landslideLikelihood",
    "landslideLikelihoodModerate",
    "landslideLikelihoodHigh",
    "mappedLandslideEvents",
    "groupIndustrialTechnologicalIncidents",
    "majorIndustrialIncidents",
    "industrialAccidents",
    "chemicalAccidents",
    "industrialExplosions",
    "otherTechnicalAccidents",
  ] as const) {
    assert(legend[key].trim(), `${locale}.${key}`);
  }
}

console.log(JSON.stringify({
  nasaProvider: true,
  cemsProvider: true,
  europe: true,
  products: ["GeoJSON", "vector tiles", "COG"],
  fixtures: 6,
  translations: supportedLocales.length,
  legendCounter: true,
  search: true,
}, null, 2));
