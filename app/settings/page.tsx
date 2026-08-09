"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bike,
  Box,
  Bus,
  Car,
  Footprints,
  Languages,
  Layers,
  Map as MapIcon,
  MapPin,
  Monitor,
  Moon,
  Mountain,
  Palette,
  Plane,
  Route,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  History,
} from "lucide-react";
import ProjectPageShell from "@/components/layout/ProjectPageShell";
import { useThemePreferences } from "@/components/theme/ThemeProvider";
import { getEnabledBasemaps } from "@/lib/map/basemapRegistry";
import {
  getPreferencesStorage,
  type ThemePreference,
} from "@/lib/preferences/userPreferences";
import { supportedLocales, type Locale } from "@/lib/i18n/config";

function SectionHeading({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full"
        style={{
          background: "var(--surface-muted)",
          color: "var(--accent)",
        }}
      >
        {icon}
      </span>
      <span>{children}</span>
    </h2>
  );
}

function transportIcon(mode: string) {
  switch (mode) {
    case "bicycle":
      return Bike;
    case "walk":
      return Footprints;
    case "transit":
      return Bus;
    case "flight":
      return Plane;
    case "car":
    default:
      return Car;
  }
}

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
  const ModeIcon = transportIcon(preferences.directions.defaultMode);

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    icon: typeof Sun;
  }> = [
    { id: "system", label: "System", icon: Monitor },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <ProjectPageShell title="Settings">
      <div className="space-y-8 text-sm">
        <section
          className="space-y-3 rounded-2xl border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
          }}
        >
          <SectionHeading icon={<Palette className="h-4 w-4" aria-hidden />}>
            Appearance
          </SectionHeading>
          <p className="text-[var(--text-muted)]">
            Theme (resolved: {resolvedTheme})
          </p>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map(({ id, label, icon: Icon }) => {
              const selected = preferences.appearance.theme === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTheme(id)}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
                  style={{
                    borderColor: selected ? "var(--accent)" : "var(--border)",
                    background: selected
                      ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                      : "var(--surface-elevated)",
                    color: selected ? "var(--accent)" : "var(--text)",
                    fontWeight: selected ? 600 : 500,
                  }}
                  aria-pressed={selected}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
          <label className="block space-y-1">
            <span className="inline-flex items-center gap-2 text-[var(--text-muted)]">
              <Layers className="h-4 w-4" aria-hidden />
              Default basemap
            </span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-elevated)",
                color: "var(--text)",
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

        <section
          className="space-y-3 rounded-2xl border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
          }}
        >
          <SectionHeading icon={<Languages className="h-4 w-4" aria-hidden />}>
            Language & region
          </SectionHeading>
          <label className="block space-y-1">
            <span className="text-[var(--text-muted)]">Preferred language</span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-elevated)",
                color: "var(--text)",
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

        <section
          className="space-y-3 rounded-2xl border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
          }}
        >
          <SectionHeading icon={<MapIcon className="h-4 w-4" aria-hidden />}>
            Map
          </SectionHeading>
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
            <Mountain className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
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
            <Box className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
            Prefer 3D terrain
          </label>
        </section>

        <section
          className="space-y-3 rounded-2xl border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
          }}
        >
          <SectionHeading icon={<Route className="h-4 w-4" aria-hidden />}>
            Directions
          </SectionHeading>
          <label className="block space-y-1">
            <span className="inline-flex items-center gap-2 text-[var(--text-muted)]">
              <ModeIcon className="h-4 w-4" aria-hidden />
              Default transport mode
            </span>
            <select
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-elevated)",
                color: "var(--text)",
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
            <Plane className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
            Prefer direct flights when searching
          </label>
        </section>

        <section
          className="space-y-3 rounded-2xl border p-4"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow)",
          }}
        >
          <SectionHeading icon={<ShieldCheck className="h-4 w-4" aria-hidden />}>
            Privacy & security
          </SectionHeading>
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
            <Search className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
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
            <History className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
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
            <MapPin className="h-4 w-4 text-[var(--text-muted)]" aria-hidden />
            Allow in-app geolocation prompts (browser permission still required)
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)" }}
              onClick={() => getPreferencesStorage().clearSearchHistory()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear search history
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2"
              style={{ borderColor: "var(--border)" }}
              onClick={() => getPreferencesStorage().clearRouteHistory()}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear directions history
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[var(--danger)]"
              style={{ borderColor: "var(--border)" }}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear all local preferences
            </button>
          </div>
          {confirmClear ? (
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--border)" }}
            >
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
