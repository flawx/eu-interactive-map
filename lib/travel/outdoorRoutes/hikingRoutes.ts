/**
 * Major Hiking Routes — curated, simplified LineStrings through well-known
 * waypoint sequences along long-distance European hiking routes. See
 * `types.ts` for the data-honesty note: these are recognisable-course
 * approximations, not survey-grade trail geometry.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import type { OutdoorRoute } from "./types";

const SOURCE_IDS: readonly string[] = [DATA_LAYER_SOURCE_IDS.HIKING_ROUTES_SOURCE];

export const HIKING_ROUTES: readonly OutdoorRoute[] = [
  {
    id: "hiking-gr5-vosges-jura",
    routeType: "hiking",
    name: "GR5 — Vosges to Jura section",
    routeCode: "GR5",
    distanceKm: 380,
    countries: ["FR"],
    operator: "Fédération Française de la Randonnée Pédestre",
    officialWebsite: "https://www.ffrandonnee.fr/",
    description:
      "Simplified course of the French GR5 long-distance trail from the Vosges through the Jura toward Lake Geneva, following the Lorraine–Bourgogne–Franche-Comté waypoint chain.",
    coordinates: [
      [7.0128, 48.3608],
      [6.8483, 48.0501],
      [6.6425, 47.7458],
      [6.3494, 47.4067],
      [6.1494, 47.0967],
      [6.0333, 46.7],
      [6.1432, 46.2044],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "hiking-camino-frances-fragment",
    routeType: "hiking",
    name: "Camino de Santiago — Camino Francés (Sarria–Santiago fragment)",
    routeCode: "Camino Francés",
    distanceKm: 115,
    countries: ["ES"],
    operator: "Xunta de Galicia — Turismo de Galicia",
    officialWebsite: "https://www.caminodesantiago.gal/",
    description:
      "The minimum-distance qualifying fragment of the French Way from Sarria to Santiago de Compostela, following the official town waypoint sequence.",
    coordinates: [
      [-2.6435, 42.7699],
      [-4.3178, 42.7],
      [-6.6167, 42.7833],
      [-7.4136, 42.7799],
      [-7.8639, 42.8],
      [-8.4115, 42.8805],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "hiking-e4-crete-segment",
    routeType: "hiking",
    name: "E4 European Long Distance Path — Crete segment (Samaria Gorge area)",
    routeCode: "E4",
    distanceKm: 320,
    countries: ["EL"],
    operator: "European Ramblers Association",
    officialWebsite: "https://www.era-ewv-ferp.org/",
    description:
      "Simplified western-to-central Crete section of the pan-European E4 path, following the White Mountains and Samaria Gorge waypoint chain.",
    coordinates: [
      [23.5333, 35.3167],
      [23.9531, 35.3833],
      [24.0181, 35.3392],
      [24.4667, 35.3333],
      [24.8667, 35.3167],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "hiking-tmb-approximate",
    routeType: "hiking",
    name: "Tour du Mont Blanc (approximate circuit)",
    routeCode: "TMB",
    distanceKm: 170,
    countries: ["FR", "IT", "CH"],
    operator: "Fédération Française de la Randonnée Pédestre",
    officialWebsite: "https://www.ffrandonnee.fr/",
    description:
      "Approximate circuit of the Tour du Mont Blanc through its three main national stage towns (Les Houches, Courmayeur, Champex), honestly simplified — the real trail loops through many more valleys and passes.",
    coordinates: [
      [6.7994, 45.8919],
      [6.8697, 45.8272],
      [6.9772, 45.7833],
      [7.0575, 45.7939],
      [7.1075, 45.8397],
      [7.0186, 45.9219],
      [6.9436, 45.9694],
      [6.7994, 45.8919],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "hiking-gr10-pyrenees-segment",
    routeType: "hiking",
    name: "GR10 — Pyrénées Atlantiques segment",
    routeCode: "GR10",
    distanceKm: 866,
    countries: ["FR"],
    operator: "Fédération Française de la Randonnée Pédestre",
    officialWebsite: "https://www.ffrandonnee.fr/",
    description:
      "Western Pyrenean segment of the French GR10 trans-Pyrenean trail from Hendaye toward Lescun, following the official stage-town chain.",
    coordinates: [
      [-1.7714, 43.3628],
      [-1.4667, 43.2333],
      [-1.1667, 43.15],
      [-0.7667, 43.0667],
      [-0.5667, 42.95],
    ],
    sourceIds: [...SOURCE_IDS],
  },
];
