import { deduplicateAlerts, stableAlertId } from "@/lib/alerts/deduplication";
import { mergeEarthquakeProviders } from "@/lib/alerts/earthquakeDeduplication";
import {
  isAlertInsideProjectEurope,
  isPointInsideProjectEurope,
  normalizeAlertCountryCode,
  PROJECT_EUROPE_ALERT_BOUNDS,
} from "@/lib/alerts/geography";
import { earthquakeMagnitudeBand } from "@/lib/alerts/geologicalActivity";
import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";
import type {
  AlertApiResponse,
  AlertConnectorStatus,
  AlertSeverity,
  EarthquakeReviewStatus,
  NormalizedAlert,
} from "@/lib/alerts/types";

const USGS_DAY_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const USGS_WEEK_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const EMSC_QUERY_URL =
  "https://www.seismicportal.eu/fdsnws/event/1/query";
const GDACS_GEOLOGY_URL =
  "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,VO";

const USGS_CACHE_MS = 2 * 60 * 1000;
const EMSC_CACHE_MS = 2 * 60 * 1000;
const GDACS_CACHE_MS = 10 * 60 * 1000;

type CachedResult<T> = {
  expiresAt: number;
  value: T;
};

type ProviderAlerts = {
  alerts: NormalizedAlert[];
  status: AlertConnectorStatus;
  warning: string | null;
};

const cache = new Map<string, CachedResult<ProviderAlerts>>();
const pending = new Map<string, Promise<ProviderAlerts>>();

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  const raw = text(value);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function featureList(value: unknown): unknown[] {
  const root = record(value);
  return root && Array.isArray(root.features) ? root.features : [];
}

function pointGeometry(
  value: unknown,
): { geometry: GeoJSON.Point; longitude: number; latitude: number; depth: number | null } | null {
  const geometry = record(value);
  if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates)) {
    return null;
  }
  const longitude = number(geometry.coordinates[0]);
  const latitude = number(geometry.coordinates[1]);
  const depth = number(geometry.coordinates[2]);
  if (
    longitude == null ||
    latitude == null ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }
  return {
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude, depth ?? 0],
    },
    longitude,
    latitude,
    depth,
  };
}

function severityFromMagnitude(magnitude: number | null): AlertSeverity {
  const band = earthquakeMagnitudeBand(magnitude);
  if (band === "major") return "extreme";
  if (band === "strong") return "severe";
  if (band === "moderate") return "moderate";
  if (band === "minor") return "minor";
  return "unknown";
}

function reviewStatus(value: unknown): EarthquakeReviewStatus {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("review")) return "reviewed";
  if (normalized.includes("automatic")) return "automatic";
  return "unknown";
}

function recentEarthquakeStatus(
  eventAt: string,
  fetchedAt: string,
): "active" | "ended" {
  return Date.parse(fetchedAt) - Date.parse(eventAt) <= 24 * 60 * 60 * 1000
    ? "active"
    : "ended";
}

