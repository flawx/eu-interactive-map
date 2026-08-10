/**
 * International organisations headquartered within EUIM operational scope.
 *
 * These are explicitly NOT EU institutions (e.g. the Council of Europe is a
 * separate international organisation, not to be confused with the Council
 * of the EU or the European Council). Switzerland is in EUIM scope via
 * Schengen even though it is outside the EU.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type InternationalOrganisation = {
  id: string;
  name: string;
  acronym: string;
  city: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  purpose: string;
  officialUrl: string;
  sourceIds: string[];
  icon: string;
};

export const INTERNATIONAL_ORGANISATIONS: readonly InternationalOrganisation[] = [
  {
    id: "nato-hq",
    name: "North Atlantic Treaty Organization",
    acronym: "NATO",
    city: "Brussels",
    countryCode: "BE",
    longitude: 4.4254,
    latitude: 50.8776,
    purpose: "Political and military alliance for the collective defence of its members.",
    officialUrl: "https://www.nato.int/",
    sourceIds: ["nato"],
    icon: "globe",
  },
  {
    id: "un-geneva-palais-des-nations",
    name: "United Nations Office at Geneva",
    acronym: "UNOG",
    city: "Geneva",
    countryCode: "CH",
    longitude: 6.14,
    latitude: 46.2267,
    purpose: "United Nations hub for multilateral diplomacy at the Palais des Nations.",
    officialUrl: "https://www.ungeneva.org/",
    sourceIds: ["un-official"],
    icon: "globe",
  },
  {
    id: "un-vienna-international-centre",
    name: "United Nations Office at Vienna",
    acronym: "UNOV",
    city: "Vienna",
    countryCode: "AT",
    longitude: 16.4167,
    latitude: 48.2333,
    purpose: "United Nations hub hosting agencies such as the IAEA and UNODC.",
    officialUrl: "https://www.unvienna.org/",
    sourceIds: ["un-official"],
    icon: "globe",
  },
  {
    id: "unesco-hq",
    name: "United Nations Educational, Scientific and Cultural Organization",
    acronym: "UNESCO",
    city: "Paris",
    countryCode: "FR",
    longitude: 2.3064,
    latitude: 48.8496,
    purpose: "UN agency promoting international cooperation in education, science and culture.",
    officialUrl: "https://www.unesco.org/",
    sourceIds: ["unesco"],
    icon: "globe",
  },
  {
    id: "council-of-europe",
    name: "Council of Europe",
    acronym: "CoE",
    city: "Strasbourg",
    countryCode: "FR",
    longitude: 7.7719,
    latitude: 48.5946,
    purpose:
      "International organisation upholding human rights, democracy and the rule of law — distinct from the EU institutions.",
    officialUrl: "https://www.coe.int/",
    sourceIds: ["coe"],
    icon: "globe",
  },
  {
    id: "oecd-hq",
    name: "Organisation for Economic Co-operation and Development",
    acronym: "OECD",
    city: "Paris",
    countryCode: "FR",
    longitude: 2.269,
    latitude: 48.86,
    purpose: "Intergovernmental organisation promoting policies for economic and social well-being.",
    officialUrl: "https://www.oecd.org/",
    sourceIds: ["oecd"],
    icon: "globe",
  },
  {
    id: "osce-secretariat",
    name: "Organization for Security and Co-operation in Europe",
    acronym: "OSCE",
    city: "Vienna",
    countryCode: "AT",
    longitude: 16.363,
    latitude: 48.208,
    purpose: "Intergovernmental organisation focused on security, conflict prevention and human rights.",
    officialUrl: "https://www.osce.org/",
    sourceIds: ["osce"],
    icon: "globe",
  },
];

export function getInternationalOrganisationById(
  id: string,
): InternationalOrganisation | undefined {
  return INTERNATIONAL_ORGANISATIONS.find((org) => org.id === id);
}

function toEntity(org: InternationalOrganisation): EUIMMapEntity {
  return {
    id: org.id,
    category: "europe",
    subcategory: "international-organisation",
    layerId: "international-organisations",
    name: org.name,
    countryCode: org.countryCode,
    geometry: {
      type: "Point",
      coordinates: [org.longitude, org.latitude],
    },
    icon: org.icon,
    color: "#0f766e",
    sourceIds: org.sourceIds,
    properties: {
      acronym: org.acronym,
      city: org.city,
      purpose: org.purpose,
      officialUrl: org.officialUrl,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    INTERNATIONAL_ORGANISATIONS.filter((org) =>
      isCountryInEUIMScope(org.countryCode),
    ).map(toEntity),
  );
}

export function getById(id: string): InternationalOrganisation | undefined {
  return getInternationalOrganisationById(id);
}

export const ALL: readonly InternationalOrganisation[] = INTERNATIONAL_ORGANISATIONS;

export type InternationalOrganisationsAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
};

export function auditInternationalOrganisations(): InternationalOrganisationsAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];

  for (const org of INTERNATIONAL_ORGANISATIONS) {
    if (ids.has(org.id)) duplicateIds.push(org.id);
    ids.add(org.id);

    if (!Number.isFinite(org.longitude) || !Number.isFinite(org.latitude)) {
      missingCoordinates.push(org.id);
    }

    if (!isCountryInEUIMScope(org.countryCode)) {
      outsideScope.push(org.id);
    }
  }

  return {
    total: INTERNATIONAL_ORGANISATIONS.length,
    inScope: INTERNATIONAL_ORGANISATIONS.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
  };
}
