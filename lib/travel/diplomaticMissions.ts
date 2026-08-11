/**
 * Diplomatic Missions — VERY LIMITED curated set. This is intentionally NOT
 * an exhaustive worldwide embassy directory. Scope for this commit:
 *
 * 1. Permanent Representations to the EU in Brussels — one per EU member
 *    state. Addresses are sourced from official/government diplomatic
 *    directories (Portuguese Permanent Representation's published list of
 *    "National Permanent Representations to the EU"; Romanian Permanent
 *    Representation's published "Presence of EU Member States" directory).
 *    Coordinates are APPROXIMATE — geocoded to the correct Brussels European
 *    Quarter street from the official address, not a survey-grade rooftop
 *    fix (`coordinatesApproximate: true` on every entry in this group).
 *
 * 2. A handful of capital-to-capital embassies where the building and
 *    address are unambiguous, well-documented landmarks (e.g. the French
 *    Embassy in Berlin at Pariser Platz, next to the Brandenburg Gate).
 *
 * No emergency phone numbers are invented — `emergencyPhone` is only
 * populated when an official general switchboard number was found in the
 * same official source as the address; otherwise left `null`.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type DiplomaticMissionType =
  | "embassy"
  | "consulate"
  | "permanentRepresentation"
  | "other";

export type DiplomaticMission = {
  id: string;
  missionType: DiplomaticMissionType;
  name: string;
  sendingCountry: string;
  hostCountry: string;
  city: string;
  address: string | null;
  longitude: number;
  latitude: number;
  /** True when the coordinate is street-level geocoded from an official address, not a rooftop-precise fix. */
  coordinatesApproximate: boolean;
  officialWebsite: string | null;
  emergencyPhone: string | null;
  sourceIds: string[];
};

const PERM_REP_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.EEAS_DIPLOMATIC,
  DATA_LAYER_SOURCE_IDS.DIPLOMATIC_CURATED,
];

function permRep(
  sendingCountry: string,
  countryName: string,
  address: string,
  longitude: number,
  latitude: number,
  officialWebsite: string | null = null,
  emergencyPhone: string | null = null,
): DiplomaticMission {
  return {
    id: `permrep-eu-${sendingCountry.toLowerCase()}`,
    missionType: "permanentRepresentation",
    name: `Permanent Representation of ${countryName} to the EU`,
    sendingCountry,
    hostCountry: "BE",
    city: "Brussels",
    address,
    longitude,
    latitude,
    coordinatesApproximate: true,
    officialWebsite,
    emergencyPhone,
    sourceIds: [...PERM_REP_SOURCE_IDS],
  };
}

function embassy(
  id: string,
  sendingCountry: string,
  hostCountry: string,
  name: string,
  city: string,
  address: string,
  longitude: number,
  latitude: number,
  officialWebsite: string | null = null,
): DiplomaticMission {
  return {
    id,
    missionType: "embassy",
    name,
    sendingCountry,
    hostCountry,
    city,
    address,
    longitude,
    latitude,
    coordinatesApproximate: false,
    officialWebsite,
    emergencyPhone: null,
    sourceIds: [DATA_LAYER_SOURCE_IDS.EEAS_DIPLOMATIC, DATA_LAYER_SOURCE_IDS.DIPLOMATIC_CURATED],
  };
}

/**
 * Permanent Representations to the EU — Brussels, European Quarter.
 * Source: official diplomatic address directories (see file header).
 */
