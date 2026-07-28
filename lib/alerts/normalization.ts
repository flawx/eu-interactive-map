import { stableAlertId } from "@/lib/alerts/deduplication";
import {
  isEuropeanAlertCentroid,
  normalizeAlertCountryCode,
} from "@/lib/alerts/geography";
import {
  normalizeGdacsSeverity,
  normalizeMeteoalarmSeverity,
} from "@/lib/alerts/severity";
import type {
  AlertHazard,
  AlertStatus,
  NormalizedAlert,
} from "@/lib/alerts/types";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function iso(value: unknown): string | null {
  const valueText = text(value);
  if (!valueText) return null;
  const time = Date.parse(valueText);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function number(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function geometryCentroid(
  geometry: GeoJSON.Geometry | null,
): { longitude: number; latitude: number } | null {
  if (!geometry) return null;
  const points: Array<[number, number]> = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      points.push([value[0], value[1]]);
      return;
    }
    value.forEach(visit);
  };
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((item) => {
      const centroid = geometryCentroid(item);
      if (centroid) points.push([centroid.longitude, centroid.latitude]);
    });
  } else {
    visit(geometry.coordinates);
  }
  if (!points.length) return null;
  return {
    longitude: points.reduce((sum, point) => sum + point[0], 0) / points.length,
    latitude: points.reduce((sum, point) => sum + point[1], 0) / points.length,
  };
}

export function normalizeMeteoalarmHazard(value: unknown): AlertHazard {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("tornado")) return "tornado";
  if (normalized.includes("hail") || normalized.includes("grêle")) return "hail";
  if (normalized.includes("thunder")) return "thunderstorm";
  if (normalized.includes("rain-flood") || normalized.includes("flash")) return "flash_flood";
  if (normalized.includes("flood")) return "river_flood";
  if (normalized.includes("coastal") || normalized.includes("marine")) return "coastal_flood";
  if (normalized.includes("rain")) return "heavy_rain";
  if (normalized.includes("snow")) return "snow";
  if (normalized.includes("ice")) return "ice";
  if (normalized.includes("extreme") && normalized.includes("wind")) return "extreme_wind";
  if (normalized.includes("wind")) return "strong_wind";
  return "other_weather";
}

export function normalizeAlertStatus(
  value: unknown,
  onsetAt: string | null,
  expiresAt: string | null,
  now = new Date(),
): AlertStatus {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("ended") || normalized.includes("expired")) return "ended";
  const nowMs = now.getTime();
  if (onsetAt && Date.parse(onsetAt) > nowMs) return "upcoming";
  if (expiresAt && Date.parse(expiresAt) < nowMs) return "ended";
  return onsetAt || expiresAt ? "active" : "unknown";
}

function validGeometry(value: unknown): GeoJSON.Geometry | null {
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const type = String((value as { type: unknown }).type);
  if (!["Point", "MultiPoint", "LineString", "MultiLineString", "Polygon", "MultiPolygon", "GeometryCollection"].includes(type)) {
    return null;
  }
  return value as GeoJSON.Geometry;
}

