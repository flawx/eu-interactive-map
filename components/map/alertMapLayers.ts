import type { NormalizedAlert, AlertHazard } from "@/lib/alerts/types";
import type { WildfireWind } from "@/lib/alerts/wind";
import { severityColor } from "@/lib/alerts/severity";
import { windOriginToFlowDirection } from "@/lib/alerts/wind";

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

export const ALERT_SOURCE_ID = "normalized-alerts";
export const ALERT_FILL_LAYER_ID = "normalized-alert-zones-fill";
export const ALERT_LINE_LAYER_ID = "normalized-alert-zones-line";
export const ALERT_POINT_LAYER_ID = "normalized-alert-points";
export const ALERT_SELECTED_LAYER_ID = "normalized-alert-selected";
export const ALERT_SELECTED_POINT_LAYER_ID = "normalized-alert-selected-point";
export const ALERT_TRACK_SOURCE_ID = "storm-tracks";
export const ALERT_TRACK_LAYER_ID = "storm-tracks-line";
export const ALERT_FORECAST_TRACK_LAYER_ID = "storm-forecast-tracks-line";
export const ALERT_UNCERTAINTY_LAYER_ID = "storm-uncertainty-fill";
export const WILDFIRE_WIND_SOURCE_ID = "wildfire-wind";
export const WILDFIRE_WIND_LAYER_ID = "wildfire-wind-arrows";

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
    weatherFilters: WeatherHazardFilters;
  },
): NormalizedAlert[] {
  return alerts.filter((alert) => {
    if (alert.source === "meteoalarm") {
      return options.weather && weatherHazardVisible(alert.hazard, options.weatherFilters);
    }
    if (alert.category === "flood") return options.floods;
    if (alert.category === "tropical_cyclone") return options.storms;
    return false;
  });
}

export function buildAlertFeatureCollection(
  alerts: readonly NormalizedAlert[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts
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