export const DIPLOMATIC_MISSIONS: readonly DiplomaticMission[] = [
  permRep("AT", "Austria", "Avenue de Cortenbergh 30, 1040 Brussels", 4.3831, 50.8452, "https://www.bmeia.gv.at/oev-eu-bruessel", "+32 2 234 51 00"),
  permRep("BE", "Belgium", "Rue de la Loi 61-63, 1040 Brussels", 4.3745, 50.8467, null, "+32 2 233 21 11"),
  permRep("BG", "Bulgaria", "Square Marie-Louise 49, 1000 Brussels", 4.3835, 50.8480, "https://www.bg-permrep.eu/", "+32 2 235 83 00"),
  permRep("HR", "Croatia", "Avenue des Arts 50, 1000 Brussels", 4.3670, 50.8495, null),
  permRep("CY", "Cyprus", "Avenue de Cortenbergh 61, 1000 Brussels", 4.3872, 50.8449, null, "+32 2 739 51 11"),
  permRep("CZ", "Czechia", "Rue Caroly 15, 1050 Brussels", 4.3722, 50.8387, "https://www.mzv.cz/representation.eu", "+32 2 213 91 11"),
  permRep("DK", "Denmark", "Rue d'Arlon 73, 1040 Brussels", 4.3790, 50.8420, null, "+32 2 233 08 11"),
  permRep("EE", "Estonia", "Rue Guimard 11-13, 1040 Brussels", 4.3752, 50.8447, null, "+32 2 227 39 10"),
  permRep("FI", "Finland", "Avenue de Cortenbergh 80, 1000 Brussels", 4.3900, 50.8443, null),
  permRep("FR", "France", "Place de Louvain 14, 1000 Brussels", 4.3663, 50.8516, "https://www.rpfrance.eu/", "+32 2 229 82 11"),
  permRep("DE", "Germany", "Rue Jacques de Lalaing 8-14, 1040 Brussels", 4.3800, 50.8460, "https://www.eu-vertretung.de/", "+32 2 787 10 00"),
  permRep("EL", "Greece", "Rue Jacques de Lalaing 19-21, 1040 Brussels", 4.3805, 50.8458, null),
  permRep("HU", "Hungary", "Rue de Trèves 92-98, 1040 Brussels", 4.3796, 50.8407, null),
  permRep("IE", "Ireland", "Rue Froissart 50, 1040 Brussels", 4.3826, 50.8420, "https://www.irelandrepbrussels.be/", "+32 2 230 85 80"),
  permRep("IT", "Italy", "Rue du Marteau 7-15, 1000 Brussels", 4.3660, 50.8540, null),
  permRep("LV", "Latvia", "Avenue des Arts 23, 1000 Brussels", 4.3660, 50.8497, null, "+32 2 238 31 00"),
  permRep("LT", "Lithuania", "Rue Belliard 41-43, 1040 Brussels", 4.3705, 50.8407, null),
  permRep("LU", "Luxembourg", "Avenue de Cortenbergh 75, 1000 Brussels", 4.3895, 50.8445, null),
  permRep("MT", "Malta", "Rue Archimède 25, 1000 Brussels", 4.3843, 50.8455, null, "+32 2 343 01 95"),
  permRep("NL", "the Netherlands", "Avenue de Cortenbergh 4-10, 1040 Brussels", 4.3810, 50.8455, null, "+32 2 679 15 11"),
  permRep("PL", "Poland", "Rue Stevin 139, 1000 Brussels", 4.3835, 50.8460, null, "+32 2 777 72 00"),
  permRep("PT", "Portugal", "Avenue de Cortenbergh 12-22, 1040 Brussels", 4.3818, 50.8451, null, "+32 2 286 42 11"),
  permRep("RO", "Romania", "Avenue de Cortenbergh 107, 1000 Brussels", 4.3935, 50.8438, null, "+32 2 700 06 40"),
  permRep("SK", "Slovakia", "Avenue de Cortenbergh 79, 1000 Brussels", 4.3898, 50.8443, null),
  permRep("SI", "Slovenia", "Rue du Commerce 44, 1000 Brussels", 4.3700, 50.8393, null, "+32 2 213 63 00"),
  permRep("ES", "Spain", "Boulevard du Régent 52, 1000 Brussels", 4.3660, 50.8420, null),
  permRep("SE", "Sweden", "Square de Meeûs 30, 1000 Brussels", 4.3695, 50.8395, null),

  // A few well-documented capital-to-capital embassies (landmark buildings, unambiguous addresses).
  embassy(
    "embassy-fr-de-berlin",
    "FR",
    "DE",
    "Embassy of France in Berlin",
    "Berlin",
    "Pariser Platz 5, 10117 Berlin",
    13.3778,
    52.5163,
    "https://de.ambafrance.org/",
  ),
  embassy(
    "embassy-de-fr-paris",
    "DE",
    "FR",
    "Embassy of Germany in Paris",
    "Paris",
    "13-15 Avenue Franklin D. Roosevelt, 75008 Paris",
    2.3070,
    48.8695,
    "https://fr.diplo.de/",
  ),
  embassy(
    "embassy-it-fr-paris",
    "IT",
    "FR",
    "Embassy of Italy in Paris",
    "Paris",
    "47 Rue de Varenne, 75007 Paris",
    2.3202,
    48.8551,
    "https://ambparigi.esteri.it/",
  ),
];

export function getDiplomaticMissionById(id: string): DiplomaticMission | undefined {
  return DIPLOMATIC_MISSIONS.find((entry) => entry.id === id);
}

function toEntity(entry: DiplomaticMission): EUIMMapEntity {
  return {
    id: entry.id,
    category: "travel",
    subcategory: entry.missionType,
    layerId: "diplomatic-missions",
    name: entry.name,
    countryCode: entry.hostCountry,
    geometry: {
      type: "Point",
      coordinates: [entry.longitude, entry.latitude],
    },
    icon: "diplomatic",
    color: "#334155",
    sourceIds: entry.sourceIds,
    properties: {
      missionType: entry.missionType,
      sendingCountry: entry.sendingCountry,
      hostCountry: entry.hostCountry,
      city: entry.city,
      address: entry.address,
      coordinatesApproximate: entry.coordinatesApproximate,
      officialWebsite: entry.officialWebsite,
      emergencyPhone: entry.emergencyPhone,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    DIPLOMATIC_MISSIONS.filter((entry) => isCountryInEUIMScope(entry.hostCountry)).map(
      toEntity,
    ),
  );
}

export type DiplomaticMissionsAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  invalidMissionTypes: string[];
};

const VALID_MISSION_TYPES = new Set<DiplomaticMissionType>([
  "embassy",
  "consulate",
  "permanentRepresentation",
  "other",
]);

export function auditDiplomaticMissions(): DiplomaticMissionsAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const invalidMissionTypes: string[] = [];

  for (const entry of DIPLOMATIC_MISSIONS) {
    if (ids.has(entry.id)) duplicateIds.push(entry.id);
    ids.add(entry.id);

    if (!Number.isFinite(entry.longitude) || !Number.isFinite(entry.latitude)) {
      missingCoordinates.push(entry.id);
    }

    if (!isCountryInEUIMScope(entry.hostCountry)) {
      outsideScope.push(entry.id);
    }

    if (!VALID_MISSION_TYPES.has(entry.missionType)) {
      invalidMissionTypes.push(entry.id);
    }
  }

  return {
    total: DIPLOMATIC_MISSIONS.length,
    inScope: DIPLOMATIC_MISSIONS.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    invalidMissionTypes,
  };
}
