/**
 * Single source of truth for EU Interactive Map operational coverage.
 * Operational data = EU member states + official EU candidate countries.
 * Basemap world context may still render outside this scope.
 */

export type EUIMCountryStatus =
  | "eu_member"
  | "eu_candidate"
  | "outside_scope";

/** Greece = EL (GISCO / Eurostat). United Kingdom canonical = UK (not GB). */
export const EUIM_EU_MEMBER_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "EL",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
] as const;

/** Official EU candidate countries (no potential-candidate XK). */
export const EUIM_EU_CANDIDATE_CODES = [
  "AL", "BA", "GE", "MD", "ME", "MK", "RS", "TR", "UA",
] as const;

export const EUIM_COUNTRY_CODES = [
  ...EUIM_EU_MEMBER_CODES,
  ...EUIM_EU_CANDIDATE_CODES,
] as const;

export type EUIMCountryCode = (typeof EUIM_COUNTRY_CODES)[number];

/** Explicitly excluded from operational EUIM data (former broader Europe set). */
export const EUIM_EXCLUDED_COUNTRY_CODES = [
  "UK", "GB", "CH", "NO", "IS", "LI", "XK",
] as const;

export const EUIM_MAP_BOUNDS = {
  minLongitude: -25,
  maxLongitude: 45,
  minLatitude: 34,
  maxLatitude: 72,
} as const;

const EU_MEMBER_SET = new Set<string>(EUIM_EU_MEMBER_CODES);
const CANDIDATE_SET = new Set<string>(EUIM_EU_CANDIDATE_CODES);
const IN_SCOPE_SET = new Set<string>(EUIM_COUNTRY_CODES);

const ISO3_TO_EUIM: Record<string, string> = {
  ALB: "AL", AUT: "AT", BEL: "BE", BGR: "BG", BIH: "BA",
  CYP: "CY", CZE: "CZ", DEU: "DE", DNK: "DK", ESP: "ES", EST: "EE",
  FIN: "FI", FRA: "FR", GEO: "GE", GRC: "EL", HRV: "HR",
  HUN: "HU", IRL: "IE", ITA: "IT", LTU: "LT",
  LUX: "LU", LVA: "LV", MDA: "MD", MKD: "MK", MLT: "MT", MNE: "ME",
  NLD: "NL", POL: "PL", PRT: "PT", ROU: "RO", SRB: "RS",
  SVK: "SK", SVN: "SI", SWE: "SE", TUR: "TR", UKR: "UA",
  // Out-of-scope (normalized then rejected by IN_SCOPE_SET)
  GBR: "UK", CHE: "CH", ISL: "IS", LIE: "LI", NOR: "NO", XKX: "XK",
};

/**
 * Approximate rectangles for out-of-scope states that sit inside the Europe
 * basemap bbox. Used when a feature has coordinates but no country code.
 * Tuned to avoid swallowing nearby in-scope border towns (e.g. Calais).
 */
const EXCLUDED_APPROX_BOXES: ReadonlyArray<{
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}> = [
  // Great Britain (avoid Ireland: keep west edge ≥ -5.8)
  { minLon: -5.8, maxLon: 1.65, minLat: 49.9, maxLat: 58.7 },
  // Northern Ireland (approx; may clip a little of Donegal)
  { minLon: -8.2, maxLon: -5.4, minLat: 54.05, maxLat: 55.25 },
  // Switzerland + Liechtenstein
  { minLon: 5.9, maxLon: 10.55, minLat: 45.78, maxLat: 47.82 },
  // Iceland
  { minLon: -25, maxLon: -13.2, minLat: 63.2, maxLat: 66.7 },
  // Southern Norway (Oslo / south) — avoid most of Sweden
  { minLon: 4.5, maxLon: 12.6, minLat: 57.9, maxLat: 64.0 },
  // Northern Norway
  { minLon: 12.0, maxLon: 31.5, minLat: 64.0, maxLat: 71.3 },
  // Kosovo
  { minLon: 20.0, maxLon: 21.8, minLat: 41.8, maxLat: 43.3 },
  // Western Russia (keeps Ukraine / Baltics south of ~54°N)
  { minLon: 30.0, maxLon: 45.0, minLat: 54.0, maxLat: 72.0 },
];

export function normalizeEUIMCountryCode(value: unknown): string | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return null;
  const mapped =
    ISO3_TO_EUIM[raw] ??
    (raw === "GB" ? "UK" : raw === "GR" ? "EL" : raw);
  return mapped || null;
}

