export type AlertCategory =
  | "wildfire"
  | "flood"
  | "weather"
  | "tropical_cyclone"
  | "earthquake"
  | "volcano"
  | "landslide"
  | "industrial_incident"
  | "road_traffic";

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
  | "earthquake"
  | "aftershock"
  | "volcanic_unrest"
  | "volcanic_eruption"
  | "ash_emission"
  | "landslide_likelihood"
  | "landslide_event"
  | "industrial_accident"
  | "chemical_accident"
  | "explosion"
  | "technical_accident"
  | "unknown_industrial_incident"
  | "traffic_jam"
  | "road_accident"
  | "road_closure"
  | "lane_closure"
  | "roadworks"
  | "broken_down_vehicle"
  | "road_hazard"
  | "road_weather"
  | "traffic_restriction"
  | "other_traffic_incident"
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
  | "instrumental-observation"
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
  demoMode?: boolean;
  providerStatuses?: Record<string, AlertConnectorStatus>;
};

export type AlertActivityMode = "active" | "24h" | "72h";

export type EarthquakeReviewStatus = "automatic" | "reviewed" | "unknown";

export type EarthquakeProviderEventIds = {
  usgs?: string;
  emsc?: string;
  gdacs?: string;
};

export type EarthquakeAlertMetadata = {
  magnitude: number | null;
  magnitudeType: string | null;
  depthKilometers: number | null;
  feltReports: number | null;
  maximumReportedIntensity: number | null;
  estimatedIntensity: number | null;
  tsunamiFlag: boolean | null;
  reviewStatus: EarthquakeReviewStatus;
  usgsEventId: string | null;
  emscEventId: string | null;
  gdacsEventId: string | null;
  providerEventIds: EarthquakeProviderEventIds;
  providerMagnitudes: Partial<Record<"usgs" | "emsc" | "gdacs", number>>;
  providerUpdatedAt: Partial<Record<"usgs" | "emsc" | "gdacs", string>>;
  providerUrls: Partial<Record<"usgs" | "emsc" | "gdacs", string>>;
  affectedPopulation: number | null;
  gdacsSeverity: "green" | "orange" | "red" | null;
};

export type VolcanoAlertMetadata = {
  volcanoName: string;
  volcanoId: string | null;
  activityType: "unrest" | "eruption" | "ash_emission" | "unknown";
  gdacsEventId: string | null;
  eruptionStartAt: string | null;
  lastActivityAt: string | null;
  ashCloudInformation: string | null;
  affectedPopulation: number | null;
};

export type EarthquakeTimeMode = "1h" | "24h" | "7d";
export type VolcanoTimeMode = "ongoing" | "72h" | "30d";
export type CemsActivationTimeMode = "ongoing" | "72h" | "30d";
export type TrafficIncidentTimeMode = "current" | "planned" | "recent";

export type LandslideAlertMetadata = {
  dataType: "modelled_likelihood" | "mapped_event";
  likelihood: "moderate" | "high" | "unknown";
  modelName: string | null;
  validAt: string | null;
  publishedAt: string | null;
  cemsActivationCode: string | null;
  aoiCount: number | null;
  productCount: number | null;
  observedAreaSquareKilometers: number | null;
  affectedPopulation: number | null;
  observed: boolean;
  forecast: boolean;
};

export type IndustrialIncidentMetadata = {
  incidentType:
    | "industrial_accident"
    | "chemical_accident"
    | "explosion"
    | "technical_accident"
    | "unknown";
  cemsActivationCode: string;
  eventTime: string | null;
  activationTime: string;
  closed: boolean;
  aoiCount: number;
  productCount: number;
  affectedAreaSquareKilometers: number | null;
  affectedBuildings: number | null;
  affectedPopulation: number | null;
  substances: string[];
  officialInstructions: string | null;
  emarsReportUrl: string | null;
};

export type TrafficIncidentStatus = "planned" | "active" | "ended" | "unknown";

export type TrafficIncidentMetadata = {
  providerIncidentId: string;
  incidentType: AlertHazard;
  status: TrafficIncidentStatus;
  roadNumbers: string[];
  fromLocation: string | null;
  toLocation: string | null;
  direction: string | null;
  lengthMeters: number | null;
  delaySeconds: number | null;
  currentSpeedKph: number | null;
  freeFlowSpeedKph: number | null;
  currentTravelTimeSeconds: number | null;
  freeFlowTravelTimeSeconds: number | null;
  magnitudeOfDelay: number | null;
  magnitudeOfDelayLabel: string | null;
  probabilityOfOccurrence: string | null;
  confidence: number | null;
  numberOfReports: number | null;
  roadClosed: boolean | null;
  lanesClosed: number | null;
  totalLanes: number | null;
  startAt: string | null;
  endAt: string | null;
  lastReportAt: string | null;
  updatedAt: string;
  providerModelId: string | null;
  emergencyServices: string[] | null;
  estimatedClearanceAt: string | null;
  providerEvents: Array<{
    code: number | null;
    description: string;
    iconCategory: string | null;
  }>;
};
