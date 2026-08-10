/**
 * European Capitals of Culture — official European Commission designated
 * list (culture.ec.europa.eu). Coordinates are city-centre centroids, not
 * specific venues. Greece uses EL (not GR) per EUIM convention.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type CapitalOfCultureTemporalStatus = "past" | "current" | "upcoming";

export type EuropeanCapitalOfCulture = {
  id: string;
  city: string;
  countryCode: string;
  year: number;
  longitude: number;
  latitude: number;
  officialUrl: string;
  sourceIds: string[];
};

const ECOC_COMMISSION_PAGE =
  "https://culture.ec.europa.eu/policies/culture-in-cities-and-regions/designated-capitals-of-culture";

const CULTURE_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.EUROPEAN_CAPITALS_OF_CULTURE,
];

function slug(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function entry(
  city: string,
  countryCode: string,
  year: number,
  longitude: number,
  latitude: number,
  officialUrl: string = ECOC_COMMISSION_PAGE,
): EuropeanCapitalOfCulture {
  return {
    id: `europe-culture-capital-${year}-${slug(city)}`,
    city,
    countryCode,
    year,
    longitude,
    latitude,
    officialUrl,
    sourceIds: [...CULTURE_SOURCE_IDS],
  };
}

export const EUROPEAN_CAPITALS_OF_CULTURE: readonly EuropeanCapitalOfCulture[] = [
  // 2019
  entry("Matera", "IT", 2019, 16.6114, 40.6664),
  entry("Plovdiv", "BG", 2019, 24.7453, 42.1354),
  // 2020
  entry("Galway", "IE", 2020, -9.0568, 53.2707),
  entry("Rijeka", "HR", 2020, 14.4422, 45.3271),
  // 2022
  entry("Esch-sur-Alzette", "LU", 2022, 5.9808, 49.4958),
  entry("Kaunas", "LT", 2022, 23.9036, 54.8985),
  entry("Novi Sad", "RS", 2022, 19.8335, 45.2671),
  // 2023
  entry("Veszprém", "HU", 2023, 17.9093, 47.0929),
  entry("Timișoara", "RO", 2023, 21.2087, 45.7489),
  entry("Elefsina", "EL", 2023, 23.545, 38.041),
  // 2024
  entry("Bad Ischl", "AT", 2024, 13.6183, 47.7135),
  entry("Bodø", "NO", 2024, 14.4049, 67.2804),
  entry("Tartu", "EE", 2024, 26.729, 58.3776),
  // 2025
  entry("Chemnitz", "DE", 2025, 12.9214, 50.8278),
  entry("Nova Gorica", "SI", 2025, 13.6506, 45.9564),
  // 2026
  entry("Oulu", "FI", 2026, 25.4651, 65.0121),
  entry("Trenčín", "SK", 2026, 18.0446, 48.8944),
  // 2027
  entry("Liepāja", "LV", 2027, 21.0111, 56.5108),
  entry("Évora", "PT", 2027, -7.9036, 38.5714),
  // 2028
  entry("České Budějovice", "CZ", 2028, 14.4747, 49.0068),
  entry("Bourges", "FR", 2028, 2.3966, 47.081),
  entry("Skopje", "MK", 2028, 21.4254, 41.9981),
  // 2029
  entry("Lublin", "PL", 2029, 22.5684, 51.2465),
  entry("Kiruna", "SE", 2029, 20.2253, 67.8558),
  // 2030
  entry("Leuven", "BE", 2030, 4.7005, 50.8798),
  entry("Larnaka", "CY", 2030, 33.6333, 34.9167),
  entry("Nikšić", "ME", 2030, 18.9481, 42.7731),
];

export function getTemporalStatus(
  year: number,
  now: Date = new Date(),
): CapitalOfCultureTemporalStatus {
  const currentYear = now.getFullYear();
  if (year < currentYear) return "past";
  if (year > currentYear) return "upcoming";
  return "current";
}

export const CAPITAL_OF_CULTURE_STATUS_COLORS: Record<
  CapitalOfCultureTemporalStatus,
  string
> = {
  current: "#c026d3",
  upcoming: "#a855f7",
  past: "#7c3aed",
};

export const CAPITAL_OF_CULTURE_STATUS_OPACITY: Record<
  CapitalOfCultureTemporalStatus,
  number
> = {
  current: 1,
  upcoming: 0.85,
  past: 0.55,
};

export function getEuropeanCapitalOfCultureById(
  id: string,
): EuropeanCapitalOfCulture | undefined {
  return EUROPEAN_CAPITALS_OF_CULTURE.find((capital) => capital.id === id);
}

function toEntity(
  capital: EuropeanCapitalOfCulture,
  now: Date,
): EUIMMapEntity {
  const temporalStatus = getTemporalStatus(capital.year, now);
  return {
    id: capital.id,
    category: "europe",
    subcategory: "european-capital-of-culture",
    layerId: "european-capitals-of-culture",
    name: capital.city,
    countryCode: capital.countryCode,
    geometry: {
      type: "Point",
      coordinates: [capital.longitude, capital.latitude],
    },
    icon: "sparkles",
    color: CAPITAL_OF_CULTURE_STATUS_COLORS[temporalStatus],
    validFrom: `${capital.year}-01-01`,
    validUntil: `${capital.year}-12-31`,
    sourceIds: capital.sourceIds,
    properties: {
      year: capital.year,
      temporalStatus,
      opacity: CAPITAL_OF_CULTURE_STATUS_OPACITY[temporalStatus],
      officialUrl: capital.officialUrl,
    },
  };
}

export function toFeatureCollection(now: Date = new Date()): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    EUROPEAN_CAPITALS_OF_CULTURE.filter((capital) =>
      isCountryInEUIMScope(capital.countryCode),
    ).map((capital) => toEntity(capital, now)),
  );
}

export function getById(id: string): EuropeanCapitalOfCulture | undefined {
  return getEuropeanCapitalOfCultureById(id);
}

export const ALL: readonly EuropeanCapitalOfCulture[] = EUROPEAN_CAPITALS_OF_CULTURE;

export type EuropeanCapitalsOfCultureAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  past: number;
  current: number;
  upcoming: number;
};

export function auditEuropeanCapitalsOfCulture(
  now: Date = new Date(),
): EuropeanCapitalsOfCultureAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  let past = 0;
  let current = 0;
  let upcoming = 0;

  for (const capital of EUROPEAN_CAPITALS_OF_CULTURE) {
    if (ids.has(capital.id)) duplicateIds.push(capital.id);
    ids.add(capital.id);

    if (
      !Number.isFinite(capital.longitude) ||
      !Number.isFinite(capital.latitude)
    ) {
      missingCoordinates.push(capital.id);
    }

    if (!isCountryInEUIMScope(capital.countryCode)) {
      outsideScope.push(capital.id);
    }

    const status = getTemporalStatus(capital.year, now);
    if (status === "past") past += 1;
    else if (status === "current") current += 1;
    else upcoming += 1;
  }

  return {
    total: EUROPEAN_CAPITALS_OF_CULTURE.length,
    inScope: EUROPEAN_CAPITALS_OF_CULTURE.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    past,
    current,
    upcoming,
  };
}
