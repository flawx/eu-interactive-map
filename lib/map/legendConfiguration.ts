import type { Messages } from "@/lib/i18n/messages/types";
import type { MapLayerPreferences } from "@/lib/map/mapLayerPreferences";

export type LegendCategoryId =
  | "europe"
  | "tourism"
  | "security"
  | "alerts"
  | "roadTraffic"
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
  alerts: false,
  roadTraffic: false,
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
          {
            id: "eu-bodies-agencies",
            preferenceKey: "euBodiesAgencies",
            titleKey: { ns: "legend", key: "euBodiesAgencies" },
            descriptionKey: {
              ns: "legend",
              key: "euBodiesAgenciesDescription",
            },
            icon: "building",
            color: "#6d28d9",
            swatchStyle: { backgroundColor: "#6d28d9" },
          },
          {
            id: "international-organisations",
            preferenceKey: "internationalOrganisations",
            titleKey: { ns: "legend", key: "internationalOrganisations" },
            descriptionKey: {
              ns: "legend",
              key: "internationalOrganisationsDescription",
            },
            icon: "globe",
            color: "#0f766e",
            swatchStyle: { backgroundColor: "#0f766e" },
          },
          {
            id: "european-capitals-of-culture",
            preferenceKey: "europeanCapitalsOfCulture",
            titleKey: { ns: "legend", key: "europeanCapitalsOfCulture" },
            descriptionKey: {
              ns: "legend",
              key: "europeanCapitalsOfCultureDescription",
            },
            icon: "sparkles",
            color: "#c026d3",
            swatchStyle: { backgroundColor: "#c026d3" },
          },
        ],
      },
      {
        id: "europe-eu-projects",
        titleKey: { ns: "legend", key: "groupEuProjects" },
        defaultExpanded: false,
        footerNoteKeys: [{ ns: "legend", key: "euProjectsStatusNote" }],
        layers: [
          {
            id: "eu-projects-transport",
            preferenceKey: "euProjectsTransport",
            titleKey: { ns: "legend", key: "euProjectsTransport" },
            descriptionKey: { ns: "legend", key: "euProjectsTransportDescription" },
            icon: "transport",
            color: "#2563eb",
            swatchClassName: "rounded-full",
          },
          {
            id: "eu-projects-sport-culture",
            preferenceKey: "euProjectsSportCulture",
            titleKey: { ns: "legend", key: "euProjectsSportCulture" },
            descriptionKey: { ns: "legend", key: "euProjectsSportCultureDescription" },
            icon: "sport",
            color: "#c026d3",
            swatchClassName: "rounded-full",
          },
          {
            id: "eu-projects-protection",
            preferenceKey: "euProjectsProtection",
            titleKey: { ns: "legend", key: "euProjectsProtection" },
            descriptionKey: { ns: "legend", key: "euProjectsProtectionDescription" },
            icon: "shield",
            color: "#7c3aed",
            swatchClassName: "rounded-full",
          },
          {
            id: "eu-projects-public-social",
            preferenceKey: "euProjectsPublicSocial",
            titleKey: { ns: "legend", key: "euProjectsPublicSocial" },
            descriptionKey: { ns: "legend", key: "euProjectsPublicSocialDescription" },
            icon: "community",
            color: "#0f766e",
            swatchClassName: "rounded-full",
          },
          {
            id: "eu-projects-research",
            preferenceKey: "euProjectsResearch",
            titleKey: { ns: "legend", key: "euProjectsResearch" },
            descriptionKey: { ns: "legend", key: "euProjectsResearchDescription" },
            icon: "science",
            color: "#0891b2",
            swatchClassName: "rounded-full",
          },
          {
            id: "eu-projects-environment",
            preferenceKey: "euProjectsEnvironment",
            titleKey: { ns: "legend", key: "euProjectsEnvironment" },
            descriptionKey: { ns: "legend", key: "euProjectsEnvironmentDescription" },
            icon: "environment",
            color: "#15803d",
            swatchClassName: "rounded-full",
          },
        ],
      },
      {
        id: "europe-economy",
        titleKey: { ns: "legend", key: "groupEuropeEconomy" },
        defaultExpanded: false,
        layers: [
          {
            id: "european-economic-area",
            preferenceKey: "europeanEconomicArea",
            titleKey: { ns: "legend", key: "europeanEconomicArea" },
            descriptionKey: { ns: "legend", key: "europeanEconomicAreaDescription" },
            icon: "economy",
            color: "#0d9488",
            swatchClassName: "rounded-[3px]",
            swatchStyle: { backgroundColor: "#0d9488" },
          },
          {
            id: "major-business-districts",
            preferenceKey: "majorBusinessDistricts",
            titleKey: { ns: "legend", key: "majorBusinessDistricts" },
            descriptionKey: { ns: "legend", key: "majorBusinessDistrictsDescription" },
            icon: "economy",
            color: "#b45309",
            swatchClassName: "rounded-full",
          },
          {
            id: "major-freight-ports",
            preferenceKey: "majorFreightPorts",
            titleKey: { ns: "legend", key: "majorFreightPorts" },
            descriptionKey: { ns: "legend", key: "majorFreightPortsDescription" },
            icon: "port",
            color: "#1d4ed8",
            swatchClassName: "rounded-full",
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
        id: "tourism-culture-attractions",
        titleKey: { ns: "legend", key: "groupCultureAttractions" },
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
        id: "tourism-nature-protected",
        titleKey: { ns: "legend", key: "groupNatureProtected" },
        defaultExpanded: false,
        footerNoteKeys: [{ ns: "legend", key: "natura2000Attribution" }],
        layers: [
          {
            id: "natura2000",
            preferenceKey: "natura2000",
            titleKey: { ns: "legend", key: "natura2000" },
            descriptionKey: { ns: "legend", key: "natura2000Description" },
            icon: "leaf",
            color: "#16a34a",
            swatchClassName: "rounded-full",
            swatchStyle: { backgroundColor: "#16a34a" },
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
        ],
      },
      {
        id: "tourism-beaches-bathing",
        titleKey: { ns: "legend", key: "groupBeachesBathing" },
        defaultExpanded: false,
        footerNoteKeys: [{ ns: "legend", key: "bathingWaterAnnualNote" }],
        layers: [
          {
            id: "european-bathing-waters",
            preferenceKey: "europeanBathingWaters",
            titleKey: { ns: "legend", key: "europeanBathingWaters" },
            descriptionKey: {
              ns: "legend",
              key: "europeanBathingWatersDescription",
            },
            icon: "waves",
            color: "#0891b2",
            swatchClassName: "rounded-full",
          },
          {
            id: "major-beaches-seaside-resorts",
            preferenceKey: "majorBeachesSeasideResorts",
            titleKey: { ns: "legend", key: "majorBeachesSeasideResorts" },
            descriptionKey: {
              ns: "legend",
              key: "majorBeachesSeasideResortsDescription",
            },
            icon: "beach",
            color: "#0284c7",
            swatchClassName: "rounded-full",
          },
        ],
      },
      {
        id: "tourism-outdoor-routes",
        titleKey: { ns: "legend", key: "groupOutdoorRoutes" },
        defaultExpanded: false,
        layers: [
          {
            id: "major-hiking-routes",
            preferenceKey: "majorHikingRoutes",
            titleKey: { ns: "legend", key: "majorHikingRoutes" },
            descriptionKey: { ns: "legend", key: "majorHikingRoutesDescription" },
            icon: "hiking",
            color: "#92400e",
            swatchClassName: "rounded-full",
          },
          {
            id: "major-cycling-routes",
            preferenceKey: "majorCyclingRoutes",
            titleKey: { ns: "legend", key: "majorCyclingRoutes" },
            descriptionKey: { ns: "legend", key: "majorCyclingRoutesDescription" },
            icon: "cycling",
            color: "#2563eb",
            swatchClassName: "rounded-full",
          },
          {
            id: "major-running-routes",
            preferenceKey: "majorRunningRoutes",
            titleKey: { ns: "legend", key: "majorRunningRoutes" },
            descriptionKey: { ns: "legend", key: "majorRunningRoutesDescription" },
            icon: "running",
            color: "#db2777",
            swatchClassName: "rounded-full",
          },
        ],
      },
      {
        id: "tourism-visitor-services",
        titleKey: { ns: "legend", key: "groupTravelVisitorServices" },
        defaultExpanded: false,
        footerNoteKeys: [
          { ns: "legend", key: "eurostarTransportDescription" },
          { ns: "legend", key: "eurostarSchematicNote" },
          { ns: "legend", key: "emergency112Note" },
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
            id: "wifi4eu",
            preferenceKey: "wifi4eu",
            titleKey: { ns: "legend", key: "wifi4eu" },
            descriptionKey: { ns: "legend", key: "wifi4euDescription" },
            icon: "wifi",
            color: "#0891b2",
            swatchClassName: "rounded-full",
          },
          {
            id: "tourist-information-offices",
            preferenceKey: "touristInformationOffices",
            titleKey: { ns: "legend", key: "touristInformationOffices" },
            descriptionKey: {
              ns: "legend",
              key: "touristInformationOfficesDescription",
            },
            icon: "info",
            color: "#0d9488",
            swatchClassName: "rounded-full",
          },
          {
            id: "diplomatic-missions",
            preferenceKey: "diplomaticMissions",
            titleKey: { ns: "legend", key: "diplomaticMissions" },
            descriptionKey: { ns: "legend", key: "diplomaticMissionsDescription" },
            icon: "diplomatic",
            color: "#334155",
            swatchClassName: "rounded-full",
          },
          {
            id: "visitor-safety-assistance",
            preferenceKey: "visitorSafetyAssistance",
            titleKey: { ns: "legend", key: "visitorSafetyAssistance" },
            descriptionKey: {
              ns: "legend",
              key: "visitorSafetyAssistanceDescription",
            },
            icon: "safety",
            color: "#dc2626",
            swatchClassName: "rounded-full",
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
            filters: [
              {
                id: "wildfire-wind",
                preferenceKey: "wildfireWind",
                titleKey: { ns: "legend", key: "wildfireWind" },
                color: "#38bdf8",
              },
            ],
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
      {
        id: "alerts-floods-weather",
        titleKey: { ns: "legend", key: "groupFloodsSevereWeather" },
        defaultExpanded: true,
        layers: [
          {
            id: "official-weather-warnings",
            preferenceKey: "officialWeatherWarnings",
            titleKey: { ns: "legend", key: "officialWeatherWarnings" },
            icon: "weather-warning",
            color: "#f59e0b",
            filters: [
              {
                id: "weather-heavy-rain",
                preferenceKey: "weatherHeavyRain",
                titleKey: { ns: "legend", key: "weatherHeavyRain" },
                color: "#0ea5e9",
              },
              {
                id: "weather-flood",
                preferenceKey: "weatherFlood",
                titleKey: { ns: "legend", key: "weatherFlood" },
                color: "#2563eb",
              },
              {
                id: "weather-strong-wind",
                preferenceKey: "weatherStrongWind",
                titleKey: { ns: "legend", key: "weatherStrongWind" },
                color: "#a855f7",
              },
              {
                id: "weather-thunderstorm",
                preferenceKey: "weatherThunderstorm",
                titleKey: { ns: "legend", key: "weatherThunderstorm" },
                color: "#7c3aed",
              },
              {
                id: "weather-hail",
                preferenceKey: "weatherHail",
                titleKey: { ns: "legend", key: "weatherHail" },
                color: "#64748b",
              },
              {
                id: "weather-snow-ice",
                preferenceKey: "weatherSnowIce",
                titleKey: { ns: "legend", key: "weatherSnowIce" },
                color: "#bae6fd",
              },
              {
                id: "weather-coastal",
                preferenceKey: "weatherCoastal",
                titleKey: { ns: "legend", key: "weatherCoastal" },
                color: "#0891b2",
              },
              {
                id: "weather-other",
                preferenceKey: "weatherOther",
                titleKey: { ns: "legend", key: "weatherOther" },
                color: "#64748b",
              },
            ],
          },
          {
            id: "major-flood-alerts",
            preferenceKey: "majorFloodAlerts",
            titleKey: { ns: "legend", key: "majorFloodAlerts" },
            icon: "flood",
            color: "#2563eb",
          },
          {
            id: "observed-flood-extent",
            preferenceKey: "observedFloodExtent",
            titleKey: { ns: "legend", key: "observedFloodExtent" },
            icon: "satellite",
            color: "#06b6d4",
          },
          {
            id: "major-storms",
            preferenceKey: "majorStorms",
            titleKey: { ns: "legend", key: "majorStorms" },
            icon: "storm",
            color: "#7c3aed",
          },
        ],
      },
      {
        id: "alerts-geological-risks",
        titleKey: { ns: "legend", key: "groupGeologicalRisks" },
        defaultExpanded: true,
        layers: [
          {
            id: "recent-earthquakes",
            preferenceKey: "recentEarthquakes",
            titleKey: { ns: "legend", key: "recentEarthquakes" },
            icon: "earthquake",
            color: "#f97316",
            filters: [
              {
                id: "earthquake-minor",
                preferenceKey: "earthquakeMinor",
                titleKey: { ns: "legend", key: "earthquakeMinor" },
                color: "#facc15",
              },
              {
                id: "earthquake-moderate",
                preferenceKey: "earthquakeModerate",
                titleKey: { ns: "legend", key: "earthquakeModerate" },
                color: "#fb923c",
              },
              {
                id: "earthquake-strong",
                preferenceKey: "earthquakeStrong",
                titleKey: { ns: "legend", key: "earthquakeStrong" },
                color: "#ef4444",
              },
              {
                id: "earthquake-major",
                preferenceKey: "earthquakeMajor",
                titleKey: { ns: "legend", key: "earthquakeMajor" },
                color: "#991b1b",
              },
            ],
          },
          {
            id: "major-volcanic-activity",
            preferenceKey: "majorVolcanicActivity",
            titleKey: { ns: "legend", key: "majorVolcanicActivity" },
            icon: "volcano",
            color: "#dc2626",
            filters: [
              {
                id: "volcano-unrest",
                preferenceKey: "volcanoUnrest",
                titleKey: { ns: "legend", key: "volcanoUnrest" },
                color: "#eab308",
              },
              {
                id: "volcano-eruption",
                preferenceKey: "volcanoEruption",
                titleKey: { ns: "legend", key: "volcanoEruption" },
                color: "#dc2626",
              },
              {
                id: "volcano-ash",
                preferenceKey: "volcanoAshEmission",
                titleKey: { ns: "legend", key: "volcanoAshEmission" },
                color: "#64748b",
              },
            ],
          },
          {
            id: "landslide-likelihood",
            preferenceKey: "landslideLikelihood",
            titleKey: { ns: "legend", key: "landslideLikelihood" },
            icon: "landslide",
            color: "#f97316",
            filters: [
              {
                id: "landslide-likelihood-moderate",
                preferenceKey: "landslideLikelihoodModerate",
                titleKey: { ns: "legend", key: "landslideLikelihoodModerate" },
                color: "#f97316",
              },
              {
                id: "landslide-likelihood-high",
                preferenceKey: "landslideLikelihoodHigh",
                titleKey: { ns: "legend", key: "landslideLikelihoodHigh" },
                color: "#dc2626",
              },
            ],
          },
          {
            id: "mapped-landslide-events",
            preferenceKey: "mappedLandslideEvents",
            titleKey: { ns: "legend", key: "mappedLandslideEvents" },
            icon: "landslide",
            color: "#b45309",
          },
        ],
      },
      {
        id: "alerts-industrial-technological-incidents",
        titleKey: {
          ns: "legend",
          key: "groupIndustrialTechnologicalIncidents",
        },
        defaultExpanded: true,
        layers: [
          {
            id: "major-industrial-incidents",
            preferenceKey: "majorIndustrialIncidents",
            titleKey: { ns: "legend", key: "majorIndustrialIncidents" },
            icon: "industrial",
            color: "#7c3aed",
            filters: [
              {
                id: "industrial-accidents",
                preferenceKey: "industrialAccidents",
                titleKey: { ns: "legend", key: "industrialAccidents" },
                color: "#7c3aed",
              },
              {
                id: "chemical-accidents",
                preferenceKey: "chemicalAccidents",
                titleKey: { ns: "legend", key: "chemicalAccidents" },
                color: "#0f766e",
              },
              {
                id: "industrial-explosions",
                preferenceKey: "industrialExplosions",
                titleKey: { ns: "legend", key: "industrialExplosions" },
                color: "#dc2626",
              },
              {
                id: "other-technical-accidents",
                preferenceKey: "otherTechnicalAccidents",
                titleKey: { ns: "legend", key: "otherTechnicalAccidents" },
                color: "#64748b",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "roadTraffic",
    titleKey: { ns: "legend", key: "categoryRoadTraffic" },
    icon: "transport",
    groups: [
      {
        id: "road-traffic-layers",
        titleKey: { ns: "legend", key: "groupRoadTraffic" },
        defaultExpanded: true,
        layers: [
          {
            id: "live-road-traffic",
            preferenceKey: "liveTrafficFlow",
            titleKey: { ns: "legend", key: "liveTrafficFlow" },
            icon: "transport",
            color: "#22c55e",
          },
          {
            id: "road-traffic-incidents",
            preferenceKey: "roadTrafficIncidents",
            titleKey: { ns: "legend", key: "roadTrafficIncidents" },
            icon: "alert",
            color: "#f97316",
            filters: [
              { id: "traffic-accidents", preferenceKey: "trafficAccidents", titleKey: { ns: "legend", key: "trafficAccidents" }, color: "#ef4444" },
              { id: "traffic-major-jams", preferenceKey: "trafficMajorJams", titleKey: { ns: "legend", key: "trafficMajorJams" }, color: "#991b1b" },
              { id: "traffic-broken-vehicles", preferenceKey: "trafficBrokenVehicles", titleKey: { ns: "legend", key: "trafficBrokenVehicles" }, color: "#eab308" },
              { id: "traffic-hazards", preferenceKey: "trafficHazards", titleKey: { ns: "legend", key: "trafficHazards" }, color: "#f97316" },
              { id: "traffic-road-weather", preferenceKey: "trafficRoadWeather", titleKey: { ns: "legend", key: "trafficRoadWeather" }, color: "#0ea5e9" },
              { id: "traffic-other-incidents", preferenceKey: "trafficOtherIncidents", titleKey: { ns: "legend", key: "trafficOtherIncidents" }, color: "#64748b" },
            ],
          },
          {
            id: "road-closures-restrictions",
            preferenceKey: "roadClosuresRestrictions",
            titleKey: { ns: "legend", key: "roadClosuresRestrictions" },
            icon: "alert",
            color: "#7f1d1d",
            filters: [
              { id: "traffic-road-closures", preferenceKey: "trafficRoadClosures", titleKey: { ns: "legend", key: "trafficRoadClosures" }, color: "#7f1d1d" },
              { id: "traffic-lane-closures", preferenceKey: "trafficLaneClosures", titleKey: { ns: "legend", key: "trafficLaneClosures" }, color: "#f97316" },
              { id: "traffic-restrictions", preferenceKey: "trafficRestrictions", titleKey: { ns: "legend", key: "trafficRestrictions" }, color: "#a855f7" },
            ],
          },
          {
            id: "roadworks",
            preferenceKey: "roadworks",
            titleKey: { ns: "legend", key: "roadworks" },
            icon: "transport",
            color: "#f59e0b",
            filters: [
              { id: "traffic-active-roadworks", preferenceKey: "trafficActiveRoadworks", titleKey: { ns: "legend", key: "trafficActiveRoadworks" }, color: "#f59e0b" },
              { id: "traffic-planned-roadworks", preferenceKey: "trafficPlannedRoadworks", titleKey: { ns: "legend", key: "trafficPlannedRoadworks" }, color: "#fde047" },
            ],
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
