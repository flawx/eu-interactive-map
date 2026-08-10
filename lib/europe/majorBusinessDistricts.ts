/**
 * Major European business districts — curated catalogue.
 *
 * selectionCriteria: this is a CURATED list of well-known central business
 * districts / financial districts in EUIM-scope cities, chosen for name
 * recognition and general public knowledge (skyline, headquarters density,
 * financial-centre role). It is NOT an official EU ranking, NOT exhaustive,
 * and does not imply any economic size ordering between entries. UK
 * districts (Canary Wharf, City of London) are intentionally excluded —
 * out of EUIM scope. Coordinates are approximate district centroids
 * (Point geometry only — no polygon boundaries are invented).
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type MajorBusinessDistrict = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  description: string;
  officialUrl: string | null;
  sourceIds: string[];
};

const DISTRICT_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.BUSINESS_DISTRICTS_CURATED,
];

export const MAJOR_BUSINESS_DISTRICTS: readonly MajorBusinessDistrict[] = [
  {
    id: "business-district-la-defense",
    name: "La Défense",
    city: "Paris / Nanterre",
    countryCode: "FR",
    longitude: 2.238,
    latitude: 48.892,
    description:
      "Purpose-built high-rise business district west of Paris, one of the largest in Europe.",
    officialUrl: "https://www.ladefense.fr/",
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-frankfurt-bankenviertel",
    name: "Bankenviertel (Frankfurt banking district)",
    city: "Frankfurt am Main",
    countryCode: "DE",
    longitude: 8.672,
    latitude: 50.11,
    description:
      "Financial district hosting the European Central Bank and Germany's major banking headquarters.",
    officialUrl: "https://www.frankfurt.de/",
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-zuidas",
    name: "Zuidas",
    city: "Amsterdam",
    countryCode: "NL",
    longitude: 4.868,
    latitude: 52.338,
    description:
      "Amsterdam's financial and business district, home to law firms, banks and multinational offices.",
    officialUrl: "https://www.amsterdam.nl/zuidas/",
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-kirchberg",
    name: "Kirchberg",
    city: "Luxembourg City",
    countryCode: "LU",
    longitude: 6.145,
    latitude: 49.627,
    description:
      "Business and EU institutions plateau hosting banks, investment funds and European institutions.",
    officialUrl: null,
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-porta-nuova",
    name: "Porta Nuova",
    city: "Milan",
    countryCode: "IT",
    longitude: 9.19,
    latitude: 45.485,
    description:
      "Redeveloped high-rise district in Milan hosting corporate headquarters and financial firms.",
    officialUrl: null,
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-levent-maslak",
    name: "Levent / Maslak",
    city: "Istanbul",
    countryCode: "TR",
    longitude: 28.994,
    latitude: 41.081,
    description:
      "Istanbul's principal high-rise financial and corporate district (Türkiye is an EU candidate country).",
    officialUrl: null,
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-brussels-quartier-nord",
    name: "Quartier Nord / Noordwijk",
    city: "Brussels",
    countryCode: "BE",
    longitude: 4.357,
    latitude: 50.86,
    description:
      "Brussels' main office-tower business district, distinct from the institutional European Quarter.",
    officialUrl: null,
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-potsdamer-platz",
    name: "Potsdamer Platz",
    city: "Berlin",
    countryCode: "DE",
    longitude: 13.376,
    latitude: 52.509,
    description:
      "Redeveloped commercial and office district at the heart of reunified Berlin.",
    officialUrl: null,
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-warsaw-wola",
    name: "Wola business district",
    city: "Warsaw",
    countryCode: "PL",
    longitude: 20.984,
    latitude: 52.23,
    description:
      "Warsaw's fastest-growing office and high-rise business district west of the historic centre.",
    officialUrl: null,
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-barcelona-22at",
    name: "22@ Barcelona",
    city: "Barcelona",
    countryCode: "ES",
    longitude: 2.189,
    latitude: 41.404,
    description:
      "Former industrial Poblenou district redeveloped into an innovation and business hub.",
    officialUrl: "https://www.22barcelona.com/",
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
  {
    id: "business-district-vienna-donau-city",
    name: "Donau City",
    city: "Vienna",
    countryCode: "AT",
    longitude: 16.422,
    latitude: 48.233,
    description:
      "High-rise business district beside the Danube, hosting the Vienna International Centre nearby.",
    officialUrl: null,
    sourceIds: [...DISTRICT_SOURCE_IDS],
  },
];

export function getMajorBusinessDistrictById(
  id: string,
): MajorBusinessDistrict | undefined {
  return MAJOR_BUSINESS_DISTRICTS.find((district) => district.id === id);
}

function toEntity(district: MajorBusinessDistrict): EUIMMapEntity {
  return {
    id: district.id,
    category: "economy",
    subcategory: "business-district",
    layerId: "major-business-districts",
    name: district.name,
    countryCode: district.countryCode,
    geometry: {
      type: "Point",
      coordinates: [district.longitude, district.latitude],
    },
    icon: "economy",
    color: "#b45309",
    sourceIds: district.sourceIds,
    properties: {
      city: district.city,
      description: district.description,
      officialUrl: district.officialUrl,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    MAJOR_BUSINESS_DISTRICTS.filter((district) =>
      isCountryInEUIMScope(district.countryCode),
    ).map(toEntity),
  );
}

export function getById(id: string): MajorBusinessDistrict | undefined {
  return getMajorBusinessDistrictById(id);
}

export const ALL: readonly MajorBusinessDistrict[] = MAJOR_BUSINESS_DISTRICTS;

export type MajorBusinessDistrictsAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  ukEntries: string[];
};

export function auditMajorBusinessDistricts(): MajorBusinessDistrictsAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const ukEntries: string[] = [];

  for (const district of MAJOR_BUSINESS_DISTRICTS) {
    if (ids.has(district.id)) duplicateIds.push(district.id);
    ids.add(district.id);

    if (
      !Number.isFinite(district.longitude) ||
      !Number.isFinite(district.latitude)
    ) {
      missingCoordinates.push(district.id);
    }

    if (!isCountryInEUIMScope(district.countryCode)) {
      outsideScope.push(district.id);
    }

    if (district.countryCode === "UK" || district.countryCode === "GB") {
      ukEntries.push(district.id);
    }
  }

  return {
    total: MAJOR_BUSINESS_DISTRICTS.length,
    inScope: MAJOR_BUSINESS_DISTRICTS.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    ukEntries,
  };
}
