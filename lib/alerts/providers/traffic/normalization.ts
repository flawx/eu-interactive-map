import { isAlertInsideProjectEurope } from "@/lib/alerts/geography";
import type {
  AlertHazard,
  NormalizedAlert,
  TrafficIncidentMetadata,
  TrafficIncidentStatus,
} from "@/lib/alerts/types";
import { delayMagnitudeValue, trafficSeverity } from "./severity";

type TomTomEvent = {
  code?: unknown;
  description?: unknown;
  iconCategory?: unknown;
};

type TomTomIncidentProperties = {
  id?: unknown;
  iconCategory?: unknown;
  magnitudeOfDelay?: unknown;
  events?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  from?: unknown;
  to?: unknown;
  lengthInMeters?: unknown;
  delayInSeconds?: unknown;
  roadNumbers?: unknown;
  timeValidity?: unknown;
  probabilityOfOccurrence?: unknown;
  numberOfReports?: unknown;
  lastReportTime?: unknown;
};

export type TomTomIncidentFeature = {
  type?: unknown;
  geometry?: unknown;
  properties?: TomTomIncidentProperties;
};

const ICON_HAZARDS: Record<string, AlertHazard> = {
  accident: "road_accident",
  jam: "traffic_jam",
  roadClosed: "road_closure",
  laneClosed: "lane_closure",
  roadWorks: "roadworks",
  brokenDownVehicle: "broken_down_vehicle",
  fog: "road_weather",
  rain: "road_weather",
  ice: "road_weather",
  wind: "road_weather",
  flooding: "road_weather",
  dangerousConditions: "road_hazard",
  unknown: "other_traffic_incident",
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function validGeometry(value: unknown): GeoJSON.Geometry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as GeoJSON.Geometry;
  const validPosition = (position: unknown): position is GeoJSON.Position =>
    Array.isArray(position) &&
    position.length >= 2 &&
    typeof position[0] === "number" &&
    Number.isFinite(position[0]) &&
    position[0] >= -180 &&
    position[0] <= 180 &&
    typeof position[1] === "number" &&
    Number.isFinite(position[1]) &&
    position[1] >= -90 &&
    position[1] <= 90;
  if (candidate.type === "Point") {
    return validPosition(candidate.coordinates) ? candidate : null;
  }
  if (candidate.type === "LineString") {
    return candidate.coordinates.length >= 2 &&
      candidate.coordinates.every(validPosition)
      ? candidate
      : null;
  }
  if (candidate.type === "MultiLineString") {
    return candidate.coordinates.length > 0 &&
      candidate.coordinates.every(
        (line) => line.length >= 2 && line.every(validPosition),
      )
      ? candidate
      : null;
  }
  return null;
}

function centroidOf(geometry: GeoJSON.Geometry): {
  latitude: number;
  longitude: number;
} | null {
  const coordinates: Array<[number, number]> = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      coordinates.push([value[0], value[1]]);
      return;
    }
    value.forEach(visit);
  };
  if (geometry.type === "GeometryCollection") {
    geometry.geometries.forEach((item) => {
      if ("coordinates" in item) visit(item.coordinates);
    });
  } else {
    visit(geometry.coordinates);
  }
  if (!coordinates.length) return null;
  const middle = coordinates[Math.floor(coordinates.length / 2)];
  return { longitude: middle[0], latitude: middle[1] };
}

function normalizedEvents(value: unknown): TrafficIncidentMetadata["providerEvents"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const event = entry as TomTomEvent;
    const description = text(event.description);
    if (!description) return [];
    return [{
      code: number(event.code),
      description,
      iconCategory: text(event.iconCategory),
    }];
  });
}

function incidentStatus(
  timeValidity: string | null,
  endAt: string | null,
  now: Date,
): TrafficIncidentStatus {
  if (timeValidity === "future") return "planned";
  if (timeValidity === "present") return "active";
  if (endAt && Date.parse(endAt) < now.getTime()) return "ended";
  return "unknown";
}

export function hazardForTomTomIcon(iconCategory: unknown): AlertHazard {
  return ICON_HAZARDS[String(iconCategory ?? "")] ?? "other_traffic_incident";
}

