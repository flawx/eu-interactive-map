"use client";

import { useMemo, useState } from "react";
import ProjectPageShell from "@/components/layout/ProjectPageShell";
import { useThemePreferences } from "@/components/theme/ThemeProvider";
import { getEnabledBasemaps } from "@/lib/map/basemapRegistry";
import {
  getPreferencesStorage,
  type ThemePreference,
} from "@/lib/preferences/userPreferences";
import { supportedLocales, type Locale } from "@/lib/i18n/config";

export default function SettingsPage() {
  const {
    preferences,
    resolvedTheme,
    setTheme,
    updatePreferences,
    clearAllLocalData,
  } = useThemePreferences();
  const [confirmClear, setConfirmClear] = useState(false);
  const basemaps = useMemo(() => getEnabledBasemaps(), []);

  return (
    <ProjectPageShell title="Settings">
      <div className="space-y-8 text-sm">
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="text-[var(--text-muted)]">
            Theme (resolved: {resolvedTheme})
          </p>
          <div className="flex flex-wrap gap-2">
            {(["system", "light", "dark"] as ThemePreference[]).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => setTheme(theme)}
                className="rounded-lg border px-3 py-2 capitalize"
                style={{
                  borderColor: "var(--border)",
                  background:
                    preferences.appearance.theme === theme
                      ? "var(--surface-elevated)"
                      : "var(--surface)",
                }}
                aria-pressed={preferences.appearance.theme === theme}
              >
                {theme}
              </button>
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-[var(--text-muted)]">Default basemap</span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
              value={preferences.appearance.defaultBasemapId}
              onChange={(event) =>
                updatePreferences({
                  appearance: {
                    ...preferences.appearance,
                    defaultBasemapId: event.target.value,
                  },
                })
              }
            >
              {basemaps.map((basemap) => (
                <option key={basemap.id} value={basemap.id}>
                  {basemap.id}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Language & region</h2>
          <label className="block space-y-1">
            <span className="text-[var(--text-muted)]">Preferred language</span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
              value={preferences.language.locale ?? ""}
              onChange={(event) =>
                updatePreferences({
                  language: {
                    locale: (event.target.value || null) as Locale | null,
                  },
                })
              }
            >
              <option value="">System / session</option>
              {supportedLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Map</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.map.preferRelief}
              onChange={(event) =>
                updatePreferences({
                  map: {
                    ...preferences.map,
                    preferRelief: event.target.checked,
                  },
                })
              }
            />
            Prefer Relief mode
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.map.prefer3d}
              onChange={(event) =>
                updatePreferences({
                  map: { ...preferences.map, prefer3d: event.target.checked },
                })
              }
            />
            Prefer 3D terrain
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Directions</h2>
          <label className="block space-y-1">
            <span className="text-[var(--text-muted)]">Default transport mode</span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
              value={preferences.directions.defaultMode}
              onChange={(event) =>
                updatePreferences({
                  directions: {
                    ...preferences.directions,
                    defaultMode: event.target.value as
                      | "car"
                      | "bicycle"
                      | "walk"
                      | "transit"
                      | "flight",
                  },
                })
              }
            >
              <option value="car">Car</option>
              <option value="bicycle">Bicycle</option>
              <option value="walk">Walk</option>
              <option value="transit">Transit</option>
              <option value="flight">Flight</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.directions.preferDirectFlights}
              onChange={(event) =>
                updatePreferences({
                  directions: {
                    ...preferences.directions,
                    preferDirectFlights: event.target.checked,
                  },
                })
              }
            />
            Prefer direct flights when searching
          </label>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Privacy & security</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.privacy.saveSearchHistory}
              onChange={(event) =>
                updatePreferences({
                  privacy: {
                    ...preferences.privacy,
                    saveSearchHistory: event.target.checked,
                  },
                })
              }
            />
            Save search history locally
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.privacy.saveRouteHistory}
              onChange={(event) =>
                updatePreferences({
                  privacy: {
                    ...preferences.privacy,
                    saveRouteHistory: event.target.checked,
                  },
                })
              }
            />
            Save directions history locally
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.privacy.allowGeolocationPrompt}
              onChange={(event) =>
                updatePreferences({
                  privacy: {
                    ...preferences.privacy,
                    allowGeolocationPrompt: event.target.checked,
                  },
                })
              }
            />
            Allow in-app geolocation prompts (browser permission still required)
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)" }}
              onClick={() => getPreferencesStorage().clearSearchHistory()}
            >
              Clear search history
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)" }}
              onClick={() => getPreferencesStorage().clearRouteHistory()}
            >
              Clear directions history
            </button>
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-[var(--danger)]"
              style={{ borderColor: "var(--border)" }}
              onClick={() => setConfirmClear(true)}
            >
              Clear all local preferences
            </button>
          </div>
          {confirmClear ? (
            <div className="rounded-lg border p-3" style={{ borderColor: "var(--border)" }}>
              <p className="mb-2 text-[var(--text-muted)]">
                This removes local preferences and histories from this browser.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-[var(--danger)] px-3 py-2 text-white"
                  onClick={() => {
                    clearAllLocalData();
                    setConfirmClear(false);
                  }}
                >
                  Confirm clear
                </button>
                <button
                  type="button"
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)" }}
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </ProjectPageShell>
  );
}