export function normalizeUsgsEarthquake(
  value: unknown,
  fetchedAt = new Date().toISOString(),
): NormalizedAlert | null {
  const feature = record(value);
  const properties = feature ? record(feature.properties) : null;
  const point = feature ? pointGeometry(feature.geometry) : null;
  const sourceEventId = feature ? text(feature.id) : null;
  if (!feature || !properties || !point || !sourceEventId) return null;
  if (String(properties.type ?? "earthquake").toLowerCase() !== "earthquake") {
    return null;
  }
  if (!isPointInsideProjectEurope(point.longitude, point.latitude)) return null;
  const eventAt = timestamp(properties.time);
  const updatedAt = timestamp(properties.updated) ?? fetchedAt;
  if (!eventAt) return null;
  const magnitude = number(properties.mag);
  const feltReports = number(properties.felt);
  const place = text(properties.place) ?? "European epicentre";
  const sourceUrl =
    text(properties.url) ??
    `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(sourceEventId)}`;
  const detailUrl = text(properties.detail);
  const reviewed = reviewStatus(properties.status);
  return {
    id: stableAlertId("usgs", sourceEventId),
    source: "usgs",
    sourceEventId,
    category: "earthquake",
    hazard: "earthquake",
    title: `${magnitude == null ? "M?" : `M${magnitude.toFixed(1)}`} · ${place}`,
    description: null,
    instructions: null,
    severity: severityFromMagnitude(magnitude),
    status: recentEarthquakeStatus(eventAt, fetchedAt),
    certainty: reviewed,
    urgency: null,
    effectiveAt: eventAt,
    onsetAt: eventAt,
    expiresAt: null,
    updatedAt,
    fetchedAt,
    countryCodes: [],
    affectedAreaNames: [place],
    geometry: point.geometry,
    centroid: { longitude: point.longitude, latitude: point.latitude },
    sourceUrl,
    officialSourceName: "USGS Earthquake Hazards Program",
    observed: true,
    forecast: false,
    metadata: {
      dataNature: "instrumental-observation",
      magnitude,
      magnitudeType: text(properties.magType),
      depthKilometers: point.depth,
      feltReports,
      maximumReportedIntensity: number(properties.cdi),
      estimatedIntensity: number(properties.mmi),
      tsunamiFlag:
        properties.tsunami == null ? null : Number(properties.tsunami) === 1,
      reviewStatus: reviewed,
      usgsEventId: sourceEventId,
      emscEventId: null,
      gdacsEventId: null,
      providerEventIds: { usgs: sourceEventId },
      providerMagnitudes: magnitude == null ? {} : { usgs: magnitude },
      providerUpdatedAt: { usgs: updatedAt },
      providerUrls: { usgs: sourceUrl },
      affectedPopulation: null,
      gdacsSeverity: null,
      detailUrl,
      significance: number(properties.sig),
      network: text(properties.net),
    },
  };
}

export function normalizeEmscEarthquake(
  value: unknown,
  fetchedAt = new Date().toISOString(),
): NormalizedAlert | null {
  const feature = record(value);
  const properties = feature ? record(feature.properties) : null;
  const point = feature ? pointGeometry(feature.geometry) : null;
  const sourceEventId =
    (feature ? text(feature.id) : null) ?? (properties ? text(properties.unid) : null);
  if (!feature || !properties || !point || !sourceEventId) return null;
  if (!isPointInsideProjectEurope(point.longitude, point.latitude)) return null;
  const eventAt = timestamp(properties.time);
  if (!eventAt) return null;
  const updatedAt = timestamp(properties.lastupdate) ?? fetchedAt;
  const magnitude = number(properties.mag);
  const place = text(properties.flynn_region) ?? "European epicentre";
  const depthKilometers =
    number(properties.depth) ?? (point.depth == null ? null : Math.abs(point.depth));
  const sourceUrl = `https://www.emsc-csem.org/Earthquake_information/earthquake.php?id=${encodeURIComponent(
    text(properties.source_id) ?? sourceEventId,
  )}`;
  return {
    id: stableAlertId("emsc", sourceEventId),
    source: "emsc",
    sourceEventId,
    category: "earthquake",
    hazard: "earthquake",
    title: `${magnitude == null ? "M?" : `M${magnitude.toFixed(1)}`} · ${place}`,
    description: null,
    instructions: null,
    severity: severityFromMagnitude(magnitude),
    status: recentEarthquakeStatus(eventAt, fetchedAt),
    certainty: null,
    urgency: null,
    effectiveAt: eventAt,
    onsetAt: eventAt,
    expiresAt: null,
    updatedAt,
    fetchedAt,
    countryCodes: [],
    affectedAreaNames: [place],
    geometry: point.geometry,
    centroid: { longitude: point.longitude, latitude: point.latitude },
    sourceUrl,
    officialSourceName: "EMSC / SeismicPortal",
    observed: true,
    forecast: false,
    metadata: {
      dataNature: "instrumental-observation",
      magnitude,
      magnitudeType: text(properties.magtype),
      depthKilometers,
      feltReports: null,
      maximumReportedIntensity: null,
      estimatedIntensity: null,
      tsunamiFlag: null,
      reviewStatus: "unknown",
      usgsEventId: null,
      emscEventId: sourceEventId,
      gdacsEventId: null,
      providerEventIds: { emsc: sourceEventId },
      providerMagnitudes: magnitude == null ? {} : { emsc: magnitude },
      providerUpdatedAt: { emsc: updatedAt },
      providerUrls: { emsc: sourceUrl },
      affectedPopulation: null,
      gdacsSeverity: null,
      author: text(properties.auth),
      sourceCatalog: text(properties.source_catalog),
    },
  };
}

