import type { EntityStatus } from "@/lib/map/dataLayers/entityStatus";

/** Maps 1:1 to the six `eu-projects-*` layers in `dataLayerRegistry.ts`. */
export type EuProjectCategory =
  | "transport"
  | "sportCulture"
  | "protection"
  | "publicSocial"
  | "research"
  | "environment";

export const EU_PROJECT_CATEGORIES: readonly EuProjectCategory[] = [
  "transport",
  "sportCulture",
  "protection",
  "publicSocial",
  "research",
  "environment",
];

/** `layerId` used on the map entity / DATA_LAYER_REGISTRY id for the category. */
export const EU_PROJECT_CATEGORY_LAYER_IDS: Record<EuProjectCategory, string> = {
  transport: "eu-projects-transport",
  sportCulture: "eu-projects-sport-culture",
  protection: "eu-projects-protection",
  publicSocial: "eu-projects-public-social",
  research: "eu-projects-research",
  environment: "eu-projects-environment",
};

/** `preferenceKey` on `MapLayerPreferences` for the category. */
export const EU_PROJECT_CATEGORY_PREFERENCE_KEYS: Record<
  EuProjectCategory,
  string
> = {
  transport: "euProjectsTransport",
  sportCulture: "euProjectsSportCulture",
  protection: "euProjectsProtection",
  publicSocial: "euProjectsPublicSocial",
  research: "euProjectsResearch",
  environment: "euProjectsEnvironment",
};

export const EU_PROJECT_CATEGORY_ICONS: Record<EuProjectCategory, string> = {
  transport: "transport",
  sportCulture: "sport",
  protection: "shield",
  publicSocial: "community",
  research: "science",
  environment: "environment",
};

/**
 * A single curated EU-funded / EU-associated project.
 *
 * `geometry` is Point-only for the curated fixture set — LineString/Polygon
 * corridor geometries are intentionally NOT invented without a verified
 * source geometry (see EuProjectCategory doc in fixtureProjects.ts header).
 */
export type EuProject = {
  id: string;
  name: string;
  category: EuProjectCategory;
  countryCode: string;
  /** Additional countries for multinational projects (informational only). */
  countryCodes?: readonly string[];
  longitude: number;
  latitude: number;
  status: EntityStatus;
  /** EUR, whole-euro amount. `null` when the budget is not confidently known. */
  budgetEUR: number | null;
  /** e.g. "TEN-T", "Horizon Europe", "LIFE", "Cohesion Fund". `null` if unknown. */
  fundingProgram: string | null;
  description: string;
  officialUrl: string | null;
  sourceIds: string[];
  /** Used by `majorOnly` viewport-loader / API filtering at low zoom levels. */
  isMajor: boolean;
};

export type EuProjectFilters = {
  bbox?: [number, number, number, number];
  category?: EuProjectCategory | EuProjectCategory[];
  status?: EntityStatus | EntityStatus[];
  minBudget?: number;
  majorOnly?: boolean;
  limit?: number;
  cursor?: number;
};

export type EuProjectQueryMeta = {
  fetchedAt: string;
  totalMatched: number;
  nextCursor: number | null;
};
