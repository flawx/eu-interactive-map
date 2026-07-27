export type MapLayerPreferences = {
  euroArea: boolean;
  euOutsideEuroArea: boolean;
  schengenOutsideEu: boolean;
  euCandidates: boolean;
  euCapitals: boolean;
  euMainInstitutions: boolean;
  unescoWorldHeritage: boolean;
  unescoCultural: boolean;
  unescoNatural: boolean;
  unescoMixed: boolean;
  majorTouristPlaces: boolean;
  touristLandmark: boolean;
  touristHistoricArea: boolean;
  touristMuseum: boolean;
  touristParkGarden: boolean;
  touristNaturalLandscape: boolean;
  touristCoastalDestination: boolean;
  touristMountainDestination: boolean;
  majorEuropeanAirports: boolean;
  eurostarStations: boolean;
  eurostarRoutes: boolean;
  majorWildfires: boolean;
  satelliteActiveFires: boolean;
  recentSatelliteHistory: boolean;
};

export const DEFAULT_MAP_LAYER_PREFERENCES: MapLayerPreferences = {
  euroArea: true,
  euOutsideEuroArea: true,
  schengenOutsideEu: false,
  euCandidates: false,
  euCapitals: false,
  euMainInstitutions: false,
  unescoWorldHeritage: false,
  unescoCultural: true,
  unescoNatural: true,
  unescoMixed: true,
  majorTouristPlaces: false,
  touristLandmark: true,
  touristHistoricArea: true,
  touristMuseum: true,
  touristParkGarden: true,
  touristNaturalLandscape: true,
  touristCoastalDestination: true,
  touristMountainDestination: true,
  majorEuropeanAirports: false,
  eurostarStations: false,
  eurostarRoutes: false,
  majorWildfires: false,
  satelliteActiveFires: false,
  recentSatelliteHistory: false,
};

const LAYER_PREFS_KEY = "eu-map-layer-preferences-v1";
const LEGEND_COLLAPSED_KEY = "eu-map-legend-collapsed-v1";

const LAYER_KEYS = [
  "euroArea",
  "euOutsideEuroArea",
  "schengenOutsideEu",
  "euCandidates",
  "euCapitals",
  "euMainInstitutions",
  "unescoWorldHeritage",
  "unescoCultural",
  "unescoNatural",
  "unescoMixed",
  "majorTouristPlaces",
  "touristLandmark",
  "touristHistoricArea",
  "touristMuseum",
  "touristParkGarden",
  "touristNaturalLandscape",
  "touristCoastalDestination",
  "touristMountainDestination",
  "majorEuropeanAirports",
  "eurostarStations",
  "eurostarRoutes",
  "majorWildfires",
  "satelliteActiveFires",
  "recentSatelliteHistory",
] as const satisfies ReadonlyArray<keyof MapLayerPreferences>;

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function loadMapLayerPreferences(): MapLayerPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_MAP_LAYER_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(LAYER_PREFS_KEY);
    if (!raw) {
      return { ...DEFAULT_MAP_LAYER_PREFERENCES };
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...DEFAULT_MAP_LAYER_PREFERENCES };
    }

    const source = parsed as Record<string, unknown>;
    const result = { ...DEFAULT_MAP_LAYER_PREFERENCES };

    for (const key of LAYER_KEYS) {
      if (isBoolean(source[key])) {
        result[key] = source[key];
      }
    }

    return result;
  } catch {
    return { ...DEFAULT_MAP_LAYER_PREFERENCES };
  }
}

export function saveMapLayerPreferences(
  preferences: MapLayerPreferences,
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: MapLayerPreferences = {
      euroArea: Boolean(preferences.euroArea),
      euOutsideEuroArea: Boolean(preferences.euOutsideEuroArea),
      schengenOutsideEu: Boolean(preferences.schengenOutsideEu),
      euCandidates: Boolean(preferences.euCandidates),
      euCapitals: Boolean(preferences.euCapitals),
      euMainInstitutions: Boolean(preferences.euMainInstitutions),
      unescoWorldHeritage: Boolean(preferences.unescoWorldHeritage),
      unescoCultural: Boolean(preferences.unescoCultural),
      unescoNatural: Boolean(preferences.unescoNatural),
      unescoMixed: Boolean(preferences.unescoMixed),
      majorTouristPlaces: Boolean(preferences.majorTouristPlaces),
      touristLandmark: Boolean(preferences.touristLandmark),
      touristHistoricArea: Boolean(preferences.touristHistoricArea),
      touristMuseum: Boolean(preferences.touristMuseum),
      touristParkGarden: Boolean(preferences.touristParkGarden),
      touristNaturalLandscape: Boolean(preferences.touristNaturalLandscape),
      touristCoastalDestination: Boolean(preferences.touristCoastalDestination),
      touristMountainDestination: Boolean(
        preferences.touristMountainDestination,
      ),
      majorEuropeanAirports: Boolean(preferences.majorEuropeanAirports),
      eurostarStations: Boolean(preferences.eurostarStations),
      eurostarRoutes: Boolean(preferences.eurostarRoutes),
      majorWildfires: Boolean(preferences.majorWildfires),
      satelliteActiveFires: Boolean(preferences.satelliteActiveFires),
      recentSatelliteHistory: Boolean(preferences.recentSatelliteHistory),
    };
    window.localStorage.setItem(LAYER_PREFS_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota — keep session values only
  }
}

export function countActiveMapLayers(
  preferences: MapLayerPreferences,
): number {
  return LAYER_KEYS.filter((key) => preferences[key]).length;
}

/** `null` = no stored preference yet. */
export function loadLegendCollapsed(): boolean | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LEGEND_COLLAPSED_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function saveLegendCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LEGEND_COLLAPSED_KEY,
      collapsed ? "true" : "false",
    );
  } catch {
    // ignore
  }
}

export function defaultLegendCollapsedForViewport(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(max-width: 767px)").matches;
}
