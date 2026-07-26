import type {
  IncidentAlertLevel,
  WildfireIncident,
} from "@/lib/incidents/types";

const GDACS_GEOJSON_URL =
  "https://www.gdacs.org/contentdata/xml/gdacsAPP_Home.geojson";

const euCountryCodes = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "EL",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

const iso3ToIso2: Record<string, string> = {
  AUT: "AT",
  BEL: "BE",
  BGR: "BG",
  HRV: "HR",
  CYP: "CY",
  CZE: "CZ",
  DNK: "DK",
  EST: "EE",
  FIN: "FI",
  FRA: "FR",
  DEU: "DE",
  GRC: "GR",
  HUN: "HU",
  IRL: "IE",
  ITA: "IT",
  LVA: "LV",
  LTU: "LT",
  LUX: "LU",
  MLT: "MT",
  NLD: "NL",
  POL: "PL",
  PRT: "PT",
  ROU: "RO",
  SVK: "SK",
  SVN: "SI",
  ESP: "ES",
  SWE: "SE",
};

const euCountryNameToCode: Record<string, string> = {
  Austria: "AT",
  Belgium: "BE",
  Bulgaria: "BG",
  Croatia: "HR",
  Cyprus: "CY",
  Czechia: "CZ",
  "Czech Republic": "CZ",
  Denmark: "DK",
  Estonia: "EE",
  Finland: "FI",
  France: "FR",
  Germany: "DE",
  Greece: "GR",
  Hungary: "HU",
  Ireland: "IE",
  Italy: "IT",
  Latvia: "LV",
  Lithuania: "LT",
  Luxembourg: "LU",
  Malta: "MT",
  Netherlands: "NL",
  Poland: "PL",
  Portugal: "PT",
  Romania: "RO",
  Slovakia: "SK",
  Slovenia: "SI",
  Spain: "ES",
  Sweden: "SE",
};

function normalizeCountryCode(code: string): string {
  const upper = code.toUpperCase();
  if (upper === "GR") return "EL";
  return upper;
}

function resolveCountryCode(
  countryName: string | null,
  countryCodeRaw: string | null,
): string | null {
  if (countryCodeRaw) {
    const trimmed = countryCodeRaw.trim().toUpperCase();
    if (trimmed.length === 3 && iso3ToIso2[trimmed]) {
      return normalizeCountryCode(iso3ToIso2[trimmed]);
    }
    if (trimmed.length === 2 && euCountryCodes.has(trimmed)) {
      return normalizeCountryCode(trimmed);
    }
  }

  if (countryName) {
    const mapped = euCountryNameToCode[countryName.trim()];
    if (mapped) {
      return normalizeCountryCode(mapped);
    }
  }

  return null;
}

function parseAlertLevel(value: unknown): IncidentAlertLevel {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim().toLowerCase();
  if (normalized === "green") return "green";
  if (normalized === "orange") return "orange";
  if (normalized === "red") return "red";
  return "unknown";
}

function resolveGdacsAlertLevel(
  properties: Record<string, unknown>,
): IncidentAlertLevel {
  const candidates = [
    properties.alertlevel,
    properties.alertLevel,
    properties.episodealertlevel,
    properties.episodeAlertLevel,
    properties.severityalertlevel,
  ];

  for (const candidate of candidates) {
    const parsed = parseAlertLevel(candidate);
    if (parsed !== "unknown") {
      return parsed;
    }
  }

  return "unknown";
}

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : null;
}

function parseAreaHectares(properties: Record<string, unknown>): number | null {
  const rawArea =
    parsePositiveNumber(properties.hectares) ??
    parsePositiveNumber(properties.severity);

  const rawAreaUnitCandidate =
    typeof properties.hectaresunit === "string"
      ? properties.hectaresunit
      : typeof properties.severityunit === "string"
        ? properties.severityunit
        : null;

  const rawAreaUnit =
    typeof rawAreaUnitCandidate === "string"
      ? rawAreaUnitCandidate.trim().toLowerCase()
      : null;

  if (rawArea === null) {
    return null;
  }

  if (
    rawAreaUnit === "ha" ||
    rawAreaUnit === "hectare" ||
    rawAreaUnit === "hectares"
  ) {
    return rawArea;
  }

  if (rawAreaUnit === "km2" || rawAreaUnit === "km²") {
    return rawArea * 100;
  }

  if (rawAreaUnit === "acre" || rawAreaUnit === "acres") {
    return rawArea * 0.404685642;
  }

  return null;
}