export function normalizeTomTomIncident(
  feature: TomTomIncidentFeature,
  options: {
    fetchedAt: string;
    trafficModelId: string | null;
    now?: Date;
  },
): NormalizedAlert | null {
  const properties = feature.properties;
  const providerIncidentId = text(properties?.id);
  const geometry = validGeometry(feature.geometry);
  if (!providerIncidentId || !geometry) return null;
  const centroid = centroidOf(geometry);
  const hazard = hazardForTomTomIcon(properties?.iconCategory);
  const roadNumbers = Array.isArray(properties?.roadNumbers)
    ? properties!.roadNumbers.flatMap((value) => {
        const item = text(value);
        return item ? [item] : [];
      })
    : [];
  const events = normalizedEvents(properties?.events);
  const fromLocation = text(properties?.from);
  const toLocation = text(properties?.to);
  const startAt = text(properties?.startTime);
  const endAt = text(properties?.endTime);
  const lastReportAt = text(properties?.lastReportTime);
  const timeValidity = text(properties?.timeValidity);
  const status = incidentStatus(timeValidity, endAt, options.now ?? new Date());
  const delaySeconds = number(properties?.delayInSeconds);
  const lengthMeters = number(properties?.lengthInMeters);
  const magnitudeLabel = text(properties?.magnitudeOfDelay);
  const roadClosed = hazard === "road_closure" ? true : null;
  const lanesClosed = null;
  const description = events.map((event) => event.description).join(" · ") || null;
  const titleParts = [
    description,
    roadNumbers.length ? roadNumbers.join(", ") : null,
  ].filter(Boolean);
  const alert: NormalizedAlert = {
    id: `tomtom:${providerIncidentId}`,
    source: "tomtom-traffic",
    sourceEventId: providerIncidentId,
    category: "road_traffic",
    hazard,
    title: titleParts.join(" — ") || "Road traffic incident",
    description,
    instructions: null,
    severity: trafficSeverity(magnitudeLabel, delaySeconds),
    status:
      status === "planned"
        ? "upcoming"
        : status === "ended"
          ? "ended"
          : status === "active"
            ? "active"
            : "unknown",
    certainty: text(properties?.probabilityOfOccurrence),
    urgency: null,
    effectiveAt: startAt,
    onsetAt: startAt,
    expiresAt: endAt,
    updatedAt: lastReportAt ?? options.fetchedAt,
    fetchedAt: options.fetchedAt,
    countryCodes: [],
    affectedAreaNames: [fromLocation, toLocation].filter(
      (value): value is string => Boolean(value),
    ),
    geometry,
    centroid,
    sourceUrl: "https://www.tomtom.com/products/traffic-and-travel-information/",
    officialSourceName: "TomTom Traffic",
    observed: true,
    forecast: status === "planned",
    metadata: {
      providerIncidentId,
      incidentType: hazard,
      status,
      roadNumbers,
      fromLocation,
      toLocation,
      direction: toLocation,
      lengthMeters,
      delaySeconds,
      currentSpeedKph: null,
      freeFlowSpeedKph: null,
      currentTravelTimeSeconds: null,
      freeFlowTravelTimeSeconds: null,
      magnitudeOfDelay: delayMagnitudeValue(magnitudeLabel),
      magnitudeOfDelayLabel: magnitudeLabel,
      probabilityOfOccurrence: text(properties?.probabilityOfOccurrence),
      confidence: null,
      numberOfReports: number(properties?.numberOfReports),
      roadClosed,
      lanesClosed,
      totalLanes: null,
      startAt,
      endAt,
      lastReportAt,
      updatedAt: lastReportAt ?? options.fetchedAt,
      providerModelId: options.trafficModelId,
      emergencyServices: null,
      estimatedClearanceAt: null,
      providerEvents: events,
      dataNature: "instrumental-observation",
      demo: false,
    } satisfies TrafficIncidentMetadata & Record<string, unknown>,
  };
  return isAlertInsideProjectEurope(alert) ? alert : null;
}

export function normalizeTomTomResponse(
  value: unknown,
  options: { fetchedAt: string; trafficModelId: string | null; now?: Date },
): NormalizedAlert[] {
  if (!value || typeof value !== "object") return [];
  const incidents = (value as { incidents?: unknown }).incidents;
  if (!Array.isArray(incidents)) return [];
  const deduped = new Map<string, NormalizedAlert>();
  for (const item of incidents) {
    const alert = normalizeTomTomIncident(
      item as TomTomIncidentFeature,
      options,
    );
    if (alert) deduped.set(alert.id, alert);
  }
  return [...deduped.values()];
}
