import type { Messages } from "@/lib/i18n/messages/types";
import type { MapLayerPreferences } from "@/lib/map/mapLayerPreferences";

export type LegendCategoryId =
  | "europe"
  | "tourism"
  | "security"
  | "alerts"
  | "weather"
  | "sportCulture"
  | "economy"
  | "energy";

export type LegendGroupId = string;
export type LegendLayerId = string;
export type LegendFilterId = string;

/** Resolves against `messages.legend` or `messages.nav`. */
export type LegendTranslationKey =
  | { ns: "legend"; key: keyof Messages["legend"] }
  | { ns: "nav"; key: keyof Messages["nav"] };

export type LegendFilterDefinition = {
  id: LegendFilterId;
  preferenceKey: keyof MapLayerPreferences;
  titleKey: LegendTranslationKey;
  color: string;
};

export type LegendLayerDefinition = {
  id: LegendLayerId;
  preferenceKey: keyof MapLayerPreferences;
  titleKey: LegendTranslationKey;
  descriptionKey?: LegendTranslationKey;
  icon: string;
  color: string;
  swatchClassName?: string;
  swatchStyle?: Record<string, string>;
  filters?: LegendFilterDefinition[];
};

export type LegendGroupDefinition = {
  id: LegendGroupId;
  titleKey: LegendTranslationKey;
  defaultExpanded: boolean;
  layers: LegendLayerDefinition[];
  /** Compact notes always shown at the bottom of the group when relevant. */
  footerNoteKeys?: LegendTranslationKey[];
};

export type LegendCategoryDefinition = {
  id: LegendCategoryId;
  titleKey: LegendTranslationKey;
  icon: string;
  /** Categories without layers are reserved for future expansion and are hidden. */
  groups: LegendGroupDefinition[];
};

export const LEGEND_GROUP_STORAGE_KEY = "eu-map-legend-groups-v1";

export const DEFAULT_EXPANDED_CATEGORIES: Record<
  LegendCategoryId,
  boolean
> = {
  europe: false,
  tourism: false,
  security: false,
  alerts: true,
  weather: false,
  sportCulture: false,
  economy: false,
  energy: false,
};

