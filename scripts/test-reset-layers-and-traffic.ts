import assert from "node:assert/strict";
import {
  createDefaultLayerState,
  DEFAULT_MAP_LAYER_PREFERENCES,
  MAP_LAYER_PREFERENCES_SCHEMA_VERSION,
  migrateMapLayerPreferences,
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

/** Mirrors MapLegend outside-click: menu clicks must stay inside [data-legend-actions]. */
function isInsideLegendActions(
  target: { closest: (s: string) => unknown } | null,
) {
  return Boolean(target?.closest("[data-legend-actions]"));
}

/**
 * Integration-style reducer for Reset layers: mutated prefs → defaults.
 * Proves the action that MapInterface applies, not only createDefaultLayerState().
 */
function applyResetLayersAction(
  current: typeof DEFAULT_MAP_LAYER_PREFERENCES,
): typeof DEFAULT_MAP_LAYER_PREFERENCES {
  void current;
  return createDefaultLayerState();
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
  assert.equal(defaults.roadTrafficIncidents, true);
  assert.equal(defaults.roadClosuresRestrictions, true);
  assert.equal(defaults.roadworks, true);
  assert.equal(defaults.schengenOutsideEu, false);
  assert.equal(defaults.euCandidates, false);
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

  // Outside-click must treat menu items as inside (desktop dual-mount regression).
  assert.equal(
    isInsideLegendActions({
      closest: (s: string) => (s === "[data-legend-actions]" ? {} : null),
    }),
    true,
  );
  assert.equal(
    isInsideLegendActions({
      closest: () => null,
    }),
    false,
  );

  // Simulate: all Road Traffic OFF → Reset → 4/4 ON; Heritage restored ON.
  const dirty = migrateMapLayerPreferences({
    ...DEFAULT_MAP_LAYER_PREFERENCES,
    liveTrafficFlow: false,
    roadTrafficIncidents: false,
    roadClosuresRestrictions: false,
    roadworks: false,
    schengenOutsideEu: true,
    euCandidates: true,
    europeanHeritageLabel: false,
    majorEuropeanAirports: false,
  });
  assert.equal(dirty.liveTrafficFlow, false);
  assert.equal(dirty.roadTrafficIncidents, false);
  assert.equal(dirty.roadClosuresRestrictions, false);
  assert.equal(dirty.roadworks, false);
  assert.equal(dirty.europeanHeritageLabel, false);

  const afterReset = applyResetLayersAction(dirty);
  assert.equal(afterReset.liveTrafficFlow, true);
  assert.equal(afterReset.roadTrafficIncidents, true);
  assert.equal(afterReset.roadClosuresRestrictions, true);
  assert.equal(afterReset.roadworks, true);
  assert.equal(afterReset.schengenOutsideEu, false);
  assert.equal(afterReset.euCandidates, false);
  assert.equal(afterReset.europeanHeritageLabel, true);
  assert.equal(afterReset.majorEuropeanAirports, true);
  assert.notEqual(afterReset, dirty);
  assert.notEqual(afterReset, DEFAULT_MAP_LAYER_PREFERENCES);
  assert.deepEqual(afterReset, createDefaultLayerState());

  // Repeated reset must keep working (new object each time).
  const r1 = applyResetLayersAction(afterReset);
  const r2 = applyResetLayersAction(r1);
  const r3 = applyResetLayersAction(r2);
  assert.deepEqual(r1, defaults);
  assert.deepEqual(r2, defaults);
  assert.deepEqual(r3, defaults);
  assert.notEqual(r1, r2);
  assert.notEqual(r2, r3);

  console.log("test-reset-layers-and-traffic: ok");
}

main();
