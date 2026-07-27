/**
 * Schengen external border crossing points (Annex 4) and temporary
 * internal border-control notifications.
 *
 * Official sources:
 * - https://home-affairs.ec.europa.eu/policies/schengen/border-crossing_en
 * - https://home-affairs.ec.europa.eu/policies/schengen/schengen-area/temporary-reintroduction-border-control_en
 *
 * Local JSON is produced by `scripts/update-schengen-border-data.ts`
 * (`npm run security:borders:update`). This module never invents coordinates.
 */

import rawBorderDataset from "@/data/schengen-border-crossing-points.json";
import rawTemporaryControlsFallback from "@/data/schengen-temporary-border-controls-fallback.json";

export type BorderCrossingMode =
  | "road"
  | "motorway"
  | "rail"
  | "air"
  | "sea"
  | "river"
  | "pedestrian"
  | "other";

/** @deprecated Prefer BorderCrossingMode */
export type SchengenBorderCrossingMode = BorderCrossingMode;

export type BorderCrossingStatus =
  | "authorised"
  | "temporarily-controlled"
  | "restricted"
  | "unknown";

/** @deprecated Prefer BorderCrossingStatus */
export type SchengenBorderCrossingStatus = BorderCrossingStatus;

export type BorderCoordinateConfidence =
  | "official"
  | "verified"
  | "approximate";

/** @deprecated Prefer BorderCoordinateConfidence */
export type SchengenCoordinateConfidence = BorderCoordinateConfidence;

export type GeometryAccuracy = "notified-scope";
export const TEMPORARY_CONTROL_GEOMETRY_ACCURACY: GeometryAccuracy =
  "notified-scope";

export type SchengenBorderCrossingPoint = {
  id: string;
  officialName: string;
  localName: string | null;
  countryCode: string;
  neighbouringCountryCode: string | null;
  latitude: number;
  longitude: number;
  mode: BorderCrossingMode;
  externalSchengenBorder: boolean;
  status: BorderCrossingStatus;
  openingHours: string | null;
  passengerTraffic: boolean | null;
  freightTraffic: boolean | null;
  officialSourceName: string;
  officialSourceUrl: string;
  coordinateSourceUrl: string | null;
  coordinateConfidence: BorderCoordinateConfidence;
  lastVerifiedAt: string;
};

export type TemporaryInternalBorderControl = {
  id: string;
  implementingCountryCode: string;
  affectedCountryCodes: string[];
  modes: BorderCrossingMode[];
  startAt: string;
  endAt: string;
  scope: string;
  officialReason: string;
  authorisedCrossingNames: string[];
  officialSourceUrl: string;
  fetchedAt: string;
  geometryAccuracy?: GeometryAccuracy;
};

export type SchengenUnresolvedEntry = {
  officialName: string;
  countryCode: string;
  mode: BorderCrossingMode | null;
  reason: string;
};

export type SchengenBorderCrossingDataset = {
  source: {
    name: string;
    url: string;
    pageUrl: string;
    retrievedAt: string;
  };
  points: SchengenBorderCrossingPoint[];
  unresolved: SchengenUnresolvedEntry[];
};

export type TemporaryBorderControlsFallbackDataset = {
  source: {
    name: string;
    url: string;
    retrievedAt: string;
  };
  controls: TemporaryInternalBorderControl[];
};

const DISPLAYABLE_CONFIDENCE = new Set<BorderCoordinateConfidence>([
  "official",
  "verified",
]);

const VALID_MODES = new Set<BorderCrossingMode>([
  "road",
  "motorway",
  "rail",
  "air",
  "sea",
  "river",
  "pedestrian",
  "other",
]);

const VALID_STATUSES = new Set<BorderCrossingStatus>([
  "authorised",
  "temporarily-controlled",
  "restricted",
  "unknown",
]);

/** Known ISO / Eurostat country codes used on the map (plus neighbours). */
const KNOWN_COUNTRY_CODES = new Set([
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
  "EL",
  "GR",
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
  "IS",
  "LI",
  "NO",
  "CH",
  "UK",
  "GB",
  "AL",
  "BA",
  "ME",
  "MK",
  "RS",
  "TR",
  "UA",
  "BY",
  "RU",
  "MD",
  "GI",
  "MA",
  "DZ",
  "TN",
  "EG",
  "LY",
]);

const MAP_BOUNDS = {
  minLongitude: -25,
  maxLongitude: 45,
  minLatitude: 34,
  maxLatitude: 72,
} as const;

const dataset = rawBorderDataset as SchengenBorderCrossingDataset;
const fallbackDataset =
  rawTemporaryControlsFallback as TemporaryBorderControlsFallbackDataset;

export const SCHENGEN_BORDER_DATASET_META = dataset.source;

/** Displayable points only (never approximate). */
export const SCHENGEN_BORDER_CROSSING_POINTS: readonly SchengenBorderCrossingPoint[] =
  dataset.points.filter(
    (point) =>
      DISPLAYABLE_CONFIDENCE.has(point.coordinateConfidence) &&
      point.externalSchengenBorder,
  );

export const SCHENGEN_UNRESOLVED_ENTRIES: readonly SchengenUnresolvedEntry[] =
  dataset.unresolved;

export const FALLBACK_TEMPORARY_CONTROLS_META = fallbackDataset.source;

export const FALLBACK_TEMPORARY_BORDER_CONTROLS: readonly TemporaryInternalBorderControl[] =
  fallbackDataset.controls.map((control) => ({
    ...control,
    geometryAccuracy: control.geometryAccuracy ?? "notified-scope",
  }));

export const SCHENGEN_TEMPORARY_CONTROLS_FALLBACK =
  FALLBACK_TEMPORARY_BORDER_CONTROLS;

