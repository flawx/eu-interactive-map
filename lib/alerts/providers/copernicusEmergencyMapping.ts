import {
  geometryIntersectsProjectEurope,
  isAlertInsideProjectEurope,
  normalizeAlertCountryCode,
} from "@/lib/alerts/geography";
import { getAlertSource } from "@/lib/alerts/sourceRegistry";
import type {
  AlertApiResponse,
  AlertConnectorStatus,
  AlertHazard,
  CemsActivationTimeMode,
  NormalizedAlert,
} from "@/lib/alerts/types";

const LIST_URL =
  "https://mapping.emergency.copernicus.eu/activations/api/activations/";
const DETAIL_URL =
  "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/";
const CACHE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 12_000;

export type CemsActivationKind =
  | "landslide"
  | "industrial_accident"
  | "chemical_accident"
  | "explosion"
  | "technical_accident"
  | null;

export type CemsProductKind =
  | "reference"
  | "delineation"
  | "grading"
  | "monitoring"
  | "unknown";

export type CemsMapLayer = {
  format: "geojson" | "vector_tiles" | "cog";
  url: string;
  attribution: string;
};

export type CemsProduct = {
  id: string;
  aoiId: string;
  kind: CemsProductKind;
  feasible: boolean;
  latestVersion: string | null;
  deliveredAt: string | null;
  geometry: GeoJSON.Geometry | null;
  layers: CemsMapLayer[];
  downloadUrl: string | null;
};

export type CemsAoi = {
  id: string;
  name: string;
  geometry: GeoJSON.Geometry | null;
  products: CemsProduct[];
};

export type CemsActivation = {
  code: string;
  name: string;
  reason: string | null;
  category: string;
  subCategory: string | null;
  kind: Exclude<CemsActivationKind, null>;
  countryCodes: string[];
  countryNames: string[];
  centroid: { longitude: number; latitude: number } | null;
  eventTime: string | null;
  activationTime: string;
  updatedAt: string;
  closed: boolean;
  reportUrl: string | null;
  viewerUrl: string;
  aois: CemsAoi[];
  observedAreaSquareKilometers: number | null;
  affectedBuildings: number | null;
  affectedPopulation: number | null;
  substances: string[];
  officialInstructions: string | null;
  emarsReportUrl: string | null;
};

type JsonRecord = Record<string, unknown>;
type CacheEntry<T> = { expiresAt: number; value: T };
let listCache: CacheEntry<CemsActivation[]> | null = null;
let listInFlight: Promise<CemsActivation[]> | null = null;
const detailCache = new Map<string, CacheEntry<CemsActivation>>();
const detailInFlight = new Map<string, Promise<CemsActivation>>();

