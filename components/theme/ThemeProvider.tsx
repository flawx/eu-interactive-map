"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_USER_PREFERENCES,
  getPreferencesStorage,
  type ThemePreference,
  type UserPreferences,
} from "@/lib/preferences/userPreferences";

type ThemeContextValue = {
  preferences: UserPreferences;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemePreference) => void;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  clearAllLocalData: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(theme: ThemePreference): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(
    DEFAULT_USER_PREFERENCES,
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const loaded = getPreferencesStorage().load();
    setPreferences(loaded);
    setResolvedTheme(resolveTheme(loaded.appearance.theme));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (preferences.appearance.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(resolveTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preferences.appearance.theme]);

  const updatePreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferences((current) => {
      const next: UserPreferences = {
        ...current,
        ...patch,
        appearance: { ...current.appearance, ...patch.appearance },
        language: { ...current.language, ...patch.language },
        map: { ...current.map, ...patch.map },
        directions: { ...current.directions, ...patch.directions },
        privacy: { ...current.privacy, ...patch.privacy },
      };
      getPreferencesStorage().save(next);
      if (patch.appearance?.theme) {
        setResolvedTheme(resolveTheme(patch.appearance.theme));
      }
      return next;
    });
  }, []);

  const setTheme = useCallback((theme: ThemePreference) => {
    setPreferences((current) => {
      const next: UserPreferences = {
        ...current,
        appearance: { ...current.appearance, theme },
      };
      getPreferencesStorage().save(next);
      setResolvedTheme(resolveTheme(theme));
      return next;
    });
  }, []);

  const clearAllLocalData = useCallback(() => {
    const storage = getPreferencesStorage();
    storage.clear();
    storage.clearSearchHistory();
    storage.clearRouteHistory();
    setPreferences(structuredClone(DEFAULT_USER_PREFERENCES));
    setResolvedTheme(resolveTheme(DEFAULT_USER_PREFERENCES.appearance.theme));
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      resolvedTheme,
      setTheme,
      updatePreferences,
      clearAllLocalData,
    }),
    [
      preferences,
      resolvedTheme,
      setTheme,
      updatePreferences,
      clearAllLocalData,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreferences(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemePreferences must be used within ThemeProvider");
  }
  return ctx;
}
