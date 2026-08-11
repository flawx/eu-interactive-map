import { DATA_LAYER_SOURCE_IDS } from "./sourceIds";

export type DataLayerCategory =
  | "europe"
  | "tourism"
  | "sportCulture"
  | "weather"
  | "education"
  | "science"
  | "energy"
  | "alerts"
  | "economy"
  | "security"
  | "other";

export type DataLayerClusterConfig = {
  enabled: boolean;
  maxZoom: number;
  radius: number;
};

export type DataLayerGeometryType =
  | "Point"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon";

export type DataLayerZOrderGroup =
  | "fills"
  | "project-polygons"
  | "project-lines"
  | "economy-areas"
  | "entity-points"
  | "institutions"
  | "poi"
  | "route-lines"
  | "selected";

export type DataLayerDefinition = {
  id: string;
  category: DataLayerCategory;
  section: string;
  /** Intended `keyof MapLayerPreferences` — kept as string to avoid circular deps. */
  preferenceKey: string;
  nameKey: string;
  descriptionKey?: string;
  icon: string;
  defaultEnabled: boolean;
  cluster: DataLayerClusterConfig | null;
  geometryTypes: DataLayerGeometryType[];
  sourceIds: string[];
  statusColors?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zOrderGroup: DataLayerZOrderGroup;
};

const DEFAULT_POINT_CLUSTER: DataLayerClusterConfig = {
  enabled: true,
  maxZoom: 11,
  radius: 50,
};

const DEFAULT_PROJECT_CLUSTER: DataLayerClusterConfig = {
  enabled: true,
  maxZoom: 10,
  radius: 40,
};

/** Existing layers registered for progressive migration from legend/MapContainer. */
const LEGACY_MIGRATION_LAYER_IDS = new Set<string>([
  "euro-area",
  "eu-outside-euro-area",
  "schengen-outside-eu",
  "eu-candidates",
  "eu-capitals",
  "eu-main-institutions",
]);

