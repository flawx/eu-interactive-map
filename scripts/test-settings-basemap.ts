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

function tileOf(
  basemapId: string,
  theme: "light" | "dark",
): string | undefined {
  return resolveBasemapTileConfig(basemapId, theme)?.tiles[0];
}

function main() {
  assert.ok(DATA_SOURCES_REGISTRY.length >= 15);
  assert.ok(
    DATA_SOURCES_REGISTRY.every((s) => s.officialUrl.startsWith("http")),
  );

  const enabled = getEnabledBasemaps();
  assert.ok(enabled.some((b) => b.id === "standard"));
  assert.ok(enabled.some((b) => b.id === "light"));
  assert.ok(enabled.some((b) => b.id === "dark"));
  assert.ok(enabled.some((b) => b.id === "transport"));
  assert.ok(enabled.some((b) => b.id === "cycling"));
  assert.equal(getBasemapById("satellite")?.enabled, false);

  assert.equal(getBasemapById("standard")?.themeBehavior, "adaptive");
  assert.equal(getBasemapById("light")?.themeBehavior, "fixed-light");
  assert.equal(getBasemapById("dark")?.themeBehavior, "fixed-dark");
  assert.equal(getBasemapById("satellite")?.themeBehavior, "independent");

  // Standard adaptive
  assert.ok(tileOf("standard", "light")?.includes("voyager"));
  assert.ok(tileOf("standard", "dark")?.includes("dark_all"));

  // Explicit Light stays light even under dark UI theme
  assert.ok(tileOf("light", "light")?.includes("light_all"));
  assert.ok(tileOf("light", "dark")?.includes("light_all"));

  // Explicit Dark stays dark even under light UI theme
  assert.ok(tileOf("dark", "dark")?.includes("dark_all"));
  assert.ok(tileOf("dark", "light")?.includes("dark_all"));

  // System-dark is the same as resolvedTheme "dark" for Standard
  assert.ok(tileOf("standard", "dark")?.includes("dark_all"));

  assert.equal(BASEMAP_REGISTRY.length, 6);
  assert.equal(
    DEFAULT_USER_PREFERENCES.schemaVersion,
    USER_PREFERENCES_SCHEMA_VERSION,
  );
  assert.equal(DEFAULT_USER_PREFERENCES.appearance.theme, "system");
  assert.equal(
    DEFAULT_USER_PREFERENCES.appearance.defaultBasemapId,
    "standard",
  );

  const storage = new LocalPreferencesStorage();
  const loaded = storage.load();
  assert.equal(loaded.appearance.theme, "system");

  console.log("test-settings-basemap: ok");
}

main();
