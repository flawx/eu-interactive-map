import rawSites from "@/data/unesco-world-heritage-europe.json";
import {
  isAllowedUnescoMapCountry,
  isForbiddenUnescoCountry,
  UNESCO_EUROPE_MAP_BOUNDS,
  UNESCO_MAP_COUNTRY_CODES,
} from "@/lib/tourism/unescoEuropeCoverage";

export type UnescoSiteCategory = "cultural" | "natural" | "mixed";

export type UnescoDangerStatus = "not-in-danger" | "in-danger";

export type UnescoWorldHeritageSite = {
  id: string;
  unescoId: number;
  canonicalName: string;
  countryCodes: string[];
  stateParties: string[];
  category: UnescoSiteCategory;
  latitude: number;
  longitude: number;
  inscriptionYear: number;
  extensionYears: number[];
  criteria: string[];
  areaHectares: number | null;
  bufferZoneHectares: number | null;
  dangerStatus: UnescoDangerStatus;
  dangerYears: number[];
  transboundary: boolean;
  serial: boolean;
  officialUrl: string;
  region: string | null;
  location: string | null;
  shortDescription: string | null;
  justification: string | null;
  importedAt: string;
  /** ISO / GISCO country code containing the representative point. */
  resolvedCountryCode?: string;
  /** True when the point lies in the European map coverage. */
  resolvedEuropeanTerritory?: boolean;
};

export type UnescoWorldHeritageDataset = {
  source: {
    format: "xml";
    url: string;
    retrievedAt: string;
    rowsInSource: number;
  };
  sites: UnescoWorldHeritageSite[];
};

/** @deprecated Prefer UNESCO_EUROPE_MAP_BOUNDS — kept for call-site compatibility. */
export const UNESCO_EUROPE_BBOX = UNESCO_EUROPE_MAP_BOUNDS;

export { UNESCO_MAP_COUNTRY_CODES };

const dataset = rawSites as UnescoWorldHeritageDataset;

export const UNESCO_WORLD_HERITAGE_SITES: readonly UnescoWorldHeritageSite[] =
  dataset.sites.filter(
    (site) =>
      site.resolvedCountryCode &&
      isAllowedUnescoMapCountry(site.resolvedCountryCode),
  );

export const UNESCO_DATASET_META = dataset.source;

export function getUnescoSiteById(
  siteId: string,
): UnescoWorldHeritageSite | undefined {
  return UNESCO_WORLD_HERITAGE_SITES.find((site) => site.id === siteId);
}

export function getUnescoSiteByUnescoId(
  unescoId: number,
): UnescoWorldHeritageSite | undefined {
  return UNESCO_WORLD_HERITAGE_SITES.find((site) => site.unescoId === unescoId);
}

export function isPointInUnescoEuropeCoverage(
  longitude: number,
  latitude: number,
): boolean {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= UNESCO_EUROPE_MAP_BOUNDS.minLongitude &&
    longitude <= UNESCO_EUROPE_MAP_BOUNDS.maxLongitude &&
    latitude >= UNESCO_EUROPE_MAP_BOUNDS.minLatitude &&
    latitude <= UNESCO_EUROPE_MAP_BOUNDS.maxLatitude
  );
}

export function summarizeUnescoSites(
  sites: readonly UnescoWorldHeritageSite[] = UNESCO_WORLD_HERITAGE_SITES,
) {
  return {
    total: sites.length,
    cultural: sites.filter((site) => site.category === "cultural").length,
    natural: sites.filter((site) => site.category === "natural").length,
    mixed: sites.filter((site) => site.category === "mixed").length,
    inDanger: sites.filter((site) => site.dangerStatus === "in-danger").length,
    transboundary: sites.filter((site) => site.transboundary).length,
    serial: sites.filter((site) => site.serial).length,
  };
}

export function validateUnescoWorldHeritageSites(
  sites: readonly UnescoWorldHeritageSite[] = UNESCO_WORLD_HERITAGE_SITES,
): string[] {
  const errors: string[] = [];
  const ids = new Set<number>();
  const coordKeys = new Set<string>();

  for (const site of sites) {
    if (!Number.isInteger(site.unescoId) || site.unescoId <= 0) {
      errors.push(`Invalid unescoId on ${site.id}`);
    }
    if (ids.has(site.unescoId)) {
      errors.push(`Duplicate unescoId: ${site.unescoId}`);
    }
    ids.add(site.unescoId);

    if (!site.canonicalName?.trim()) {
      errors.push(`Missing name for ${site.id}`);
    }

    if (
      !isPointInUnescoEuropeCoverage(site.longitude, site.latitude)
    ) {
      errors.push(`Site outside European coverage: ${site.id}`);
    }

    if (!site.resolvedCountryCode) {
      errors.push(`Missing resolvedCountryCode for ${site.id}`);
    } else if (!isAllowedUnescoMapCountry(site.resolvedCountryCode)) {
      errors.push(
        `resolvedCountryCode not in map perimeter: ${site.id} (${site.resolvedCountryCode})`,
      );
    } else if (isForbiddenUnescoCountry(site.resolvedCountryCode)) {
      errors.push(
        `Forbidden resolvedCountryCode: ${site.id} (${site.resolvedCountryCode})`,
      );
    }

    if (site.resolvedEuropeanTerritory !== true) {
      errors.push(`resolvedEuropeanTerritory not true for ${site.id}`);
    }

    if (
      site.category !== "cultural" &&
      site.category !== "natural" &&
      site.category !== "mixed"
    ) {
      errors.push(`Invalid category for ${site.id}`);
    }

    if (
      !Number.isInteger(site.inscriptionYear) ||
      site.inscriptionYear < 1972 ||
      site.inscriptionYear > new Date().getFullYear() + 1
    ) {
      errors.push(`Implausible inscription year for ${site.id}`);
    }

    if (
      !site.officialUrl.startsWith("https://whc.unesco.org/")
    ) {
      errors.push(`Invalid official URL for ${site.id}`);
    }

    if (!site.countryCodes.length) {
      errors.push(`No country codes for ${site.id}`);
    }

    const coordKey = `${site.unescoId}:${site.longitude.toFixed(5)},${site.latitude.toFixed(5)}`;
    if (coordKeys.has(coordKey)) {
      errors.push(`Exact duplicate coordinates for ${site.id}`);
    }
    coordKeys.add(coordKey);
  }

  return errors;
}

if (process.env.NODE_ENV !== "production") {
  const validationErrors = validateUnescoWorldHeritageSites();
  if (validationErrors.length > 0) {
    console.error("[unescoWorldHeritage]", validationErrors.join("; "));
  }
}