export const DATA_LAYER_REGISTRY: readonly DataLayerDefinition[] = [
  // --- Existing membership fills (progressive migration) ---
  {
    id: "euro-area",
    category: "europe",
    section: "membership",
    preferenceKey: "euroArea",
    nameKey: "eurozone",
    icon: "swatch",
    defaultEnabled: true,
    cluster: null,
    geometryTypes: ["Polygon", "MultiPolygon"],
    sourceIds: ["gisco-countries"],
    zOrderGroup: "fills",
  },
  {
    id: "eu-outside-euro-area",
    category: "europe",
    section: "membership",
    preferenceKey: "euOutsideEuroArea",
    nameKey: "nonEurozone",
    icon: "swatch",
    defaultEnabled: true,
    cluster: null,
    geometryTypes: ["Polygon", "MultiPolygon"],
    sourceIds: ["gisco-countries"],
    zOrderGroup: "fills",
  },
  {
    id: "schengen-outside-eu",
    category: "europe",
    section: "membership",
    preferenceKey: "schengenOutsideEu",
    nameKey: "schengenNonEU",
    icon: "swatch",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Polygon", "MultiPolygon"],
    sourceIds: ["gisco-countries"],
    zOrderGroup: "fills",
  },
  {
    id: "eu-candidates",
    category: "europe",
    section: "membership",
    preferenceKey: "euCandidates",
    nameKey: "officialCandidate",
    icon: "swatch",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Polygon", "MultiPolygon"],
    sourceIds: ["gisco-countries"],
    zOrderGroup: "fills",
  },

  // --- Existing capitals / institutions (progressive migration) ---
  {
    id: "eu-capitals",
    category: "europe",
    section: "capitalsInstitutions",
    preferenceKey: "euCapitals",
    nameKey: "euCapitals",
    descriptionKey: "euCapitalsDescription",
    icon: "capital",
    defaultEnabled: true,
    cluster: DEFAULT_POINT_CLUSTER,
    geometryTypes: ["Point"],
    sourceIds: ["gisco-countries"],
    zOrderGroup: "poi",
  },
  {
    id: "eu-main-institutions",
    category: "europe",
    section: "capitalsInstitutions",
    preferenceKey: "euMainInstitutions",
    nameKey: "euMainInstitutions",
    descriptionKey: "euMainInstitutionsDescription",
    icon: "institution",
    defaultEnabled: true,
    cluster: DEFAULT_POINT_CLUSTER,
    geometryTypes: ["Point"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.EU_INSTITUTIONS_DIRECTORY],
    zOrderGroup: "institutions",
  },

  // --- Europe V2: institutions & culture ---
  {
    id: "eu-bodies-agencies",
    category: "europe",
    section: "capitalsInstitutions",
    preferenceKey: "euBodiesAgencies",
    nameKey: "euBodiesAgencies",
    descriptionKey: "euBodiesAgenciesDescription",
    icon: "institution",
    defaultEnabled: false,
    cluster: { enabled: true, maxZoom: 11, radius: 50 },
    geometryTypes: ["Point"],
    sourceIds: [
      DATA_LAYER_SOURCE_IDS.EU_INSTITUTIONS_DIRECTORY,
      DATA_LAYER_SOURCE_IDS.EU_AGENCIES_NETWORK,
    ],
    zOrderGroup: "institutions",
  },
  {
    id: "international-organisations",
    category: "europe",
    section: "capitalsInstitutions",
    preferenceKey: "internationalOrganisations",
    nameKey: "internationalOrganisations",
    descriptionKey: "internationalOrganisationsDescription",
    icon: "institution",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Point"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.EU_INSTITUTIONS_DIRECTORY],
    zOrderGroup: "institutions",
  },
  {
    id: "european-capitals-of-culture",
    category: "europe",
    section: "capitalsInstitutions",
    preferenceKey: "europeanCapitalsOfCulture",
    nameKey: "europeanCapitalsOfCulture",
    descriptionKey: "europeanCapitalsOfCultureDescription",
    icon: "culture",
    defaultEnabled: false,
    cluster: DEFAULT_POINT_CLUSTER,
    geometryTypes: ["Point"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.EUROPEAN_CAPITALS_OF_CULTURE],
    zOrderGroup: "institutions",
  },

  // --- Europe V2: EU-funded projects ---
  {
    id: "eu-projects-transport",
    category: "europe",
    section: "euProjects",
    preferenceKey: "euProjectsTransport",
    nameKey: "euProjectsTransport",
    descriptionKey: "euProjectsTransportDescription",
    icon: "transport",
    defaultEnabled: false,
    cluster: DEFAULT_PROJECT_CLUSTER,
    geometryTypes: ["Point", "LineString", "MultiLineString", "Polygon", "MultiPolygon"],
    sourceIds: [
      DATA_LAYER_SOURCE_IDS.TEN_T,
      DATA_LAYER_SOURCE_IDS.CINEA_CEF,
      DATA_LAYER_SOURCE_IDS.KOHESIO,
    ],
    statusColors: true,
    zOrderGroup: "project-lines",
  },
  {
    id: "eu-projects-sport-culture",
    category: "europe",
    section: "euProjects",
    preferenceKey: "euProjectsSportCulture",
    nameKey: "euProjectsSportCulture",
    descriptionKey: "euProjectsSportCultureDescription",
    icon: "sport",
    defaultEnabled: false,
    cluster: DEFAULT_PROJECT_CLUSTER,
    geometryTypes: ["Point", "Polygon", "MultiPolygon"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.KOHESIO],
    statusColors: true,
    zOrderGroup: "project-polygons",
  },
  {
    id: "eu-projects-protection",
    category: "europe",
    section: "euProjects",
    preferenceKey: "euProjectsProtection",
    nameKey: "euProjectsProtection",
    descriptionKey: "euProjectsProtectionDescription",
    icon: "shield",
    defaultEnabled: false,
    cluster: DEFAULT_PROJECT_CLUSTER,
    geometryTypes: ["Point", "Polygon", "MultiPolygon"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.KOHESIO],
    statusColors: true,
    zOrderGroup: "project-polygons",
  },
  {
    id: "eu-projects-public-social",
    category: "europe",
    section: "euProjects",
    preferenceKey: "euProjectsPublicSocial",
    nameKey: "euProjectsPublicSocial",
    descriptionKey: "euProjectsPublicSocialDescription",
    icon: "community",
    defaultEnabled: false,
    cluster: DEFAULT_PROJECT_CLUSTER,
    geometryTypes: ["Point", "Polygon", "MultiPolygon"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.KOHESIO],
    statusColors: true,
    zOrderGroup: "project-polygons",
  },
  {
    id: "eu-projects-research",
    category: "europe",
    section: "euProjects",
    preferenceKey: "euProjectsResearch",
    nameKey: "euProjectsResearch",
    descriptionKey: "euProjectsResearchDescription",
    icon: "science",
    defaultEnabled: false,
    cluster: DEFAULT_PROJECT_CLUSTER,
    geometryTypes: ["Point", "Polygon", "MultiPolygon"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.CORDIS, DATA_LAYER_SOURCE_IDS.KOHESIO],
    statusColors: true,
    zOrderGroup: "project-polygons",
  },
  {
    id: "eu-projects-environment",
    category: "europe",
    section: "euProjects",
    preferenceKey: "euProjectsEnvironment",
    nameKey: "euProjectsEnvironment",
    descriptionKey: "euProjectsEnvironmentDescription",
    icon: "environment",
    defaultEnabled: false,
    cluster: DEFAULT_PROJECT_CLUSTER,
    geometryTypes: ["Point", "LineString", "Polygon", "MultiPolygon"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.KOHESIO, DATA_LAYER_SOURCE_IDS.CINEA_CEF],
    statusColors: true,
    zOrderGroup: "project-polygons",
  },

  // --- Economy V2 ---
  {
    id: "european-economic-area",
    category: "economy",
    section: "economy",
    preferenceKey: "europeanEconomicArea",
    nameKey: "europeanEconomicArea",
    descriptionKey: "europeanEconomicAreaDescription",
    icon: "economy",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Polygon", "MultiPolygon"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.EFTA_EEA],
    zOrderGroup: "economy-areas",
  },
  {
    id: "major-business-districts",
    category: "economy",
    section: "economy",
    preferenceKey: "majorBusinessDistricts",
    nameKey: "majorBusinessDistricts",
    descriptionKey: "majorBusinessDistrictsDescription",
    icon: "economy",
    defaultEnabled: false,
    cluster: DEFAULT_POINT_CLUSTER,
    geometryTypes: ["Point", "Polygon", "MultiPolygon"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.BUSINESS_DISTRICTS_CURATED],
    zOrderGroup: "entity-points",
  },
  {
    id: "major-freight-ports",
    category: "economy",
    section: "economy",
    preferenceKey: "majorFreightPorts",
    nameKey: "majorFreightPorts",
    descriptionKey: "majorFreightPortsDescription",
    icon: "port",
    defaultEnabled: false,
    cluster: DEFAULT_POINT_CLUSTER,
    geometryTypes: ["Point"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.TEN_T_PORTS],
    zOrderGroup: "entity-points",
  },

  // --- Tourism Travel V2: visitor services (commit 1) ---
  {
    id: "wifi4eu",
    category: "tourism",
    section: "visitorServices",
    preferenceKey: "wifi4eu",
    nameKey: "wifi4eu",
    descriptionKey: "wifi4euDescription",
    icon: "wifi",
    defaultEnabled: false,
    cluster: DEFAULT_POINT_CLUSTER,
    geometryTypes: ["Point"],
    sourceIds: [
      DATA_LAYER_SOURCE_IDS.WIFI4EU,
      DATA_LAYER_SOURCE_IDS.WIFI4EU_MUNICIPAL_OPEN_DATA,
    ],
    zOrderGroup: "entity-points",
  },
  {
    id: "tourist-information-offices",
    category: "tourism",
    section: "visitorServices",
    preferenceKey: "touristInformationOffices",
    nameKey: "touristInformationOffices",
    descriptionKey: "touristInformationOfficesDescription",
    icon: "info",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Point"],
    sourceIds: [
      DATA_LAYER_SOURCE_IDS.ETC,
      DATA_LAYER_SOURCE_IDS.TOURIST_OFFICES_CURATED,
    ],
    zOrderGroup: "entity-points",
  },
  {
    id: "diplomatic-missions",
    category: "tourism",
    section: "visitorServices",
    preferenceKey: "diplomaticMissions",
    nameKey: "diplomaticMissions",
    descriptionKey: "diplomaticMissionsDescription",
    icon: "diplomatic",
    defaultEnabled: false,
    cluster: { enabled: true, maxZoom: 9, radius: 45 },
    geometryTypes: ["Point"],
    sourceIds: [
      DATA_LAYER_SOURCE_IDS.EEAS_DIPLOMATIC,
      DATA_LAYER_SOURCE_IDS.DIPLOMATIC_CURATED,
    ],
    zOrderGroup: "entity-points",
  },
  {
    id: "visitor-safety-assistance",
    category: "tourism",
    section: "visitorServices",
    preferenceKey: "visitorSafetyAssistance",
    nameKey: "visitorSafetyAssistance",
    descriptionKey: "visitorSafetyAssistanceDescription",
    icon: "safety",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Point"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.VISITOR_SAFETY_CURATED],
    zOrderGroup: "entity-points",
  },

  // --- Tourism Travel V2: nature, protected areas & beaches (commit 2) ---
  {
    id: "natura2000",
    category: "tourism",
    section: "natureProtected",
    preferenceKey: "natura2000",
    nameKey: "natura2000",
    descriptionKey: "natura2000Description",
    icon: "leaf",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Point", "Polygon", "MultiPolygon"],
    sourceIds: [
      DATA_LAYER_SOURCE_IDS.EEA_NATURA2000,
      DATA_LAYER_SOURCE_IDS.EUROPEAN_COMMISSION_NATURA2000,
    ],
    zOrderGroup: "fills",
  },
  {
    id: "major-beaches-seaside-resorts",
    category: "tourism",
    section: "beachesSeaside",
    preferenceKey: "majorBeachesSeasideResorts",
    nameKey: "majorBeachesSeasideResorts",
    descriptionKey: "majorBeachesSeasideResortsDescription",
    icon: "beach",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["Point"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.BEACHES_CURATED],
    zOrderGroup: "entity-points",
  },

  // --- Tourism Travel V2: outdoor routes (commit 3) ---
  {
    id: "major-hiking-routes",
    category: "tourism",
    section: "outdoorRoutes",
    preferenceKey: "majorHikingRoutes",
    nameKey: "majorHikingRoutes",
    descriptionKey: "majorHikingRoutesDescription",
    icon: "hiking",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["LineString"],
    sourceIds: [DATA_LAYER_SOURCE_IDS.HIKING_ROUTES_SOURCE],
    zOrderGroup: "route-lines",
  },
  {
    id: "major-cycling-routes",
    category: "tourism",
    section: "outdoorRoutes",
    preferenceKey: "majorCyclingRoutes",
    nameKey: "majorCyclingRoutes",
    descriptionKey: "majorCyclingRoutesDescription",
    icon: "cycling",
    defaultEnabled: false,
    cluster: null,
    geometryTypes: ["LineString"],
    sourceIds: [
      DATA_LAYER_SOURCE_IDS.EUROVELO,
      DATA_LAYER_SOURCE_IDS.OPENSTREETMAP_ROUTES,
    ],
    zOrderGroup: "route-lines",
  },
] as const;

