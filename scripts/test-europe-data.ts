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
import { DATA_SOURCES_REGISTRY } from "../lib/map/dataSourcesRegistry";
import {
  EUROPEAN_ECONOMIC_AREA_MEMBER_CODES,
  auditEuropeanEconomicArea,
  isEeaMember,
} from "../lib/europe/europeanEconomicArea";
import {
  MAJOR_BUSINESS_DISTRICTS,
  auditMajorBusinessDistricts,
} from "../lib/europe/majorBusinessDistricts";
import {
  MAJOR_FREIGHT_PORTS,
  auditMajorFreightPorts,
} from "../lib/europe/majorFreightPorts";
import { auditEuProjects } from "../lib/europe/euProjects/entities";
import { EU_PROJECTS_FIXTURE } from "../lib/europe/euProjects/fixtureProjects";
import { normalizeEntityStatus } from "../lib/map/dataLayers/entityStatus";
import {
  buildRequestKey,
  EuProjectsViewportCache,
  debounce,
  resolveZoomStrategy,
  createEuProjectsViewportLoader,
} from "../lib/europe/euProjects/viewportLoader";

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

function testEuropeanEconomicAreaMembership(): void {
  const audit = auditEuropeanEconomicArea();
  assert.ok(audit.includesIS, "EEA must include Iceland");
  assert.ok(audit.includesNO, "EEA must include Norway");
  assert.ok(audit.includesLI, "EEA must include Liechtenstein");
  assert.ok(audit.excludesCH, "EEA must exclude Switzerland");
  assert.ok(audit.excludesUK, "EEA must exclude the United Kingdom");
  assert.ok(
    audit.chStillInEUIMScope,
    "Switzerland must remain in EUIM scope (Schengen) despite EEA exclusion",
  );
  assert.ok(isEeaMember("FR"), "EU members must be EEA members");
  assert.equal(isEeaMember("CH"), false);
  assert.equal(isEeaMember("UK"), false);
  assert.equal(isEeaMember("GB"), false);
  assert.ok(EUROPEAN_ECONOMIC_AREA_MEMBER_CODES.includes("IS"));
  assert.ok(EUROPEAN_ECONOMIC_AREA_MEMBER_CODES.includes("NO"));
  assert.ok(EUROPEAN_ECONOMIC_AREA_MEMBER_CODES.includes("LI"));
  assert.ok(!EUROPEAN_ECONOMIC_AREA_MEMBER_CODES.includes("CH"));
}

function testBusinessDistrictsInScopeNoUK(): void {
  const audit = auditMajorBusinessDistricts();
  assert.equal(audit.duplicateIds.length, 0, "duplicate business district ids");
  assert.equal(audit.missingCoordinates.length, 0, "districts missing coords");
  assert.equal(audit.outsideScope.length, 0, "districts outside EUIM scope");
  assert.equal(audit.ukEntries.length, 0, "no UK business districts expected");
  assert.equal(audit.total, MAJOR_BUSINESS_DISTRICTS.length);
  assert.ok(audit.total >= 8, "expected a reasonably sized curated district list");

  for (const district of MAJOR_BUSINESS_DISTRICTS) {
    assert.ok(isCountryInEUIMScope(district.countryCode), district.id);
    assert.ok(district.id.startsWith("business-district-"), district.id);
  }
}

function testFreightPortsInScopeNoUK(): void {
  const audit = auditMajorFreightPorts();
  assert.equal(audit.duplicateIds.length, 0, "duplicate freight port ids");
  assert.equal(audit.missingCoordinates.length, 0, "ports missing coords");
  assert.equal(audit.outsideScope.length, 0, "ports outside EUIM scope");
  assert.equal(audit.ukEntries.length, 0, "no UK freight ports expected");
  assert.equal(audit.total, MAJOR_FREIGHT_PORTS.length);
  assert.ok(audit.total >= 10, "expected a reasonably sized curated port list");

  for (const port of MAJOR_FREIGHT_PORTS) {
    assert.ok(isCountryInEUIMScope(port.countryCode), port.id);
  }
}

function testEuProjectsFixtureQuality(): void {
  const audit = auditEuProjects();
  assert.equal(audit.duplicateIds.length, 0, "duplicate EU project ids");
  assert.equal(audit.missingCoordinates.length, 0, "projects missing coords");
  assert.equal(audit.outsideScope.length, 0, "projects outside EUIM scope");
  assert.equal(audit.invalidBudgets.length, 0, "projects with invalid budget values");
  assert.equal(audit.total, EU_PROJECTS_FIXTURE.length);
  assert.ok(
    audit.total >= 20 && audit.total <= 40,
    "expected ~20-40 curated representative EU projects",
  );

  const expectedCategories = [
    "transport",
    "sportCulture",
    "protection",
    "publicSocial",
    "research",
    "environment",
  ];
  for (const category of expectedCategories) {
    assert.ok(
      (audit.byCategory[category] ?? 0) > 0,
      `expected at least one project in category ${category}`,
    );
  }

  for (const project of EU_PROJECTS_FIXTURE) {
    if (project.budgetEUR !== null) {
      assert.ok(
        Number.isFinite(project.budgetEUR) && project.budgetEUR >= 0,
        `${project.id} has an invalid non-null budget`,
      );
    }
  }
}

