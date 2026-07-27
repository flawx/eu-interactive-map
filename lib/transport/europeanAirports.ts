/**
 * Major European international airports from EUROCONTROL Data Snapshot #58
 * (top 40 European airports in the NM area in 2025).
 *
 * Source dataset:
 * https://www.eurocontrol.int/sites/default/files/2026-03/eurocontrol-data-snapshot-58-dataset.xlsx
 * Publication:
 * https://www.eurocontrol.int/publication/eurocontrol-data-snapshot-58-top-40-european-airports-historic-peak-days
 *
 * rank2025 is the order by Max IFR flight count in that official top-40 set
 * (1 = highest peak-day IFR count). Airports outside the map European
 * perimeter are omitted (Antalya, Istanbul Sabiha Gökçen, Tel Aviv,
 * Gran Canaria).
 */

import { UNESCO_MAP_COUNTRY_CODES } from "@/lib/tourism/unescoEuropeCoverage";

export type EuropeanAirport = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  iataCode: string | null;
  icaoCode: string;
  rank2025: number | null;
  officialWebsite: string | null;
  wikidataId: string | null;
  airportType: "major-international";
};

const ALLOWED = new Set<string>(UNESCO_MAP_COUNTRY_CODES);

/**
 * Curated from EUROCONTROL Snapshot #58 airport names + official / aeronautical
 * identifiers and coordinates. Overseas / non-perimeter sites excluded.
 */