export const LEGEND_CONFIGURATION: readonly LegendCategoryDefinition[] = [
  {
    id: "europe",
    titleKey: { ns: "nav", key: "europe" },
    icon: "layers",
    groups: [
      {
        id: "europe-membership",
        titleKey: { ns: "legend", key: "groupMembershipIntegration" },
        defaultExpanded: true,
        layers: [
          {
            id: "euro-area",
            preferenceKey: "euroArea",
            titleKey: { ns: "legend", key: "eurozone" },
            icon: "swatch",
            color: "#2563eb",
          },
          {
            id: "eu-outside-euro",
            preferenceKey: "euOutsideEuroArea",
            titleKey: { ns: "legend", key: "nonEurozone" },
            icon: "swatch",
            color: "#7c3aed",
          },
          {
            id: "schengen-outside-eu",
            preferenceKey: "schengenOutsideEu",
            titleKey: { ns: "legend", key: "schengenNonEU" },
            icon: "swatch",
            color: "#14b8a6",
          },
          {
            id: "eu-candidates",
            preferenceKey: "euCandidates",
            titleKey: { ns: "legend", key: "officialCandidate" },
            icon: "swatch",
            color: "#f59e0b",
          },
        ],
      },
      {
        id: "europe-capitals-institutions",
        titleKey: { ns: "legend", key: "groupCapitalsInstitutions" },
        defaultExpanded: true,
        layers: [
          {
            id: "eu-capitals",
            preferenceKey: "euCapitals",
            titleKey: { ns: "legend", key: "euCapitals" },
            descriptionKey: { ns: "legend", key: "euCapitalsDescription" },
            icon: "capital",
            color: "#003399",
            swatchClassName: "relative overflow-hidden rounded-full",
            swatchStyle: {
              background:
                "radial-gradient(circle at 50% 50%, #facc15 0 28%, #003399 30%)",
            },
          },
          {
            id: "eu-institutions",
            preferenceKey: "euMainInstitutions",
            titleKey: { ns: "legend", key: "euMainInstitutions" },
            descriptionKey: {
              ns: "legend",
              key: "euMainInstitutionsDescription",
            },
            icon: "institution",
            color: "#5b21b6",
            swatchClassName: "relative overflow-hidden rounded-[3px]",
            swatchStyle: {
              backgroundColor: "#5b21b6",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23facc15' d='M8 2.2 3.5 6h9L8 2.2zm-5 4.3v1.2h10V6.5H3zm1.6 1.7v4.2h1.3V8.2H4.6zm3.05 0v4.2h1.3V8.2H7.65zm3.05 0v4.2H12V8.2h-1.3zM3 13v1.2h10V13H3z'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "11px 11px",
            },
          },
        ],
      },
    ],
  },
  {
    id: "tourism",
    titleKey: { ns: "nav", key: "tourism" },
    icon: "plane",
    groups: [
      {
        id: "tourism-heritage",
        titleKey: { ns: "legend", key: "groupHeritage" },
        defaultExpanded: true,
        footerNoteKeys: [{ ns: "legend", key: "unescoAttribution" }],
        layers: [
          {
            id: "unesco",
            preferenceKey: "unescoWorldHeritage",
            titleKey: { ns: "legend", key: "unescoWorldHeritage" },
            descriptionKey: {
              ns: "legend",
              key: "unescoWorldHeritageDescription",
            },
            icon: "unesco",
            color: "#1e3a8a",
            swatchClassName: "rounded-full",
            filters: [
              {
                id: "unesco-cultural",
                preferenceKey: "unescoCultural",
                titleKey: { ns: "legend", key: "unescoCultural" },
                color: "#7c3aed",
              },
              {
                id: "unesco-natural",
                preferenceKey: "unescoNatural",
                titleKey: { ns: "legend", key: "unescoNatural" },
                color: "#15803d",
              },
              {
                id: "unesco-mixed",
                preferenceKey: "unescoMixed",
                titleKey: { ns: "legend", key: "unescoMixed" },
                color: "#0891b2",
              },
            ],
          },
          {
            id: "european-heritage-label",
            preferenceKey: "europeanHeritageLabel",
            titleKey: { ns: "legend", key: "europeanHeritageLabel" },
            descriptionKey: {
              ns: "legend",
              key: "europeanHeritageLabelDescription",
            },
            icon: "ehl",
            color: "#003399",
            swatchClassName: "rounded-full",
            swatchStyle: {
              background:
                "radial-gradient(circle at 50% 50%, #facc15 0 22%, #003399 24%)",
              boxShadow: "inset 0 0 0 1.5px #facc15",
            },
          },
        ],
      },
      {
        id: "tourism-destinations",
        titleKey: { ns: "legend", key: "groupTouristDestinations" },
        defaultExpanded: false,
        layers: [
          {
            id: "major-tourist-places",
            preferenceKey: "majorTouristPlaces",
            titleKey: { ns: "legend", key: "majorTouristPlaces" },
            descriptionKey: {
              ns: "legend",
              key: "majorTouristPlacesDescription",
            },
            icon: "tourist",
            color: "#c2410c",
            swatchClassName: "rounded-[3px]",
            filters: [
              {
                id: "tourist-landmark",
                preferenceKey: "touristLandmark",
                titleKey: { ns: "legend", key: "touristLandmark" },
                color: "#c2410c",
              },
              {
                id: "tourist-historic",
                preferenceKey: "touristHistoricArea",
                titleKey: { ns: "legend", key: "touristHistoricArea" },
                color: "#a16207",
              },
              {
                id: "tourist-museum",
                preferenceKey: "touristMuseum",
                titleKey: { ns: "legend", key: "touristMuseum" },
                color: "#7c3aed",
              },
              {
                id: "tourist-park",
                preferenceKey: "touristParkGarden",
                titleKey: { ns: "legend", key: "touristParkGarden" },
                color: "#15803d",
              },
              {
                id: "tourist-natural",
                preferenceKey: "touristNaturalLandscape",
                titleKey: { ns: "legend", key: "touristNaturalLandscape" },
                color: "#0f766e",
              },
              {
                id: "tourist-coastal",
                preferenceKey: "touristCoastalDestination",
                titleKey: { ns: "legend", key: "touristCoastalDestination" },
                color: "#0284c7",
              },
              {
                id: "tourist-mountain",
                preferenceKey: "touristMountainDestination",
                titleKey: { ns: "legend", key: "touristMountainDestination" },
                color: "#57534e",
              },
            ],
          },
          {
            id: "european-mountain-places",
            preferenceKey: "europeanMountainPlaces",
            titleKey: { ns: "legend", key: "europeanMountainPlaces" },
            descriptionKey: {
              ns: "legend",
              key: "europeanMountainPlacesDescription",
            },
            icon: "mountain",
            color: "#0284c7",
            swatchClassName: "rounded-full",
            filters: [
              {
                id: "mountain-ski",
                preferenceKey: "mountainSkiResort",
                titleKey: { ns: "legend", key: "mountainSkiResort" },
                color: "#0284c7",
              },
              {
                id: "mountain-dest",
                preferenceKey: "mountainDestination",
                titleKey: { ns: "legend", key: "mountainDestination" },
                color: "#166534",
              },
              {
                id: "mountain-peak",
                preferenceKey: "mountainIconicPeak",
                titleKey: { ns: "legend", key: "mountainIconicPeak" },
                color: "#64748b",
              },
              {
                id: "mountain-range",
                preferenceKey: "mountainRange",
                titleKey: { ns: "legend", key: "mountainRange" },
                color: "#7c3aed",
              },
            ],
          },
          {
            id: "major-civil-engineering-works",
            preferenceKey: "majorCivilEngineeringWorks",
            titleKey: { ns: "legend", key: "majorCivilEngineeringWorks" },
            descriptionKey: {
              ns: "legend",
              key: "majorCivilEngineeringWorksDescription",
            },
            icon: "civil-engineering",
            color: "#2563eb",
            swatchClassName: "rounded-full",
            filters: [
              {
                id: "civil-engineering-bridge",
                preferenceKey: "civilEngineeringBridge",
                titleKey: { ns: "legend", key: "civilEngineeringBridge" },
                color: "#2563eb",
              },
              {
                id: "civil-engineering-viaduct",
                preferenceKey: "civilEngineeringViaduct",
                titleKey: { ns: "legend", key: "civilEngineeringViaduct" },
                color: "#7c3aed",
              },
              {
                id: "civil-engineering-tunnel",
                preferenceKey: "civilEngineeringTunnel",
                titleKey: { ns: "legend", key: "civilEngineeringTunnel" },
                color: "#475569",
              },
              {
                id: "civil-engineering-dam",
                preferenceKey: "civilEngineeringDam",
                titleKey: { ns: "legend", key: "civilEngineeringDam" },
                color: "#0891b2",
              },
              {
                id: "civil-engineering-lock",
                preferenceKey: "civilEngineeringCanalLock",
                titleKey: { ns: "legend", key: "civilEngineeringCanalLock" },
                color: "#0f766e",
              },
            ],
          },
        ],
      },
      {
        id: "tourism-transport",
        titleKey: { ns: "legend", key: "groupInternationalTransport" },
        defaultExpanded: false,
        footerNoteKeys: [
          { ns: "legend", key: "eurostarTransportDescription" },
          { ns: "legend", key: "eurostarSchematicNote" },
        ],
        layers: [
          {
            id: "airports",
            preferenceKey: "majorEuropeanAirports",
            titleKey: { ns: "legend", key: "majorEuropeanAirports" },
            descriptionKey: {
              ns: "legend",
              key: "majorEuropeanAirportsDescription",
            },
            icon: "airport",
            color: "#0e7490",
            swatchClassName: "rounded-[3px]",
          },
          {
            id: "eurostar-stations",
            preferenceKey: "eurostarStations",
            titleKey: { ns: "legend", key: "eurostarStations" },
            icon: "station",
            color: "#f59e0b",
            swatchClassName: "rounded-[3px]",
          },
          {
            id: "eurostar-routes",
            preferenceKey: "eurostarRoutes",
            titleKey: { ns: "legend", key: "eurostarRoutes" },
            icon: "route",
            color: "#1e3a8a",
          },
        ],
      },
    ],
  },
  {
    id: "security",
    titleKey: { ns: "nav", key: "security" },
    icon: "shield",
    groups: [
      {
        id: "security-borders",
        titleKey: { ns: "legend", key: "groupBordersAndControls" },
        defaultExpanded: true,
        footerNoteKeys: [
          {
            ns: "legend",
            key: "schengenTemporaryInternalControlsDescription",
          },
        ],
        layers: [
          {
            id: "schengen-external-crossings",
            preferenceKey: "schengenExternalBorderCrossings",
            titleKey: {
              ns: "legend",
              key: "schengenExternalBorderCrossings",
            },
            descriptionKey: {
              ns: "legend",
              key: "schengenExternalBorderCrossingsDescription",
            },
            icon: "border",
            color: "#1e3a8a",
            swatchClassName: "rounded-[3px]",
            filters: [
              {
                id: "border-road",
                preferenceKey: "borderCrossingRoad",
                titleKey: { ns: "legend", key: "borderCrossingRoad" },
                color: "#1e3a8a",
              },
              {
                id: "border-rail",
                preferenceKey: "borderCrossingRail",
                titleKey: { ns: "legend", key: "borderCrossingRail" },
                color: "#1d4ed8",
              },
              {
                id: "border-air",
                preferenceKey: "borderCrossingAir",
                titleKey: { ns: "legend", key: "borderCrossingAir" },
                color: "#1e3a8a",
              },
              {
                id: "border-sea",
                preferenceKey: "borderCrossingSea",
                titleKey: { ns: "legend", key: "borderCrossingSea" },
                color: "#0e4d8b",
              },
            ],
          },
          {
            id: "schengen-temporary-controls",
            preferenceKey: "schengenTemporaryInternalControls",
            titleKey: {
              ns: "legend",
              key: "schengenTemporaryInternalControls",
            },
            descriptionKey: {
              ns: "legend",
              key: "schengenTemporaryInternalControlsDescription",
            },
            icon: "control",
            color: "#ea580c",
            swatchClassName: "rounded-full",
          },
        ],
      },
    ],
  },
  {
    id: "alerts",
    titleKey: { ns: "nav", key: "alerts" },
    icon: "alert",
    groups: [
      {
        id: "alerts-wildfires",
        titleKey: { ns: "legend", key: "groupWildfires" },
        defaultExpanded: true,
        footerNoteKeys: [{ ns: "legend", key: "satelliteHistoryNote" }],
        layers: [
          {
            id: "major-wildfires",
            preferenceKey: "majorWildfires",
            titleKey: { ns: "legend", key: "majorWildfires" },
            icon: "wildfire",
            color: "#ef4444",
            swatchClassName: "rounded-full",
            swatchStyle: {
              background:
                "linear-gradient(135deg, #ef4444 0%, #ef4444 55%, #f59e0b 55%, #f59e0b 100%)",
            },
          },
          {
            id: "satellite-active-fires",
            preferenceKey: "satelliteActiveFires",
            titleKey: { ns: "legend", key: "satelliteActiveFires" },
            icon: "swatch",
            color: "#f97316",
          },
          {
            id: "satellite-history",
            preferenceKey: "recentSatelliteHistory",
            titleKey: { ns: "legend", key: "satelliteBurnedAreas" },
            icon: "swatch",
            color: "#7c2d12",
          },
        ],
      },
    ],
  },
  // Reserved empty categories (hidden until they have layers):
  {
    id: "weather",
    titleKey: { ns: "legend", key: "categoryWeather" },
    icon: "weather",
    groups: [],
  },
  {
    id: "sportCulture",
    titleKey: { ns: "legend", key: "categorySportCulture" },
    icon: "sport",
    groups: [],
  },
  {
    id: "economy",
    titleKey: { ns: "legend", key: "categoryEconomy" },
    icon: "economy",
    groups: [],
  },
  {
    id: "energy",
    titleKey: { ns: "nav", key: "energy" },
    icon: "energy",
    groups: [],
  },
];

