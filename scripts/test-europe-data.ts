import assert from "node:assert/strict";
import {
  EU_INSTITUTIONS,
  INSTITUTION_IDS,
  validateEuInstitutions,
} from "../lib/europe/euInstitutions";
import {
  EU_BODIES_AGENCIES,
  auditEuBodiesAgencies,
} from "../lib/europe/euBodiesAgencies";
import {
  INTERNATIONAL_ORGANISATIONS,
  auditInternationalOrganisations,
} from "../lib/europe/internationalOrganisations";
import {
  EUROPEAN_CAPITALS_OF_CULTURE,
  auditEuropeanCapitalsOfCulture,
  getTemporalStatus,
} from "../lib/europe/europeanCapitalsOfCulture";
import { isCountryInEUIMScope } from "../lib/geography/euimCoverage";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  createDefaultLayerState,
} from "../lib/map/mapLayerPreferences";
import { DATA_LAYER_REGISTRY } from "../lib/map/dataLayers/dataLayerRegistry";

const FORBIDDEN_ALIASES = [
  "general secretariat of the european union",
  "secretariat-general of the european union",
];

function testInstitutionIdsUniqueAndNoForbiddenAliases(): void {
  assert.equal(
    new Set(INSTITUTION_IDS).size,
    INSTITUTION_IDS.length,
    "institution ids must be unique",
  );
  assert.equal(
    new Set(EU_INSTITUTIONS.map((i) => i.id)).size,
    EU_INSTITUTIONS.length,
    "EU_INSTITUTIONS ids must be unique",
  );

  for (const institution of EU_INSTITUTIONS) {
    for (const alias of institution.aliases) {
      const normalized = alias.toLowerCase();
      assert.ok(
        !FORBIDDEN_ALIASES.includes(normalized),
        `forbidden fake institution alias found on ${institution.id}: ${alias}`,
      );
    }
  }

  validateEuInstitutions();
}

function testAgenciesInScopeWithCoordinates(): void {
  const audit = auditEuBodiesAgencies();
  assert.equal(audit.duplicateIds.length, 0, "duplicate agency ids");
  assert.equal(audit.missingCoordinates.length, 0, "agencies missing coords");
  assert.equal(audit.outsideScope.length, 0, "agencies outside EUIM scope");
  assert.equal(audit.total, EU_BODIES_AGENCIES.length);

  for (const agency of EU_BODIES_AGENCIES) {
    assert.ok(isCountryInEUIMScope(agency.countryCode), agency.id);
    assert.ok(Number.isFinite(agency.longitude));
    assert.ok(Number.isFinite(agency.latitude));
  }
}

function testOrganisationsInScopeWithCoordinates(): void {
  const audit = auditInternationalOrganisations();
  assert.equal(audit.duplicateIds.length, 0, "duplicate organisation ids");
  assert.equal(
    audit.missingCoordinates.length,
    0,
    "organisations missing coords",
  );
  assert.equal(audit.outsideScope.length, 0, "organisations outside EUIM scope");
  assert.equal(audit.total, INTERNATIONAL_ORGANISATIONS.length);

  const switzerlandOrgs = INTERNATIONAL_ORGANISATIONS.filter(
    (org) => org.countryCode === "CH",
  );
  assert.ok(
    switzerlandOrgs.length > 0,
    "expected at least one CH-based international organisation (Schengen, non-EU)",
  );
  for (const org of switzerlandOrgs) {
    assert.ok(
      isCountryInEUIMScope(org.countryCode),
      "Switzerland must be in EUIM scope via Schengen",
    );
  }
}

function testCultureCapitalsInScopeWithCoordinates(): void {
  const audit = auditEuropeanCapitalsOfCulture();
  assert.equal(audit.duplicateIds.length, 0, "duplicate culture capital ids");
  assert.equal(
    audit.missingCoordinates.length,
    0,
    "culture capitals missing coords",
  );
  assert.equal(
    audit.outsideScope.length,
    0,
    "culture capitals outside EUIM scope",
  );
  assert.equal(audit.total, EUROPEAN_CAPITALS_OF_CULTURE.length);

  for (const capital of EUROPEAN_CAPITALS_OF_CULTURE) {
    assert.ok(isCountryInEUIMScope(capital.countryCode), capital.id);
    assert.notEqual(
      capital.countryCode,
      "GR",
      "Greece must use EL, not GR (EUIM convention)",
    );
  }
}

function testCultureTemporalStatus(): void {
  const now = new Date("2026-06-01T00:00:00Z");
  assert.equal(getTemporalStatus(2025, now), "past");
  assert.equal(getTemporalStatus(2026, now), "current");
  assert.equal(getTemporalStatus(2027, now), "upcoming");
}

function testNewLayerPreferencesDefaultOff(): void {
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.euBodiesAgencies, false);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.internationalOrganisations, false);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.europeanCapitalsOfCulture, false);

  // Existing layers must stay untouched by this commit.
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.euCapitals, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.euMainInstitutions, true);
}

function testResetKeepsNewPrefsOff(): void {
  const defaults = createDefaultLayerState();
  assert.equal(defaults.euBodiesAgencies, false);
  assert.equal(defaults.internationalOrganisations, false);
  assert.equal(defaults.europeanCapitalsOfCulture, false);
}

function testRegistryPreferenceKeysMatch(): void {
  const newLayerIds = [
    "eu-bodies-agencies",
    "international-organisations",
    "european-capitals-of-culture",
  ] as const;
  const expectedPreferenceKeys = [
    "euBodiesAgencies",
    "internationalOrganisations",
    "europeanCapitalsOfCulture",
  ] as const;

  for (let i = 0; i < newLayerIds.length; i += 1) {
    const layer = DATA_LAYER_REGISTRY.find((entry) => entry.id === newLayerIds[i]);
    assert.ok(layer, `missing registry entry for ${newLayerIds[i]}`);
    assert.equal(layer!.preferenceKey, expectedPreferenceKeys[i]);
    assert.equal(
      layer!.preferenceKey in DEFAULT_MAP_LAYER_PREFERENCES,
      true,
      `${layer!.preferenceKey} must exist on MapLayerPreferences`,
    );
    assert.equal(layer!.defaultEnabled, false);
  }
}

function main(): void {
  testInstitutionIdsUniqueAndNoForbiddenAliases();
  testAgenciesInScopeWithCoordinates();
  testOrganisationsInScopeWithCoordinates();
  testCultureCapitalsInScopeWithCoordinates();
  testCultureTemporalStatus();
  testNewLayerPreferencesDefaultOff();
  testResetKeepsNewPrefsOff();
  testRegistryPreferenceKeysMatch();
  console.log("test-europe-data: ok");
}

main();