function gdacsCountryCodes(properties: Record<string, unknown>): string[] {
  const affected = Array.isArray(properties.affectedcountries)
    ? properties.affectedcountries
    : [];
  const values = [
    properties.iso3,
    ...affected.flatMap((item) => {
      const itemRecord = record(item);
      return itemRecord ? [itemRecord.iso2, itemRecord.iso3] : [];
    }),
  ];
  return [
    ...new Set(
      values
        .map(normalizeAlertCountryCode)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function gdacsSourceUrl(
  properties: Record<string, unknown>,
  eventType: "EQ" | "VO",
  eventId: string,
  episodeId: string | null,
): string {
  const urls = record(properties.url);
  return (
    (urls ? text(urls.report) : null) ??
    `https://www.gdacs.org/report.aspx?eventid=${encodeURIComponent(
      eventId,
    )}&episodeid=${encodeURIComponent(episodeId ?? "1")}&eventtype=${eventType}`
  ).replace(/^http:/, "https:");
}

function gdacsAlertLevel(
  value: unknown,
): { severity: AlertSeverity; gdacs: "green" | "orange" | "red" | null } {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "red") return { severity: "extreme", gdacs: "red" };
  if (normalized === "orange") return { severity: "severe", gdacs: "orange" };
  if (normalized === "green") return { severity: "minor", gdacs: "green" };
  return { severity: "unknown", gdacs: null };
}

export function normalizeGdacsGeological(
  value: unknown,
  expected: "EQ" | "VO",
  fetchedAt = new Date().toISOString(),
): NormalizedAlert | null {
  const feature = record(value);
  const properties = feature ? record(feature.properties) : null;
  const point = feature ? pointGeometry(feature.geometry) : null;
  if (!feature || !properties || !point) return null;
  if (String(properties.eventtype ?? "").toUpperCase() !== expected) return null;
  const eventId = text(properties.eventid);
  if (!eventId) return null;
  const episodeId = text(properties.episodeid);
  const countryCodes = gdacsCountryCodes(properties);
  const geography = {
    countryCodes,
    centroid: { longitude: point.longitude, latitude: point.latitude },
    geometry: point.geometry,
  };
  if (!isAlertInsideProjectEurope(geography)) return null;
  const explicitIso = text(properties.iso3);
  if (explicitIso && !normalizeAlertCountryCode(explicitIso) && !countryCodes.length) {
    return null;
  }
  const eventAt = timestamp(properties.fromdate) ?? fetchedAt;
  const updatedAt = timestamp(properties.datemodified) ?? eventAt;
  const sourceUrl = gdacsSourceUrl(properties, expected, eventId, episodeId);
  const alertLevel = gdacsAlertLevel(
    properties.alertlevel ?? properties.episodealertlevel,
  );
  const country = text(properties.country);
  const severityData = record(properties.severitydata);
  if (expected === "VO") {
    const volcanoName =
      text(properties.eventname) ??
      text(properties.name)?.replace(/^Eruption\s+/i, "") ??
      "Volcano";
    const description =
      text(properties.description) ?? text(properties.htmldescription);
    const activityText = `${properties.name ?? ""} ${description ?? ""}`.toLowerCase();
    const activityType = activityText.includes("ash")
      ? "ash_emission"
      : activityText.includes("eruption")
        ? "eruption"
        : activityText.includes("unrest")
          ? "unrest"
          : "unknown";
    const status =
      String(properties.iscurrent ?? "").toLowerCase() === "true"
        ? "active"
        : "ended";
    return {
      id: stableAlertId("gdacs", eventId, episodeId),
      source: "gdacs",
      sourceEventId: eventId,
      category: "volcano",
      hazard:
        activityType === "ash_emission"
          ? "ash_emission"
          : activityType === "eruption"
            ? "volcanic_eruption"
            : "volcanic_unrest",
      title: volcanoName,
      description,
      instructions: null,
      severity: alertLevel.severity,
      status,
      certainty: null,
      urgency: null,
      effectiveAt: eventAt,
      onsetAt: eventAt,
      expiresAt: status === "ended" ? timestamp(properties.todate) : null,
      updatedAt,
      fetchedAt,
      countryCodes,
      affectedAreaNames: country ? [country] : [],
      geometry: point.geometry,
      centroid: geography.centroid,
      sourceUrl,
      officialSourceName: "GDACS",
      observed: false,
      forecast: false,
      metadata: {
        dataNature: "impact-estimation",
        volcanoName,
        volcanoId: text(properties.glide),
        activityType,
        gdacsEventId: eventId,
        eruptionStartAt: eventAt,
        lastActivityAt: updatedAt,
        ashCloudInformation:
          activityType === "ash_emission" ? description : null,
        affectedPopulation: number(properties.population),
        gdacsSeverity: alertLevel.gdacs,
        episodeId,
      },
    };
  }

  const magnitude = number(severityData?.severity);
  const severityText = text(severityData?.severitytext);
  const depthMatch = severityText?.match(/Depth:\s*([\d.]+)\s*km/i);
  const depthKilometers = depthMatch ? number(depthMatch[1]) : point.depth;
  const place =
    text(properties.name) ??
    (country ? `Earthquake in ${country}` : "Major earthquake");
  return {
    id: stableAlertId("gdacs", eventId, episodeId),
    source: "gdacs",
    sourceEventId: eventId,
    category: "earthquake",
    hazard: "earthquake",
    title: `${magnitude == null ? "M?" : `M${magnitude.toFixed(1)}`} · ${place}`,
    description: text(properties.description) ?? text(properties.htmldescription),
    instructions: null,
    severity: alertLevel.severity,
    status: recentEarthquakeStatus(eventAt, fetchedAt),
    certainty: null,
    urgency: null,
    effectiveAt: eventAt,
    onsetAt: eventAt,
    expiresAt: null,
    updatedAt,
    fetchedAt,
    countryCodes,
    affectedAreaNames: country ? [country] : [],
    geometry: point.geometry,
    centroid: geography.centroid,
    sourceUrl,
    officialSourceName: "GDACS",
    observed: false,
    forecast: false,
    metadata: {
      dataNature: "impact-estimation",
      magnitude,
      magnitudeType: "M",
      depthKilometers,
      feltReports: null,
      maximumReportedIntensity: null,
      estimatedIntensity: null,
      tsunamiFlag: null,
      reviewStatus: "unknown",
      usgsEventId: null,
      emscEventId: null,
      gdacsEventId: eventId,
      providerEventIds: { gdacs: eventId },
      providerMagnitudes: magnitude == null ? {} : { gdacs: magnitude },
      providerUpdatedAt: { gdacs: updatedAt },
      providerUrls: { gdacs: sourceUrl },
      affectedPopulation: number(properties.population),
      gdacsSeverity: alertLevel.gdacs,
      episodeId,
    },
  };
}

async function fetchJson(
  url: string,
  timeoutMilliseconds: number,
  revalidateSeconds: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "EUMap-alerts/1.0",
      },
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
    });
    if (!response.ok) throw new Error(`http_${response.status}`);
    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

