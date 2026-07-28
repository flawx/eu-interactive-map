import type { NormalizedAlert, AlertHazard } from "@/lib/alerts/types";
import type { WildfireWind } from "@/lib/alerts/wind";
import { severityColor } from "@/lib/alerts/severity";
import { windOriginToFlowDirection } from "@/lib/alerts/wind";
import {
  earthquakeFilterVisible,
  earthquakeMagnitudeBand,
  type EarthquakeMagnitudeBand,
} from "@/lib/alerts/geologicalActivity";

export type WeatherHazardFilters = {
  heavyRain: boolean;
  flood: boolean;
  strongWind: boolean;
  thunderstorm: boolean;
  hail: boolean;
  snowIce: boolean;
  coastal: boolean;
  other: boolean;
};

export type EarthquakeMagnitudeFilters = Record<EarthquakeMagnitudeBand, boolean>;

export type VolcanoActivityFilters = {
  unrest: boolean;
  eruption: boolean;
  ashEmission: boolean;
};

export const ALERT_SOURCE_ID = "normalized-alerts";
export const ALERT_FILL_LAYER_ID = "normalized-alert-zones-fill";
export const ALERT_LINE_LAYER_ID = "normalized-alert-zones-line";
export const ALERT_POINT_LAYER_ID = "normalized-alert-points";
export const ALERT_SELECTED_LAYER_ID = "normalized-alert-selected";
export const ALERT_SELECTED_POINT_LAYER_ID = "normalized-alert-selected-point";
export const FLOOD_EVENT_SOURCE_ID = "gdacs-flood-events";
export const FLOOD_EVENT_CLUSTER_LAYER_ID = "gdacs-flood-event-clusters";
export const FLOOD_EVENT_CLUSTER_COUNT_LAYER_ID =
  "gdacs-flood-event-cluster-count";
export const FLOOD_EVENT_MARKER_RING_LAYER_ID =
  "gdacs-flood-event-marker-ring";
export const FLOOD_EVENT_MARKER_LAYER_ID = "gdacs-flood-event-marker";
export const FLOOD_EVENT_WAVE_LAYER_ID = "gdacs-flood-event-wave";
export const FLOOD_EVENT_LABEL_LAYER_ID = "gdacs-flood-event-label";
export const FLOOD_EVENT_WAVE_ICON_ID = "gdacs-flood-wave-icon";
export const ALERT_TRACK_SOURCE_ID = "storm-tracks";
export const ALERT_TRACK_LAYER_ID = "storm-tracks-line";
export const ALERT_FORECAST_TRACK_LAYER_ID = "storm-forecast-tracks-line";
export const ALERT_UNCERTAINTY_LAYER_ID = "storm-uncertainty-fill";
export const WILDFIRE_WIND_SOURCE_ID = "wildfire-wind";
export const WILDFIRE_WIND_LAYER_ID = "wildfire-wind-arrows";
export const GEOLOGICAL_ALERT_SOURCE_ID = "geological-alert-events";
export const GEOLOGICAL_CLUSTER_LAYER_ID = "geological-alert-clusters";
export const GEOLOGICAL_CLUSTER_COUNT_LAYER_ID =
  "geological-alert-cluster-count";
export const EARTHQUAKE_WAVE_LAYER_ID = "earthquake-marker-wave";
export const EARTHQUAKE_MARKER_LAYER_ID = "earthquake-marker";
export const VOLCANO_MARKER_LAYER_ID = "volcano-marker";
export const GEOLOGICAL_LABEL_LAYER_ID = "geological-alert-label";
export const GEOLOGICAL_SELECTED_LAYER_ID = "geological-alert-selected";

export function weatherHazardVisible(
  hazard: AlertHazard,
  filters: WeatherHazardFilters,
): boolean {
  if (hazard === "heavy_rain") return filters.heavyRain;
  if (hazard === "river_flood" || hazard === "flash_flood") return filters.flood;
  if (hazard === "strong_wind" || hazard === "extreme_wind") return filters.strongWind;
  if (hazard === "thunderstorm" || hazard === "tornado") return filters.thunderstorm;
  if (hazard === "hail") return filters.hail;
  if (hazard === "snow" || hazard === "ice") return filters.snowIce;
  if (hazard === "coastal_flood" || hazard === "storm_surge") return filters.coastal;
  return filters.other;
}

