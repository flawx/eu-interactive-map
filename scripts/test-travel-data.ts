import assert from "node:assert/strict";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  createDefaultLayerState,
} from "../lib/map/mapLayerPreferences";
import { DATA_LAYER_REGISTRY } from "../lib/map/dataLayers/dataLayerRegistry";
import { DATA_SOURCES_REGISTRY } from "../lib/map/dataSourcesRegistry";
import { DATA_LAYER_SOURCE_IDS } from "../lib/map/dataLayers/sourceIds";
import { isCountryInEUIMScope } from "../lib/geography/euimCoverage";
import {
  createViewportDataLoader,
  TtlCache,
  debounce,
} from "../lib/map/dataLayers/viewportDataLoader";
import {
  WIFI4EU_FIXTURE_HOTSPOTS,
  getWifi4EuHotspotById,
} from "../lib/travel/wifi4eu/fixtureHotspots";
import {
  auditWifi4EuHotspots,
  queryWifi4EuHotspots,
  parseBboxParam,
} from "../lib/travel/wifi4eu/query";
import {
  TOURIST_OFFICES,
  auditTouristOffices,
  getTouristOfficeById,
  toFeatureCollection as buildTouristOfficesCollection,
} from "../lib/travel/touristOffices";
import {
  DIPLOMATIC_MISSIONS,
  auditDiplomaticMissions,
  getDiplomaticMissionById,
  toFeatureCollection as buildDiplomaticMissionsCollection,
} from "../lib/travel/diplomaticMissions";
import {
  VISITOR_SAFETY_LOCATIONS,
  auditVisitorSafety,
  getVisitorSafetyLocationById,
  toFeatureCollection as buildVisitorSafetyCollection,
} from "../lib/travel/visitorSafety";

function testNewPreferencesDefaultOff(): void {
  const newKeys = [
    "wifi4eu",
    "touristInformationOffices",
    "diplomaticMissions",
    "visitorSafetyAssistance",
  ] as const;

  for (const key of newKeys) {
    assert.equal(
      DEFAULT_MAP_LAYER_PREFERENCES[key],
      false,
      `${key} must default to false`,
    );
  }

  // Existing validated defaults must remain untouched by this commit.
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.europeanHeritageLabel, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.majorTouristPlaces, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.touristLandmark, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.majorEuropeanAirports, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.europeanMountainPlaces, false);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.majorCivilEngineeringWorks, false);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.liveTrafficFlow, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.roadTrafficIncidents, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.roadClosuresRestrictions, true);
  assert.equal(DEFAULT_MAP_LAYER_PREFERENCES.roadworks, true);
}

function testResetKeepsNewPrefsOff(): void {
  const defaults = createDefaultLayerState();
  assert.equal(defaults.wifi4eu, false);
  assert.equal(defaults.touristInformationOffices, false);
  assert.equal(defaults.diplomaticMissions, false);
  assert.equal(defaults.visitorSafetyAssistance, false);
}

function testRegistryEntriesValid(): void {
  const expected: Array<[string, string]> = [
    ["wifi4eu", "wifi4eu"],
    ["tourist-information-offices", "touristInformationOffices"],
    ["diplomatic-missions", "diplomaticMissions"],
    ["visitor-safety-assistance", "visitorSafetyAssistance"],
  ];

  for (const [layerId, preferenceKey] of expected) {
    const layer = DATA_LAYER_REGISTRY.find((entry) => entry.id === layerId);
    assert.ok(layer, `missing registry entry for ${layerId}`);
    assert.equal(layer!.preferenceKey, preferenceKey);
    assert.equal(layer!.category, "tourism");
    assert.equal(layer!.defaultEnabled, false);
    assert.ok(layer!.sourceIds.length > 0, `${layerId} must declare sourceIds`);
    for (const sourceId of layer!.sourceIds) {
      assert.ok(
        DATA_SOURCES_REGISTRY.some((source) => source.id === sourceId),
        `${layerId} references unknown data source ${sourceId}`,
      );
    }
  }

  // Registry-wide id/preferenceKey uniqueness must still hold after the addition.
  const ids = DATA_LAYER_REGISTRY.map((layer) => layer.id);
  assert.equal(new Set(ids).size, ids.length, "registry ids must stay unique");
  const preferenceKeys = DATA_LAYER_REGISTRY.map((layer) => layer.preferenceKey);
  assert.equal(
    new Set(preferenceKeys).size,
    preferenceKeys.length,
    "registry preferenceKeys must stay unique",
  );
}

