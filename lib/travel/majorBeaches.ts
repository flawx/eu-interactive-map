/**
 * Major Beaches & Seaside Resorts — hand-curated editorial selection of
 * well-known European beaches and seaside resorts. This is NOT an official
 * EU ranking or exhaustive directory — see `selectionCriteria` on each
 * entry's spirit: broad name recognition, geographic spread across EUIM
 * coverage, and a mix of coastal types (Atlantic, Mediterranean, Baltic,
 * North Sea, Adriatic, Aegean). United Kingdom beaches are out of scope.
 *
 * Distinct from the EEA `europeanBathingWaters` layer (official annual
 * water-quality classification) — this layer is about well-known seaside
 * *destinations*, not water-quality assessment. Coordinates are the
 * beach/resort's well-known public location, not a survey-grade fix.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type BeachCoastalType =
  | "atlantic"
  | "mediterranean"
  | "adriatic"
  | "aegean"
  | "baltic"
  | "northSea";

export type MajorBeach = {
  id: string;
  name: string;
  municipality: string;
  region: string;
  countryCode: string;
  coastalType: BeachCoastalType;
  officialTourismUrl: string;
  longitude: number;
  latitude: number;
  sourceIds: string[];
};

const BEACH_SOURCE_IDS: readonly string[] = [DATA_LAYER_SOURCE_IDS.BEACHES_CURATED];

function beach(
  id: string,
  name: string,
  municipality: string,
  region: string,
  countryCode: string,
  coastalType: BeachCoastalType,
  officialTourismUrl: string,
  longitude: number,
  latitude: number,
): MajorBeach {
  return {
    id,
    name,
    municipality,
    region,
    countryCode,
    coastalType,
    officialTourismUrl,
    longitude,
    latitude,
    sourceIds: [...BEACH_SOURCE_IDS],
  };
}

export const MAJOR_BEACHES: readonly MajorBeach[] = [
  beach("beach-la-concha", "La Concha", "San Sebastián", "Basque Country", "ES", "atlantic", "https://www.sansebastianturismo.com/", -1.9812, 43.3183),
  beach("beach-grande-plage-biarritz", "Grande Plage", "Biarritz", "Nouvelle-Aquitaine", "FR", "atlantic", "https://www.tourisme.biarritz.fr/", -1.5586, 43.4838),
  beach("beach-pampelonne", "Plage de Pampelonne", "Ramatuelle", "Provence-Alpes-Côte d'Azur", "FR", "mediterranean", "https://www.ramatuelle-tourisme.com/", 6.6798, 43.2185),
  beach("beach-la-malagueta", "La Malagueta", "Málaga", "Andalusia", "ES", "mediterranean", "https://www.malagaturismo.com/", -4.4055, 36.7178),
  beach("beach-positano-spiaggia-grande", "Spiaggia Grande", "Positano", "Campania", "IT", "mediterranean", "https://www.positano.com/", 14.4849, 40.6280),
  beach("beach-zlatni-rat", "Zlatni Rat", "Bol, Brač", "Split-Dalmatia County", "HR", "adriatic", "https://www.bol.hr/", 16.6383, 43.2564),
  beach("beach-navagio", "Navagio (Shipwreck Beach)", "Zakynthos", "Ionian Islands", "EL", "mediterranean", "https://www.visitgreece.gr/", 20.6247, 37.8599),
  beach("beach-praia-da-rocha", "Praia da Rocha", "Portimão", "Algarve", "PT", "atlantic", "https://www.visitalgarve.pt/", -8.5386, 37.1194),
  beach("beach-cascais", "Praia da Ribeira", "Cascais", "Lisbon District", "PT", "atlantic", "https://www.visitcascais.com/", -9.4215, 38.6970),
  beach("beach-sylt-westerland", "Westerland Beach", "Sylt", "Schleswig-Holstein", "DE", "northSea", "https://www.sylt.de/", 8.3406, 54.9096),
  beach("beach-scheveningen", "Scheveningen Beach", "The Hague", "South Holland", "NL", "northSea", "https://www.denhaag.com/", 4.2760, 52.1073),
  beach("beach-platja-den-bossa", "Platja d'en Bossa", "Ibiza", "Balearic Islands", "ES", "mediterranean", "https://www.ibiza.travel/", 1.4324, 38.8791),
  beach("beach-mykonos-paradise", "Paradise Beach", "Mykonos", "South Aegean", "EL", "aegean", "https://www.visitgreece.gr/", 25.3547, 37.3906),
  beach("beach-elafonissi", "Elafonissi", "Chania", "Crete", "EL", "mediterranean", "https://www.visitgreece.gr/", 23.5406, 35.2717),
  beach("beach-cala-macarella", "Cala Macarella", "Menorca", "Balearic Islands", "ES", "mediterranean", "https://www.menorca.es/", 3.9506, 39.9385),
  beach("beach-varadero-style-sopot", "Sopot Beach", "Sopot", "Pomeranian Voivodeship", "PL", "baltic", "https://www.sopot.pl/", 18.5658, 54.4468),
  beach("beach-jurmala", "Jūrmala Beach", "Jūrmala", "Riga Region", "LV", "baltic", "https://www.jurmala.lv/", 23.7700, 56.9681),
  beach("beach-varna-golden-sands", "Golden Sands", "Varna", "Varna Province", "BG", "mediterranean", "https://www.bulgariatravel.org/", 28.0350, 43.2833),
  beach("beach-costinesti", "Costinești Beach", "Costinești", "Constanța County", "RO", "mediterranean", "https://romania.travel/", 28.6389, 43.9539),
  beach("beach-lloret-de-mar", "Platja de Lloret", "Lloret de Mar", "Catalonia", "ES", "mediterranean", "https://www.lloretdemar.org/", 2.8447, 41.6997),
  beach("beach-rimini", "Spiaggia di Rimini", "Rimini", "Emilia-Romagna", "IT", "adriatic", "https://www.riminiturismo.it/", 12.5736, 44.0678),
  beach("beach-dubrovnik-banje", "Banje Beach", "Dubrovnik", "Dubrovnik-Neretva County", "HR", "adriatic", "https://www.tzdubrovnik.hr/", 18.1195, 42.6408),
];

export function getMajorBeachById(id: string): MajorBeach | undefined {
  return MAJOR_BEACHES.find((entry) => entry.id === id);
}

function toEntity(entry: MajorBeach): EUIMMapEntity {
  return {
    id: entry.id,
    category: "travel",
    subcategory: entry.coastalType,
    layerId: "major-beaches-seaside-resorts",
    name: entry.name,
    countryCode: entry.countryCode,
    geometry: { type: "Point", coordinates: [entry.longitude, entry.latitude] },
    icon: "beach",
    color: "#0284c7",
    sourceIds: entry.sourceIds,
    properties: {
      municipality: entry.municipality,
      region: entry.region,
      coastalType: entry.coastalType,
      officialTourismUrl: entry.officialTourismUrl,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    MAJOR_BEACHES.filter((entry) => isCountryInEUIMScope(entry.countryCode)).map(
      toEntity,
    ),
  );
}

export type MajorBeachesAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  ukEntries: string[];
};

export function auditMajorBeaches(): MajorBeachesAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const ukEntries: string[] = [];

  for (const entry of MAJOR_BEACHES) {
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
    total: MAJOR_BEACHES.length,
    inScope: MAJOR_BEACHES.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    ukEntries,
  };
}