export function filterVisibleAlerts(
  alerts: readonly NormalizedAlert[],
  options: {
    weather: boolean;
    floods: boolean;
    storms: boolean;
    earthquakes: boolean;
    volcanoes: boolean;
    earthquakeFilters: EarthquakeMagnitudeFilters;
    volcanoFilters: VolcanoActivityFilters;
    weatherFilters: WeatherHazardFilters;
  },
): NormalizedAlert[] {
  return alerts.filter((alert) => {
    if (alert.source === "meteoalarm") {
      return options.weather && weatherHazardVisible(alert.hazard, options.weatherFilters);
    }
    if (alert.category === "flood") return options.floods;
    if (alert.category === "tropical_cyclone") return options.storms;
    if (alert.category === "earthquake") {
      const magnitude =
        typeof alert.metadata.magnitude === "number"
          ? alert.metadata.magnitude
          : null;
      return (
        options.earthquakes &&
        earthquakeFilterVisible(magnitude, options.earthquakeFilters)
      );
    }
    if (alert.category === "volcano") {
      if (!options.volcanoes) return false;
      const activity = String(alert.metadata.activityType ?? "unknown");
      if (activity === "ash_emission") return options.volcanoFilters.ashEmission;
      if (activity === "eruption") return options.volcanoFilters.eruption;
      return options.volcanoFilters.unrest;
    }
    return false;
  });
}

function geologicalColor(alert: NormalizedAlert): string {
  const gdacs = String(alert.metadata.gdacsSeverity ?? "").toLowerCase();
  if (gdacs === "red") return "#dc2626";
  if (gdacs === "orange") return "#f97316";
  if (gdacs === "green") return "#22c55e";
  if (alert.category === "volcano") {
    const activity = String(alert.metadata.activityType ?? "unknown");
    if (activity === "ash_emission") return "#64748b";
    if (activity === "eruption") return "#dc2626";
    return "#eab308";
  }
  const magnitude =
    typeof alert.metadata.magnitude === "number"
      ? alert.metadata.magnitude
      : null;
  const band = earthquakeMagnitudeBand(magnitude);
  if (band === "major") return "#991b1b";
  if (band === "strong") return "#ef4444";
  if (band === "moderate") return "#fb923c";
  return "#facc15";
}

export function buildGeologicalAlertCollection(
  alerts: readonly NormalizedAlert[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts
      .filter(
        (alert) =>
          (alert.category === "earthquake" || alert.category === "volcano") &&
          alert.centroid,
      )
      .map((alert) => {
        const magnitude =
          typeof alert.metadata.magnitude === "number"
            ? alert.metadata.magnitude
            : null;
        const depth =
          typeof alert.metadata.depthKilometers === "number"
            ? alert.metadata.depthKilometers
            : null;
        const felt =
          typeof alert.metadata.feltReports === "number"
            ? alert.metadata.feltReports
            : null;
        const location =
          alert.affectedAreaNames[0] ?? alert.countryCodes.join(", ");
        return {
          type: "Feature" as const,
          id: alert.id,
          properties: {
            alertId: alert.id,
            title: alert.title,
            category: alert.category,
            magnitude,
            magnitudeBand: earthquakeMagnitudeBand(magnitude),
            depthKilometers: depth,
            feltReports: felt,
            displayLocation: location,
            updatedAt: alert.updatedAt,
            onsetAt: alert.onsetAt,
            sourceName: alert.officialSourceName,
            gdacsSeverity: alert.metadata.gdacsSeverity ?? null,
            activityType: alert.metadata.activityType ?? null,
            markerColor: geologicalColor(alert),
            markerRadius:
              alert.category === "volcano"
                ? 11
                : magnitude == null
                  ? 7
                  : magnitude >= 6
                    ? 14
                    : magnitude >= 5
                      ? 11
                      : magnitude >= 4
                        ? 9
                        : 7,
            label:
              alert.category === "earthquake"
                ? `${magnitude == null ? "M?" : `M${magnitude.toFixed(1)}`} · ${location}`
                : alert.title,
            reviewStatus: alert.metadata.reviewStatus ?? null,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [
              alert.centroid!.longitude,
              alert.centroid!.latitude,
            ],
          },
        };
      }),
  };
}

export function buildAlertFeatureCollection(
  alerts: readonly NormalizedAlert[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts
      .filter(
        (alert) =>
          alert.category !== "earthquake" && alert.category !== "volcano",
      )
      .filter((alert) => alert.geometry || alert.centroid)
      .map((alert) => ({
        type: "Feature",
        id: alert.id,
        properties: {
          alertId: alert.id,
          title: alert.title,
          hazard: alert.hazard,
          category: alert.category,
          severity: alert.severity,
          severityColor: severityColor(alert.severity),
          status: alert.status,
          source: alert.source,
          updatedAt: alert.updatedAt,
          displayLocation:
            alert.affectedAreaNames[0] ?? alert.countryCodes.join(", "),
          countryCodes: alert.countryCodes.join(","),
          startAt: alert.onsetAt,
          endAt: alert.expiresAt,
          affectedAreaSquareKilometers:
            alert.metadata.affectedAreaSquareKilometers ?? null,
          affectedPopulation: alert.metadata.populationExposure ?? null,
          sourceUrl: alert.sourceUrl,
          dataNature: alert.metadata.dataNature ?? null,
        },
        geometry:
          alert.geometry ??
          ({
            type: "Point",
            coordinates: [alert.centroid!.longitude, alert.centroid!.latitude],
          } satisfies GeoJSON.Point),
      })),
  };
}

