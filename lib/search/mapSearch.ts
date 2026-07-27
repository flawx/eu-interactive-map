import {
  euInstitutionsByCountry,
  nationalDaysByCountry,
  type EuInstitutionId,
} from "@/lib/data/countryFacts";
import { EU_CAPITALS, EU_MEMBER_COUNTRY_CODES } from "@/lib/europe/euCapitals";
import {
  EU_INSTITUTIONS,
  uniquePhysicalSites,
  type EuInstitutionId as MainEuInstitutionId,
} from "@/lib/europe/euInstitutions";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { UNESCO_WORLD_HERITAGE_SITES } from "@/lib/tourism/unescoWorldHeritage";
import {
  EUROPEAN_HERITAGE_LABEL_SITES,
  type EuropeanHeritageLabelSite,
} from "@/lib/tourism/europeanHeritageLabel";
import { MAJOR_TOURIST_PLACES } from "@/lib/tourism/majorTouristPlaces";
import { EUROPEAN_AIRPORTS } from "@/lib/transport/europeanAirports";
import { EUROSTAR_STATIONS } from "@/lib/transport/eurostarNetwork";
import {
  getActiveTemporaryControls,
  SCHENGEN_BORDER_CROSSING_POINTS,
  type BorderCrossingMode,
  type TemporaryInternalBorderControl,
} from "@/lib/security/schengenBorders";

export type MapSearchResultType =
  | "country"
  | "capital"
  | "wildfire"
  | "eu_institution"
  | "unesco_site"
  | "european_heritage_label"
  | "tourist_place"
  | "airport"
  | "eurostar_station"
  | "border_crossing"
  | "temporary_border_control"
  | "categorized_place"
  | "external_place";

export type MapSearchCategory =
  | "countries_capitals"
  | "eu_capitals"
  | "eu_institutions"
  | "unesco_sites"
  | "european_heritage_label_sites"
  | "tourist_places"
  | "airports"
  | "international_stations"
  | "borders_and_controls"
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
  institutionId?: MainEuInstitutionId;
  siteId?: string;
  unescoSiteId?: string;
  ehlSiteId?: string;
  ehlLocationId?: string;
  touristPlaceId?: string;
  airportId?: string;
  eurostarStationId?: string;
  borderCrossingId?: string;
  temporaryControlId?: string;
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

/** Only Court of Justice / Court of Auditors remain in this legacy seat list. */
const COURT_SEATS = INSTITUTION_SEATS.filter(
  (seat) => seat.id === "court-of-justice" || seat.id === "court-of-auditors",
);

function mainInstitutionLocalName(
  id: MainEuInstitutionId,
  locale: Locale,
): string {
  const tp = getMessages(locale).institutionPanel;
  switch (id) {
    case "european-commission":
      return tp.nameCommission;
    case "european-council":
      return tp.nameEuropeanCouncil;
    case "council-of-the-eu":
      return tp.nameCouncilOfTheEu;
    case "european-parliament":
      return tp.nameParliament;
    case "european-central-bank":
      return tp.nameEcb;
  }
}

function mainInstitutionShortName(
  id: MainEuInstitutionId,
  locale: Locale,
): string {
  const tp = getMessages(locale).institutionPanel;
  switch (id) {
    case "european-commission":
      return tp.shortCommission;
    case "european-council":
      return tp.shortEuropeanCouncil;
    case "council-of-the-eu":
      return tp.shortCouncilOfTheEu;
    case "european-parliament":
      return tp.shortParliament;
    case "european-central-bank":
      return tp.shortEcb;
  }
}

/**
 * Search entries for the five main EU institutions: one logical result per
 * institution plus one per unique physical site (so "Berlaymont" or
 * "Europa building" resolve directly to their location).
 */
