/**
 * EU bodies, decentralised agencies and CFSP agencies.
 *
 * Curated catalogue — coordinates are approximate headquarters locations.
 * Every entry is validated against `isCountryInEUIMScope` before being
 * exposed to the map. United Kingdom is out of scope.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type EuBodyAgencyCategory =
  | "eu-body"
  | "decentralised-agency"
  | "cfsp-agency"
  | "other";

export type EuBodyAgency = {
  id: string;
  name: string;
  acronym: string;
  officialCategory: EuBodyAgencyCategory;
  city: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  purpose: string;
  officialUrl: string;
  sourceIds: string[];
  icon: string;
};

const AGENCY_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.EU_AGENCIES_NETWORK,
];

export const EU_BODIES_AGENCIES: readonly EuBodyAgency[] = [
  {
    id: "eppo",
    name: "European Public Prosecutor's Office",
    acronym: "EPPO",
    officialCategory: "eu-body",
    city: "Luxembourg",
    countryCode: "LU",
    longitude: 6.1694,
    latitude: 49.6269,
    purpose:
      "Investigates and prosecutes crimes against the EU budget across participating member states.",
    officialUrl: "https://www.eppo.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "europol",
    name: "European Union Agency for Law Enforcement Cooperation",
    acronym: "Europol",
    officialCategory: "decentralised-agency",
    city: "The Hague",
    countryCode: "NL",
    longitude: 4.282,
    latitude: 52.0926,
    purpose:
      "Supports police cooperation between EU member states and combats serious international crime and terrorism.",
    officialUrl: "https://www.europol.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "eurojust",
    name: "European Union Agency for Criminal Justice Cooperation",
    acronym: "Eurojust",
    officialCategory: "decentralised-agency",
    city: "The Hague",
    countryCode: "NL",
    longitude: 4.2829,
    latitude: 52.0886,
    purpose:
      "Coordinates cross-border investigations and prosecutions between national judicial authorities.",
    officialUrl: "https://www.eurojust.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "ema",
    name: "European Medicines Agency",
    acronym: "EMA",
    officialCategory: "decentralised-agency",
    city: "Amsterdam",
    countryCode: "NL",
    longitude: 4.891,
    latitude: 52.3485,
    purpose:
      "Evaluates and supervises medicines for human and veterinary use across the EU.",
    officialUrl: "https://www.ema.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "efsa",
    name: "European Food Safety Authority",
    acronym: "EFSA",
    officialCategory: "decentralised-agency",
    city: "Parma",
    countryCode: "IT",
    longitude: 10.328,
    latitude: 44.8085,
    purpose:
      "Provides independent scientific advice on risks associated with the food chain in the EU.",
    officialUrl: "https://www.efsa.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "euipo",
    name: "European Union Intellectual Property Office",
    acronym: "EUIPO",
    officialCategory: "decentralised-agency",
    city: "Alicante",
    countryCode: "ES",
    longitude: -0.505,
    latitude: 38.356,
    purpose:
      "Manages the registration of EU trade marks and registered Community designs.",
    officialUrl: "https://www.euipo.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "frontex",
    name: "European Border and Coast Guard Agency",
    acronym: "Frontex",
    officialCategory: "decentralised-agency",
    city: "Warsaw",
    countryCode: "PL",
    longitude: 21.0175,
    latitude: 52.2319,
    purpose:
      "Supports EU member states in managing the external borders of the Schengen area.",
    officialUrl: "https://www.frontex.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "enisa",
    name: "European Union Agency for Cybersecurity",
    acronym: "ENISA",
    officialCategory: "decentralised-agency",
    city: "Athens",
    countryCode: "EL",
    longitude: 23.7275,
    latitude: 37.9838,
    purpose:
      "Supports a high common level of cybersecurity across the European Union.",
    officialUrl: "https://www.enisa.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "easa",
    name: "European Union Aviation Safety Agency",
    acronym: "EASA",
    officialCategory: "decentralised-agency",
    city: "Cologne",
    countryCode: "DE",
    longitude: 6.937,
    latitude: 50.941,
    purpose:
      "Responsible for civil aviation safety and environmental protection standards in the EU.",
    officialUrl: "https://www.easa.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "emsa",
    name: "European Maritime Safety Agency",
    acronym: "EMSA",
    officialCategory: "decentralised-agency",
    city: "Lisbon",
    countryCode: "PT",
    longitude: -9.1427,
    latitude: 38.7223,
    purpose:
      "Supports maritime safety, security and pollution prevention across EU waters.",
    officialUrl: "https://www.emsa.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "eba",
    name: "European Banking Authority",
    acronym: "EBA",
    officialCategory: "decentralised-agency",
    city: "Paris (La Défense)",
    countryCode: "FR",
    longitude: 2.237,
    latitude: 48.891,
    purpose:
      "Safeguards the integrity, efficiency and orderly functioning of the EU banking sector.",
    officialUrl: "https://www.eba.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "esma",
    name: "European Securities and Markets Authority",
    acronym: "ESMA",
    officialCategory: "decentralised-agency",
    city: "Paris",
    countryCode: "FR",
    longitude: 2.375,
    latitude: 48.844,
    purpose:
      "Safeguards the stability of the EU financial system by promoting supervisory convergence.",
    officialUrl: "https://www.esma.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "eiopa",
    name: "European Insurance and Occupational Pensions Authority",
    acronym: "EIOPA",
    officialCategory: "decentralised-agency",
    city: "Frankfurt",
    countryCode: "DE",
    longitude: 8.672,
    latitude: 50.112,
    purpose:
      "Oversees the insurance and occupational pensions sectors to protect policyholders across the EU.",
    officialUrl: "https://www.eiopa.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "eu-osha",
    name: "European Agency for Safety and Health at Work",
    acronym: "EU-OSHA",
    officialCategory: "decentralised-agency",
    city: "Bilbao",
    countryCode: "ES",
    longitude: -2.934,
    latitude: 43.262,
    purpose: "Promotes safer, healthier and more productive workplaces across the EU.",
    officialUrl: "https://osha.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "cedefop",
    name: "European Centre for the Development of Vocational Training",
    acronym: "Cedefop",
    officialCategory: "decentralised-agency",
    city: "Thessaloniki",
    countryCode: "EL",
    longitude: 22.955,
    latitude: 40.64,
    purpose: "Supports the development of European vocational education and training policy.",
    officialUrl: "https://www.cedefop.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "eurofound",
    name: "European Foundation for the Improvement of Living and Working Conditions",
    acronym: "Eurofound",
    officialCategory: "decentralised-agency",
    city: "Dublin",
    countryCode: "IE",
    longitude: -6.148,
    latitude: 53.247,
    purpose:
      "Provides research and analysis to inform EU social, employment and work-related policy.",
    officialUrl: "https://www.eurofound.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "fra",
    name: "European Union Agency for Fundamental Rights",
    acronym: "FRA",
    officialCategory: "decentralised-agency",
    city: "Vienna",
    countryCode: "AT",
    longitude: 16.372,
    latitude: 48.208,
    purpose: "Provides independent, evidence-based advice on fundamental rights in the EU.",
    officialUrl: "https://fra.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
  {
    id: "ecdc",
    name: "European Centre for Disease Prevention and Control",
    acronym: "ECDC",
    officialCategory: "decentralised-agency",
    city: "Stockholm",
    countryCode: "SE",
    longitude: 18.0686,
    latitude: 59.3293,
    purpose: "Strengthens Europe's defences against infectious diseases.",
    officialUrl: "https://www.ecdc.europa.eu/",
    sourceIds: [...AGENCY_SOURCE_IDS],
    icon: "building",
  },
];

export function getEuBodyAgencyById(id: string): EuBodyAgency | undefined {
  return EU_BODIES_AGENCIES.find((agency) => agency.id === id);
}

function toEntity(agency: EuBodyAgency): EUIMMapEntity {
  return {
    id: agency.id,
    category: "europe",
    subcategory: agency.officialCategory,
    layerId: "eu-bodies-agencies",
    name: agency.name,
    countryCode: agency.countryCode,
    geometry: {
      type: "Point",
      coordinates: [agency.longitude, agency.latitude],
    },
    icon: agency.icon,
    color: "#6d28d9",
    sourceIds: agency.sourceIds,
    properties: {
      acronym: agency.acronym,
      officialCategory: agency.officialCategory,
      city: agency.city,
      purpose: agency.purpose,
      officialUrl: agency.officialUrl,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    EU_BODIES_AGENCIES.filter((agency) =>
      isCountryInEUIMScope(agency.countryCode),
    ).map(toEntity),
  );
}

export function getById(id: string): EuBodyAgency | undefined {
  return getEuBodyAgencyById(id);
}

export const ALL: readonly EuBodyAgency[] = EU_BODIES_AGENCIES;

export type EuBodiesAgenciesAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
};

export function auditEuBodiesAgencies(): EuBodiesAgenciesAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];

  for (const agency of EU_BODIES_AGENCIES) {
    if (ids.has(agency.id)) duplicateIds.push(agency.id);
    ids.add(agency.id);

    if (
      !Number.isFinite(agency.longitude) ||
      !Number.isFinite(agency.latitude)
    ) {
      missingCoordinates.push(agency.id);
    }

    if (!isCountryInEUIMScope(agency.countryCode)) {
      outsideScope.push(agency.id);
    }
  }

  return {
    total: EU_BODIES_AGENCIES.length,
    inScope: EU_BODIES_AGENCIES.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
  };
}
