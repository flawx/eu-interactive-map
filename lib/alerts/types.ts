export type AlertCategory =
  | "wildfire"
  | "flood"
  | "weather"
  | "tropical_cyclone";

export type AlertHazard =
  | "wildfire"
  | "river_flood"
  | "flash_flood"
  | "coastal_flood"
  | "heavy_rain"
  | "strong_wind"
  | "extreme_wind"
  | "thunderstorm"
  | "hail"
  | "tornado"
  | "tropical_cyclone"
  | "storm_surge"
  | "snow"
  | "ice"
  | "other_weather";

export type AlertSeverity =
  | "unknown"
  | "minor"
  | "moderate"
  | "severe"
  | "extreme";

export type AlertStatus =
  | "upcoming"
  | "active"
  | "ended"
  | "cancelled"
  | "unknown";

export type AlertDataNature =
  | "official-warning"
  | "satellite-observation"
  | "forecast-model"
  | "impact-estimation";

export type AlertConnectorStatus =
  | "operational"
  | "delayed"
  | "unavailable"
  | "misconfigured";

export type NormalizedAlert = {
  id: string;
  source: string;
  sourceEventId: string;
  category: AlertCategory;
  hazard: AlertHazard;
  title: string;
  description: string | null;
  instructions: string | null;
  severity: AlertSeverity;
  status: AlertStatus;
  certainty: string | null;
  urgency: string | null;
  effectiveAt: string | null;
  onsetAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
  fetchedAt: string;
  countryCodes: string[];
  affectedAreaNames: string[];
  geometry: GeoJSON.Geometry | null;
  centroid: {
    latitude: number;
    longitude: number;
  } | null;
  sourceUrl: string | null;
  officialSourceName: string;
  observed: boolean;
  forecast: boolean;
  metadata: Record<string, unknown>;
};
export type AlertSourceDefinition = {
  id: string;
  name: string;
  categories: AlertCategory[];
  updateIntervalMs: number;
  attribution: string;
  officialUrl: string;
  dataNature: AlertDataNature;
  potentialDelay: string;
};

export type AlertApiResponse = {
  alerts: NormalizedAlert[];
  fetchedAt: string;
  source: AlertSourceDefinition;
  connectorStatus: AlertConnectorStatus;
  warnings: string[];
};