function buildMainEuInstitutionSearchResults(locale: Locale): MapSearchResult[] {
  const results: MapSearchResult[] = [];

  for (const institution of EU_INSTITUTIONS) {
    const primarySite = institution.sites[0];
    const name = mainInstitutionLocalName(institution.id, locale);
    const shortName = mainInstitutionShortName(institution.id, locale);
    const cities = [...new Set(institution.sites.map((site) => site.city))];
    const subtitle =
      cities.length > 1
        ? cities.join(" · ")
        : `${primarySite.city} · ${countryDisplayName(primarySite.countryCode, locale)}`;

    results.push({
      id: `eu-institution:${institution.id}`,
      type: "eu_institution",
      category: "eu_institutions",
      title: name,
      subtitle,
      longitude: primarySite.longitude,
      latitude: primarySite.latitude,
      icon: "institution",
      countryCode: primarySite.countryCode,
      institutionId: institution.id,
      source: "local",
      metadata: {
        sharedSite: false,
        searchText: [
          name,
          shortName,
          institution.canonicalName,
          institution.shortName,
          ...institution.aliases,
          ...cities,
        ].join(" "),
      },
    });
  }

  for (const site of uniquePhysicalSites()) {
    const primaryInstitutionId = site.institutionIds[0];
    const countryLabel = countryDisplayName(site.countryCode, locale);
    const institutionShortNames = site.institutionIds.map((id) =>
      mainInstitutionShortName(id, locale),
    );
    const sharedLabel = getMessages(locale).institutionPanel.sharedSite;
    const subtitle = site.sharedSite
      ? `${site.city} · ${countryLabel} · ${sharedLabel}`
      : `${site.city} · ${countryLabel}`;

    results.push({
      id: `eu-institution-site:${site.id}`,
      type: "eu_institution",
      category: "eu_institutions",
      title: site.name,
      subtitle,
      longitude: site.longitude,
      latitude: site.latitude,
      icon: "institution",
      countryCode: site.countryCode,
      institutionId: primaryInstitutionId,
      siteId: site.id,
      source: "local",
      metadata: {
        sharedSite: site.sharedSite,
        searchText: [
          site.name,
          ...site.aliases,
          site.city,
          site.countryCode,
          ...institutionShortNames,
        ].join(" "),
      },
    });
  }

  return results;
}

function unescoIconForCategory(
  category: "cultural" | "natural" | "mixed",
): string {
  switch (category) {
    case "cultural":
      return "unesco-cultural";
    case "natural":
      return "unesco-natural";
    case "mixed":
      return "unesco-mixed";
  }
}

/** One search entry per UNESCO World Heritage site in the dataset. */
function buildUnescoSiteSearchResults(locale: Locale): MapSearchResult[] {
  const t = getMessages(locale);

  return UNESCO_WORLD_HERITAGE_SITES.map((site) => {
    const countryNames = site.countryCodes.map((code) =>
      countryDisplayName(code === "EL" ? "GR" : code, locale),
    );
    const countriesLabel = countryNames.join(" · ");
    const subtitleParts = [countriesLabel, String(site.inscriptionYear)];
    if (site.dangerStatus === "in-danger") {
      subtitleParts.push(t.unescoPanel.inDanger);
    }

    return {
      id: `unesco-site:${site.id}`,
      type: "unesco_site",
      category: "unesco_sites",
      title: site.canonicalName,
      subtitle: subtitleParts.join(" · "),
      longitude: site.longitude,
      latitude: site.latitude,
      icon: unescoIconForCategory(site.category),
      countryCode: site.countryCodes[0],
      unescoSiteId: site.id,
      source: "local",
      metadata: {
        category: site.category,
        dangerStatus: site.dangerStatus,
        searchText: [
          site.canonicalName,
          site.location ?? "",
          String(site.unescoId),
          site.category,
          ...site.countryCodes,
          ...countryNames,
        ].join(" "),
      },
    } satisfies MapSearchResult;
  });
}

function representativeEhlLocation(
  site: EuropeanHeritageLabelSite,
): EuropeanHeritageLabelSite["locations"][number] | null {
  return (
    site.locations.find((location) => location.representativePoint) ??
    site.locations[0] ??
    null
  );
}

/**
 * One search entry per logical European Heritage Label site (not per
 * location) — serial/transnational properties still resolve to a single
 * result, focused on their representative location.
 */
function buildEuropeanHeritageLabelSearchResults(
  locale: Locale,
): MapSearchResult[] {
  const t = getMessages(locale);

  return EUROPEAN_HERITAGE_LABEL_SITES.filter(
    (site) => site.locations.length > 0,
  ).map((site) => {
    const representative = representativeEhlLocation(site)!;
    const countryNames = site.countryCodes.map((code) =>
      countryDisplayName(code === "EL" ? "GR" : code, locale),
    );
    const countriesLabel = countryNames.join(" · ");
    const subtitleParts = [countriesLabel, String(site.awardYear)];
    if (site.serial) {
      subtitleParts.push(t.ehlPanel.serial);
    }

    return {
      id: `ehl-site:${site.id}`,
      type: "european_heritage_label",
      category: "european_heritage_label_sites",
      title: site.canonicalName,
      subtitle: subtitleParts.join(" · "),
      longitude: representative.longitude,
      latitude: representative.latitude,
      icon: site.serial ? "ehl-serial" : "ehl",
      countryCode: site.countryCodes[0],
      ehlSiteId: site.id,
      ehlLocationId: representative.id,
      source: "local",
      metadata: {
        serial: site.serial,
        transnational: site.transnational,
        searchText: [
          site.canonicalName,
          String(site.awardYear),
          ...site.countryCodes,
          ...countryNames,
          ...site.locations.map((location) => location.name),
          ...site.locations.map((location) => location.cityOrRegion),
        ].join(" "),
      },
    } satisfies MapSearchResult;
  });
}

