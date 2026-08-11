/**
 * Tourist Information Offices — curated catalogue of official national
 * tourism organisations (member bodies of the European Travel Commission,
 * ETC) and a small number of major-hub city tourist offices.
 *
 * Coordinates represent each organisation's home city centre (the capital,
 * or the hub city for city-level entries) rather than a verified exact
 * street address for every entry — `officialWebsite` is the authoritative
 * source for exact contact details. Where a specific public-facing office
 * address/phone/hours is confirmed from an official source (e.g. Barcelona),
 * that data is used instead of the generic city-centre placement.
 *
 * `phone` / `openingHours` are left `null` unless taken from an official
 * source — never invented.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type TouristOffice = {
  id: string;
  name: string;
  organisation: string;
  city: string;
  region: string | null;
  countryCode: string;
  longitude: number;
  latitude: number;
  officialWebsite: string;
  phone: string | null;
  openingHours: string | null;
  sourceIds: string[];
};

const OFFICE_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.ETC,
  DATA_LAYER_SOURCE_IDS.TOURIST_OFFICES_CURATED,
];

function office(
  id: string,
  name: string,
  organisation: string,
  city: string,
  region: string | null,
  countryCode: string,
  longitude: number,
  latitude: number,
  officialWebsite: string,
  phone: string | null = null,
  openingHours: string | null = null,
): TouristOffice {
  return {
    id,
    name,
    organisation,
    city,
    region,
    countryCode,
    longitude,
    latitude,
    officialWebsite,
    phone,
    openingHours,
    sourceIds: [...OFFICE_SOURCE_IDS],
  };
}

/** ETC (European Travel Commission) member national tourism organisations + selected major-hub offices. */
export const TOURIST_OFFICES: readonly TouristOffice[] = [
  office("tourist-office-at", "Austrian National Tourist Office", "Austrian National Tourist Office (ANTO)", "Vienna", null, "AT", 16.3738, 48.2082, "https://www.austria.info/"),
  office("tourist-office-be", "Visit Brussels", "visit.brussels", "Brussels", null, "BE", 4.3517, 50.8503, "https://visit.brussels/"),
  office("tourist-office-bg", "Visit Bulgaria", "Ministry of Tourism of the Republic of Bulgaria", "Sofia", null, "BG", 23.3219, 42.6977, "https://visitbulgaria.com/"),
  office("tourist-office-hr", "Croatian National Tourist Board", "Croatian National Tourist Board (CNTB)", "Zagreb", null, "HR", 15.9819, 45.8150, "https://croatia.hr/"),
  office("tourist-office-cy", "Visit Cyprus", "Republic of Cyprus, Deputy Ministry of Tourism", "Nicosia", null, "CY", 33.3823, 35.1856, "https://www.visitcyprus.com/"),
  office("tourist-office-cz", "Visit Czechia", "CzechTourism", "Prague", null, "CZ", 14.4378, 50.0755, "https://www.visitczechia.com/"),
  office("tourist-office-dk", "VisitDenmark", "VisitDenmark", "Copenhagen", null, "DK", 12.5683, 55.6761, "https://www.visitdenmark.com/"),
  office("tourist-office-ee", "Visit Estonia", "Estonian Tourist Board — Enterprise Estonia", "Tallinn", null, "EE", 24.7536, 59.4370, "https://www.visitestonia.com/"),
  office("tourist-office-fi", "Visit Finland", "Visit Finland — Business Finland", "Helsinki", null, "FI", 24.9384, 60.1699, "https://www.visitfinland.com/"),
  office("tourist-office-fr", "Atout France — Paris Convention and Visitors Bureau", "Atout France", "Paris", "Île-de-France", "FR", 2.3522, 48.8566, "https://www.france.fr/"),
  office("tourist-office-de", "German National Tourist Board", "German National Tourist Board (GNTB)", "Berlin", null, "DE", 13.4050, 52.5200, "https://www.germany.travel/"),
  office("tourist-office-el", "This Is Athens & Partners", "Greek National Tourism Organisation (GNTO/EOT)", "Athens", "Attica", "EL", 23.7275, 37.9838, "https://www.visitgreece.gr/"),
  office("tourist-office-hu", "Visit Hungary", "Hungarian Tourism Agency", "Budapest", null, "HU", 19.0402, 47.4979, "https://visithungary.com/"),
  office("tourist-office-ie", "Tourism Ireland", "Tourism Ireland Ltd.", "Dublin", null, "IE", -6.2603, 53.3498, "https://www.ireland.com/"),
  office("tourist-office-it", "ENIT — Italian National Tourist Board", "ENIT — Agenzia Nazionale del Turismo", "Rome", "Lazio", "IT", 12.4964, 41.9028, "https://www.italia.it/"),
  office("tourist-office-lv", "Latvia Travel", "Investment and Development Agency of Latvia (LIAA)", "Riga", null, "LV", 24.1052, 56.9496, "https://www.latvia.travel/"),
  office("tourist-office-lt", "Lithuania Travel", "Ministry of the Economy and Innovation of the Republic of Lithuania", "Vilnius", null, "LT", 25.2797, 54.6872, "https://www.lithuania.travel/"),
  office("tourist-office-lu", "Luxembourg For Tourism", "Luxembourg For Tourism (LFT)", "Luxembourg", null, "LU", 6.1319, 49.6116, "https://www.visitluxembourg.com/"),
  office("tourist-office-mt", "Visit Malta", "Malta Tourism Authority (MTA)", "Valletta", null, "MT", 14.5146, 35.8989, "https://www.visitmalta.com/"),
  office("tourist-office-nl", "amsterdam&partners", "NBTC Holland Marketing", "Amsterdam", null, "NL", 4.9041, 52.3676, "https://www.holland.com/"),
  office("tourist-office-no", "Visit Norway", "Innovation Norway", "Oslo", null, "NO", 10.7522, 59.9139, "https://www.visitnorway.com/"),
  office("tourist-office-pl", "Warsaw Tourist Office", "Polish Tourism Organisation (PTO)", "Warsaw", null, "PL", 21.0122, 52.2297, "https://www.poland.travel/"),
  office("tourist-office-pt", "Turismo de Portugal", "Turismo de Portugal", "Lisbon", null, "PT", -9.1393, 38.7223, "https://www.visitportugal.com/"),
  office("tourist-office-ro", "Romania Tourism", "Romanian Ministry of Economy, Entrepreneurship and Tourism", "Bucharest", null, "RO", 26.1025, 44.4268, "https://turism.gov.ro/"),
  office("tourist-office-sk", "Slovakia Travel", "Slovakia Travel", "Bratislava", null, "SK", 17.1077, 48.1486, "https://www.slovakia.travel/"),
  office("tourist-office-si", "Visit Ljubljana", "Slovenian Tourist Board", "Ljubljana", null, "SI", 14.5058, 46.0569, "https://www.slovenia.info/"),
  office("tourist-office-es", "Turespaña", "Turespaña — Instituto de Turismo de España", "Madrid", "Community of Madrid", "ES", -3.7038, 40.4168, "https://www.spain.info/"),
  office("tourist-office-se", "Visit Sweden", "Visit Sweden", "Stockholm", null, "SE", 18.0686, 59.3293, "https://visitsweden.com/"),
  office("tourist-office-ch", "Switzerland Tourism", "Switzerland Tourism", "Zurich", null, "CH", 8.5417, 47.3769, "https://www.myswitzerland.com/"),
  office("tourist-office-is", "Visit Iceland", "Icelandic Tourist Board", "Reykjavík", null, "IS", -21.9426, 64.1466, "https://www.visiticeland.com/"),
  office("tourist-office-rs", "National Tourism Organisation of Serbia", "National Tourism Organisation of Serbia (NTOS)", "Belgrade", null, "RS", 20.4489, 44.7866, "https://www.serbia.travel/"),
  office("tourist-office-me", "National Tourism Organisation of Montenegro", "National Tourism Organisation of Montenegro", "Podgorica", null, "ME", 19.2594, 42.4304, "https://www.montenegro.travel/"),
  office("tourist-office-ua", "Visit Ukraine — State Agency for Tourism Development", "State Agency for Tourism Development of Ukraine (SATD)", "Kyiv", null, "UA", 30.5234, 50.4501, "https://www.ukraine.travel/"),
  office(
    "tourist-office-barcelona",
    "Barcelona Tourist Office — Plaça de Catalunya",
    "Barcelona Turisme",
    "Barcelona",
    "Catalonia",
    "ES",
    2.1701,
    41.3870,
    "https://www.barcelonaturisme.com/",
    "+34 932 853 834",
    "Daily 08:30–20:30 (shorter hours 26 Dec & 6 Jan; closed 1 Jan & 25 Dec)",
  ),
];

