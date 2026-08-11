/**
 * Major Running & Recreational Routes — a small curated selection of
 * well-known urban running paths with public, easily-verifiable courses.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import type { OutdoorRoute } from "./types";

const SOURCE_IDS: readonly string[] = [DATA_LAYER_SOURCE_IDS.OPENSTREETMAP_ROUTES];

export const RUNNING_ROUTES: readonly OutdoorRoute[] = [
  {
    id: "running-copenhagen-harbour-loop",
    routeType: "running",
    name: "Copenhagen Harbour Loop",
    routeCode: "CPH Harbour Loop",
    distanceKm: 13,
    countries: ["DK"],
    operator: "Visit Copenhagen",
    officialWebsite: "https://www.visitcopenhagen.com/",
    description:
      "Popular waterfront running loop around Copenhagen's inner harbour, from Islands Brygge to Nyhavn and back along both harbour banks.",
    coordinates: [
      [12.5798, 55.6656],
      [12.5883, 55.6739],
      [12.5983, 55.6797],
      [12.5936, 55.6867],
      [12.5806, 55.6836],
      [12.5729, 55.6746],
      [12.5798, 55.6656],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "running-paris-seine-path",
    routeType: "running",
    name: "Paris Seine Riverside Running Path",
    routeCode: "Paris Seine",
    distanceKm: 10,
    countries: ["FR"],
    operator: "Ville de Paris",
    officialWebsite: "https://www.paris.fr/",
    description:
      "Riverside running path along the Seine from the Eiffel Tower area through the Louvre to Île Saint-Louis, following the Voie Georges Pompidou / quays.",
    coordinates: [
      [2.2945, 48.8584],
      [2.3151, 48.8606],
      [2.3324, 48.8611],
      [2.3417, 48.8578],
      [2.3522, 48.8519],
      [2.3597, 48.8508],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "running-vienna-donauinsel-segment",
    routeType: "running",
    name: "Vienna Donauinsel Running Segment",
    routeCode: "Donauinsel",
    distanceKm: 8,
    countries: ["AT"],
    operator: "Wien Tourismus",
    officialWebsite: "https://www.wien.info/",
    description:
      "Flat, traffic-free running segment along Vienna's Donauinsel (Danube Island), a popular recreational running and cycling corridor.",
    coordinates: [
      [16.4231, 48.2394],
      [16.4304, 48.2489],
      [16.4356, 48.2578],
      [16.4398, 48.2661],
      [16.4467, 48.2751],
    ],
    sourceIds: [...SOURCE_IDS],
  },
];
