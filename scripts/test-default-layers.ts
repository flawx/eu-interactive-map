import assert from "node:assert/strict";
import {
  DEFAULT_EXPANDED_CATEGORIES,
  LEGEND_CONFIGURATION,
  getVisibleLegendCategories,
} from "../lib/map/legendConfiguration";
import { DEFAULT_MAP_LAYER_PREFERENCES } from "../lib/map/mapLayerPreferences";

function main() {
  const prefs = DEFAULT_MAP_LAYER_PREFERENCES;
  assert.equal(prefs.euroArea, true);
  assert.equal(prefs.euOutsideEuroArea, true);
  assert.equal(prefs.euCapitals, true);
  assert.equal(prefs.euMainInstitutions, true);
  assert.equal(prefs.europeanHeritageLabel, true);
  assert.equal(prefs.majorTouristPlaces, true);
  assert.equal(prefs.touristLandmark, true);
  assert.equal(prefs.majorEuropeanAirports, true);
  assert.equal(prefs.liveTrafficFlow, true);
  assert.equal(prefs.roadTrafficIncidents, true);
  assert.equal(prefs.roadClosuresRestrictions, true);
  assert.equal(prefs.roadworks, true);
  assert.equal(prefs.euCandidates, false);
  assert.equal(prefs.unescoWorldHeritage, false);
  assert.equal(prefs.majorWildfires, false);
  assert.equal(prefs.schengenOutsideEu, false);

  assert.equal(DEFAULT_EXPANDED_CATEGORIES.alerts, false);
  assert.equal(DEFAULT_EXPANDED_CATEGORIES.roadTraffic, false);
  assert.equal(DEFAULT_EXPANDED_CATEGORIES.europe, false);

  const categories = getVisibleLegendCategories();
  assert.ok(categories.some((c) => c.id === "roadTraffic"));
  assert.ok(categories.some((c) => c.id === "alerts"));
  const alerts = LEGEND_CONFIGURATION.find((c) => c.id === "alerts");
  assert.ok(alerts);
  assert.ok(
    !alerts.groups.some((g) => g.id === "alerts-road-traffic"),
    "road traffic must not nest under alerts",
  );
  const road = LEGEND_CONFIGURATION.find((c) => c.id === "roadTraffic");
  assert.ok(road);
  assert.ok(road.groups.some((g) => g.layers.some((l) => l.id === "live-road-traffic")));

  console.log("test-default-layers: ok");
}

main();