/** One search entry per curated major tourist place. */
function buildTouristPlaceSearchResults(locale: Locale): MapSearchResult[] {
  const t = getMessages(locale);

  return MAJOR_TOURIST_PLACES.map((place) => {
    const countryName = countryDisplayName(
      place.countryCode === "EL" ? "GR" : place.countryCode,
      locale,
    );
    const categoryLabel = t.touristPlacePanel.categories[place.category];

    return {
      id: `tourist-place:${place.id}`,
      type: "tourist_place",
      category: "tourist_places",
      title: place.canonicalName,
      subtitle: [place.cityOrRegion, countryName, categoryLabel]
        .filter(Boolean)
        .join(" · "),
      longitude: place.longitude,
      latitude: place.latitude,
      icon: `tourist-${place.category}`,
      countryCode: place.countryCode,
      touristPlaceId: place.id,
      source: "local",
      metadata: {
        category: place.category,
        searchText: [
          place.canonicalName,
          place.cityOrRegion,
          place.countryCode,
          countryName,
          categoryLabel,
          ...place.aliases,
          place.unescoSiteId ?? "",
        ].join(" "),
      },
    } satisfies MapSearchResult;
  });
}

function buildAirportSearchResults(locale: Locale): MapSearchResult[] {
  return EUROPEAN_AIRPORTS.map((airport) => {
    const countryName = countryDisplayName(
      airport.countryCode === "EL" ? "GR" : airport.countryCode,
      locale,
    );
    const codes = [airport.iataCode, airport.icaoCode].filter(Boolean);
    const subtitle = [airport.city, countryName, ...codes]
      .filter(Boolean)
      .join(" · ");

    return {
      id: `airport:${airport.id}`,
      type: "airport",
      category: "airports",
      title: airport.name,
      subtitle,
      longitude: airport.longitude,
      latitude: airport.latitude,
      icon: "airport",
      countryCode: airport.countryCode,
      airportId: airport.id,
      source: "local",
      metadata: {
        rank2025: airport.rank2025,
        searchText: [
          airport.name,
          airport.city,
          airport.iataCode ?? "",
          airport.icaoCode,
          airport.countryCode,
          countryName,
          "airport",
          "aéroport",
          "aeroport",
        ].join(" "),
      },
    } satisfies MapSearchResult;
  });
}

function borderModeSearchBucket(mode: BorderCrossingMode): string {
  if (mode === "rail") return "rail";
  if (mode === "air") return "air";
  if (mode === "sea" || mode === "river") return "sea";
  return "road";
}

function buildBorderCrossingSearchResults(locale: Locale): MapSearchResult[] {
  const t = getMessages(locale);
  const modeLabels = t.borderCrossingPanel.modes;

  return SCHENGEN_BORDER_CROSSING_POINTS.map((point) => {
    const countryName = countryDisplayName(
      point.countryCode === "EL" ? "GR" : point.countryCode,
      locale,
    );
    const neighbourName = point.neighbouringCountryCode
      ? countryDisplayName(
          point.neighbouringCountryCode === "EL"
            ? "GR"
            : point.neighbouringCountryCode,
          locale,
        )
      : "";
    const modeLabel = modeLabels[point.mode];
    const subtitle = [countryName, neighbourName, modeLabel]
      .filter(Boolean)
      .join(" · ");

    return {
      id: `border-crossing:${point.id}`,
      type: "border_crossing",
      category: "borders_and_controls",
      title: point.officialName,
      subtitle,
      longitude: point.longitude,
      latitude: point.latitude,
      icon: `border-${borderModeSearchBucket(point.mode)}`,
      countryCode: point.countryCode,
      borderCrossingId: point.id,
      source: "local",
      metadata: {
        mode: point.mode,
        status: point.status,
        searchText: [
          point.officialName,
          point.localName ?? "",
          point.countryCode,
          point.neighbouringCountryCode ?? "",
          countryName,
          neighbourName,
          modeLabel,
          modeLabels[point.mode],
          point.mode,
          "border",
          "frontière",
          "grenze",
          "schengen",
        ].join(" "),
      },
    } satisfies MapSearchResult;
  });
}

