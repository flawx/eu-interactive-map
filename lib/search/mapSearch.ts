import {
  euInstitutionsByCountry,
  nationalDaysByCountry,
  type EuInstitutionId,
} from "@/lib/data/countryFacts";
import { EU_CAPITALS, EU_MEMBER_COUNTRY_CODES } from "@/lib/europe/euCapitals";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { Locale } from "@/lib/i18n/config";

export type MapSearchResultType =
  | "country"
  | "capital"
  | "wildfire"
  | "eu_institution"
  | "categorized_place"
  | "external_place";

export type MapSearchCategory =
  | "countries_capitals"
  | "eu_capitals"
  | "eu_institutions"
  | "active_alerts"
  | "app_places"
  | "external";

export type MapSearchResult = {
  id: string;
  type: MapSearchResultType;
  category: MapSearchCategory;
  title: string;
  subtitle: string;
  longitude: number;
  latitude: number;
  bbox?: [number, number, number, number];
  icon: string;
  countryCode?: string;
  capitalId?: string;
  incidentId?: string;
  source: "local" | "nominatim";
  metadata: Record<string, string | number | boolean | null>;
};

export type MapSearchGroup = {
  category: MapSearchCategory;
  results: MapSearchResult[];
};

/** Non-EU capitals still indexed for search (Schengen / candidates). */
const NON_EU_CAPITALS_BY_COUNTRY: ReadonlyArray<{
  countryCode: string;
  name: string;
  aliases: readonly string[];
  longitude: number;
  latitude: number;
}> = [
  { countryCode: "IS", name: "Reykjavík", aliases: ["Reykjavik"], longitude: -21.8174, latitude: 64.1466 },
  { countryCode: "LI", name: "Vaduz", aliases: [], longitude: 9.5209, latitude: 47.141 },
  { countryCode: "NO", name: "Oslo", aliases: [], longitude: 10.7522, latitude: 59.9139 },
  { countryCode: "CH", name: "Bern", aliases: ["Berne"], longitude: 7.4474, latitude: 46.948 },
  { countryCode: "AL", name: "Tirana", aliases: ["Tiranë"], longitude: 19.8187, latitude: 41.3275 },
  { countryCode: "BA", name: "Sarajevo", aliases: [], longitude: 18.4131, latitude: 43.8563 },
  { countryCode: "GE", name: "Tbilisi", aliases: [], longitude: 44.8271, latitude: 41.7151 },
  { countryCode: "MD", name: "Chișinău", aliases: ["Chisinau"], longitude: 28.8638, latitude: 47.0105 },
  { countryCode: "ME", name: "Podgorica", aliases: [], longitude: 19.2594, latitude: 42.4304 },
  { countryCode: "MK", name: "Skopje", aliases: [], longitude: 21.4254, latitude: 41.9981 },
  { countryCode: "RS", name: "Belgrade", aliases: ["Beograd", "Belgrad"], longitude: 20.4489, latitude: 44.7866 },
  { countryCode: "TR", name: "Ankara", aliases: [], longitude: 32.8597, latitude: 39.9334 },
  { countryCode: "UA", name: "Kyiv", aliases: ["Kiev", "Київ"], longitude: 30.5234, latitude: 50.4501 },
];

const EU_MEMBER_CODE_SET = new Set<string>(EU_MEMBER_COUNTRY_CODES);

