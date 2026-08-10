import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";
import { EU_PROJECTS_FIXTURE } from "./fixtureProjects";
import {
  EU_PROJECT_CATEGORY_ICONS,
  EU_PROJECT_CATEGORY_LAYER_IDS,
  type EuProject,
} from "./types";

/** Only fixture projects located in EUIM operational scope. */
export const EU_PROJECTS_IN_SCOPE: readonly EuProject[] =
  EU_PROJECTS_FIXTURE.filter((project) =>
    isCountryInEUIMScope(project.countryCode),
  );

export function getEuProjectById(id: string): EuProject | undefined {
  return EU_PROJECTS_FIXTURE.find((project) => project.id === id);
}

export function euProjectToEntity(project: EuProject): EUIMMapEntity {
  return {
    id: project.id,
    category: "europe",
    subcategory: project.category,
    layerId: EU_PROJECT_CATEGORY_LAYER_IDS[project.category],
    name: project.name,
    countryCode: project.countryCode,
    geometry: {
      type: "Point",
      coordinates: [project.longitude, project.latitude],
    },
    icon: EU_PROJECT_CATEGORY_ICONS[project.category],
    status: project.status,
    sourceIds: project.sourceIds,
    properties: {
      category: project.category,
      countryCodes: project.countryCodes ?? null,
      budgetEUR: project.budgetEUR,
      fundingProgram: project.fundingProgram,
      description: project.description,
      officialUrl: project.officialUrl,
      isMajor: project.isMajor,
    },
  };
}

export function toFeatureCollection(
  projects: readonly EuProject[] = EU_PROJECTS_IN_SCOPE,
): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(projects.map(euProjectToEntity));
}

export type EuProjectsAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  invalidBudgets: string[];
  byCategory: Record<string, number>;
};

export function auditEuProjects(): EuProjectsAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const invalidBudgets: string[] = [];
  const byCategory: Record<string, number> = {};

  for (const project of EU_PROJECTS_FIXTURE) {
    if (ids.has(project.id)) duplicateIds.push(project.id);
    ids.add(project.id);

    if (
      !Number.isFinite(project.longitude) ||
      !Number.isFinite(project.latitude)
    ) {
      missingCoordinates.push(project.id);
    }

    if (!isCountryInEUIMScope(project.countryCode)) {
      outsideScope.push(project.id);
    }

    if (
      project.budgetEUR !== null &&
      (!Number.isFinite(project.budgetEUR) || project.budgetEUR < 0)
    ) {
      invalidBudgets.push(project.id);
    }

    byCategory[project.category] = (byCategory[project.category] ?? 0) + 1;
  }

  return {
    total: EU_PROJECTS_FIXTURE.length,
    inScope: EU_PROJECTS_FIXTURE.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    invalidBudgets,
    byCategory,
  };
}