async function cachedProvider(
  key: string,
  ttl: number,
  loader: () => Promise<NormalizedAlert[]>,
): Promise<ProviderAlerts> {
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return existing.value;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const operation = loader()
    .then((alerts) => ({
      alerts,
      status: "operational" as const,
      warning: null,
    }))
    .catch((error: unknown) => ({
      alerts: existing?.value.alerts ?? [],
      status: existing ? ("delayed" as const) : ("unavailable" as const),
      warning: error instanceof Error ? error.message : `${key}_unavailable`,
    }))
    .then((result) => {
      cache.set(key, { expiresAt: Date.now() + ttl, value: result });
      pending.delete(key);
      return result;
    });
  pending.set(key, operation);
  return operation;
}

async function fetchUsgs(): Promise<ProviderAlerts> {
  return cachedProvider("usgs", USGS_CACHE_MS, async () => {
    const fetchedAt = new Date().toISOString();
    const [day, week] = await Promise.all([
      fetchJson(USGS_DAY_URL, 10_000, 120),
      fetchJson(USGS_WEEK_URL, 10_000, 120),
    ]);
    const alerts = [...featureList(day), ...featureList(week)]
      .map((feature) => normalizeUsgsEarthquake(feature, fetchedAt))
      .filter((alert): alert is NormalizedAlert => Boolean(alert))
      .filter((alert) => {
        const magnitude = number(alert.metadata.magnitude);
        const felt = number(alert.metadata.feltReports) ?? 0;
        const age = Date.parse(fetchedAt) - Date.parse(alert.onsetAt ?? fetchedAt);
        return magnitude != null && (
          magnitude >= 4 ||
          (magnitude >= 2.5 && age <= 24 * 60 * 60 * 1000) ||
          felt > 0
        );
      });
    return deduplicateAlerts(alerts);
  });
}