const COUNTRY_NAMES: Record<string, string> = {
  Albania: "AL", Austria: "AT", Belgium: "BE", Bulgaria: "BG",
  "Bosnia and Herzegovina": "BA", Switzerland: "CH", Cyprus: "CY",
  Czechia: "CZ", "Czech Republic": "CZ", Germany: "DE", Denmark: "DK",
  Spain: "ES", Estonia: "EE", Finland: "FI", France: "FR",
  "United Kingdom": "UK", Georgia: "GE", Greece: "EL", Croatia: "HR",
  Hungary: "HU", Ireland: "IE", Iceland: "IS", Italy: "IT",
  Liechtenstein: "LI", Lithuania: "LT", Luxembourg: "LU", Latvia: "LV",
  Moldova: "MD", "North Macedonia": "MK", Malta: "MT", Montenegro: "ME",
  Netherlands: "NL", Norway: "NO", Poland: "PL", Portugal: "PT",
  Romania: "RO", Serbia: "RS", Slovakia: "SK", Slovenia: "SI",
  Sweden: "SE", Turkey: "TR", Türkiye: "TR", Ukraine: "UA", Kosovo: "XK",
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

function iso(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function countryCode(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  return normalizeAlertCountryCode(COUNTRY_NAMES[raw] ?? raw);
}

export function classifyCemsActivation(
  categoryValue: unknown,
  subCategoryValue: unknown,
  nameValue: unknown,
): CemsActivationKind {
  const category = String(categoryValue ?? "").toLowerCase();
  const context = `${category} ${String(subCategoryValue ?? "")} ${String(nameValue ?? "")}`.toLowerCase();
  if (category === "mass" || /\b(landslide|mudslide|mudflow|rockfall|mass movement)\b/.test(context)) {
    return /\b(landslide|mudslide|mudflow|rockfall|mass movement)\b/.test(context)
      ? "landslide"
      : null;
  }
  if (category !== "industrial" && !/\bindustrial accident\b/.test(context)) {
    return null;
  }
  if (/\b(chemical|toxic|hazardous substance|oil spill|chemical spill)\b/.test(context)) {
    return "chemical_accident";
  }
  if (/\b(explosion|blast)\b/.test(context)) return "explosion";
  if (/\b(technical|infrastructure failure|mine accident)\b/.test(context)) {
    return "technical_accident";
  }
  return "industrial_accident";
}

function splitCoordinatePairs(value: string): number[][] {
  return value
    .split(",")
    .map((pair) => pair.trim().split(/\s+/).slice(0, 2).map(Number))
    .filter(
      (pair) =>
        pair.length === 2 &&
        Number.isFinite(pair[0]) &&
        Number.isFinite(pair[1]),
    );
}

export function parseCemsWkt(value: unknown): GeoJSON.Geometry | null {
  const wkt = text(value);
  if (!wkt) return null;
  const normalized = wkt.replace(/^SRID=\d+;/i, "").trim();
  const point = normalized.match(/^POINT\s*(?:Z\s*)?\(\s*([-\d.]+)\s+([-\d.]+)/i);
  if (point) {
    return { type: "Point", coordinates: [Number(point[1]), Number(point[2])] };
  }
  const polygon = normalized.match(/^POLYGON\s*\(\((.*)\)\)$/i);
  if (polygon) {
    const rings = polygon[1].split(/\)\s*,\s*\(/).map(splitCoordinatePairs);
    return rings.every((ring) => ring.length >= 4)
      ? { type: "Polygon", coordinates: rings }
      : null;
  }
  const multi = normalized.match(/^MULTIPOLYGON\s*\(\(\((.*)\)\)\)$/i);
  if (multi) {
    const polygons = multi[1]
      .split(/\)\)\s*,\s*\(\(/)
      .map((part) => part.split(/\)\s*,\s*\(/).map(splitCoordinatePairs));
    return polygons.every((item) => item.every((ring) => ring.length >= 4))
      ? { type: "MultiPolygon", coordinates: polygons }
      : null;
  }
  return null;
}

function geometryFromUnknown(value: unknown): GeoJSON.Geometry | null {
  if (typeof value === "string") return parseCemsWkt(value);
  const candidate = record(value);
  const type = text(candidate.type);
  if (
    type &&
    ["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"].includes(type)
  ) {
    return candidate as unknown as GeoJSON.Geometry;
  }
  return null;
}

function safePublicUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function layerFormat(value: unknown, url: string): CemsMapLayer["format"] | null {
  const format = String(value ?? "").toLowerCase();
  if (format === "cog" || /\.(tif|tiff)(?:\?|$)/i.test(url)) return "cog";
  if (format.includes("vector") || format === "vt" || /tiles/i.test(url)) {
    return "vector_tiles";
  }
  if (format.includes("json") || /\.geojson(?:\?|$)/i.test(url)) return "geojson";
  return null;
}

function productKind(value: unknown): CemsProductKind {
  const raw = String(value ?? "").toUpperCase();
  if (raw.includes("DEL")) return "delineation";
  if (raw.includes("GRA")) return "grading";
  if (raw.includes("MON")) return "monitoring";
  if (raw.includes("REF")) return "reference";
  return "unknown";
}

function latestVersion(product: JsonRecord): JsonRecord {
  const versions = array(product.versions ?? product.version).map(record);
  if (!versions.length) return product;
  return versions.sort((a, b) => {
    const aNumber = number(a.number) ?? 0;
    const bNumber = number(b.number) ?? 0;
    return bNumber - aNumber;
  })[0];
}

function parseLayers(product: JsonRecord, version: JsonRecord): CemsMapLayer[] {
  const values = [
    ...array(product.layers),
    ...array(version.layers),
  ];
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const item = record(value);
    const url = safePublicUrl(item.url ?? item.href ?? item.downloadUrl);
    if (!url || seen.has(url)) return [];
    const format = layerFormat(item.format ?? item.type, url);
    if (!format) return [];
    seen.add(url);
    return [{ format, url, attribution: "European Union, Copernicus EMS" }];
  });
}

function parseProduct(value: unknown, aoiId: string, index: number): CemsProduct | null {
  const item = record(value);
  const version = latestVersion(item);
  const feasibleValue = item.feasible ?? item.isFeasible;
  const feasible =
    feasibleValue === undefined ||
    feasibleValue === null ||
    feasibleValue === true ||
    String(feasibleValue).toLowerCase() === "true";
  if (!feasible) return null;
  const statusCode = String(version.statusCode ?? "").toUpperCase();
  if (["N", "NF", "NOT_FEASIBLE"].includes(statusCode)) return null;
  return {
    id: text(item.id ?? item.code ?? item.type) ?? `${aoiId}-product-${index}`,
    aoiId,
    kind: productKind(item.type ?? item.productType),
    feasible,
    latestVersion: text(version.number) ?? (number(version.number)?.toString() ?? null),
    deliveredAt: iso(version.deliveryTime ?? version.deliveredAt ?? item.deliveryTime),
    geometry: geometryFromUnknown(version.extent ?? item.extent),
    layers: parseLayers(item, version),
    downloadUrl: safePublicUrl(version.downloadPath ?? item.downloadPath),
  };
}

function parseAoi(value: unknown, index: number): CemsAoi | null {
  const item = record(value);
  const id = text(item.id ?? item.code ?? item.number) ?? `aoi-${index + 1}`;
  const products = array(item.products)
    .map((product, productIndex) => parseProduct(product, id, productIndex))
    .filter((product): product is CemsProduct => Boolean(product));
  const geometry = geometryFromUnknown(item.extent ?? item.geometry);
  if (geometry && !geometryIntersectsProjectEurope(geometry)) return null;
  return {
    id,
    name: text(item.name) ?? `AOI ${index + 1}`,
    geometry,
    products: products.filter(
      (product) =>
        !product.geometry || geometryIntersectsProjectEurope(product.geometry),
    ),
  };
}

function statValues(value: unknown): JsonRecord[] {
  const item = record(value);
  return [
    ...array(value),
    ...array(item.stats),
    ...array(item.statistics),
    ...Object.values(item).flatMap((entry) => array(entry)),
  ].map(record);
}

function parseStatistics(value: unknown): {
  observedAreaSquareKilometers: number | null;
  affectedBuildings: number | null;
  affectedPopulation: number | null;
} {
  let area: number | null = null;
  let buildings: number | null = null;
  let population: number | null = null;
  for (const stat of statValues(value)) {
    const label = String(stat.name ?? stat.label ?? stat.category ?? "").toLowerCase();
    const unit = String(stat.unit ?? "").toLowerCase().replace("²", "2");
    const affected = number(stat.affected ?? stat.value ?? stat.count);
    if (affected == null || affected < 0) continue;
    if (/\b(event extent|affected area|landslide area|damaged area)\b/.test(label)) {
      if (unit.includes("km2")) area = affected;
      else if (unit === "ha" || unit.includes("hectare")) area = affected / 100;
    } else if (/\b(building|built-up)\b/.test(label) && !unit) {
      buildings = affected;
    } else if (/\b(population|people)\b/.test(label) && !unit) {
      population = affected;
    }
  }
  return {
    observedAreaSquareKilometers: area,
    affectedBuildings: buildings,
    affectedPopulation: population,
  };
}

function parseCentroid(value: unknown): CemsActivation["centroid"] {
  const geometry = geometryFromUnknown(value);
  if (geometry?.type === "Point") {
    const [longitude, latitude] = geometry.coordinates;
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return { longitude, latitude };
    }
  }
  const item = record(value);
  const longitude = number(item.longitude ?? item.lon ?? item.x);
  const latitude = number(item.latitude ?? item.lat ?? item.y);
  return longitude == null || latitude == null ? null : { longitude, latitude };
}

