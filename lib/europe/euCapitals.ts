import type { Locale } from "@/lib/i18n/config";

export type EuCapital = {
  id: string;
  countryCode: string;
  canonicalName: string;
  nativeName: string;
  aliases: string[];
  longitude: number;
  latitude: number;
  wikidataId: string;
  wikipediaTitles?: Partial<Record<Locale, string>>;
  /** Optional local note (e.g. government seat differs from capital). */
  noteKey?: "governmentInTheHague";
};

/** 27 EU member-state capitals. Country codes match the map (Greece = EL). */
export const EU_CAPITALS: readonly EuCapital[] = [
  {
    id: "vienna",
    countryCode: "AT",
    canonicalName: "Vienna",
    nativeName: "Wien",
    aliases: ["Vienne", "Vienna", "Wien"],
    longitude: 16.3738,
    latitude: 48.2082,
    wikidataId: "Q1741",
  },
  {
    id: "brussels",
    countryCode: "BE",
    canonicalName: "Brussels",
    nativeName: "Bruxelles",
    aliases: ["Brussels", "Bruxelles", "Brussel", "Brüssel"],
    longitude: 4.3517,
    latitude: 50.8503,
    wikidataId: "Q239",
  },
  {
    id: "sofia",
    countryCode: "BG",
    canonicalName: "Sofia",
    nativeName: "София",
    aliases: ["Sofia", "Sofiya", "Sofija"],
    longitude: 23.3219,
    latitude: 42.6977,
    wikidataId: "Q472",
  },
  {
    id: "zagreb",
    countryCode: "HR",
    canonicalName: "Zagreb",
    nativeName: "Zagreb",
    aliases: ["Zagreb"],
    longitude: 15.9819,
    latitude: 45.815,
    wikidataId: "Q1435",
  },
  {
    id: "nicosia",
    countryCode: "CY",
    canonicalName: "Nicosia",
    nativeName: "Λευκωσία",
    aliases: ["Nicosia", "Lefkosia", "Lefkoşa", "Nicosie"],
    longitude: 33.3823,
    latitude: 35.1856,
    wikidataId: "Q3856",
  },
  {
    id: "prague",
    countryCode: "CZ",
    canonicalName: "Prague",
    nativeName: "Praha",
    aliases: ["Prague", "Praha", "Prag", "Praga"],
    longitude: 14.4378,
    latitude: 50.0755,
    wikidataId: "Q1085",
  },
  {
    id: "copenhagen",
    countryCode: "DK",
    canonicalName: "Copenhagen",
    nativeName: "København",
    aliases: ["Copenhagen", "København", "Kopenhagen", "Copenhague"],
    longitude: 12.5683,
    latitude: 55.6761,
    wikidataId: "Q1748",
  },
  {
    id: "tallinn",
    countryCode: "EE",
    canonicalName: "Tallinn",
    nativeName: "Tallinn",
    aliases: ["Tallinn", "Reval"],
    longitude: 24.7536,
    latitude: 59.437,
    wikidataId: "Q1770",
  },
  {
    id: "helsinki",
    countryCode: "FI",
    canonicalName: "Helsinki",
    nativeName: "Helsinki",
    aliases: ["Helsinki", "Helsingfors"],
    longitude: 24.9384,
    latitude: 60.1699,
    wikidataId: "Q1757",
  },
  {
    id: "paris",
    countryCode: "FR",
    canonicalName: "Paris",
    nativeName: "Paris",
    aliases: ["Paris"],
    longitude: 2.3522,
    latitude: 48.8566,
    wikidataId: "Q90",
  },
  {
    id: "berlin",
    countryCode: "DE",
    canonicalName: "Berlin",
    nativeName: "Berlin",
    aliases: ["Berlin"],
    longitude: 13.405,
    latitude: 52.52,
    wikidataId: "Q64",
  },
  {
    id: "athens",
    countryCode: "EL",
    canonicalName: "Athens",
    nativeName: "Αθήνα",
    aliases: ["Athens", "Athína", "Athen", "Athènes", "Athinai"],
    longitude: 23.7275,
    latitude: 37.9838,
    wikidataId: "Q1524",
  },
  {
    id: "budapest",
    countryCode: "HU",
    canonicalName: "Budapest",
    nativeName: "Budapest",
    aliases: ["Budapest"],
    longitude: 19.0402,
    latitude: 47.4979,
    wikidataId: "Q1781",
  },
  {
    id: "dublin",
    countryCode: "IE",
    canonicalName: "Dublin",
    nativeName: "Baile Átha Cliath",
    aliases: ["Dublin", "Baile Átha Cliath"],
    longitude: -6.2603,
    latitude: 53.3498,
    wikidataId: "Q1761",
  },
  {
    id: "rome",
    countryCode: "IT",
    canonicalName: "Rome",
    nativeName: "Roma",
    aliases: ["Rome", "Roma"],
    longitude: 12.4964,
    latitude: 41.9028,
    wikidataId: "Q220",
  },
  {
    id: "riga",
    countryCode: "LV",
    canonicalName: "Riga",
    nativeName: "Rīga",
    aliases: ["Riga", "Rīga"],
    longitude: 24.1052,
    latitude: 56.9496,
    wikidataId: "Q1773",
  },
  {
    id: "vilnius",
    countryCode: "LT",
    canonicalName: "Vilnius",
    nativeName: "Vilnius",
    aliases: ["Vilnius", "Wilno", "Vilna"],
    longitude: 25.2797,
    latitude: 54.6872,
    wikidataId: "Q216",
  },
  {
    id: "luxembourg",
    countryCode: "LU",
    canonicalName: "Luxembourg",
    nativeName: "Lëtzebuerg",
    aliases: ["Luxembourg", "Luxemburg", "Lëtzebuerg", "Luxembourg City"],
    longitude: 6.1296,
    latitude: 49.6116,
    wikidataId: "Q1842",
  },
  {
    id: "valletta",
    countryCode: "MT",
    canonicalName: "Valletta",
    nativeName: "Il-Belt Valletta",
    aliases: ["Valletta", "La Valette", "Valeta"],
    longitude: 14.5146,
    latitude: 35.8989,
    wikidataId: "Q23800",
  },
  {
    id: "amsterdam",
    countryCode: "NL",
    canonicalName: "Amsterdam",
    nativeName: "Amsterdam",
    aliases: ["Amsterdam"],
    longitude: 4.9041,
    latitude: 52.3676,
    wikidataId: "Q727",
    noteKey: "governmentInTheHague",
  },
  {
    id: "warsaw",
    countryCode: "PL",
    canonicalName: "Warsaw",
    nativeName: "Warszawa",
    aliases: ["Warsaw", "Warszawa", "Varsovie", "Warschau"],
    longitude: 21.0122,
    latitude: 52.2297,
    wikidataId: "Q270",
  },
  {
    id: "lisbon",
    countryCode: "PT",
    canonicalName: "Lisbon",
    nativeName: "Lisboa",
    aliases: ["Lisbon", "Lisboa", "Lisbonne"],
    longitude: -9.1393,
    latitude: 38.7223,
    wikidataId: "Q597",
  },
  {
    id: "bucharest",
    countryCode: "RO",
    canonicalName: "Bucharest",
    nativeName: "București",
    aliases: ["Bucharest", "București", "Bucarest", "Bukarest"],
    longitude: 26.1025,
    latitude: 44.4268,
    wikidataId: "Q19660",
  },
  {
    id: "bratislava",
    countryCode: "SK",
    canonicalName: "Bratislava",
    nativeName: "Bratislava",
    aliases: ["Bratislava", "Pressburg", "Pozsony"],
    longitude: 17.1077,
    latitude: 48.1486,
    wikidataId: "Q1780",
  },
  {
    id: "ljubljana",
    countryCode: "SI",
    canonicalName: "Ljubljana",
    nativeName: "Ljubljana",
    aliases: ["Ljubljana", "Laibach"],
    longitude: 14.5058,
    latitude: 46.0569,
    wikidataId: "Q437",
  },
  {
    id: "madrid",
    countryCode: "ES",
    canonicalName: "Madrid",
    nativeName: "Madrid",
    aliases: ["Madrid"],
    longitude: -3.7038,
    latitude: 40.4168,
    wikidataId: "Q2807",
  },
  {
    id: "stockholm",
    countryCode: "SE",
    canonicalName: "Stockholm",
    nativeName: "Stockholm",
    aliases: ["Stockholm"],
    longitude: 18.0686,
    latitude: 59.3293,
    wikidataId: "Q1754",
  },
] as const;