export function getDataLayerById(id: string): DataLayerDefinition | undefined {
  return DATA_LAYER_REGISTRY.find((layer) => layer.id === id);
}

export function getDataLayersByCategory(
  category: DataLayerCategory,
): DataLayerDefinition[] {
  return DATA_LAYER_REGISTRY.filter((layer) => layer.category === category);
}

export function getDataLayersBySection(section: string): DataLayerDefinition[] {
  return DATA_LAYER_REGISTRY.filter((layer) => layer.section === section);
}

export function getNewEuropeV2LayerIds(): string[] {
  return DATA_LAYER_REGISTRY.filter(
    (layer) =>
      !layer.defaultEnabled &&
      (layer.category === "europe" || layer.category === "economy") &&
      !LEGACY_MIGRATION_LAYER_IDS.has(layer.id),
  ).map((layer) => layer.id);
}

export function assertDataLayerRegistryIntegrity(): void {
  const ids = new Set<string>();
  const preferenceKeys = new Set<string>();

  for (const layer of DATA_LAYER_REGISTRY) {
    if (ids.has(layer.id)) {
      throw new Error(`Duplicate data layer id: ${layer.id}`);
    }
    ids.add(layer.id);

    if (preferenceKeys.has(layer.preferenceKey)) {
      throw new Error(
        `Duplicate data layer preferenceKey: ${layer.preferenceKey}`,
      );
    }
    preferenceKeys.add(layer.preferenceKey);

    if (layer.sourceIds.length === 0) {
      throw new Error(`Data layer ${layer.id} must declare sourceIds`);
    }

    if (!layer.zOrderGroup) {
      throw new Error(`Data layer ${layer.id} must declare zOrderGroup`);
    }
  }
}

assertDataLayerRegistryIntegrity();