export function normalizeMeteoalarmFeature(
  feature: unknown,
  fetchedAt = new Date().toISOString(),
): NormalizedAlert | null {
  if (!feature || typeof feature !== "object") return null;
  const record = feature as Record<string, unknown>;
  const properties =
    record.properties && typeof record.properties === "object"
      ? (record.properties as Record<string, unknown>)
      : {};
  const message =
    properties.message && typeof properties.message === "object"
      ? (properties.message as Record<string, unknown>)
      : properties;
  const sourceEventId =
    text(record.id) ??
    text(message.identifier) ??
    text(properties.identifier);
  if (!sourceEventId) return null;
  const geometry = validGeometry(record.geometry);
  const centroid = geometryCentroid(geometry);
  const countryCode = normalizeAlertCountryCode(
    properties.country ?? properties.countryCode ?? message.country,
  );
  if (!countryCode && !isEuropeanAlertCentroid(centroid)) return null;
  const onsetAt = iso(message.onset ?? message.effective ?? properties.onset);
  const expiresAt = iso(message.expires ?? properties.expires);
  const updatedAt =
    iso(message.sent ?? message.updated ?? properties.updated) ?? fetchedAt;
  const awarenessType =
    message.awareness_type ??
    message.awarenessType ??
    properties.awareness_type ??
    properties.event ??
    message.event;
  const hazard = normalizeMeteoalarmHazard(awarenessType);
  const status = normalizeAlertStatus(message.msgType ?? message.status, onsetAt, expiresAt);
  const title =
    text(message.headline) ??
    text(message.event) ??
    text(properties.title) ??
    "Official weather warning";
  const areaName =
    text(message.areaDesc) ??
    text(properties.areaDesc) ??
    text(properties.name);
  const severityOriginal =
    message.severity ??
    message.awareness_level ??
    properties.awareness_level ??
    properties.severity;
  return {
    id: stableAlertId("meteoalarm", sourceEventId),
    source: "meteoalarm",
    sourceEventId,
    category: hazard === "river_flood" || hazard === "flash_flood" || hazard === "coastal_flood"
      ? "flood"
      : "weather",
    hazard,
    title,
    description: text(message.description),
    instructions: text(message.instruction),
    severity: normalizeMeteoalarmSeverity(severityOriginal),
    status,
    certainty: text(message.certainty),
    urgency: text(message.urgency),
    effectiveAt: iso(message.effective),
    onsetAt,
    expiresAt,
    updatedAt,
    fetchedAt,
    countryCodes: countryCode ? [countryCode] : [],
    affectedAreaNames: areaName ? [areaName] : [],
    geometry,
    centroid,
    sourceUrl: text(properties.web) ?? text(message.web) ?? "https://www.meteoalarm.org/",
    officialSourceName:
      text(message.senderName) ?? text(properties.senderName) ?? "Meteoalarm / EUMETNET member",
    observed: false,
    forecast: true,
    metadata: {
      dataNature: "official-warning",
      originalSeverity: severityOriginal ?? null,
      originalAwarenessType: awarenessType ?? null,
      messageType: message.msgType ?? null,
    },
  };
}

function gdacsEventType(properties: Record<string, unknown>): string {
  return String(
    properties.eventtype ??
      properties.eventType ??
      properties.eventtypeid ??
      "",
  ).toUpperCase();
}

