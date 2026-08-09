import assert from "node:assert/strict";
import {
  nextThemeFromResolved,
  themeToggleShowsSun,
} from "../lib/theme/themeToggle";
import { getMessages } from "../lib/i18n/messages";

function simulateToggleChain(
  preference: "system" | "light" | "dark",
  resolved: "light" | "dark",
): { nextPreference: "light" | "dark"; nextResolved: "light" | "dark" } {
  // Clicking the quick toggle always sets an explicit opposite preference.
  void preference;
  const nextPreference = nextThemeFromResolved(resolved);
  return { nextPreference, nextResolved: nextPreference };
}

function main() {
  assert.equal(themeToggleShowsSun("light"), true);
  assert.equal(themeToggleShowsSun("dark"), false);
  assert.equal(nextThemeFromResolved("light"), "dark");
  assert.equal(nextThemeFromResolved("dark"), "light");

  // System + resolved dark → click → explicit light
  const fromSystemDark = simulateToggleChain("system", "dark");
  assert.equal(fromSystemDark.nextPreference, "light");
  assert.equal(fromSystemDark.nextResolved, "light");

  // System + resolved light → click → explicit dark
  const fromSystemLight = simulateToggleChain("system", "light");
  assert.equal(fromSystemLight.nextPreference, "dark");
  assert.equal(fromSystemLight.nextResolved, "dark");

  // Header/burger/settings share the same preference transformation.
  const header = simulateToggleChain("dark", "dark");
  const burger = simulateToggleChain("dark", "dark");
  assert.deepEqual(header, burger);
  assert.equal(header.nextPreference, "light");

  const en = getMessages("en");
  assert.equal(en.header.switchToDarkMode, "Switch to dark mode");
  assert.equal(en.header.switchToLightMode, "Switch to light mode");
  assert.equal(en.nav.appearance, "Appearance");
  assert.equal(en.nav.lightMode, "Light mode");
  assert.equal(en.nav.darkMode, "Dark mode");

  const fr = getMessages("fr");
  assert.equal(fr.header.switchToDarkMode, "Passer en mode sombre");
  assert.equal(fr.header.switchToLightMode, "Passer en mode clair");
  assert.equal(fr.nav.appearance, "Apparence");

  const de = getMessages("de");
  assert.ok(de.header.switchToDarkMode.includes("Dunkel"));
  assert.ok(de.header.switchToLightMode.includes("Hell"));

  // Fallback merge: locale without new keys still gets English via deep merge.
  const es = getMessages("es");
  assert.equal(es.header.switchToDarkMode, "Switch to dark mode");
  assert.equal(es.nav.darkMode, "Dark mode");

  console.log("test-theme-toggle: ok");
}

main();