async function fetchEmsc(): Promise<ProviderAlerts> {
  return cachedProvider("emsc", EMSC_CACHE_MS, async () => {
    const fetchedAt = new Date().toISOString();
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const query = new URLSearchParams({
      format: "json",
      limit: "2000",
      start,
      minlat: String(PROJECT_EUROPE_ALERT_BOUNDS.south),
      maxlat: String(PROJECT_EUROPE_ALERT_BOUNDS.north),
      minlon: String(PROJECT_EUROPE_ALERT_BOUNDS.west),
      maxlon: String(PROJECT_EUROPE_ALERT_BOUNDS.east),
    });
    const data = await fetchJson(`${EMSC_QUERY_URL}?${query}`, 12_000, 120);
    return featureList(data)
      .map((feature) => normalizeEmscEarthquake(feature, fetchedAt))
      .filter((alert): alert is NormalizedAlert => Boolean(alert))
      .filter((alert) => {
        const magnitude = number(alert.metadata.magnitude);
        return magnitude != null && magnitude >= 2.5;
      });
  });
}

async function fetchGdacsGeology(): Promise<{
  earthquakes: ProviderAlerts;
  volcanoes: ProviderAlerts;
}> {
  const result = await cachedProvider("gdacs-geological", GDACS_CACHE_MS, async () => {
    const fetchedAt = new Date().toISOString();
    const data = await fetchJson(GDACS_GEOLOGY_URL, 20_000, 600);
    return featureList(data)
      .flatMap((feature) => [
        normalizeGdacsGeological(feature, "EQ", fetchedAt),
        normalizeGdacsGeological(feature, "VO", fetchedAt),
      ])
      .filter((alert): alert is NormalizedAlert => Boolean(alert));
  });
  return {
    earthquakes: {
      ...result,
      alerts: result.alerts.filter((alert) => alert.category === "earthquake"),
    },
    volcanoes: {
      ...result,
      alerts: result.alerts.filter((alert) => alert.category === "volcano"),
    },
  };
}

export async function fetchEuropeanEarthquakes(): Promise<AlertApiResponse> {
  const [usgs, emsc, gdacs] = await Promise.all([
    fetchUsgs(),
    fetchEmsc(),
    fetchGdacsGeology(),
  ]);
  const alerts = mergeEarthquakeProviders(
    usgs.alerts,
    emsc.alerts,
    gdacs.earthquakes.alerts,
  ).filter(isAlertInsideProjectEurope);
  return {
    alerts,
    fetchedAt: new Date().toISOString(),
    source: ALERT_SOURCES.usgs,
    connectorStatus:
      usgs.status === "unavailable" && emsc.status === "unavailable"
        ? "unavailable"
        : usgs.status === "delayed" || emsc.status === "delayed"
          ? "delayed"
          : "operational",
    providerStatuses: {
      usgs: usgs.status,
      emsc: emsc.status,
      "gdacs-geological": gdacs.earthquakes.status,
    },
    warnings: [usgs.warning, emsc.warning, gdacs.earthquakes.warning].filter(
      (value): value is string => Boolean(value),
    ),
  };
}

export async function fetchEuropeanVolcanoes(): Promise<AlertApiResponse> {
  const gdacs = await fetchGdacsGeology();
  return {
    alerts: gdacs.volcanoes.alerts.filter(isAlertInsideProjectEurope),
    fetchedAt: new Date().toISOString(),
    source: ALERT_SOURCES.gdacsGeological,
    connectorStatus: gdacs.volcanoes.status,
    providerStatuses: { "gdacs-geological": gdacs.volcanoes.status },
    warnings: gdacs.volcanoes.warning ? [gdacs.volcanoes.warning] : [],
  };
}
