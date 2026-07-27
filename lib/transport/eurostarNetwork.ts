/**
 * Eurostar stations and direct (through-service) links.
 *
 * Official station list:
 * https://help.eurostar.com/faq/uk-en/question/What-stations-do-Eurostar-trains-use
 * Station guides:
 * https://www.eurostar.com/uk-en/travel-info/your-trip/stations
 * Route map:
 * https://www.eurostar.com/rw-en/destinations/routemap
 *
 * Routes are undirected logical connections along Eurostar through services.
 * geometryAccuracy is always "schematic" — not the physical rail alignment.
 */

export type EurostarServiceStatus = "regular" | "seasonal";

export type EurostarStation = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  officialUrl: string;
  stationWebsite: string | null;
  wikidataId: string | null;
  serviceStatus: EurostarServiceStatus;
};

export type EurostarRoute = {
  id: string;
  fromStationId: string;
  toStationId: string;
  serviceStatus: EurostarServiceStatus;
  officialUrl: string;
};

const EUROSTAR_ROUTEMAP_URL =
  "https://www.eurostar.com/rw-en/destinations/routemap";
const EUROSTAR_STATIONS_URL =
  "https://www.eurostar.com/uk-en/travel-info/your-trip/stations";

export const EUROSTAR_STATIONS: readonly EurostarStation[] = [
  {
    id: "eurostar-london-st-pancras",
    name: "London St Pancras International",
    city: "London",
    countryCode: "UK",
    latitude: 51.5314,
    longitude: -0.1261,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/london-st-pancras-international",
    stationWebsite: "https://stpancras.com/",
    wikidataId: "Q719530",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-paris-nord",
    name: "Paris Gare du Nord",
    city: "Paris",
    countryCode: "FR",
    latitude: 48.8809,
    longitude: 2.3553,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/paris-gare-du-nord",
    stationWebsite: "https://www.garesetconnexions.sncf/fr/gare/paris-nord",
    wikidataId: "Q745559",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-lille-europe",
    name: "Lille-Europe",
    city: "Lille",
    countryCode: "FR",
    latitude: 50.6393,
    longitude: 3.0757,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/lille-europe",
    stationWebsite: "https://www.garesetconnexions.sncf/fr/gare/lille-europe",
    wikidataId: "Q801088",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-marne-la-vallee",
    name: "Marne-la-Vallée–Chessy (Disneyland Paris)",
    city: "Chessy",
    countryCode: "FR",
    latitude: 48.8698,
    longitude: 2.7835,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/disneyland-paris",
    stationWebsite: null,
    wikidataId: "Q801165",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-paris-cdg",
    name: "Paris Charles de Gaulle Airport (TGV)",
    city: "Paris",
    countryCode: "FR",
    latitude: 49.0036,
    longitude: 2.571,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/paris-charles-de-gaulle-airport",
    stationWebsite: "https://www.parisaeroport.fr/",
    wikidataId: "Q259983",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-brussels-midi",
    name: "Brussels-Midi/Zuid",
    city: "Brussels",
    countryCode: "BE",
    latitude: 50.8353,
    longitude: 4.3358,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/brussels-midi",
    stationWebsite: "https://www.belgiantrain.be/en/station-information/brussels-south",
    wikidataId: "Q800598",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-antwerp",
    name: "Antwerpen-Centraal",
    city: "Antwerp",
    countryCode: "BE",
    latitude: 51.2172,
    longitude: 4.4211,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/antwerp-central",
    stationWebsite: null,
    wikidataId: "Q800414",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-liege",
    name: "Liège-Guillemins",
    city: "Liège",
    countryCode: "BE",
    latitude: 50.6247,
    longitude: 5.5667,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/liege-guillemins",
    stationWebsite: null,
    wikidataId: "Q800938",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-amsterdam-centraal",
    name: "Amsterdam Centraal",
    city: "Amsterdam",
    countryCode: "NL",
    latitude: 52.3789,
    longitude: 4.9003,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/amsterdam-central",
    stationWebsite: "https://www.ns.nl/en/stationsinformatie/amsterdam-centraal",
    wikidataId: "Q800622",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-rotterdam",
    name: "Rotterdam Centraal",
    city: "Rotterdam",
    countryCode: "NL",
    latitude: 51.925,
    longitude: 4.4694,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/rotterdam-central",
    stationWebsite: null,
    wikidataId: "Q801357",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-schiphol",
    name: "Amsterdam Schiphol Airport",
    city: "Schiphol",
    countryCode: "NL",
    latitude: 52.309,
    longitude: 4.762,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/schiphol-airport",
    stationWebsite: "https://www.schiphol.nl/",
    wikidataId: "Q800455",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-aachen",
    name: "Aachen Hbf",
    city: "Aachen",
    countryCode: "DE",
    latitude: 50.7678,
    longitude: 6.0911,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/germany",
    stationWebsite: null,
    wikidataId: "Q300671",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-cologne",
    name: "Cologne Hbf",
    city: "Cologne",
    countryCode: "DE",
    latitude: 50.9432,
    longitude: 6.9587,
    officialUrl: "https://www.eurostar.com/uk-en/train-stations/cologne-central",
    stationWebsite: null,
    wikidataId: "Q1954",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-dusseldorf",
    name: "Düsseldorf Hbf",
    city: "Düsseldorf",
    countryCode: "DE",
    latitude: 51.22,
    longitude: 6.7933,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/germany",
    stationWebsite: null,
    wikidataId: "Q463249",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-dusseldorf-airport",
    name: "Düsseldorf Airport",
    city: "Düsseldorf",
    countryCode: "DE",
    latitude: 51.2915,
    longitude: 6.7869,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/germany",
    stationWebsite: null,
    wikidataId: "Q800701",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-duisburg",
    name: "Duisburg Hbf",
    city: "Duisburg",
    countryCode: "DE",
    latitude: 51.4297,
    longitude: 6.7756,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/germany",
    stationWebsite: null,
    wikidataId: "Q463331",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-essen",
    name: "Essen Hbf",
    city: "Essen",
    countryCode: "DE",
    latitude: 51.4514,
    longitude: 7.0136,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/germany",
    stationWebsite: null,
    wikidataId: "Q318719",
    serviceStatus: "regular",
  },
  {
    id: "eurostar-dortmund",
    name: "Dortmund Hbf",
    city: "Dortmund",
    countryCode: "DE",
    latitude: 51.5178,
    longitude: 7.4592,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/germany",
    stationWebsite: null,
    wikidataId: "Q318781",
    serviceStatus: "regular",
  },
  // Eurostar Snow (winter) — from Brussels, named on the official routemap.
  {
    id: "eurostar-chambery",
    name: "Chambéry-Challes-les-Eaux",
    city: "Chambéry",
    countryCode: "FR",
    latitude: 45.5714,
    longitude: 5.9194,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/french-alps",
    stationWebsite: null,
    wikidataId: "Q2208236",
    serviceStatus: "seasonal",
  },
  {
    id: "eurostar-albertville",
    name: "Albertville",
    city: "Albertville",
    countryCode: "FR",
    latitude: 45.6756,
    longitude: 6.3831,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/french-alps",
    stationWebsite: null,
    wikidataId: "Q2479405",
    serviceStatus: "seasonal",
  },
  {
    id: "eurostar-moutiers",
    name: "Moûtiers-Salins-Brides-les-Bains",
    city: "Moûtiers",
    countryCode: "FR",
    latitude: 45.4864,
    longitude: 6.5308,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/french-alps",
    stationWebsite: null,
    wikidataId: "Q2479391",
    serviceStatus: "seasonal",
  },
  {
    id: "eurostar-bourg-saint-maurice",
    name: "Bourg-Saint-Maurice",
    city: "Bourg-Saint-Maurice",
    countryCode: "FR",
    latitude: 45.6186,
    longitude: 6.7703,
    officialUrl: "https://www.eurostar.com/uk-en/destinations/french-alps",
    stationWebsite: null,
    wikidataId: "Q2208214",
    serviceStatus: "seasonal",
  },
] as const;