export function getVisibleLegendCategories(): LegendCategoryDefinition[] {
  return LEGEND_CONFIGURATION.filter((category) => category.groups.length > 0);
}

export function getMainLayerPreferenceKeys(): ReadonlyArray<
  keyof MapLayerPreferences
> {
  const keys: Array<keyof MapLayerPreferences> = [];
  for (const category of LEGEND_CONFIGURATION) {
    for (const group of category.groups) {
      for (const layer of group.layers) {
        keys.push(layer.preferenceKey);
      }
    }
  }
  return keys;
}

export function getFilterPreferenceKeys(): ReadonlyArray<
  keyof MapLayerPreferences
> {
  const keys: Array<keyof MapLayerPreferences> = [];
  for (const category of LEGEND_CONFIGURATION) {
    for (const group of category.groups) {
      for (const layer of group.layers) {
        for (const filter of layer.filters ?? []) {
          keys.push(filter.preferenceKey);
        }
      }
    }
  }
  return keys;
}

/** Counts only main layers — never filters. */
export function getActiveMainLayerCount(
  preferences: MapLayerPreferences,
): number {
  return getMainLayerPreferenceKeys().filter((key) => preferences[key]).length;
}

export function getActiveLayerCountForCategory(
  categoryId: LegendCategoryId,
  preferences: MapLayerPreferences,
): number {
  const category = LEGEND_CONFIGURATION.find((item) => item.id === categoryId);
  if (!category) return 0;
  let count = 0;
  for (const group of category.groups) {
    for (const layer of group.layers) {
      if (preferences[layer.preferenceKey]) count += 1;
    }
  }
  return count;
}