export function getEUIMCountryStatus(value: unknown): EUIMCountryStatus {
  const code = normalizeEUIMCountryCode(value);
  if (!code) return "outside_scope";
  if (EU_MEMBER_SET.has(code)) return "eu_member";
  if (CANDIDATE_SET.has(code)) return "eu_candidate";
  return "outside_scope";
}

export function isCountryInEUIMScope(value: unknown): boolean {
  const code = normalizeEUIMCountryCode(value);
  return code !== null && IN_SCOPE_SET.has(code);
}

export function isEuropeanTurkeyPoint(
  longitude: number,
  latitude: number,
): boolean {
  return longitude <= 29.2 && latitude >= 40.5;
}

function inMapBounds(longitude: number, latitude: number): boolean {
  return (
    longitude >= EUIM_MAP_BOUNDS.minLongitude &&
    longitude <= EUIM_MAP_BOUNDS.maxLongitude &&
    latitude >= EUIM_MAP_BOUNDS.minLatitude &&
    latitude <= EUIM_MAP_BOUNDS.maxLatitude
  );
}

function inExcludedApprox(longitude: number, latitude: number): boolean {
  return EXCLUDED_APPROX_BOXES.some(
    (box) =>
      longitude >= box.minLon &&
      longitude <= box.maxLon &&
      latitude >= box.minLat &&
      latitude <= box.maxLat,
  );
}

/**
 * Spatial scope check when no reliable ISO code is available.
 * Rejects basemap-context countries (UK/CH/NO/IS/LI/XK) via approx boxes.
 */
export function isCoordinateInEUIMScope(
  longitude: number,
  latitude: number,
): boolean {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return false;
  if (!inMapBounds(longitude, latitude)) return false;
  // Ceuta / Melilla
  if (latitude < 36.2 && longitude > -6.5 && longitude < 0) return false;
  // Anatolia (Asian Türkiye) — keep Cyprus (≈32–35°E, <36.2°N) and Thrace
  if (
    longitude > 29.2 &&
    latitude < 42.5 &&
    !(longitude <= 35.2 && latitude <= 36.2)
  ) {
    return false;
  }
  if (inExcludedApprox(longitude, latitude)) return false;
  return true;
}

export function isFeatureInEUIMScope(feature: {
  countryCode?: string | null;
  countryCodes?: readonly string[] | null;
  country?: string | null;
  iso2?: string | null;
  iso_a2?: string | null;
  country_code?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  lng?: number | null;
  lat?: number | null;
}): boolean {
  const codes = [
    feature.countryCode,
    feature.country,
    feature.iso2,
    feature.iso_a2,
    feature.country_code,
    ...(feature.countryCodes ?? []),
  ];
  const known = codes.filter((c) => c != null && String(c).trim() !== "");
  if (known.length > 0) {
    return known.some((c) => isCountryInEUIMScope(c));
  }
  const longitude = feature.longitude ?? feature.lng;
  const latitude = feature.latitude ?? feature.lat;
  if (
    typeof longitude === "number" &&
    typeof latitude === "number"
  ) {
    return isCoordinateInEUIMScope(longitude, latitude);
  }
  return false;
}

export function filterFeaturesToEUIMScope<T>(
  features: readonly T[],
  resolve: (feature: T) => {
    countryCode?: string | null;
    countryCodes?: readonly string[] | null;
    longitude?: number | null;
    latitude?: number | null;
  },
): T[] {
  return features.filter((feature) => isFeatureInEUIMScope(resolve(feature)));
}

export function assertRouteEndpointsInEUIMScope(
  points: Array<{
    latitude: number;
    longitude: number;
    countryCode?: string | null;
  } | null | undefined>,
): void {
  for (const point of points) {
    if (!point) continue;
    if (!isRoutingEndpointInEUIMScope(point)) {
      throw new Error("point_outside_coverage");
    }
  }
}

/**
 * Endpoint guard used by routing: country code wins when present;
 * otherwise spatial check.
 */
export function isRoutingEndpointInEUIMScope(point: {
  latitude: number;
  longitude: number;
  countryCode?: string | null;
}): boolean {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
    return false;
  }
  if (point.countryCode) {
    return isCountryInEUIMScope(point.countryCode);
  }
  return isCoordinateInEUIMScope(point.longitude, point.latitude);
}
