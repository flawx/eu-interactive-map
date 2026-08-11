/**
 * Visitor Safety & Assistance — VERY limited curated set of physical,
 * officially-sourced locations only (tourist police offices, mountain
 * rescue bases). This is NOT a comprehensive directory of every emergency
 * service in Europe — only entries with a clear official source and
 * address/coordinates are included, per project policy of never inventing
 * data.
 *
 * The pan-European emergency number 112 is deliberately NOT rendered as
 * map markers (it has no single physical location) — it is shown as a
 * static note in the panel/legend only.
 *
 * Sources:
 * - Hellenic Police official contact page (astynomia.gr) — Athens Tourist
 *   Police Department and Tourist Visitor Service Office addresses/phones.
 * - French government service-public.gouv.fr directory — PGHM
 *   Chamonix-Mont-Blanc (high-mountain gendarmerie rescue unit) address/phone.
 * - Air Zermatt AG official contact page — Zermatt rescue base
 *   address/phone (Switzerland, Schengen non-EU, in EUIM scope).
 * - Ajuntament de Barcelona / Guàrdia Urbana official site — Tourist
 *   Assistance Service (Ciutat Vella) address/phone/hours.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type VisitorSafetyType =
  | "touristPolice"
  | "emergencyAssistance"
  | "firstAidPost"
  | "mountainRescue"
  | "beachRescue"
  | "visitorSafetyOffice";

export type VisitorSafetyLocation = {
  id: string;
  type: VisitorSafetyType;
  name: string;
  city: string;
  countryCode: string;
  address: string | null;
  longitude: number;
  latitude: number;
  coordinatesApproximate: boolean;
  phone: string | null;
  openingHours: string | null;
  officialWebsite: string | null;
  sourceIds: string[];
};

const SAFETY_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.VISITOR_SAFETY_CURATED,
];

export const VISITOR_SAFETY_LOCATIONS: readonly VisitorSafetyLocation[] = [
  {
    id: "visitor-safety-athens-tourist-help-office",
    type: "touristPolice",
    name: "Athens Tourist Police — Visitors' Help Office",
    city: "Athens",
    countryCode: "EL",
    address: "Dragatsaniou 4, Klafthmonos Square, 105 59 Athens",
    longitude: 23.7295,
    latitude: 37.9793,
    coordinatesApproximate: true,
    phone: "+30 210 322 2230",
    openingHours: null,
    officialWebsite: "https://www.astynomia.gr/",
    sourceIds: [...SAFETY_SOURCE_IDS],
  },
  {
    id: "visitor-safety-athens-tourist-police-hq",
    type: "touristPolice",
    name: "Tourist Police Department of Athens",
    city: "Athens",
    countryCode: "EL",
    address: "Leoforos Andrea Syngrou 83, 5th floor, 117 45 Athens",
    longitude: 23.7259,
    latitude: 37.9611,
    coordinatesApproximate: true,
    phone: "+30 210 920 0724",
    openingHours: null,
    officialWebsite: "https://www.astynomia.gr/",
    sourceIds: [...SAFETY_SOURCE_IDS],
  },
  {
    id: "visitor-safety-pghm-chamonix",
    type: "mountainRescue",
    name: "PGHM Chamonix-Mont-Blanc (High-Mountain Gendarmerie Rescue Unit)",
    city: "Chamonix-Mont-Blanc",
    countryCode: "FR",
    address: "Caserne Anselme, 69 Rue de la Mollard, 74400 Chamonix-Mont-Blanc",
    longitude: 6.8663,
    latitude: 45.9231,
    coordinatesApproximate: true,
    phone: "+33 4 50 53 16 89",
    openingHours: "24/7",
    officialWebsite: "https://www.gendarmerie.interieur.gouv.fr/",
    sourceIds: [...SAFETY_SOURCE_IDS],
  },
  {
    id: "visitor-safety-air-zermatt",
    type: "mountainRescue",
    name: "Air Zermatt — Mountain Rescue Base",
    city: "Zermatt",
    countryCode: "CH",
    address: "Spissstrasse 107, 3920 Zermatt",
    longitude: 7.7529722,
    latitude: 46.0292452,
    coordinatesApproximate: false,
    phone: "+41 27 570 70 00",
    openingHours: "24/7",
    officialWebsite: "https://www.air-zermatt.ch/",
    sourceIds: [...SAFETY_SOURCE_IDS],
  },
  {
    id: "visitor-safety-barcelona-guardia-urbana",
    type: "touristPolice",
    name: "Guàrdia Urbana — Tourist Assistance Service",
    city: "Barcelona",
    countryCode: "ES",
    address: "Nou de la Rambla 43, 08001 Barcelona",
    longitude: 2.1739,
    latitude: 41.3765,
    coordinatesApproximate: true,
    phone: "+34 932 562 431",
    openingHours: "24 hours, Monday to Friday",
    officialWebsite: "https://ajuntament.barcelona.cat/guardiaurbana/",
    sourceIds: [...SAFETY_SOURCE_IDS],
  },
];

export function getVisitorSafetyLocationById(
  id: string,
): VisitorSafetyLocation | undefined {
  return VISITOR_SAFETY_LOCATIONS.find((entry) => entry.id === id);
}

function toEntity(entry: VisitorSafetyLocation): EUIMMapEntity {
  return {
    id: entry.id,
    category: "travel",
    subcategory: entry.type,
    layerId: "visitor-safety-assistance",
    name: entry.name,
    countryCode: entry.countryCode,
    geometry: {
      type: "Point",
      coordinates: [entry.longitude, entry.latitude],
    },
    icon: "safety",
    color: "#dc2626",
    sourceIds: entry.sourceIds,
    properties: {
      safetyType: entry.type,
      city: entry.city,
      address: entry.address,
      coordinatesApproximate: entry.coordinatesApproximate,
      phone: entry.phone,
      openingHours: entry.openingHours,
      officialWebsite: entry.officialWebsite,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    VISITOR_SAFETY_LOCATIONS.filter((entry) =>
      isCountryInEUIMScope(entry.countryCode),
    ).map(toEntity),
  );
}

export type VisitorSafetyAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  invalidTypes: string[];
};

const VALID_SAFETY_TYPES = new Set<VisitorSafetyType>([
  "touristPolice",
  "emergencyAssistance",
  "firstAidPost",
  "mountainRescue",
  "beachRescue",
  "visitorSafetyOffice",
]);

export function auditVisitorSafety(): VisitorSafetyAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const invalidTypes: string[] = [];

  for (const entry of VISITOR_SAFETY_LOCATIONS) {
    if (ids.has(entry.id)) duplicateIds.push(entry.id);
    ids.add(entry.id);

    if (!Number.isFinite(entry.longitude) || !Number.isFinite(entry.latitude)) {
      missingCoordinates.push(entry.id);
    }

    if (!isCountryInEUIMScope(entry.countryCode)) {
      outsideScope.push(entry.id);
    }

    if (!VALID_SAFETY_TYPES.has(entry.type)) {
      invalidTypes.push(entry.id);
    }
  }

  return {
    total: VISITOR_SAFETY_LOCATIONS.length,
    inScope: VISITOR_SAFETY_LOCATIONS.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    invalidTypes,
  };
}