export function parseCemsActivationRecord(value: unknown): CemsActivation | null {
  const item = record(value);
  const code = text(item.code ?? item.activationCode);
  const name = text(item.name ?? item.title);
  const category = text(item.category);
  if (!code || !name || !category) return null;
  const subCategory = text(item.subCategory ?? item.subcategory);
  const kind = classifyCemsActivation(category, subCategory, name);
  if (!kind) return null;
  const countries = array(item.countries).map((country) =>
    typeof country === "string" ? country : text(record(country).name ?? record(country).country),
  ).filter((country): country is string => Boolean(country));
  const countryCodes = countries.map(countryCode).filter((code): code is string => Boolean(code));
  const centroid = parseCentroid(item.centroid);
  const activationTime =
    iso(item.activationTime ?? item.activationDate ?? item.createdAt) ??
    new Date(0).toISOString();
  const updatedAt =
    iso(item.updatedAt ?? item.lastUpdate ?? item.modifiedAt) ?? activationTime;
  const aois = array(item.aois ?? item.aoi)
    .map(parseAoi)
    .filter((aoi): aoi is CemsAoi => Boolean(aoi));
  const statistics = parseStatistics(item.stats ?? item.statistics);
  const candidate = {
    countryCodes,
    centroid,
    geometry: aois.find((aoi) => aoi.geometry)?.geometry ?? null,
  };
  if (!isAlertInsideProjectEurope(candidate)) return null;
  return {
    code,
    name,
    reason: text(item.reason ?? item.activationReason ?? item.description),
    category,
    subCategory,
    kind,
    countryCodes,
    countryNames: countries,
    centroid,
    eventTime: iso(item.eventTime ?? item.eventDate),
    activationTime,
    updatedAt,
    closed: Boolean(item.closed ?? item.isClosed ?? item.status === "Closed"),
    reportUrl: safePublicUrl(item.reportLink ?? item.reportUrl),
    viewerUrl: `https://rapidmapping.emergency.copernicus.eu/EMSR${code.replace(/^EMSR/i, "")}`,
    aois,
    observedAreaSquareKilometers: statistics.observedAreaSquareKilometers,
    affectedBuildings: statistics.affectedBuildings,
    affectedPopulation: statistics.affectedPopulation,
    substances: array(item.substances).map(text).filter((entry): entry is string => Boolean(entry)),
    officialInstructions: text(item.officialInstructions),
    emarsReportUrl: safePublicUrl(item.emarsReportUrl),
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 600 },
    });
    if (!response.ok) throw new Error(`cems_http_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function allowedListUrl(value: string): boolean {
  try {
    const url = new URL(value, LIST_URL);
    return url.origin === new URL(LIST_URL).origin &&
      url.pathname === new URL(LIST_URL).pathname;
  } catch {
    return false;
  }
}

async function fetchAllActivationSummaries(): Promise<CemsActivation[]> {
  if (listCache && listCache.expiresAt > Date.now()) return listCache.value;
  if (listInFlight) return listInFlight;
  listInFlight = (async () => {
    const collected: CemsActivation[] = [];
    let next: string | null = `${LIST_URL}?limit=250`;
    for (let page = 0; next && page < 8; page += 1) {
      if (!allowedListUrl(next)) throw new Error("cems_untrusted_pagination_url");
      const payload = record(await fetchJson(next));
      const values = array(payload.results ?? payload.activations ?? payload.items);
      collected.push(...values.map(parseCemsActivationRecord).filter((item): item is CemsActivation => Boolean(item)));
      const candidate = text(payload.next);
      next = candidate ? new URL(candidate, LIST_URL).toString() : null;
    }
    listCache = { value: collected, expiresAt: Date.now() + CACHE_MS };
    return collected;
  })().finally(() => {
    listInFlight = null;
  });
  return listInFlight;
}

export async function fetchCemsActivationDetail(codeValue: string): Promise<CemsActivation> {
  const code = codeValue.toUpperCase();
  if (!/^EMSR\d{3,4}$/.test(code)) throw new Error("invalid_cems_activation_code");
  const cached = detailCache.get(code);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = detailInFlight.get(code);
  if (pending) return pending;
  const promise = (async () => {
    const payload = await fetchJson(`${DETAIL_URL}?code=${encodeURIComponent(code)}`);
    const activation = parseCemsActivationRecord(record(payload).activation ?? payload);
    if (!activation || activation.code.toUpperCase() !== code) {
      throw new Error("cems_activation_not_found_or_outside_scope");
    }
    detailCache.set(code, { value: activation, expiresAt: Date.now() + CACHE_MS });
    return activation;
  })().finally(() => detailInFlight.delete(code));
  detailInFlight.set(code, promise);
  return promise;
}

export function filterCemsActivationsByTime(
  activations: readonly CemsActivation[],
  mode: CemsActivationTimeMode,
  now = new Date(),
): CemsActivation[] {
  if (mode === "ongoing") return activations.filter((item) => !item.closed);
  const cutoff = now.getTime() - (mode === "72h" ? 72 : 30 * 24) * 60 * 60 * 1000;
  return activations.filter((item) => {
    if (!item.closed) return true;
    return [item.updatedAt, item.eventTime, item.activationTime]
      .filter((value): value is string => Boolean(value))
      .some((value) => Date.parse(value) >= cutoff);
  });
}

function alertHazard(kind: Exclude<CemsActivationKind, null>): AlertHazard {
  if (kind === "landslide") return "landslide_event";
  if (kind === "chemical_accident") return "chemical_accident";
  if (kind === "explosion") return "explosion";
  if (kind === "technical_accident") return "technical_accident";
  return "industrial_accident";
}

export function cemsActivationToAlert(item: CemsActivation, fetchedAt: string): NormalizedAlert {
  const products = item.aois.flatMap((aoi) => aoi.products);
  const geometry = item.aois.find((aoi) => aoi.geometry)?.geometry ?? null;
  return {
    id: `cems:${item.code.toLowerCase()}`,
    source: "copernicus-emergency-mapping",
    sourceEventId: item.code,
    category: item.kind === "landslide" ? "landslide" : "industrial_incident",
    hazard: alertHazard(item.kind),
    title: item.name,
    description: item.reason,
    instructions: item.officialInstructions,
    severity: "unknown",
    status: item.closed ? "ended" : "active",
    certainty: "mapped activation",
    urgency: null,
    effectiveAt: item.activationTime,
    onsetAt: item.eventTime,
    expiresAt: item.closed ? item.updatedAt : null,
    updatedAt: item.updatedAt,
    fetchedAt,
    countryCodes: item.countryCodes,
    affectedAreaNames: [...item.countryNames, ...item.aois.map((aoi) => aoi.name)],
    geometry,
    centroid: item.centroid,
    sourceUrl: item.reportUrl ?? item.viewerUrl,
    officialSourceName: "Copernicus Emergency Management Service — Rapid Mapping",
    observed: true,
    forecast: false,
    metadata: {
      dataNature: "satellite-observation",
      activationKind: item.kind,
      cemsActivationCode: item.code,
      category: item.category,
      subCategory: item.subCategory,
      eventTime: item.eventTime,
      activationTime: item.activationTime,
      closed: item.closed,
      aoiCount: item.aois.length,
      productCount: products.length,
      aois: item.aois,
      products,
      reportUrl: item.reportUrl,
      viewerUrl: item.viewerUrl,
      observedAreaSquareKilometers: item.observedAreaSquareKilometers,
      affectedAreaSquareKilometers: item.observedAreaSquareKilometers,
      affectedBuildings: item.affectedBuildings,
      affectedPopulation: item.affectedPopulation,
      substances: item.substances,
      officialInstructions: item.officialInstructions,
      emarsReportUrl: item.emarsReportUrl,
      mappingActivationNotIncidentConfirmation: true,
    },
  };
}

export async function fetchEuropeanCemsActivations(
  kind: "all" | "landslide" | "industrial" = "all",
  mode: CemsActivationTimeMode = "ongoing",
): Promise<AlertApiResponse> {
  const fetchedAt = new Date().toISOString();
  const source = getAlertSource("copernicusEmergencyMapping");
  try {
    const summaries = filterCemsActivationsByTime(
      (await fetchAllActivationSummaries()).filter((item) =>
        kind === "all"
          ? true
          : kind === "landslide"
            ? item.kind === "landslide"
            : item.kind !== "landslide",
      ),
      mode,
    );
    const detailed = await Promise.all(
      summaries.slice(0, 30).map(async (summary) => {
        try {
          return await fetchCemsActivationDetail(summary.code);
        } catch {
          return summary;
        }
      }),
    );
    return {
      alerts: detailed.map((item) => cemsActivationToAlert(item, fetchedAt)),
      fetchedAt,
      source,
      connectorStatus: "operational",
      warnings: [],
      providerStatuses: { "copernicus-emergency-mapping": "operational" },
    };
  } catch (error) {
    const warning = error instanceof Error ? error.message : "cems_unavailable";
    return {
      alerts: [],
      fetchedAt,
      source,
      connectorStatus: "unavailable",
      warnings: [warning],
      providerStatuses: { "copernicus-emergency-mapping": "unavailable" },
    };
  }
}

export function resetCemsProviderCachesForTests(): void {
  listCache = null;
  listInFlight = null;
  detailCache.clear();
  detailInFlight.clear();
}

export function cemsConnectorStatus(
  alerts: readonly NormalizedAlert[],
  fallback: AlertConnectorStatus,
): AlertConnectorStatus {
  return fallback === "operational" && alerts.length === 0 ? "operational" : fallback;
}