function route(
  fromStationId: string,
  toStationId: string,
  serviceStatus: EurostarServiceStatus = "regular",
): EurostarRoute {
  const [a, b] = [fromStationId, toStationId].sort();
  return {
    id: `eurostar-route-${a.replace("eurostar-", "")}__${b.replace("eurostar-", "")}`,
    fromStationId: a,
    toStationId: b,
    serviceStatus,
    officialUrl: EUROSTAR_ROUTEMAP_URL,
  };
}

/**
 * Schematic through-service segments (not interchange-only connections).
 * London–Continent, Paris–Benelux–Netherlands, Brussels–Germany, Snow branch.
 */
export const EUROSTAR_ROUTES: readonly EurostarRoute[] = [
  route("eurostar-london-st-pancras", "eurostar-paris-nord"),
  route("eurostar-london-st-pancras", "eurostar-lille-europe"),
  route("eurostar-london-st-pancras", "eurostar-brussels-midi"),
  route("eurostar-london-st-pancras", "eurostar-rotterdam"),
  route("eurostar-london-st-pancras", "eurostar-amsterdam-centraal"),
  route("eurostar-london-st-pancras", "eurostar-marne-la-vallee"),
  route("eurostar-paris-nord", "eurostar-brussels-midi"),
  route("eurostar-paris-nord", "eurostar-lille-europe"),
  route("eurostar-paris-nord", "eurostar-marne-la-vallee"),
  route("eurostar-paris-nord", "eurostar-paris-cdg"),
  route("eurostar-brussels-midi", "eurostar-antwerp"),
  route("eurostar-antwerp", "eurostar-rotterdam"),
  route("eurostar-rotterdam", "eurostar-schiphol"),
  route("eurostar-schiphol", "eurostar-amsterdam-centraal"),
  route("eurostar-brussels-midi", "eurostar-liege"),
  route("eurostar-liege", "eurostar-aachen"),
  route("eurostar-aachen", "eurostar-cologne"),
  route("eurostar-cologne", "eurostar-dusseldorf"),
  route("eurostar-dusseldorf", "eurostar-dusseldorf-airport"),
  route("eurostar-dusseldorf-airport", "eurostar-duisburg"),
  route("eurostar-duisburg", "eurostar-essen"),
  route("eurostar-essen", "eurostar-dortmund"),
  // Seasonal Eurostar Snow from Brussels
  route("eurostar-brussels-midi", "eurostar-chambery", "seasonal"),
  route("eurostar-chambery", "eurostar-albertville", "seasonal"),
  route("eurostar-albertville", "eurostar-moutiers", "seasonal"),
  route("eurostar-moutiers", "eurostar-bourg-saint-maurice", "seasonal"),
];

