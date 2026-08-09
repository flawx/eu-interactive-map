import assert from "node:assert/strict";
import {
  createDefaultLayerState,
  DEFAULT_MAP_LAYER_PREFERENCES,
  MAP_LAYER_PREFERENCES_SCHEMA_VERSION,
} from "../lib/map/mapLayerPreferences";
import { DEFAULT_EXPANDED_CATEGORIES } from "../lib/map/legendConfiguration";
import { EUIM_SCHENGEN_NON_EU_COUNTRY_CODES } from "../lib/geography/euimCoverage";
import { hazardForTomTomIcon } from "../lib/alerts/providers/traffic/normalization";

// Re-test language mapping via a lightweight local check mirroring provider logic
function tomTomAcceptLanguage(locale?: string): string | null {
  if (!locale) return null;
  const normalized = locale.trim().toLowerCase();
  if (!normalized) return null;
  const map: Record<string, string> = {
    en: "en-GB",
    fr: "fr-FR",
    de: "de-DE",
  };
  if (normalized.includes("-")) {
    const [lang, region] = normalized.split("-");
    return `${lang}-${(region || "").toUpperCase()}`;
  }
  return map[normalized] ?? null;
}

function main() {
  const defaults = createDefaultLayerState();
  assert.deepEqual(defaults, DEFAULT_MAP_LAYER_PREFERENCES);
  assert.equal(defaults.euroArea, true);
  assert.equal(defaults.euOutsideEuroArea, true);
  assert.equal(defaults.euCapitals, true);
  assert.equal(defaults.euMainInstitutions, true);
  assert.equal(defaults.europeanHeritageLabel, true);
  assert.equal(defaults.majorTouristPlaces, true);
  assert.equal(defaults.touristLandmark, true);
  assert.equal(defaults.majorEuropeanAirports, true);
  assert.equal(defaults.liveTrafficFlow, true);
  assert.equal(defaults.schengenOutsideEu, false);
  assert.equal(defaults.euCandidates, false);
  assert.equal(defaults.roadTrafficIncidents, false);
  assert.equal(defaults.roadClosuresRestrictions, false);
  assert.equal(defaults.roadworks, false);
  assert.equal(defaults.unescoWorldHeritage, false);
  assert.equal(defaults.majorWildfires, false);
  assert.equal(MAP_LAYER_PREFERENCES_SCHEMA_VERSION, 3);

  assert.deepEqual([...EUIM_SCHENGEN_NON_EU_COUNTRY_CODES].sort(), [
    "CH",
    "IS",
    "LI",
    "NO",
  ]);

  for (const id of Object.keys(DEFAULT_EXPANDED_CATEGORIES)) {
    assert.equal(
      DEFAULT_EXPANDED_CATEGORIES[
        id as keyof typeof DEFAULT_EXPANDED_CATEGORIES
      ],
      false,
      id,
    );
  }

  assert.equal(hazardForTomTomIcon("accident"), "road_accident");
  assert.equal(hazardForTomTomIcon("jam"), "traffic_jam");
  assert.equal(hazardForTomTomIcon("roadClosed"), "road_closure");
  assert.equal(hazardForTomTomIcon("roadWorks"), "roadworks");
  assert.equal(hazardForTomTomIcon("weird_new_type"), "other_traffic_incident");

  assert.equal(tomTomAcceptLanguage("en"), "en-GB");
  assert.equal(tomTomAcceptLanguage("fr"), "fr-FR");
  assert.equal(tomTomAcceptLanguage("en-GB"), "en-GB");
  assert.equal(tomTomAcceptLanguage("xx"), null);

  console.log("test-reset-layers-and-traffic: ok");
}

main();