export function getGroupActiveTotal(
  group: LegendGroupDefinition,
  preferences: MapLayerPreferences,
): { active: number; total: number } {
  const total = group.layers.length;
  const active = group.layers.filter(
    (layer) => preferences[layer.preferenceKey],
  ).length;
  return { active, total };
}

export function getFilterActiveTotal(
  layer: LegendLayerDefinition,
  preferences: MapLayerPreferences,
): { active: number; total: number } {
  const filters = layer.filters ?? [];
  const total = filters.length;
  const active = filters.filter(
    (filter) => preferences[filter.preferenceKey],
  ).length;
  return { active, total };
}

export function getDefaultExpandedGroups(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const category of LEGEND_CONFIGURATION) {
    for (const group of category.groups) {
      result[group.id] = group.defaultExpanded;
    }
  }
  return result;
}

export function loadLegendGroupExpanded(): Record<string, boolean> {
  const defaults = getDefaultExpandedGroups();
  if (typeof window === "undefined") return defaults;

  try {
    const raw = window.localStorage.getItem(LEGEND_GROUP_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return defaults;
    }
    const source = parsed as Record<string, unknown>;
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (typeof source[key] === "boolean") {
        result[key] = source[key];
      }
    }
    return result;
  } catch {
    return defaults;
  }
}

export function saveLegendGroupExpanded(
  expanded: Record<string, boolean>,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LEGEND_GROUP_STORAGE_KEY,
      JSON.stringify(expanded),
    );
  } catch {
    // ignore
  }
}
