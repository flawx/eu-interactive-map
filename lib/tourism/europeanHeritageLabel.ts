import rawData from "@/data/european-heritage-label-sites.json";

export type EuropeanHeritageLabelCoordinateConfidence = "official" | "verified";

export type EuropeanHeritageLabelEntityIdentityType =
  | "single-entity"
  | "serial-site"
  | "transnational-network"
  | "official-only";

export type EuropeanHeritageLabelLocation = {
  id: string;
  siteId: string;
  name: string;
  cityOrRegion: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  coordinateSourceUrl: string;
  coordinateConfidence: EuropeanHeritageLabelCoordinateConfidence;
  representativePoint: boolean;
  wikidataId: string | null;
  officialUrl: string | null;
};

export type EuropeanHeritageLabelSite = {
  id: string;
  canonicalName: string;
  awardYear: number;
  countryCodes: string[];
  officialCommissionUrl: string;
  officialWebsite: string | null;
  wikidataId: string | null;
  entityIdentityType: EuropeanHeritageLabelEntityIdentityType;
  officialSummary: string | null;
  transnational: boolean;
  serial: boolean;
  locations: EuropeanHeritageLabelLocation[];
  importedAt: string;
};

export type EuropeanHeritageLabelUnresolvedEntry = {
  name: string;
  year: number;
  href: string | null;
  reason: string;
};

export type EuropeanHeritageLabelDataset = {
  source: {
    url: string;
    retrievedAt: string;
    officialExtractedCount: number;
  };
  sites: EuropeanHeritageLabelSite[];
  unresolved: EuropeanHeritageLabelUnresolvedEntry[];
};

/**
 * European Heritage Label is an EU-only initiative. Only EU27 member-state
 * codes are ever allowed — Greece = EL (not GR), no GB/UK, no EFTA (NO/CH/IS/LI).
 */
export const EUROPEAN_HERITAGE_LABEL_EU27_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "EL",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
] as const;

const EU27_SET = new Set<string>(EUROPEAN_HERITAGE_LABEL_EU27_COUNTRY_CODES);

export function isEuropeanHeritageLabelCountry(code: string): boolean {
  return EU27_SET.has(code);
}

/** Official years in which the Commission has designated sites so far. */
export const EUROPEAN_HERITAGE_LABEL_AWARD_YEARS = [
  2013, 2014, 2015, 2017, 2019, 2021, 2023, 2025,
] as const;

const dataset = rawData as EuropeanHeritageLabelDataset;

export const EUROPEAN_HERITAGE_LABEL_SITES: readonly EuropeanHeritageLabelSite[] =
  dataset.sites;

export const EUROPEAN_HERITAGE_LABEL_UNRESOLVED: readonly EuropeanHeritageLabelUnresolvedEntry[] =
  dataset.unresolved;

export const EUROPEAN_HERITAGE_LABEL_DATASET_META = dataset.source;

export function getEuropeanHeritageLabelSiteById(
  siteId: string,
): EuropeanHeritageLabelSite | undefined {
  return EUROPEAN_HERITAGE_LABEL_SITES.find((site) => site.id === siteId);
}

export function getEuropeanHeritageLabelLocationById(
  locationId: string,
): EuropeanHeritageLabelLocation | undefined {
  for (const site of EUROPEAN_HERITAGE_LABEL_SITES) {
    const found = site.locations.find((location) => location.id === locationId);
    if (found) return found;
  }
  return undefined;
}

/** Flattened, map-ready locations — only official/verified coordinates, never approximate. */
export function getDisplayableEhlLocations(
  sites: readonly EuropeanHeritageLabelSite[] = EUROPEAN_HERITAGE_LABEL_SITES,
): EuropeanHeritageLabelLocation[] {
  const out: EuropeanHeritageLabelLocation[] = [];
  for (const site of sites) {
    for (const location of site.locations) {
      if (
        location.coordinateConfidence === "official" ||
        location.coordinateConfidence === "verified"
      ) {
        out.push(location);
      }
    }
  }
  return out;
}

export type EuropeanHeritageLabelValidationReport = {
  errors: string[];
  logicalSites: number;
  displayableLocations: number;
  sitesWithoutCoordinates: number;
  transnationalCount: number;
  serialCount: number;
  byYear: Record<number, number>;
  byCountry: Record<string, number>;
};

/**
 * Slightly wider than the mainland map bounds so EU outermost regions such
 * as the Azores (Portugal) — genuine EU territory — are not rejected.
 */
const EUROPE_MAP_BOUNDS = {
  minLongitude: -32,
  maxLongitude: 45,
  minLatitude: 30,
  maxLatitude: 72,
} as const;

function isPointInEurope(longitude: number, latitude: number): boolean {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= EUROPE_MAP_BOUNDS.minLongitude &&
    longitude <= EUROPE_MAP_BOUNDS.maxLongitude &&
    latitude >= EUROPE_MAP_BOUNDS.minLatitude &&
    latitude <= EUROPE_MAP_BOUNDS.maxLatitude
  );
}