export function getSchengenBorderCrossingById(
  id: string,
): SchengenBorderCrossingPoint | undefined {
  return SCHENGEN_BORDER_CROSSING_POINTS.find((point) => point.id === id);
}

export const getCrossingById = getSchengenBorderCrossingById;

export function getTemporaryControlById(
  id: string,
  controls: readonly TemporaryInternalBorderControl[] = FALLBACK_TEMPORARY_BORDER_CONTROLS,
): TemporaryInternalBorderControl | undefined {
  return controls.find((control) => control.id === id);
}

export function isTemporaryControlActive(
  control: TemporaryInternalBorderControl,
  now: Date = new Date(),
): boolean {
  const nowMs = now.getTime();
  const startMs = Date.parse(control.startAt);
  if (!Number.isFinite(startMs) || nowMs < startMs) return false;
  if (!control.endAt) return true;
  const endMs = Date.parse(control.endAt);
  if (!Number.isFinite(endMs)) return false;
  // Inclusive of the entire end calendar day when date-only.
  const endInclusive = control.endAt.length <= 10 ? endMs + 86_399_999 : endMs;
  return nowMs <= endInclusive;
}

export function getActiveTemporaryControls(
  controls: readonly TemporaryInternalBorderControl[] = FALLBACK_TEMPORARY_BORDER_CONTROLS,
  now: Date = new Date(),
): TemporaryInternalBorderControl[] {
  return controls.filter((control) => isTemporaryControlActive(control, now));
}

function isPointInMapBounds(longitude: number, latitude: number): boolean {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= MAP_BOUNDS.minLongitude &&
    longitude <= MAP_BOUNDS.maxLongitude &&
    latitude >= MAP_BOUNDS.minLatitude &&
    latitude <= MAP_BOUNDS.maxLatitude
  );
}

export type SchengenBorderValidationReport = {
  errors: string[];
  officialExtracted: number;
  geolocatedDisplayed: number;
  unresolvedCount: number;
  byCountry: Record<string, number>;
  byMode: Record<string, number>;
  activeTemporaryControls: number;
};

export function validateSchengenBorderData(
  points: readonly SchengenBorderCrossingPoint[] = SCHENGEN_BORDER_CROSSING_POINTS,
  unresolved: readonly SchengenUnresolvedEntry[] = SCHENGEN_UNRESOLVED_ENTRIES,
  temporaryControls: readonly TemporaryInternalBorderControl[] = FALLBACK_TEMPORARY_BORDER_CONTROLS,
): SchengenBorderValidationReport {
  const errors: string[] = [];
  const ids = new Set<string>();
  const byCountry: Record<string, number> = {};
  const byMode: Record<string, number> = {};

  for (const point of points) {
    if (ids.has(point.id)) {
      errors.push(`Duplicate id: ${point.id}`);
    }
    ids.add(point.id);

    if (!point.officialName?.trim()) {
      errors.push(`Missing officialName for ${point.id}`);
    }
    if (!KNOWN_COUNTRY_CODES.has(point.countryCode)) {
      errors.push(`Unknown countryCode for ${point.id}: ${point.countryCode}`);
    }
    if (
      point.neighbouringCountryCode &&
      !KNOWN_COUNTRY_CODES.has(point.neighbouringCountryCode)
    ) {
      errors.push(
        `Unknown neighbouringCountryCode for ${point.id}: ${point.neighbouringCountryCode}`,
      );
    }
    if (!isPointInMapBounds(point.longitude, point.latitude)) {
      errors.push(`Invalid coordinates for ${point.id}`);
    }
    if (!VALID_MODES.has(point.mode)) {
      errors.push(`Invalid mode for ${point.id}: ${point.mode}`);
    }
    if (!VALID_STATUSES.has(point.status)) {
      errors.push(`Invalid status for ${point.id}: ${point.status}`);
    }
    if (point.coordinateConfidence === "approximate") {
      errors.push(`Approximate coordinates must not be displayed: ${point.id}`);
    }
    if (!DISPLAYABLE_CONFIDENCE.has(point.coordinateConfidence)) {
      errors.push(
        `Non-displayable coordinateConfidence for ${point.id}: ${point.coordinateConfidence}`,
      );
    }
    if (!point.officialSourceUrl?.startsWith("https://")) {
      errors.push(`Official source must be HTTPS for ${point.id}`);
    }
    if (!point.lastVerifiedAt) {
      errors.push(`Missing lastVerifiedAt for ${point.id}`);
    }
    if (!point.externalSchengenBorder) {
      errors.push(
        `Internal border must not be presented as external: ${point.id}`,
      );
    }

    byCountry[point.countryCode] = (byCountry[point.countryCode] ?? 0) + 1;
    byMode[point.mode] = (byMode[point.mode] ?? 0) + 1;
  }

  for (const control of temporaryControls) {
    const startMs = Date.parse(control.startAt);
    const endMs = Date.parse(control.endAt);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      errors.push(`Invalid temporary-control dates for ${control.id}`);
    } else if (endMs < startMs) {
      errors.push(`Temporary-control end before start for ${control.id}`);
    }
    if (!control.officialSourceUrl?.startsWith("https://")) {
      errors.push(`Temporary-control source must be HTTPS for ${control.id}`);
    }
  }

  const activeTemporaryControls =
    getActiveTemporaryControls(temporaryControls).length;

  return {
    errors,
    officialExtracted: points.length + unresolved.length,
    geolocatedDisplayed: points.length,
    unresolvedCount: unresolved.length,
    byCountry,
    byMode,
    activeTemporaryControls,
  };
}

if (process.env.NODE_ENV !== "production") {
  const report = validateSchengenBorderData();
  if (report.errors.length > 0) {
    console.error(
      "[schengenBorders]",
      report.errors.slice(0, 20).join("; "),
    );
  }
}