export function normalizeGdacsFeature(
  feature: unknown,
  expected: "FL" | "TC",
  fetchedAt = new Date().toISOString(),
): NormalizedAlert | null {
  if (!feature || typeof feature !== "object") return null;
  const record = feature as Record<string, unknown>;
  const properties =
    record.properties && typeof record.properties === "object"
      ? (record.properties as Record<string, unknown>)
      : {};
  if (gdacsEventType(properties) !== expected) return null;
  const sourceEventId =
    text(properties.eventid) ??
    text(properties.eventId) ??
    text(record.id);
  if (!sourceEventId) return null;
  const geometry = validGeometry(record.geometry);
  const centroid = geometryCentroid(geometry);
  const countryValues = [
    properties.country,
    properties.countrycode,
    properties.iso3,
  ]
    .flatMap((value) => String(value ?? "").split(/[;,|]/))
    .map(normalizeAlertCountryCode)
    .filter((value): value is string => Boolean(value));
  if (!countryValues.length && !isEuropeanAlertCentroid(centroid)) return null;
  const startedAt = iso(properties.fromdate ?? properties.fromDate);
  const updatedAt =
    iso(properties.todate ?? properties.toDate ?? properties.lastupdate) ??
    fetchedAt;
  const alertLevel =
    properties.alertlevel ??
    properties.alertLevel ??
    properties.episodealertlevel;
  const title =
    text(properties.name) ??
    text(properties.eventname) ??
    `${expected === "FL" ? "Flood" : "Tropical cyclone"} ${sourceEventId}`;
  const link = Array.isArray(properties.link)
    ? properties.link.find(
        (item) =>
          item &&
          typeof item === "object" &&
          "Value" in item &&
          typeof item.Value === "string",
      )
    : null;
  const sourceUrl =
    link && typeof link === "object" && "Value" in link
      ? String(link.Value).replace(/^http:/, "https:")
      : "https://www.gdacs.org/";
  const episode = text(properties.episodeid ?? properties.episodeId);
  return {
    id: stableAlertId("gdacs", sourceEventId, episode),
    source: "gdacs",
    sourceEventId,
    category: expected === "FL" ? "flood" : "tropical_cyclone",
    hazard: expected === "FL" ? "river_flood" : "tropical_cyclone",
    title,
    description: text(properties.description ?? properties.htmldescription),
    instructions: null,
    severity: normalizeGdacsSeverity(alertLevel),
    status: normalizeAlertStatus(properties.status, startedAt, null),
    certainty: null,
    urgency: null,
    effectiveAt: startedAt,
    onsetAt: startedAt,
    expiresAt: null,
    updatedAt,
    fetchedAt,
    countryCodes: [...new Set(countryValues)],
    affectedAreaNames: text(properties.country)
      ? String(properties.country)
          .split(/[;,|]/)
          .map((item) => item.trim())
          .filter(
            (item) =>
              Boolean(item) &&
              !/^(russia|russian federation)$/i.test(item),
          )
      : [],
    geometry,
    centroid,
    sourceUrl,
    officialSourceName: "GDACS",
    observed: false,
    forecast: false,
    metadata: {
      dataNature: "impact-estimation",
      episode,
      populationExposure: number(properties.population),
      movementSpeed: number(properties.movespeed ?? properties.speed),
      movementDirection: number(properties.movedirection ?? properties.direction),
      trackGeometry: validGeometry(properties.trackgeometry),
      forecastTrackGeometry: validGeometry(properties.forecastgeometry),
      uncertaintyGeometry: validGeometry(properties.conegeometry),
      windGeometry: validGeometry(properties.windgeometry),
      stormSurge: properties.stormsurge ?? null,
      originalAlertLevel: alertLevel ?? null,
    },
  };
}

export function wildfireToNormalizedAlert(
  incident: {
    id: string;
    title: string;
    alertLevel: "green" | "orange" | "red" | "unknown";
    longitude: number;
    latitude: number;
    countryCode: string | null;
    countryName: string | null;
    startedAt: string | null;
    updatedAt: string | null;
    description: string | null;
    sourceUrl: string | null;
  },
  fetchedAt = new Date().toISOString(),
): NormalizedAlert {
  return {
    id: stableAlertId("gdacs", incident.id),
    source: "gdacs",
    sourceEventId: incident.id,
    category: "wildfire",
    hazard: "wildfire",
    title: incident.title,
    description: incident.description,
    instructions: null,
    severity: normalizeGdacsSeverity(incident.alertLevel),
    status: "active",
    certainty: null,
    urgency: null,
    effectiveAt: incident.startedAt,
    onsetAt: incident.startedAt,
    expiresAt: null,
    updatedAt: incident.updatedAt ?? fetchedAt,
    fetchedAt,
    countryCodes: incident.countryCode ? [incident.countryCode] : [],
    affectedAreaNames: incident.countryName ? [incident.countryName] : [],
    geometry: {
      type: "Point",
      coordinates: [incident.longitude, incident.latitude],
    },
    centroid: { longitude: incident.longitude, latitude: incident.latitude },
    sourceUrl: incident.sourceUrl,
    officialSourceName: "GDACS",
    observed: false,
    forecast: false,
    metadata: { dataNature: "impact-estimation" },
  };
}
