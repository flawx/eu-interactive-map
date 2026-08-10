import { auditEuBodiesAgencies } from "../lib/europe/euBodiesAgencies";
import { auditEuropeanCapitalsOfCulture } from "../lib/europe/europeanCapitalsOfCulture";
import { auditInternationalOrganisations } from "../lib/europe/internationalOrganisations";
import {
  EU_INSTITUTIONS,
  EU_INSTITUTION_SITES,
  validateEuInstitutions,
} from "../lib/europe/euInstitutions";
import { DATA_SOURCES_REGISTRY } from "../lib/map/dataSourcesRegistry";
import { DATA_LAYER_SOURCE_IDS } from "../lib/map/dataLayers/sourceIds";
import { isCountryInEUIMScope } from "../lib/geography/euimCoverage";
import { auditEuropeanEconomicArea } from "../lib/europe/europeanEconomicArea";
import { auditMajorBusinessDistricts } from "../lib/europe/majorBusinessDistricts";
import { auditMajorFreightPorts } from "../lib/europe/majorFreightPorts";
import { auditEuProjects } from "../lib/europe/euProjects/entities";

function main() {
  const institutionErrors = validateEuInstitutions();
  const agencies = auditEuBodiesAgencies();
  const orgs = auditInternationalOrganisations();
  const culture = auditEuropeanCapitalsOfCulture();
  const eea = auditEuropeanEconomicArea();
  const districts = auditMajorBusinessDistricts();
  const ports = auditMajorFreightPorts();
  const projects = auditEuProjects();

  const knownSourceIds = new Set(DATA_SOURCES_REGISTRY.map((s) => s.id));
  const invalidSources: string[] = [];
  for (const id of Object.values(DATA_LAYER_SOURCE_IDS)) {
    if (!knownSourceIds.has(id)) invalidSources.push(id);
  }

  const outsideScopeSites = EU_INSTITUTION_SITES.filter(
    (site) => !isCountryInEUIMScope(site.countryCode),
  ).map((site) => site.id);

  const missingCoords = EU_INSTITUTION_SITES.filter(
    (site) =>
      !Number.isFinite(site.longitude) || !Number.isFinite(site.latitude),
  ).map((site) => site.id);

  const allIds = [
    ...EU_INSTITUTIONS.map((i) => i.id),
    ...EU_INSTITUTION_SITES.map((s) => s.id),
    ...agencies.duplicateIds,
  ];
  void allIds;

  console.log("[data-layers-v2 audit-europe]");
  console.log(
    `entities=${EU_INSTITUTIONS.length + agencies.total + orgs.total + culture.total + districts.total + ports.total + projects.total}`,
  );
  console.log(
    `missingCoordinates=${[...missingCoords, ...agencies.missingCoordinates, ...orgs.missingCoordinates, ...culture.missingCoordinates, ...districts.missingCoordinates, ...ports.missingCoordinates, ...projects.missingCoordinates].join(",") || "none"}`,
  );
  console.log(
    `outsideScope=${[...outsideScopeSites, ...agencies.outsideScope, ...orgs.outsideScope, ...culture.outsideScope, ...districts.outsideScope, ...ports.outsideScope, ...projects.outsideScope].join(",") || "none"}`,
  );
  console.log(
    `duplicateIds=${[...agencies.duplicateIds, ...orgs.duplicateIds, ...culture.duplicateIds, ...districts.duplicateIds, ...ports.duplicateIds, ...projects.duplicateIds].join(",") || "none"}`,
  );
  console.log(
    `invalidCountryCodes=${[...outsideScopeSites, ...agencies.outsideScope, ...orgs.outsideScope, ...culture.outsideScope].join(",") || "none"}`,
  );
  console.log(`invalidSources=${invalidSources.join(",") || "none"}`);
  console.log(
    `institutionValidation=${institutionErrors.length === 0 ? "ok" : institutionErrors.join(" | ")}`,
  );
  console.log(
    `cultureTemporal=past:${culture.past},current:${culture.current},upcoming:${culture.upcoming}`,
  );
  console.log(
    `eea=members:${eea.memberCount},includesIS:${eea.includesIS},includesNO:${eea.includesNO},includesLI:${eea.includesLI},excludesCH:${eea.excludesCH},excludesUK:${eea.excludesUK},chStillInEUIMScope:${eea.chStillInEUIMScope}`,
  );
  console.log(
    `businessDistricts=total:${districts.total},inScope:${districts.inScope},ukEntries:${districts.ukEntries.length}`,
  );
  console.log(
    `freightPorts=total:${ports.total},inScope:${ports.inScope},ukEntries:${ports.ukEntries.length}`,
  );
  console.log(
    `euProjects=total:${projects.total},inScope:${projects.inScope},invalidBudgets:${projects.invalidBudgets.length},byCategory:${JSON.stringify(projects.byCategory)}`,
  );
}

main();
