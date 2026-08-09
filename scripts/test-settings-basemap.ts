import assert from "node:assert/strict";
import {
  BASEMAP_REGISTRY,
  getBasemapById,
  getEnabledBasemaps,
  resolveBasemapTileConfig,
} from "../lib/map/basemapRegistry";
import { DATA_SOURCES_REGISTRY } from "../lib/map/dataSourcesRegistry";
import {
  DEFAULT_USER_PREFERENCES,
  LocalPreferencesStorage,
  USER_PREFERENCES_SCHEMA_VERSION,
} from "../lib/preferences/userPreferences";

function main() {
  assert.ok(DATA_SOURCES_REGISTRY.length >= 15);
  assert.ok(DATA_SOURCES_REGISTRY.every((s) => s.officialUrl.startsWith("http")));

  const enabled = getEnabledBasemaps();
  assert.ok(enabled.some((b) => b.id === "standard"));
  assert.ok(enabled.some((b) => b.id === "light"));
  assert.ok(enabled.some((b) => b.id === "dark"));
  assert.ok(enabled.some((b) => b.id === "transport"));
  assert.ok(enabled.some((b) => b.id === "cycling"));
  assert.equal(getBasemapById("satellite")?.enabled, false);

  const light = resolveBasemapTileConfig("light", "light");
  assert.ok(light?.tiles[0]?.includes("light_all"));
  const dark = resolveBasemapTileConfig("dark", "dark");
  assert.ok(dark?.tiles[0]?.includes("dark_all"));
  const standard = resolveBasemapTileConfig("standard", "light");
  assert.ok(standard?.tiles[0]?.includes("voyager"));

  assert.equal(BASEMAP_REGISTRY.length, 6);
  assert.equal(DEFAULT_USER_PREFERENCES.schemaVersion, USER_PREFERENCES_SCHEMA_VERSION);
  assert.equal(DEFAULT_USER_PREFERENCES.appearance.theme, "system");
  assert.equal(DEFAULT_USER_PREFERENCES.appearance.defaultBasemapId, "standard");

  const storage = new LocalPreferencesStorage();
  const loaded = storage.load();
  assert.equal(loaded.appearance.theme, "system");

  console.log("test-settings-basemap: ok");
}

main();