export const EUROPEAN_AIRPORTS: readonly EuropeanAirport[] = [
  {
    id: "airport-cdg",
    name: "Paris Charles de Gaulle",
    city: "Paris",
    countryCode: "FR",
    latitude: 49.0097,
    longitude: 2.5479,
    iataCode: "CDG",
    icaoCode: "LFPG",
    rank2025: 1,
    officialWebsite: "https://www.parisaeroport.fr/en/passengers/paris-charles-de-gaulle",
    wikidataId: "Q46208",
    airportType: "major-international",
  },
  {
    id: "airport-ist",
    name: "Istanbul Airport",
    city: "Istanbul",
    countryCode: "TR",
    latitude: 41.2753,
    longitude: 28.7519,
    iataCode: "IST",
    icaoCode: "LTFM",
    rank2025: 2,
    officialWebsite: "https://www.istairport.com/",
    wikidataId: "Q15059457",
    airportType: "major-international",
  },
  {
    id: "airport-fra",
    name: "Frankfurt Airport",
    city: "Frankfurt",
    countryCode: "DE",
    latitude: 50.0379,
    longitude: 8.5622,
    iataCode: "FRA",
    icaoCode: "EDDF",
    rank2025: 3,
    officialWebsite: "https://www.frankfurt-airport.com/",
    wikidataId: "Q46033",
    airportType: "major-international",
  },
  {
    id: "airport-mad",
    name: "Madrid-Barajas Adolfo Suárez",
    city: "Madrid",
    countryCode: "ES",
    latitude: 40.4983,
    longitude: -3.5676,
    iataCode: "MAD",
    icaoCode: "LEMD",
    rank2025: 4,
    officialWebsite: "https://www.aena.es/en/adolfo-suarez-madrid-barajas.html",
    wikidataId: "Q1430957",
    airportType: "major-international",
  },
  {
    id: "airport-ams",
    name: "Amsterdam Airport Schiphol",
    city: "Amsterdam",
    countryCode: "NL",
    latitude: 52.3105,
    longitude: 4.7683,
    iataCode: "AMS",
    icaoCode: "EHAM",
    rank2025: 5,
    officialWebsite: "https://www.schiphol.nl/",
    wikidataId: "Q1432629",
    airportType: "major-international",
  },
  {
    id: "airport-muc",
    name: "Munich Airport",
    city: "Munich",
    countryCode: "DE",
    latitude: 48.3538,
    longitude: 11.7861,
    iataCode: "MUC",
    icaoCode: "EDDM",
    rank2025: 6,
    officialWebsite: "https://www.munich-airport.com/",
    wikidataId: "Q131402",
    airportType: "major-international",
  },
  {
    id: "airport-lhr",
    name: "London Heathrow",
    city: "London",
    countryCode: "UK",
    latitude: 51.47,
    longitude: -0.4543,
    iataCode: "LHR",
    icaoCode: "EGLL",
    rank2025: 7,
    officialWebsite: "https://www.heathrow.com/",
    wikidataId: "Q8691",
    airportType: "major-international",
  },
  {
    id: "airport-bcn",
    name: "Barcelona-El Prat Josep Tarradellas",
    city: "Barcelona",
    countryCode: "ES",
    latitude: 41.2971,
    longitude: 2.0785,
    iataCode: "BCN",
    icaoCode: "LEBL",
    rank2025: 9,
    officialWebsite: "https://www.aena.es/en/josep-tarradellas-barcelona-el-prat.html",
    wikidataId: "Q56973",
    airportType: "major-international",
  },
  {
    id: "airport-fco",
    name: "Rome Fiumicino Leonardo da Vinci",
    city: "Rome",
    countryCode: "IT",
    latitude: 41.8003,
    longitude: 12.2389,
    iataCode: "FCO",
    icaoCode: "LIRF",
    rank2025: 10,
    officialWebsite: "https://www.adr.it/fiumicino",
    wikidataId: "Q19142",
    airportType: "major-international",
  },
  {
    id: "airport-pmi",
    name: "Palma de Mallorca",
    city: "Palma",
    countryCode: "ES",
    latitude: 39.5517,
    longitude: 2.7388,
    iataCode: "PMI",
    icaoCode: "LEPA",
    rank2025: 11,
    officialWebsite: "https://www.aena.es/en/palma-de-mallorca.html",
    wikidataId: "Q56956",
    airportType: "major-international",
  },
  {
    id: "airport-vie",
    name: "Vienna International Airport",
    city: "Vienna",
    countryCode: "AT",
    latitude: 48.1103,
    longitude: 16.5697,
    iataCode: "VIE",
    icaoCode: "LOWW",
    rank2025: 12,
    officialWebsite: "https://www.viennaairport.com/",
    wikidataId: "Q32907",
    airportType: "major-international",
  },
  {
    id: "airport-bru",
    name: "Brussels Airport",
    city: "Brussels",
    countryCode: "BE",
    latitude: 50.9014,
    longitude: 4.4844,
    iataCode: "BRU",
    icaoCode: "EBBR",
    rank2025: 13,
    officialWebsite: "https://www.brusselsairport.be/",
    wikidataId: "Q73785",
    airportType: "major-international",
  },
  {
    id: "airport-ath",
    name: "Athens International Airport",
    city: "Athens",
    countryCode: "EL",
    latitude: 37.9364,
    longitude: 23.9445,
    iataCode: "ATH",
    icaoCode: "LGAV",
    rank2025: 14,
    officialWebsite: "https://www.aia.gr/",
    wikidataId: "Q211000",
    airportType: "major-international",
  },
  {
    id: "airport-mxp",
    name: "Milan Malpensa",
    city: "Milan",
    countryCode: "IT",
    latitude: 45.6301,
    longitude: 8.7255,
    iataCode: "MXP",
    icaoCode: "LIMC",
    rank2025: 15,
    officialWebsite: "https://www.milanomalpensa-airport.com/",
    wikidataId: "Q60910",
    airportType: "major-international",
  },
  {
    id: "airport-arn",
    name: "Stockholm Arlanda",
    city: "Stockholm",
    countryCode: "SE",
    latitude: 59.6519,
    longitude: 17.9186,
    iataCode: "ARN",
    icaoCode: "ESSA",
    rank2025: 16,
    officialWebsite: "https://www.swedavia.com/arlanda/",
    wikidataId: "Q81896",
    airportType: "major-international",
  },
  {
    id: "airport-zrh",
    name: "Zurich Airport",
    city: "Zurich",
    countryCode: "CH",
    latitude: 47.4647,
    longitude: 8.5492,
    iataCode: "ZRH",
    icaoCode: "LSZH",
    rank2025: 17,
    officialWebsite: "https://www.flughafen-zuerich.ch/",
    wikidataId: "Q159427",
    airportType: "major-international",
  },
  {
    id: "airport-cph",
    name: "Copenhagen Airport",
    city: "Copenhagen",
    countryCode: "DK",
    latitude: 55.618,
    longitude: 12.656,
    iataCode: "CPH",
    icaoCode: "EKCH",
    rank2025: 18,
    officialWebsite: "https://www.cph.dk/",
    wikidataId: "Q206171",
    airportType: "major-international",
  },
  {
    id: "airport-lgw",
    name: "London Gatwick",
    city: "London",
    countryCode: "UK",
    latitude: 51.1537,
    longitude: -0.1821,
    iataCode: "LGW",
    icaoCode: "EGKK",
    rank2025: 19,
    officialWebsite: "https://www.gatwickairport.com/",
    wikidataId: "Q8703",
    airportType: "major-international",
  },
  {
    id: "airport-ory",
    name: "Paris Orly",
    city: "Paris",
    countryCode: "FR",
    latitude: 48.7233,
    longitude: 2.3794,
    iataCode: "ORY",
    icaoCode: "LFPO",
    rank2025: 20,
    officialWebsite: "https://www.parisaeroport.fr/en/passengers/paris-orly",
    wikidataId: "Q46280",
    airportType: "major-international",
  },
  {
    id: "airport-man",
    name: "Manchester Airport",
    city: "Manchester",
    countryCode: "UK",
    latitude: 53.3537,
    longitude: -2.275,
    iataCode: "MAN",
    icaoCode: "EGCC",
    rank2025: 21,
    officialWebsite: "https://www.manchesterairport.co.uk/",
    wikidataId: "Q8709",
    airportType: "major-international",
  },
  {
    id: "airport-osl",
    name: "Oslo Airport Gardermoen",
    city: "Oslo",
    countryCode: "NO",
    latitude: 60.1939,
    longitude: 11.1004,
    iataCode: "OSL",
    icaoCode: "ENGM",
    rank2025: 22,
    officialWebsite: "https://avinor.no/en/airport/oslo-airport/",
    wikidataId: "Q210431",
    airportType: "major-international",
  },
  {
    id: "airport-dub",
    name: "Dublin Airport",
    city: "Dublin",
    countryCode: "IE",
    latitude: 53.4213,
    longitude: -6.2701,
    iataCode: "DUB",
    icaoCode: "EIDW",
    rank2025: 23,
    officialWebsite: "https://www.dublinairport.com/",
    wikidataId: "Q178205",
    airportType: "major-international",
  },
  {
    id: "airport-dus",
    name: "Düsseldorf Airport",
    city: "Düsseldorf",
    countryCode: "DE",
    latitude: 51.2895,
    longitude: 6.7668,
    iataCode: "DUS",
    icaoCode: "EDDL",
    rank2025: 25,
    officialWebsite: "https://www.dus.com/",
    wikidataId: "Q164998",
    airportType: "major-international",
  },
  {
    id: "airport-ber",
    name: "Berlin Brandenburg Airport",
    city: "Berlin",
    countryCode: "DE",
    latitude: 52.3667,
    longitude: 13.5033,
    iataCode: "BER",
    icaoCode: "EDDB",
    rank2025: 26,
    officialWebsite: "https://ber.berlin-airport.de/",
    wikidataId: "Q9687",
    airportType: "major-international",
  },
  {
    id: "airport-nce",
    name: "Nice Côte d'Azur",
    city: "Nice",
    countryCode: "FR",
    latitude: 43.6584,
    longitude: 7.2159,
    iataCode: "NCE",
    icaoCode: "LFMN",
    rank2025: 27,
    officialWebsite: "https://www.nice.aeroport.fr/",
    wikidataId: "Q6664",
    airportType: "major-international",
  },
  {
    id: "airport-stn",
    name: "London Stansted",
    city: "London",
    countryCode: "UK",
    latitude: 51.886,
    longitude: 0.2389,
    iataCode: "STN",
    icaoCode: "EGSS",
    rank2025: 28,
    officialWebsite: "https://www.stanstedairport.com/",
    wikidataId: "Q8710",
    airportType: "major-international",
  },
  {
    id: "airport-hel",
    name: "Helsinki Airport",
    city: "Helsinki",
    countryCode: "FI",
    latitude: 60.3172,
    longitude: 24.9633,
    iataCode: "HEL",
    icaoCode: "EFHK",
    rank2025: 30,
    officialWebsite: "https://www.finavia.fi/en/airports/helsinki-airport",
    wikidataId: "Q210401",
    airportType: "major-international",
  },
  {
    id: "airport-lis",
    name: "Lisbon Humberto Delgado",
    city: "Lisbon",
    countryCode: "PT",
    latitude: 38.7742,
    longitude: -9.1342,
    iataCode: "LIS",
    icaoCode: "LPPT",
    rank2025: 31,
    officialWebsite: "https://www.ana.pt/en/lis",
    wikidataId: "Q82190",
    airportType: "major-international",
  },
  {
    id: "airport-agp",
    name: "Málaga-Costa del Sol",
    city: "Málaga",
    countryCode: "ES",
    latitude: 36.6749,
    longitude: -4.4991,
    iataCode: "AGP",
    icaoCode: "LEMG",
    rank2025: 32,
    officialWebsite: "https://www.aena.es/en/malaga-costa-del-sol.html",
    wikidataId: "Q1431124",
    airportType: "major-international",
  },
  {
    id: "airport-waw",
    name: "Warsaw Chopin",
    city: "Warsaw",
    countryCode: "PL",
    latitude: 52.1657,
    longitude: 20.9671,
    iataCode: "WAW",
    icaoCode: "EPWA",
    rank2025: 33,
    officialWebsite: "https://www.lotnisko-chopina.pl/",
    wikidataId: "Q73794",
    airportType: "major-international",
  },
  {
    id: "airport-prg",
    name: "Prague Václav Havel",
    city: "Prague",
    countryCode: "CZ",
    latitude: 50.1008,
    longitude: 14.26,
    iataCode: "PRG",
    icaoCode: "LKPR",
    rank2025: 34,
    officialWebsite: "https://www.prg.aero/",
    wikidataId: "Q21149",
    airportType: "major-international",
  },
  {
    id: "airport-gva",
    name: "Geneva Airport",
    city: "Geneva",
    countryCode: "CH",
    latitude: 46.2381,
    longitude: 6.1089,
    iataCode: "GVA",
    icaoCode: "LSGG",
    rank2025: 35,
    officialWebsite: "https://www.gva.ch/",
    wikidataId: "Q15282",
    airportType: "major-international",
  },
  {
    id: "airport-ltn",
    name: "London Luton",
    city: "Luton",
    countryCode: "UK",
    latitude: 51.8747,
    longitude: -0.3683,
    iataCode: "LTN",
    icaoCode: "EGGW",
    rank2025: 37,
    officialWebsite: "https://www.london-luton.co.uk/",
    wikidataId: "Q8708",
    airportType: "major-international",
  },
  {
    id: "airport-bud",
    name: "Budapest Ferenc Liszt",
    city: "Budapest",
    countryCode: "HU",
    latitude: 47.4399,
    longitude: 19.2611,
    iataCode: "BUD",
    icaoCode: "LHBP",
    rank2025: 38,
    officialWebsite: "https://www.bud.hu/",
    wikidataId: "Q732576",
    airportType: "major-international",
  },
  {
    id: "airport-alc",
    name: "Alicante-Elche Miguel Hernández",
    city: "Alicante",
    countryCode: "ES",
    latitude: 38.2822,
    longitude: -0.5582,
    iataCode: "ALC",
    icaoCode: "LEAL",
    rank2025: 39,
    officialWebsite: "https://www.aena.es/en/alicante-elche.html",
    wikidataId: "Q1431015",
    airportType: "major-international",
  },
  {
    id: "airport-otp",
    name: "Bucharest Henri Coandă",
    city: "Bucharest",
    countryCode: "RO",
    latitude: 44.5711,
    longitude: 26.085,
    iataCode: "OTP",
    icaoCode: "LROP",
    rank2025: 40,
    officialWebsite: "https://www.bucharestairports.ro/",
    wikidataId: "Q727979",
    airportType: "major-international",
  },
] as const;