/** Known seats for EU institutions already referenced in countryFacts. */
const INSTITUTION_SEATS: ReadonlyArray<{
  id: EuInstitutionId;
  title: string;
  city: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  aliases: readonly string[];
}> = [
  {
    id: "european-parliament",
    title: "European Parliament",
    city: "Brussels",
    countryCode: "BE",
    longitude: 4.3601,
    latitude: 50.8385,
    aliases: ["Parlement européen", "EP", "Europarlement"],
  },
  {
    id: "european-parliament",
    title: "European Parliament",
    city: "Strasbourg",
    countryCode: "FR",
    longitude: 7.7689,
    latitude: 48.5976,
    aliases: ["Parlement européen Strasbourg"],
  },
  {
    id: "european-parliament",
    title: "European Parliament",
    city: "Luxembourg",
    countryCode: "LU",
    longitude: 6.1375,
    latitude: 49.6181,
    aliases: ["Parlement européen Luxembourg"],
  },
  {
    id: "european-council",
    title: "European Council",
    city: "Brussels",
    countryCode: "BE",
    longitude: 4.3806,
    latitude: 50.8424,
    aliases: ["Conseil européen"],
  },
  {
    id: "council-of-the-eu",
    title: "Council of the European Union",
    city: "Brussels",
    countryCode: "BE",
    longitude: 4.3815,
    latitude: 50.8429,
    aliases: ["Conseil de l'UE", "Council of the EU"],
  },
  {
    id: "european-commission",
    title: "European Commission",
    city: "Brussels",
    countryCode: "BE",
    longitude: 4.3676,
    latitude: 50.843,
    aliases: ["Commission européenne", "EC"],
  },
  {
    id: "european-commission",
    title: "European Commission",
    city: "Luxembourg",
    countryCode: "LU",
    longitude: 6.141,
    latitude: 49.626,
    aliases: ["Commission européenne Luxembourg"],
  },
  {
    id: "court-of-justice",
    title: "Court of Justice of the European Union",
    city: "Luxembourg",
    countryCode: "LU",
    longitude: 6.1406,
    latitude: 49.621,
    aliases: ["CJUE", "Cour de justice"],
  },
  {
    id: "european-central-bank",
    title: "European Central Bank",
    city: "Frankfurt",
    countryCode: "DE",
    longitude: 8.6741,
    latitude: 50.1095,
    aliases: ["ECB", "BCE", "Banque centrale européenne"],
  },
  {
    id: "court-of-auditors",
    title: "European Court of Auditors",
    city: "Luxembourg",
    countryCode: "LU",
    longitude: 6.1418,
    latitude: 49.6245,
    aliases: ["Cour des comptes européenne"],
  },
];

const COUNTRY_ALIASES: Partial<Record<string, readonly string[]>> = {
  EL: ["Greece", "GR", "Hellas", "Grèce", "Griechenland"],
  DE: ["Germany", "Allemagne", "Deutschland"],
  FR: ["France", "Frankreich"],
  ES: ["Spain", "Espagne", "España"],
  IT: ["Italy", "Italie", "Italia"],
  NL: ["Netherlands", "Pays-Bas", "Holland"],
  CZ: ["Czechia", "Czech Republic", "Tchéquie", "République tchèque"],
  UK: ["United Kingdom", "GB"],
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function countryDisplayName(countryCode: string, locale: Locale): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ??
      countryCode
    );
  } catch {
    return countryCode;
  }
}

function buildStaticLocalIndex(locale: Locale): MapSearchResult[] {
  const results: MapSearchResult[] = [];
  const countryCodes = Object.keys(nationalDaysByCountry);

  for (const countryCode of countryCodes) {
    const title = countryDisplayName(countryCode, locale);
    const aliases = [
      countryCode,
      title,
      ...(COUNTRY_ALIASES[countryCode] ?? []),
    ];
    const capital =
      EU_CAPITALS.find((c) => c.countryCode === countryCode) ??
      NON_EU_CAPITALS_BY_COUNTRY.find((c) => c.countryCode === countryCode);

    results.push({
      id: `country:${countryCode}`,
      type: "country",
      category: "countries_capitals",
      title,
      subtitle: countryCode,
      longitude: capital?.longitude ?? 15.2551,
      latitude: capital?.latitude ?? 54.526,
      icon: "country",
      countryCode,
      source: "local",
      metadata: {
        searchText: aliases.join(" "),
      },
    });
  }

  for (const capital of EU_CAPITALS) {
    const countryName = countryDisplayName(capital.countryCode, locale);
    const title =
      capital.wikipediaTitles?.[locale] ?? capital.canonicalName;
    results.push({
      id: `eu-capital:${capital.id}`,
      type: "capital",
      category: "eu_capitals",
      title,
      subtitle: countryName,
      longitude: capital.longitude,
      latitude: capital.latitude,
      icon: "capital",
      countryCode: capital.countryCode,
      capitalId: capital.id,
      source: "local",
      metadata: {
        searchText: [
          title,
          capital.canonicalName,
          capital.nativeName,
          ...capital.aliases,
          countryName,
          capital.countryCode,
        ].join(" "),
      },
    });
  }

  for (const capital of NON_EU_CAPITALS_BY_COUNTRY) {
    if (!(capital.countryCode in nationalDaysByCountry)) continue;
    if (EU_MEMBER_CODE_SET.has(capital.countryCode)) continue;
    const countryName = countryDisplayName(capital.countryCode, locale);
    results.push({
      id: `capital:${capital.countryCode}`,
      type: "capital",
      category: "countries_capitals",
      title: capital.name,
      subtitle: countryName,
      longitude: capital.longitude,
      latitude: capital.latitude,
      icon: "capital",
      countryCode: capital.countryCode,
      source: "local",
      metadata: {
        searchText: [capital.name, ...capital.aliases, countryName, capital.countryCode].join(
          " ",
        ),
      },
    });
  }

  const allowedInstitutionCountries = new Set(
    Object.keys(euInstitutionsByCountry),
  );

  for (const seat of INSTITUTION_SEATS) {
    if (!allowedInstitutionCountries.has(seat.countryCode)) continue;
    const hosted = euInstitutionsByCountry[seat.countryCode] ?? [];
    if (!hosted.includes(seat.id)) continue;

    results.push({
      id: `institution:${seat.id}:${seat.countryCode}:${seat.city}`,
      type: "eu_institution",
      category: "eu_institutions",
      title: seat.title,
      subtitle: `${seat.city} · ${countryDisplayName(seat.countryCode, locale)}`,
      longitude: seat.longitude,
      latitude: seat.latitude,
      icon: "institution",
      countryCode: seat.countryCode,
      source: "local",
      metadata: {
        institutionId: seat.id,
        city: seat.city,
        searchText: [seat.title, seat.city, seat.countryCode, ...seat.aliases].join(
          " ",
        ),
      },
    });
  }

  return results;
}