function testNewDataSourcesRegistered(): void {
  const expectedSourceIds = [
    DATA_LAYER_SOURCE_IDS.WIFI4EU,
    DATA_LAYER_SOURCE_IDS.WIFI4EU_MUNICIPAL_OPEN_DATA,
    DATA_LAYER_SOURCE_IDS.ETC,
    DATA_LAYER_SOURCE_IDS.TOURIST_OFFICES_CURATED,
    DATA_LAYER_SOURCE_IDS.EEAS_DIPLOMATIC,
    DATA_LAYER_SOURCE_IDS.DIPLOMATIC_CURATED,
    DATA_LAYER_SOURCE_IDS.VISITOR_SAFETY_CURATED,
  ];
  for (const id of expectedSourceIds) {
    const source = DATA_SOURCES_REGISTRY.find((entry) => entry.id === id);
    assert.ok(source, `missing data source registry entry for ${id}`);
  }
}

function testWifi4EuFixtureQuality(): void {
  const audit = auditWifi4EuHotspots();
  assert.equal(audit.duplicateIds.length, 0, "duplicate WiFi4EU hotspot ids");
  assert.equal(audit.missingCoordinates.length, 0, "hotspots missing coords");
  assert.equal(audit.outsideScope.length, 0, "hotspots outside EUIM scope");
  assert.equal(audit.ukEntries.length, 0, "no UK WiFi4EU hotspots expected");
  assert.equal(audit.hasPasswordField, false, "hotspots must never carry a password field");
  assert.equal(audit.total, WIFI4EU_FIXTURE_HOTSPOTS.length);
  assert.ok(audit.total >= 20, "expected a reasonably sized curated hotspot fixture");

  for (const hotspot of WIFI4EU_FIXTURE_HOTSPOTS) {
    assert.equal(hotspot.programme, "WiFi4EU");
    assert.ok(isCountryInEUIMScope(hotspot.countryCode), hotspot.id);
    assert.ok(hotspot.sourceIds.length > 0, `${hotspot.id} must declare sourceIds`);
  }

  const found = getWifi4EuHotspotById(WIFI4EU_FIXTURE_HOTSPOTS[0].id);
  assert.ok(found, "getWifi4EuHotspotById must resolve a known id");
  assert.equal(getWifi4EuHotspotById("does-not-exist"), undefined);
}

function testWifi4EuQueryBboxAndNoPassword(): void {
  const all = queryWifi4EuHotspots({});
  assert.ok(all.hotspots.length > 0, "expected hotspots with no filters");
  for (const hotspot of all.hotspots) {
    assert.ok(
      !Object.prototype.hasOwnProperty.call(hotspot, "password"),
      "query result must never include a password field",
    );
  }

  const dublinBbox: [number, number, number, number] = [-6.35, 53.3, -6.15, 53.4];
  const dublinOnly = queryWifi4EuHotspots({ bbox: dublinBbox, limit: 500 });
  assert.ok(dublinOnly.hotspots.length > 0, "expected hotspots inside Dublin bbox");
  for (const hotspot of dublinOnly.hotspots) {
    assert.ok(hotspot.longitude >= dublinBbox[0] && hotspot.longitude <= dublinBbox[2]);
    assert.ok(hotspot.latitude >= dublinBbox[1] && hotspot.latitude <= dublinBbox[3]);
  }

  const farAwayBbox: [number, number, number, number] = [100, 0, 101, 1];
  const empty = queryWifi4EuHotspots({ bbox: farAwayBbox });
  assert.equal(empty.hotspots.length, 0, "bbox with no matches must return empty");
  assert.equal(empty.meta.totalMatched, 0);

  const paged = queryWifi4EuHotspots({ limit: 2 });
  assert.equal(paged.hotspots.length, 2);
  assert.equal(paged.meta.nextCursor, 2);

  assert.deepEqual(parseBboxParam("1,2,3,4"), [1, 2, 3, 4]);
  assert.equal(parseBboxParam(null), undefined);
  assert.equal(parseBboxParam("not-a-bbox"), undefined);
  assert.equal(parseBboxParam("4,2,1,2"), undefined, "minLng > maxLng must be rejected");
}