function testEntityStatusNormalizationDefaultsUnknown(): void {
  assert.equal(normalizeEntityStatus(undefined), "unknown");
  assert.equal(normalizeEntityStatus(null), "unknown");
  assert.equal(normalizeEntityStatus(""), "unknown");
  assert.equal(normalizeEntityStatus("nonsense-value"), "unknown");
  assert.equal(normalizeEntityStatus("closed"), "unknown");
  assert.equal(normalizeEntityStatus("under construction"), "under_construction");
  assert.equal(normalizeEntityStatus("cancelled"), "cancelled");
}

function testNewDataSourcesRegistered(): void {
  const expectedSourceIds = [
    "kohesio",
    "cinea-cef",
    "ten-t-dg-move",
    "cordis",
    "efta-eea",
    "business-districts-curated",
    "ten-t-ports",
  ];
  for (const id of expectedSourceIds) {
    const source = DATA_SOURCES_REGISTRY.find((entry) => entry.id === id);
    assert.ok(source, `missing data source registry entry for ${id}`);
  }
}

function testEuProjectsAndEconomyPreferencesDefaultOff(): void {
  const newKeys = [
    "euProjectsTransport",
    "euProjectsSportCulture",
    "euProjectsProtection",
    "euProjectsPublicSocial",
    "euProjectsResearch",
    "euProjectsEnvironment",
    "europeanEconomicArea",
    "majorBusinessDistricts",
    "majorFreightPorts",
  ] as const;

  for (const key of newKeys) {
    assert.equal(
      DEFAULT_MAP_LAYER_PREFERENCES[key],
      false,
      `${key} must default to false`,
    );
  }

  const defaults = createDefaultLayerState();
  for (const key of newKeys) {
    assert.equal(defaults[key], false, `reset must keep ${key} off`);
  }

  // Existing defaults from earlier commits must remain untouched.
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.euroArea, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.liveTrafficFlow, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.euCapitals, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.euMainInstitutions, true);
}

function testEuProjectsAndEconomyRegistryEntries(): void {
  const expected: Array<[string, string]> = [
    ["eu-projects-transport", "euProjectsTransport"],
    ["eu-projects-sport-culture", "euProjectsSportCulture"],
    ["eu-projects-protection", "euProjectsProtection"],
    ["eu-projects-public-social", "euProjectsPublicSocial"],
    ["eu-projects-research", "euProjectsResearch"],
    ["eu-projects-environment", "euProjectsEnvironment"],
    ["european-economic-area", "europeanEconomicArea"],
    ["major-business-districts", "majorBusinessDistricts"],
    ["major-freight-ports", "majorFreightPorts"],
  ];

  for (const [layerId, preferenceKey] of expected) {
    const layer = DATA_LAYER_REGISTRY.find((entry) => entry.id === layerId);
    assert.ok(layer, `missing registry entry for ${layerId}`);
    assert.equal(layer!.preferenceKey, preferenceKey);
    assert.equal(layer!.defaultEnabled, false);
  }
}

async function testEuProjectsViewportLoaderPureFunctions(): Promise<void> {
  assert.deepEqual(resolveZoomStrategy(3), { majorOnly: true, limit: 60 });
  assert.deepEqual(resolveZoomStrategy(6), { majorOnly: true, limit: 120 });
  assert.deepEqual(resolveZoomStrategy(9), { majorOnly: false, limit: 300 });

  const bboxA: [number, number, number, number] = [1, 2, 3, 4];
  const bboxB: [number, number, number, number] = [1.0001, 2, 3, 4];
  const strategy = resolveZoomStrategy(8);
  assert.equal(
    buildRequestKey(bboxA, strategy, {}),
    buildRequestKey(bboxB, strategy, {}),
    "keys should round bbox to reduce cache thrash",
  );
  assert.notEqual(
    buildRequestKey(bboxA, strategy, { category: "transport" }),
    buildRequestKey(bboxA, strategy, { category: "research" }),
  );

  let clock = 1_000;
  const cache = new EuProjectsViewportCache<number>(1_000, () => clock);
  cache.set("k", 42);
  assert.equal(cache.get("k"), 42);
  clock += 1_001;
  assert.equal(cache.get("k"), undefined, "entry must expire after ttl");

  let calls = 0;
  const debounced = debounce(() => {
    calls += 1;
  }, 20);
  debounced.call();
  debounced.call();
  debounced.call();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(calls, 1, "only the trailing debounced call should fire");

  let fetchCount = 0;
  const loader = createEuProjectsViewportLoader({
    debounceMs: 5,
    cacheTtlMs: 5_000,
    fetchImpl: async () => {
      fetchCount += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ type: "FeatureCollection", features: [] }),
      };
    },
    onData: () => {},
  });

  loader.requestViewport([1, 2, 3, 4], 8, {});
  loader.requestViewport([1, 2, 3, 4], 8, {});
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(fetchCount, 1, "debounce + dedupe must collapse repeated requests");

  loader.requestViewport([1, 2, 3, 4], 8, {});
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(fetchCount, 1, "cached response must avoid a second fetch");

  loader.destroy();
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
  testEuropeanEconomicAreaMembership();
  testBusinessDistrictsInScopeNoUK();
  testFreightPortsInScopeNoUK();
  testEuProjectsFixtureQuality();
  testEntityStatusNormalizationDefaultsUnknown();
  testNewDataSourcesRegistered();
  testEuProjectsAndEconomyPreferencesDefaultOff();
  testEuProjectsAndEconomyRegistryEntries();
  console.log("test-europe-data: ok (sync checks)");
}

main();

void testEuProjectsViewportLoaderPureFunctions().then(() => {
  console.log("test-europe-data: ok (viewport loader)");
});