/** Airports listed in Snapshot #58 but excluded from this map perimeter. */
export const EUROCONTROL_TOP40_EXCLUDED = [
  { name: "Antalya", reason: "Asian Turkey / outside European map coverage" },
  {
    name: "Istanbul Sabiha Gokcen",
    reason: "Asian side of Istanbul / outside European Thrace filter",
  },
  { name: "Tel Aviv", reason: "Outside European map country set" },
  {
    name: "Gran Canaria",
    reason: "Spanish overseas territory outside European map bounds",
  },
] as const;

export const EUROCONTROL_SNAPSHOT_58 = {
  publicationUrl:
    "https://www.eurocontrol.int/publication/eurocontrol-data-snapshot-58-top-40-european-airports-historic-peak-days",
  datasetUrl:
    "https://www.eurocontrol.int/sites/default/files/2026-03/eurocontrol-data-snapshot-58-dataset.xlsx",
  top40InSource: 40,
  includedCount: EUROPEAN_AIRPORTS.length,
} as const;

export function getEuropeanAirportById(
  airportId: string,
): EuropeanAirport | undefined {
  return EUROPEAN_AIRPORTS.find((airport) => airport.id === airportId);
}

export function getEuropeanAirportByIata(
  iataCode: string,
): EuropeanAirport | undefined {
  const code = iataCode.trim().toUpperCase();
  return EUROPEAN_AIRPORTS.find((airport) => airport.iataCode === code);
}