function testTouristOfficesInScopeNoUK(): void {
  const audit = auditTouristOffices();
  assert.equal(audit.duplicateIds.length, 0, "duplicate tourist office ids");
  assert.equal(audit.missingCoordinates.length, 0, "offices missing coords");
  assert.equal(audit.outsideScope.length, 0, "offices outside EUIM scope");
  assert.equal(audit.ukEntries.length, 0, "no UK tourist offices expected");
  assert.equal(audit.total, TOURIST_OFFICES.length);
  assert.ok(
    audit.total >= 25 && audit.total <= 40,
    "expected ~25-40 curated tourist offices",
  );

  for (const office of TOURIST_OFFICES) {
    assert.ok(isCountryInEUIMScope(office.countryCode), office.id);
    assert.ok(office.officialWebsite.startsWith("https://"), office.id);
  }

  const found = getTouristOfficeById(TOURIST_OFFICES[0].id);
  assert.ok(found);
  assert.equal(getTouristOfficeById("does-not-exist"), undefined);

  const collection = buildTouristOfficesCollection();
  assert.equal(collection.type, "FeatureCollection");
  assert.ok(collection.features.length > 0);
  for (const feature of collection.features) {
    assert.equal(feature.properties?.phone === undefined, false);
  }
}

function testDiplomaticMissionsTypesValidAndInScope(): void {
  const audit = auditDiplomaticMissions();
  assert.equal(audit.duplicateIds.length, 0, "duplicate diplomatic mission ids");
  assert.equal(audit.missingCoordinates.length, 0, "missions missing coords");
  assert.equal(audit.outsideScope.length, 0, "missions with host country outside EUIM scope");
  assert.equal(audit.invalidMissionTypes.length, 0, "missions with invalid missionType");
  assert.equal(audit.total, DIPLOMATIC_MISSIONS.length);
  assert.ok(audit.total >= 20, "expected a reasonably sized curated diplomatic set");

  const validTypes = new Set(["embassy", "consulate", "permanentRepresentation", "other"]);
  for (const mission of DIPLOMATIC_MISSIONS) {
    assert.ok(validTypes.has(mission.missionType), mission.id);
    assert.ok(isCountryInEUIMScope(mission.hostCountry), mission.id);
    assert.ok(isCountryInEUIMScope(mission.sendingCountry), mission.id);
  }

  const permReps = DIPLOMATIC_MISSIONS.filter(
    (m) => m.missionType === "permanentRepresentation",
  );
  assert.ok(
    permReps.length >= 20,
    "expected a Permanent Representation for most EU member states",
  );
  for (const permRep of permReps) {
    assert.equal(permRep.hostCountry, "BE");
    assert.equal(permRep.city, "Brussels");
    assert.equal(permRep.coordinatesApproximate, true);
  }

  const found = getDiplomaticMissionById(DIPLOMATIC_MISSIONS[0].id);
  assert.ok(found);
  assert.equal(getDiplomaticMissionById("does-not-exist"), undefined);

  const collection = buildDiplomaticMissionsCollection();
  assert.ok(collection.features.length > 0);
}