function wildfireToResult(
  incident: WildfireIncident,
  locale: Locale,
): MapSearchResult {
  const countryLabel = incident.countryCode
    ? countryDisplayName(incident.countryCode, locale)
    : incident.countryName;

  return {
    id: `wildfire:${incident.id}`,
    type: "wildfire",
    category: "active_alerts",
    title: incident.title,
    subtitle: countryLabel ?? "GDACS",
    longitude: incident.longitude,
    latitude: incident.latitude,
    icon: "wildfire",
    countryCode: incident.countryCode ?? undefined,
    incidentId: incident.id,
    source: "local",
    metadata: {
      alertLevel: incident.alertLevel,
      searchText: [
        incident.title,
        incident.countryName,
        incident.countryCode,
        incident.description,
        "wildfire",
        "incendie",
        "fire",
      ]
        .filter(Boolean)
        .join(" "),
    },
  };
}

export function buildLocalSearchIndex(
  locale: Locale,
  wildfires: readonly WildfireIncident[],
): MapSearchResult[] {
  return [
    ...buildStaticLocalIndex(locale),
    ...wildfires.map((incident) => wildfireToResult(incident, locale)),
  ];
}

function scoreMatch(query: string, haystack: string): number {
  const normalizedHaystack = normalizeSearchText(haystack);
  if (!normalizedHaystack.includes(query)) return 0;
  if (normalizedHaystack.startsWith(query)) return 3;
  const tokens = normalizedHaystack.split(" ");
  if (tokens.some((token) => token.startsWith(query))) return 2;
  return 1;
}

export function searchLocalIndex(
  query: string,
  index: readonly MapSearchResult[],
  limit = 10,
): MapSearchGroup[] {
  const normalized = normalizeSearchText(query);
  if (normalized.length < 2) return [];

  const scored = index
    .map((item) => {
      const searchText = String(item.metadata.searchText ?? "");
      const score =
        scoreMatch(normalized, item.title) * 4 +
        scoreMatch(normalized, item.subtitle) * 2 +
        scoreMatch(normalized, searchText) +
        (item.countryCode &&
        normalizeSearchText(item.countryCode) === normalized
          ? 5
          : 0);
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map((entry) => entry.item);

  const order: MapSearchCategory[] = [
    "eu_capitals",
    "countries_capitals",
    "eu_institutions",
    "active_alerts",
    "app_places",
    "external",
  ];

  return order
    .map((category) => ({
      category,
      results: scored.filter((item) => item.category === category),
    }))
    .filter((group) => group.results.length > 0);
}

export function flattenSearchGroups(
  groups: readonly MapSearchGroup[],
): MapSearchResult[] {
  return groups.flatMap((group) => group.results);
}