export const EUROSTAR_NETWORK_META = {
  stationsUrl: EUROSTAR_STATIONS_URL,
  routemapUrl: EUROSTAR_ROUTEMAP_URL,
  stationsFaqUrl:
    "https://help.eurostar.com/faq/uk-en/question/What-stations-do-Eurostar-trains-use",
  geometryAccuracy: "schematic" as const,
} as const;

export function getEurostarStationById(
  stationId: string,
): EurostarStation | undefined {
  return EUROSTAR_STATIONS.find((station) => station.id === stationId);
}

export function getDirectEurostarDestinations(stationId: string) {
  const linked = new Set<string>();
  for (const r of EUROSTAR_ROUTES) {
    if (r.fromStationId === stationId) linked.add(r.toStationId);
    if (r.toStationId === stationId) linked.add(r.fromStationId);
  }
  return [...linked]
    .map((id) => {
      const station = getEurostarStationById(id);
      const routeEdge = EUROSTAR_ROUTES.find(
        (r) =>
          (r.fromStationId === stationId && r.toStationId === id) ||
          (r.toStationId === stationId && r.fromStationId === id),
      );
      if (!station || !routeEdge) return null;
      return {
        stationId: station.id,
        name: station.name,
        city: station.city,
        serviceStatus: routeEdge.serviceStatus,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function validateEurostarNetwork(
  stations: readonly EurostarStation[] = EUROSTAR_STATIONS,
  routes: readonly EurostarRoute[] = EUROSTAR_ROUTES,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const station of stations) {
    if (!station.id.startsWith("eurostar-")) {
      errors.push(`Invalid station id: ${station.id}`);
    }
    if (ids.has(station.id)) errors.push(`Duplicate station: ${station.id}`);
    ids.add(station.id);

    if (!station.name?.trim()) errors.push(`Missing station name: ${station.id}`);
    if (
      !Number.isFinite(station.latitude) ||
      !Number.isFinite(station.longitude)
    ) {
      errors.push(`Invalid coordinates: ${station.id}`);
    }
    if (!station.officialUrl.startsWith("https://www.eurostar.com/")) {
      errors.push(`Official URL must be eurostar.com: ${station.id}`);
    }
    if (
      station.serviceStatus !== "regular" &&
      station.serviceStatus !== "seasonal"
    ) {
      errors.push(`Invalid serviceStatus: ${station.id}`);
    }
  }

  const routeKeys = new Set<string>();
  for (const r of routes) {
    if (!ids.has(r.fromStationId) || !ids.has(r.toStationId)) {
      errors.push(`Route references missing station: ${r.id}`);
    }
    if (r.fromStationId === r.toStationId) {
      errors.push(`Self-route: ${r.id}`);
    }
    const key = [r.fromStationId, r.toStationId].sort().join("|");
    if (routeKeys.has(key)) errors.push(`Duplicate route pair: ${key}`);
    routeKeys.add(key);

    if (!r.officialUrl.includes("eurostar.com")) {
      errors.push(`Route official URL must be Eurostar: ${r.id}`);
    }
  }

  return errors;
}

if (process.env.NODE_ENV !== "production") {
  const validationErrors = validateEurostarNetwork();
  if (validationErrors.length > 0) {
    console.error("[eurostarNetwork]", validationErrors.join("; "));
  }
}