export function buildFloodEventMarkerCollection(
  alerts: readonly NormalizedAlert[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts
      .filter(
        (alert) =>
          alert.source === "gdacs" &&
          alert.category === "flood" &&
          alert.centroid,
      )
      .map((alert) => ({
        type: "Feature",
        id: alert.id,
        properties: {
          alertId: alert.id,
          sourceEventId: alert.sourceEventId,
          title: alert.title,
          displayLocation:
            alert.affectedAreaNames[0] ?? alert.countryCodes.join(", "),
          countryCodes: alert.countryCodes.join(","),
          severity: alert.severity,
          severityColor: severityColor(alert.severity),
          status: alert.status,
          startAt: alert.onsetAt,
          endAt: alert.expiresAt,
          updatedAt: alert.updatedAt,
          affectedAreaSquareKilometers:
            alert.metadata.affectedAreaSquareKilometers ?? null,
          affectedPopulation: alert.metadata.populationExposure ?? null,
          sourceUrl: alert.sourceUrl,
          dataNature: "impact-estimation",
        },
        geometry: {
          type: "Point",
          coordinates: [
            alert.centroid!.longitude,
            alert.centroid!.latitude,
          ],
        },
      })),
  };
}

export function createFloodWaveIcon(): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
    };
  }
  context.strokeStyle = "#ffffff";
  context.lineWidth = 5;
  context.lineCap = "round";
  for (const y of [21, 32, 43]) {
    context.beginPath();
    context.moveTo(11, y);
    context.bezierCurveTo(19, y - 7, 25, y + 7, 32, y);
    context.bezierCurveTo(39, y - 7, 45, y + 7, 53, y);
    context.stroke();
  }
  const image = context.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(image.data.buffer),
  };
}

function geometryFromMetadata(
  value: unknown,
  allowed: readonly GeoJSON.Geometry["type"][],
): GeoJSON.Geometry | null {
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  return allowed.includes(String(value.type) as GeoJSON.Geometry["type"])
    ? (value as GeoJSON.Geometry)
    : null;
}

export function buildStormGeometryCollection(
  alerts: readonly NormalizedAlert[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const alert of alerts.filter((item) => item.category === "tropical_cyclone")) {
    const entries: Array<[string, unknown, readonly GeoJSON.Geometry["type"][]]> = [
      ["past", alert.metadata.trackGeometry, ["LineString", "MultiLineString"]],
      ["forecast", alert.metadata.forecastTrackGeometry, ["LineString", "MultiLineString"]],
      ["uncertainty", alert.metadata.uncertaintyGeometry, ["Polygon", "MultiPolygon"]],
    ];
    for (const [segment, value, allowed] of entries) {
      const geometry = geometryFromMetadata(value, allowed);
      if (geometry) {
        features.push({
          type: "Feature",
          properties: { alertId: alert.id, segment },
          geometry,
        });
      }
    }
  }
  return { type: "FeatureCollection", features };
}

export function buildWildfireWindCollection(
  winds: readonly WildfireWind[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: winds
      .filter((wind) => wind.directionDegrees != null)
      .map((wind, index) => ({
        type: "Feature",
        id: index,
        properties: {
          direction: windOriginToFlowDirection(wind.directionDegrees!),
          speedKmh: wind.speedKmh,
          gustKmh: wind.gustKmh,
          validAt: wind.validAt,
        },
        geometry: {
          type: "Point",
          coordinates: [wind.longitude, wind.latitude],
        },
      })),
  };
}

export function createWindArrowIcon(): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  context.translate(size / 2, size / 2);
  context.strokeStyle = "#ffffff";
  context.lineWidth = 8;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(0, 22);
  context.lineTo(0, -20);
  context.moveTo(0, -20);
  context.lineTo(-10, -8);
  context.moveTo(0, -20);
  context.lineTo(10, -8);
  context.stroke();
  context.strokeStyle = "#0284c7";
  context.lineWidth = 4;
  context.stroke();
  const image = context.getImageData(-size / 2, -size / 2, size, size);
  return { width: size, height: size, data: new Uint8Array(image.data.buffer) };
}