export function getEuropeanAirportByIcao(
  icaoCode: string,
): EuropeanAirport | undefined {
  const code = icaoCode.trim().toUpperCase();
  return EUROPEAN_AIRPORTS.find((airport) => airport.icaoCode === code);
}

export function validateEuropeanAirports(
  airports: readonly EuropeanAirport[] = EUROPEAN_AIRPORTS,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const iatas = new Set<string>();
  const icaos = new Set<string>();
  const ranks = new Set<number>();

  const expected =
    EUROCONTROL_SNAPSHOT_58.top40InSource -
    EUROCONTROL_TOP40_EXCLUDED.length;
  if (airports.length !== expected) {
    errors.push(
      `Expected ${expected} perimeter airports from top-40 set, found ${airports.length}`,
    );
  }

  for (const airport of airports) {
    if (!airport.id?.startsWith("airport-")) {
      errors.push(`Invalid id: ${airport.id}`);
    }
    if (ids.has(airport.id)) errors.push(`Duplicate id: ${airport.id}`);
    ids.add(airport.id);

    if (!airport.name?.trim()) errors.push(`Missing name: ${airport.id}`);
    if (!airport.city?.trim()) errors.push(`Missing city: ${airport.id}`);

    if (!ALLOWED.has(airport.countryCode)) {
      errors.push(
        `Country not in map perimeter: ${airport.id} (${airport.countryCode})`,
      );
    }

    if (
      !Number.isFinite(airport.latitude) ||
      !Number.isFinite(airport.longitude) ||
      airport.latitude < 34 ||
      airport.latitude > 72 ||
      airport.longitude < -25 ||
      airport.longitude > 45
    ) {
      errors.push(`Coordinates outside European coverage: ${airport.id}`);
    }

    // Istanbul Airport is on the European side; still require European Thrace band.
    if (
      airport.countryCode === "TR" &&
      (airport.longitude > 29.2 || airport.latitude < 40.5)
    ) {
      errors.push(`Turkish airport outside European Thrace: ${airport.id}`);
    }

    if (airport.iataCode) {
      if (!/^[A-Z]{3}$/.test(airport.iataCode)) {
        errors.push(`Invalid IATA: ${airport.id}`);
      }
      if (iatas.has(airport.iataCode)) {
        errors.push(`Duplicate IATA: ${airport.iataCode}`);
      }
      iatas.add(airport.iataCode);
    }

    if (!/^[A-Z]{4}$/.test(airport.icaoCode)) {
      errors.push(`Invalid ICAO: ${airport.id}`);
    }
    if (icaos.has(airport.icaoCode)) {
      errors.push(`Duplicate ICAO: ${airport.icaoCode}`);
    }
    icaos.add(airport.icaoCode);

    if (airport.rank2025 != null) {
      if (!Number.isInteger(airport.rank2025) || airport.rank2025 < 1) {
        errors.push(`Invalid rank: ${airport.id}`);
      }
      if (ranks.has(airport.rank2025)) {
        errors.push(`Duplicate rank: ${airport.rank2025}`);
      }
      ranks.add(airport.rank2025);
    }

    if (
      airport.officialWebsite &&
      !airport.officialWebsite.startsWith("https://")
    ) {
      errors.push(`Official website must be HTTPS: ${airport.id}`);
    }

    if (airport.airportType !== "major-international") {
      errors.push(`Invalid airportType: ${airport.id}`);
    }
  }

  return errors;
}

if (process.env.NODE_ENV !== "production") {
  const validationErrors = validateEuropeanAirports();
  if (validationErrors.length > 0) {
    console.error("[europeanAirports]", validationErrors.join("; "));
  }
}
