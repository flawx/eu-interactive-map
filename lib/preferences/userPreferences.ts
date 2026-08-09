export type ThemePreference = "system" | "light" | "dark";

export type UserPreferences = {
  schemaVersion: number;
  appearance: {
    theme: ThemePreference;
    defaultBasemapId: string;
  };
  language: {
    locale: string | null;
  };
  map: {
    preferRelief: boolean;
    prefer3d: boolean;
  };
  directions: {
    defaultMode: "car" | "bicycle" | "walk" | "transit" | "flight";
    preferDirectFlights: boolean;
  };
  privacy: {
    saveSearchHistory: boolean;
    saveRouteHistory: boolean;
    allowGeolocationPrompt: boolean;
  };
};

export const USER_PREFERENCES_SCHEMA_VERSION = 1;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  schemaVersion: USER_PREFERENCES_SCHEMA_VERSION,
  appearance: {
    theme: "system",
    defaultBasemapId: "standard",
  },
  language: {
    locale: null,
  },
  map: {
    preferRelief: false,
    prefer3d: false,
  },
  directions: {
    defaultMode: "car",
    preferDirectFlights: false,
  },
  privacy: {
    saveSearchHistory: true,
    saveRouteHistory: true,
    allowGeolocationPrompt: true,
  },
};

export type SearchHistoryEntry = {
  id: string;
  query: string;
  label: string;
  longitude?: number;
  latitude?: number;
  countryCode?: string | null;
  createdAt: string;
};

export type RouteHistoryEntry = {
  id: string;
  mode: string;
  originLabel: string;
  destinationLabel: string;
  createdAt: string;
};

export interface PreferencesStorageAdapter {
  load(): UserPreferences;
  save(preferences: UserPreferences): void;
  clear(): void;
  loadSearchHistory(): SearchHistoryEntry[];
  saveSearchHistory(entries: SearchHistoryEntry[]): void;
  clearSearchHistory(): void;
  loadRouteHistory(): RouteHistoryEntry[];
  saveRouteHistory(entries: RouteHistoryEntry[]): void;
  clearRouteHistory(): void;
}

const PREFS_KEY = "euim-user-preferences-v1";
const SEARCH_HISTORY_KEY = "euim-search-history-v1";
const ROUTE_HISTORY_KEY = "euim-route-history-v1";

function migratePreferences(value: unknown): UserPreferences {
  const base = structuredClone(DEFAULT_USER_PREFERENCES);
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const record = value as Record<string, unknown>;
  const appearance = record.appearance as Record<string, unknown> | undefined;
  const language = record.language as Record<string, unknown> | undefined;
  const map = record.map as Record<string, unknown> | undefined;
  const directions = record.directions as Record<string, unknown> | undefined;
  const privacy = record.privacy as Record<string, unknown> | undefined;

  if (appearance?.theme === "system" || appearance?.theme === "light" || appearance?.theme === "dark") {
    base.appearance.theme = appearance.theme;
  }
  if (typeof appearance?.defaultBasemapId === "string") {
    base.appearance.defaultBasemapId = appearance.defaultBasemapId;
  }
  if (typeof language?.locale === "string" || language?.locale === null) {
    base.language.locale = language.locale as string | null;
  }
  if (typeof map?.preferRelief === "boolean") base.map.preferRelief = map.preferRelief;
  if (typeof map?.prefer3d === "boolean") base.map.prefer3d = map.prefer3d;
  if (
    directions?.defaultMode === "car" ||
    directions?.defaultMode === "bicycle" ||
    directions?.defaultMode === "walk" ||
    directions?.defaultMode === "transit" ||
    directions?.defaultMode === "flight"
  ) {
    base.directions.defaultMode = directions.defaultMode;
  }
  if (typeof directions?.preferDirectFlights === "boolean") {
    base.directions.preferDirectFlights = directions.preferDirectFlights;
  }
  if (typeof privacy?.saveSearchHistory === "boolean") {
    base.privacy.saveSearchHistory = privacy.saveSearchHistory;
  }
  if (typeof privacy?.saveRouteHistory === "boolean") {
    base.privacy.saveRouteHistory = privacy.saveRouteHistory;
  }
  if (typeof privacy?.allowGeolocationPrompt === "boolean") {
    base.privacy.allowGeolocationPrompt = privacy.allowGeolocationPrompt;
  }
  base.schemaVersion = USER_PREFERENCES_SCHEMA_VERSION;
  return base;
}

export class LocalPreferencesStorage implements PreferencesStorageAdapter {
  load(): UserPreferences {
    if (typeof window === "undefined") {
      return structuredClone(DEFAULT_USER_PREFERENCES);
    }
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return structuredClone(DEFAULT_USER_PREFERENCES);
      return migratePreferences(JSON.parse(raw));
    } catch {
      return structuredClone(DEFAULT_USER_PREFERENCES);
    }
  }

  save(preferences: UserPreferences): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        PREFS_KEY,
        JSON.stringify({
          ...preferences,
          schemaVersion: USER_PREFERENCES_SCHEMA_VERSION,
        }),
      );
    } catch {
      // ignore quota
    }
  }

  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(PREFS_KEY);
    } catch {
      // ignore
    }
  }

  loadSearchHistory(): SearchHistoryEntry[] {
    return this.loadJsonArray(SEARCH_HISTORY_KEY);
  }

  saveSearchHistory(entries: SearchHistoryEntry[]): void {
    this.saveJsonArray(SEARCH_HISTORY_KEY, entries.slice(0, 50));
  }

  clearSearchHistory(): void {
    this.removeKey(SEARCH_HISTORY_KEY);
  }

  loadRouteHistory(): RouteHistoryEntry[] {
    return this.loadJsonArray(ROUTE_HISTORY_KEY);
  }

  saveRouteHistory(entries: RouteHistoryEntry[]): void {
    this.saveJsonArray(ROUTE_HISTORY_KEY, entries.slice(0, 50));
  }

  clearRouteHistory(): void {
    this.removeKey(ROUTE_HISTORY_KEY);
  }

  private loadJsonArray<T>(key: string): T[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private saveJsonArray(key: string, value: unknown): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }

  private removeKey(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

let adapter: PreferencesStorageAdapter = new LocalPreferencesStorage();

export function getPreferencesStorage(): PreferencesStorageAdapter {
  return adapter;
}

export function setPreferencesStorageForTests(
  next: PreferencesStorageAdapter,
): void {
  adapter = next;
}