function buildTemporaryControlSearchResults(
  locale: Locale,
  controls: readonly TemporaryInternalBorderControl[],
): MapSearchResult[] {
  const active = getActiveTemporaryControls(controls);
  const centroids: Record<string, [number, number]> = {
    AT: [14.55, 47.52],
    BE: [4.47, 50.5],
    DE: [10.45, 51.16],
    DK: [10.0, 56.0],
    ES: [-3.7, 40.4],
    FR: [2.35, 46.6],
    HU: [19.5, 47.16],
    IT: [12.5, 42.5],
    LT: [23.9, 55.17],
    LU: [6.13, 49.75],
    NL: [5.29, 52.13],
    NO: [8.5, 60.5],
    PL: [19.15, 52.1],
    SE: [15.0, 62.0],
    SI: [14.8, 46.15],
    SK: [19.5, 48.7],
    CH: [8.23, 46.82],
    CZ: [15.47, 49.82],
  };

  return active.map((control) => {
    const implementingName = countryDisplayName(
      control.implementingCountryCode === "EL"
        ? "GR"
        : control.implementingCountryCode,
      locale,
    );
    const affectedNames = control.affectedCountryCodes
      .map((code) =>
        countryDisplayName(code === "EL" ? "GR" : code, locale),
      )
      .join(" · ");
    const center = centroids[control.implementingCountryCode] ?? [10, 50];

    return {
      id: `temporary-border-control:${control.id}`,
      type: "temporary_border_control",
      category: "borders_and_controls",
      title: implementingName,
      subtitle: affectedNames || control.scope.slice(0, 80),
      longitude: center[0],
      latitude: center[1],
      icon: "temporary-border-control",
      countryCode: control.implementingCountryCode,
      temporaryControlId: control.id,
      source: "local",
      metadata: {
        scope: control.scope,
        searchText: [
          implementingName,
          control.implementingCountryCode,
          ...control.affectedCountryCodes,
          affectedNames,
          control.scope,
          control.officialReason,
          "temporary border control",
          "contrôle frontalier",
          "schengen",
        ].join(" "),
      },
    } satisfies MapSearchResult;
  });
}

function buildEurostarStationSearchResults(locale: Locale): MapSearchResult[] {
  return EUROSTAR_STATIONS.map((station) => {
    const countryName = countryDisplayName(
      station.countryCode === "EL" ? "GR" : station.countryCode,
      locale,
    );
    const subtitle = [station.city, countryName, "Eurostar"]
      .filter(Boolean)
      .join(" · ");

    return {
      id: `eurostar-station:${station.id}`,
      type: "eurostar_station",
      category: "international_stations",
      title: station.name,
      subtitle,
      longitude: station.longitude,
      latitude: station.latitude,
      icon: "eurostar",
      countryCode: station.countryCode,
      eurostarStationId: station.id,
      source: "local",
      metadata: {
        serviceStatus: station.serviceStatus,
        searchText: [
          station.name,
          station.city,
          station.countryCode,
          countryName,
          "Eurostar",
          "Thalys",
          "train",
          "gare",
          "station",
        ].join(" "),
      },
    } satisfies MapSearchResult;
  });
}

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

function buildStaticLocalIndex(
  locale: Locale,
  temporaryControls: readonly TemporaryInternalBorderControl[] = getActiveTemporaryControls(),
): MapSearchResult[] {
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

  for (const seat of COURT_SEATS) {
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
        legacyInstitutionId: seat.id,
        city: seat.city,
        searchText: [seat.title, seat.city, seat.countryCode, ...seat.aliases].join(
          " ",
        ),
      },
    });
  }

  results.push(...buildMainEuInstitutionSearchResults(locale));
  results.push(...buildUnescoSiteSearchResults(locale));
  results.push(...buildEuropeanHeritageLabelSearchResults(locale));
  results.push(...buildTouristPlaceSearchResults(locale));
  results.push(...buildAirportSearchResults(locale));
  results.push(...buildEurostarStationSearchResults(locale));
  results.push(...buildBorderCrossingSearchResults(locale));
  results.push(
    ...buildTemporaryControlSearchResults(locale, temporaryControls),
  );

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
  temporaryControls: readonly TemporaryInternalBorderControl[] = getActiveTemporaryControls(),
): MapSearchResult[] {
  return [
    ...buildStaticLocalIndex(locale, temporaryControls),
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
    "unesco_sites",
    "european_heritage_label_sites",
    "tourist_places",
    "airports",
    "international_stations",
    "borders_and_controls",
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