function extractPointCoordinates(
  geometry: unknown,
): { longitude: number; latitude: number } | null {
  if (
    !geometry ||
    typeof geometry !== "object" ||
    !("type" in geometry) ||
    geometry.type !== "Point" ||
    !("coordinates" in geometry)
  ) {
    return null;
  }

  let coords = geometry.coordinates;

  if (
    Array.isArray(coords) &&
    coords.length === 1 &&
    Array.isArray(coords[0])
  ) {
    coords = coords[0];
  }

  if (
    !Array.isArray(coords) ||
    coords.length < 2 ||
    typeof coords[0] !== "number" ||
    typeof coords[1] !== "number"
  ) {
    return null;
  }

  const longitude = coords[0];
  const latitude = coords[1];

  if (
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  return { longitude, latitude };
}

function extractSourceUrl(link: unknown): string | null {
  if (!Array.isArray(link)) return null;

  for (const item of link) {
    if (
      item &&
      typeof item === "object" &&
      "Key" in item &&
      item.Key === "web" &&
      "Value" in item &&
      typeof item.Value === "string" &&
      /^https?:\/\//i.test(item.Value)
    ) {
      return item.Value.replace(/^http:\/\//i, "https://");
    }
  }

  return null;
}

function alertRank(level: IncidentAlertLevel): number {
  if (level === "red") return 0;
  if (level === "orange") return 1;
  if (level === "green") return 2;
  return 3;
}

export function parseGdacsWildfireIncidents(
  data: unknown,
): WildfireIncident[] {
  if (
    !data ||
    typeof data !== "object" ||
    !("type" in data) ||
    data.type !== "FeatureCollection" ||
    !("features" in data) ||
    !Array.isArray(data.features)
  ) {
    return [];
  }

  const incidentsById = new Map<string, WildfireIncident>();

  for (const feature of data.features) {
    if (!feature || typeof feature !== "object") continue;

    const properties =
      "properties" in feature &&
      feature.properties &&
      typeof feature.properties === "object"
        ? (feature.properties as Record<string, unknown>)
        : null;

    if (!properties) continue;
    if (properties.eventtype !== "WF") continue;

    const point = extractPointCoordinates(
      "geometry" in feature ? feature.geometry : null,
    );
    if (!point) continue;

    const countryName =
      typeof properties.country === "string" && properties.country.trim()
        ? properties.country.trim()
        : null;

    const countryCodeRaw =
      typeof properties.iso3 === "string"
        ? properties.iso3
        : typeof properties.countrycode === "string"
          ? properties.countrycode
          : typeof properties.CountryISO === "string"
            ? properties.CountryISO
            : null;

    const countryCode = resolveCountryCode(countryName, countryCodeRaw);
    if (!countryCode) continue;

    const eventId = properties.eventid;
    const id =
      typeof eventId === "number" || typeof eventId === "string"
        ? String(eventId)
        : null;
    if (!id) continue;

    const title =
      typeof properties.title === "string" && properties.title.trim()
        ? properties.title.trim()
        : null;
    if (!title) continue;

    incidentsById.set(id, {
      id,
      title,
      alertLevel: resolveGdacsAlertLevel(properties),
      longitude: point.longitude,
      latitude: point.latitude,
      countryCode,
      countryName,
      startedAt:
        typeof properties.fromdate === "string" && properties.fromdate.trim()
          ? properties.fromdate.trim()
          : null,
      updatedAt:
        typeof properties.todate === "string" && properties.todate.trim()
          ? properties.todate.trim()
          : null,
      areaHectares: parseAreaHectares(properties),
      populationExposure: null,
      description:
        typeof properties.description === "string" &&
        properties.description.trim()
          ? properties.description.trim()
          : null,
      sourceUrl: extractSourceUrl(properties.link),
      sourceName: "GDACS",
    });
  }

  return Array.from(incidentsById.values()).sort((a, b) => {
    const rankDiff = alertRank(a.alertLevel) - alertRank(b.alertLevel);
    if (rankDiff !== 0) return rankDiff;

    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
  });
}

export async function fetchEuWildfireIncidents(
  signal?: AbortSignal,
): Promise<WildfireIncident[]> {
  const response = await fetch(GDACS_GEOJSON_URL, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "EUInteractiveMap/0.1",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`GDACS fetch failed with ${response.status}`);
  }

  const data: unknown = await response.json();
  return parseGdacsWildfireIncidents(data);
}