export const EU_MEMBER_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK",
  "EE", "FI", "FR", "DE", "EL", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL",
  "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

export type EuMemberCountryCode = (typeof EU_MEMBER_COUNTRY_CODES)[number];

export function getEuCapitalById(id: string): EuCapital | undefined {
  return EU_CAPITALS.find((capital) => capital.id === id);
}

export function getEuCapitalByCountryCode(
  countryCode: string,
): EuCapital | undefined {
  return EU_CAPITALS.find((capital) => capital.countryCode === countryCode);
}

export function flagRegionCode(countryCode: string): string {
  return countryCode === "EL" ? "GR" : countryCode;
}

export function validateEuCapitals(): string[] {
  const errors: string[] = [];

  if (EU_CAPITALS.length !== 27) {
    errors.push(`Expected 27 capitals, found ${EU_CAPITALS.length}`);
  }

  const codes = new Set<string>();
  const ids = new Set<string>();

  for (const capital of EU_CAPITALS) {
    if (ids.has(capital.id)) {
      errors.push(`Duplicate capital id: ${capital.id}`);
    }
    ids.add(capital.id);

    if (codes.has(capital.countryCode)) {
      errors.push(`Duplicate countryCode: ${capital.countryCode}`);
    }
    codes.add(capital.countryCode);

    if (
      !(EU_MEMBER_COUNTRY_CODES as readonly string[]).includes(
        capital.countryCode,
      )
    ) {
      errors.push(`Unknown member country: ${capital.countryCode}`);
    }

    if (
      !Number.isFinite(capital.longitude) ||
      !Number.isFinite(capital.latitude) ||
      capital.longitude < -25 ||
      capital.longitude > 45 ||
      capital.latitude < 30 ||
      capital.latitude > 72
    ) {
      errors.push(`Implausible coordinates for ${capital.id}`);
    }

    if (!/^Q\d+$/.test(capital.wikidataId)) {
      errors.push(`Invalid Wikidata id for ${capital.id}`);
    }
  }

  for (const code of EU_MEMBER_COUNTRY_CODES) {
    if (!codes.has(code)) {
      errors.push(`Missing capital for member ${code}`);
    }
  }

  return errors;
}

if (process.env.NODE_ENV !== "production") {
  const validationErrors = validateEuCapitals();
  if (validationErrors.length > 0) {
    console.error("[euCapitals]", validationErrors.join("; "));
  }
}
