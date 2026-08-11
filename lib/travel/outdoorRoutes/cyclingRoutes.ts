/**
 * Major Cycling Routes — simplified LineStrings through official EuroVelo
 * city waypoints. See `types.ts` for the data-honesty note.
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import type { OutdoorRoute } from "./types";

const SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.EUROVELO,
  DATA_LAYER_SOURCE_IDS.OPENSTREETMAP_ROUTES,
];

export const CYCLING_ROUTES: readonly OutdoorRoute[] = [
  {
    id: "cycling-ev6-danube-segment",
    routeType: "cycling",
    name: "EuroVelo 6 — Danube segment (Passau to Budapest)",
    routeCode: "EV6",
    distanceKm: 600,
    countries: ["DE", "AT", "SK", "HU"],
    operator: "European Cyclists' Federation (ECF)",
    officialWebsite: "https://en.eurovelo.com/ev6",
    description:
      "Simplified course of EuroVelo 6 along the Danube from Passau through Vienna and Bratislava to Budapest, following official city waypoints; geometry approximated from OpenStreetMap-derived reference points.",
    coordinates: [
      [13.4312, 48.5667],
      [14.2861, 48.3069],
      [14.5133, 48.2],
      [15.2, 48.3167],
      [16.3738, 48.2082],
      [17.1077, 48.1486],
      [19.0402, 47.4979],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "cycling-ev15-rhine-segment",
    routeType: "cycling",
    name: "EuroVelo 15 — Rhine Cycle Route (Strasbourg to Rotterdam segment)",
    routeCode: "EV15",
    distanceKm: 700,
    countries: ["FR", "DE", "NL"],
    operator: "European Cyclists' Federation (ECF)",
    officialWebsite: "https://en.eurovelo.com/ev15",
    description:
      "Simplified course of the Rhine Cycle Route from Strasbourg through Mainz, Cologne, and Nijmegen to Rotterdam, using official city waypoints; geometry approximated from OpenStreetMap-derived reference points.",
    coordinates: [
      [7.7521, 48.5734],
      [8.4037, 49.0069],
      [8.2472, 49.9929],
      [6.9603, 50.9375],
      [6.5665, 51.9851],
      [5.8625, 51.845],
      [4.4777, 51.9244],
    ],
    sourceIds: [...SOURCE_IDS],
  },
  {
    id: "cycling-ev1-atlantic-coast-segment",
    routeType: "cycling",
    name: "EuroVelo 1 — Atlantic Coast Route (Brittany to Basque Coast segment)",
    routeCode: "EV1",
    distanceKm: 900,
    countries: ["FR"],
    operator: "European Cyclists' Federation (ECF)",
    officialWebsite: "https://en.eurovelo.com/ev1",
    description:
      "Simplified French Atlantic segment of EuroVelo 1 from Saint-Malo to Hendaye, following official coastal waypoint towns; geometry approximated from OpenStreetMap-derived reference points.",
    coordinates: [
      [-2.0261, 48.6493],
      [-2.7594, 47.6597],
      [-2.2, 47.2167],
      [-1.5457, 46.1667],
      [-1.1521, 44.8378],
      [-1.2544, 43.6],
      [-1.7714, 43.3628],
    ],
    sourceIds: [...SOURCE_IDS],
  },
];