export function getTouristOfficeById(id: string): TouristOffice | undefined {
  return TOURIST_OFFICES.find((entry) => entry.id === id);
}

function toEntity(entry: TouristOffice): EUIMMapEntity {
  return {
    id: entry.id,
    category: "travel",
    subcategory: "touristOffice",
    layerId: "tourist-information-offices",
    name: entry.name,
    countryCode: entry.countryCode,
    geometry: {
      type: "Point",
      coordinates: [entry.longitude, entry.latitude],
    },
    icon: "info",
    color: "#0d9488",
    sourceIds: entry.sourceIds,
    properties: {
      organisation: entry.organisation,
      city: entry.city,
      region: entry.region,
      officialWebsite: entry.officialWebsite,
      phone: entry.phone,
      openingHours: entry.openingHours,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    TOURIST_OFFICES.filter((entry) => isCountryInEUIMScope(entry.countryCode)).map(
      toEntity,
    ),
  );
}

export type TouristOfficesAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  ukEntries: string[];
};

export function auditTouristOffices(): TouristOfficesAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const ukEntries: string[] = [];

  for (const entry of TOURIST_OFFICES) {
    if (ids.has(entry.id)) duplicateIds.push(entry.id);
    ids.add(entry.id);

    if (!Number.isFinite(entry.longitude) || !Number.isFinite(entry.latitude)) {
      missingCoordinates.push(entry.id);
    }

    if (!isCountryInEUIMScope(entry.countryCode)) {
      outsideScope.push(entry.id);
    }

    if (entry.countryCode === "UK" || entry.countryCode === "GB") {
      ukEntries.push(entry.id);
    }
  }

  return {
    total: TOURIST_OFFICES.length,
    inScope: TOURIST_OFFICES.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    ukEntries,
  };
}