export function validateEuropeanHeritageLabelSites(
  sites: readonly EuropeanHeritageLabelSite[] = EUROPEAN_HERITAGE_LABEL_SITES,
): EuropeanHeritageLabelValidationReport {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenLocationIds = new Set<string>();
  const byYear: Record<number, number> = {};
  const byCountry: Record<string, number> = {};
  let sitesWithoutCoordinates = 0;
  let transnationalCount = 0;
  let serialCount = 0;

  for (const site of sites) {
    if (!site.id || seenIds.has(site.id)) {
      errors.push(`Duplicate or missing id: ${site.id}`);
    }
    seenIds.add(site.id);

    if (!site.canonicalName?.trim()) {
      errors.push(`Missing canonicalName for ${site.id}`);
    }

    if (!EUROPEAN_HERITAGE_LABEL_AWARD_YEARS.includes(site.awardYear as never)) {
      errors.push(`Implausible awardYear for ${site.id}: ${site.awardYear}`);
    }
    byYear[site.awardYear] = (byYear[site.awardYear] ?? 0) + 1;

    if (!site.countryCodes.length) {
      errors.push(`No country codes for ${site.id}`);
    }
    for (const code of site.countryCodes) {
      if (!isEuropeanHeritageLabelCountry(code)) {
        errors.push(`Non-EU27 country code on ${site.id}: ${code}`);
      }
      byCountry[code] = (byCountry[code] ?? 0) + 1;
    }

    if (!site.officialCommissionUrl?.startsWith("https://culture.ec.europa.eu")) {
      errors.push(`Invalid officialCommissionUrl for ${site.id}`);
    }

    if (
      site.entityIdentityType === "single-entity" &&
      (!site.wikidataId || site.locations.length !== 1)
    ) {
      errors.push(`Invalid single-entity identity for ${site.id}`);
    }
    if (
      (site.entityIdentityType === "serial-site" ||
        site.entityIdentityType === "transnational-network" ||
        site.entityIdentityType === "official-only") &&
      site.wikidataId !== null
    ) {
      errors.push(`Logical QID must be null for ${site.id}`);
    }
    if (
      site.entityIdentityType === "transnational-network" &&
      !site.transnational
    ) {
      errors.push(`Invalid transnational identity type for ${site.id}`);
    }
    if (site.entityIdentityType === "serial-site" && !site.serial) {
      errors.push(`Invalid serial identity type for ${site.id}`);
    }
    const expectedTransnational = site.countryCodes.length > 1;
    if (site.transnational !== expectedTransnational) {
      errors.push(
        `transnational flag mismatch for ${site.id} (expected ${expectedTransnational})`,
      );
    }
    if (site.transnational) transnationalCount += 1;

    const expectedSerial = site.locations.length > 1;
    if (site.serial !== expectedSerial) {
      errors.push(`serial flag mismatch for ${site.id} (expected ${expectedSerial})`);
    }
    if (site.serial) serialCount += 1;

    if (site.locations.length === 0) {
      sitesWithoutCoordinates += 1;
    }

    for (const location of site.locations) {
      if (!location.id || seenLocationIds.has(location.id)) {
        errors.push(`Duplicate or missing location id: ${location.id}`);
      }
      seenLocationIds.add(location.id);

      if (location.siteId !== site.id) {
        errors.push(`Location ${location.id} has mismatched siteId`);
      }

      if (!location.name?.trim()) {
        errors.push(`Missing location name for ${location.id}`);
      }

      if (!isEuropeanHeritageLabelCountry(location.countryCode)) {
        errors.push(
          `Non-EU27 location country code: ${location.id} (${location.countryCode})`,
        );
      }

      if (!isPointInEurope(location.longitude, location.latitude)) {
        errors.push(`Location outside European map bounds: ${location.id}`);
      }

      if (
        location.coordinateConfidence !== "official" &&
        location.coordinateConfidence !== "verified"
      ) {
        errors.push(`Invalid coordinateConfidence for ${location.id}`);
      }

      if (!location.coordinateSourceUrl?.startsWith("https://")) {
        errors.push(`Invalid coordinateSourceUrl for ${location.id}`);
      }
      if (
        location.wikidataId !== null &&
        !/^Q[1-9]\d*$/.test(location.wikidataId)
      ) {
        errors.push(`Invalid location wikidataId for ${location.id}`);
      }
      if (
        location.officialUrl !== null &&
        !location.officialUrl.startsWith("https://")
      ) {
        errors.push(`Invalid location officialUrl for ${location.id}`);
      }
    }
  }

  return {
    errors,
    logicalSites: sites.length,
    displayableLocations: getDisplayableEhlLocations(sites).length,
    sitesWithoutCoordinates,
    transnationalCount,
    serialCount,
    byYear,
    byCountry,
  };
}

if (process.env.NODE_ENV !== "production") {
  const report = validateEuropeanHeritageLabelSites();
  if (report.errors.length > 0) {
    console.error("[europeanHeritageLabel]", report.errors.join("; "));
  }
}