function testVisitorSafetyPhysicalOnlyNo112Markers(): void {
  const audit = auditVisitorSafety();
  assert.equal(audit.duplicateIds.length, 0, "duplicate visitor safety ids");
  assert.equal(audit.missingCoordinates.length, 0, "locations missing coords");
  assert.equal(audit.outsideScope.length, 0, "locations outside EUIM scope");
  assert.equal(audit.invalidTypes.length, 0, "locations with invalid type");
  assert.equal(audit.total, VISITOR_SAFETY_LOCATIONS.length);
  assert.ok(
    audit.total >= 5 && audit.total <= 15,
    "expected a small, clearly-sourced set of visitor safety locations",
  );

  for (const location of VISITOR_SAFETY_LOCATIONS) {
    assert.ok(isCountryInEUIMScope(location.countryCode), location.id);
    assert.ok(Number.isFinite(location.longitude) && Number.isFinite(location.latitude));
    // "112" must never appear as a marker name/id (panel-only note, no city markers).
    assert.ok(!location.name.includes("112"), `${location.id} must not be a 112 marker`);
    assert.ok(!location.id.includes("112"), `${location.id} must not be a 112 marker`);
  }

  const found = getVisitorSafetyLocationById(VISITOR_SAFETY_LOCATIONS[0].id);
  assert.ok(found);
  assert.equal(getVisitorSafetyLocationById("does-not-exist"), undefined);

  const collection = buildVisitorSafetyCollection();
  assert.ok(collection.features.length > 0);
}

async function testGenericViewportLoaderAbortCacheDedupe(): Promise<void> {
  // TtlCache expiry with an injectable clock.
  let clock = 1_000;
  const cache = new TtlCache<number>(1_000, () => clock);
  cache.set("k", 42);
  assert.equal(cache.get("k"), 42);
  clock += 1_001;
  assert.equal(cache.get("k"), undefined, "entry must expire after ttl");

  // debounce: only the trailing call fires.
  let calls = 0;
  const debounced = debounce(() => {
    calls += 1;
  }, 20);
  debounced.call();
  debounced.call();
  debounced.call();
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(calls, 1, "only the trailing debounced call should fire");

  // Dedupe + cache via createViewportDataLoader.
  let fetchCount = 0;
  const receivedKeys: string[] = [];
  const loader = createViewportDataLoader<{ n: number }>({
    fetchUrl: (bbox) => `/fake?bbox=${bbox.join(",")}`,
    buildKey: (bbox) => bbox.join(","),
    debounceMs: 5,
    ttlMs: 5_000,
    onData: (data, key) => {
      receivedKeys.push(key);
      void data;
    },
    fetchImpl: async () => {
      fetchCount += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({ n: fetchCount }),
      };
    },
  });

  loader.requestViewport([1, 2, 3, 4], 8);
  loader.requestViewport([1, 2, 3, 4], 8);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(fetchCount, 1, "debounce + dedupe must collapse repeated requests");

  loader.requestViewport([1, 2, 3, 4], 8);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(fetchCount, 1, "cached response must avoid a second fetch");
  assert.ok(receivedKeys.length >= 2, "onData must fire for both the live and cached hit");

  // Superseded in-flight request must be aborted, and cancel() must not error.
  let abortedCount = 0;
  const abortLoader = createViewportDataLoader<{ ok: true }>({
    fetchUrl: () => "/fake",
    buildKey: (bbox) => bbox.join(","),
    debounceMs: 0,
    fetchImpl: async (_input, init) => {
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          abortedCount += 1;
          reject(new DOMException("aborted", "AbortError"));
        });
        setTimeout(() => resolve({ ok: true, status: 200, json: async () => ({ ok: true }) }), 50);
      });
    },
    onData: () => {},
  });
  abortLoader.requestViewport([1, 2, 3, 4], 5);
  await new Promise((resolve) => setTimeout(resolve, 5));
  abortLoader.requestViewport([5, 6, 7, 8], 5);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.equal(abortedCount, 1, "superseded in-flight request must be aborted");
  abortLoader.destroy();

  loader.destroy();
}

function main(): void {
  testNewPreferencesDefaultOff();
  testResetKeepsNewPrefsOff();
  testRegistryEntriesValid();
  testNewDataSourcesRegistered();
  testWifi4EuFixtureQuality();
  testWifi4EuQueryBboxAndNoPassword();
  testTouristOfficesInScopeNoUK();
  testDiplomaticMissionsTypesValidAndInScope();
  testVisitorSafetyPhysicalOnlyNo112Markers();
  console.log("test-travel-data: ok (sync checks)");
}

main();

void testGenericViewportLoaderAbortCacheDedupe().then(() => {
  console.log("test-travel-data: ok (viewport loader)");
});
