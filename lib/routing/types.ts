export type RouteMode = "car" | "bicycle" | "pedestrian";

export type RoutePreference = "fastest" | "shortest" | "eco";

export type RoutePoint = {
  latitude: number;
  longitude: number;
  name: string | null;
  countryCode: string | null;
};

export type VehiclePropulsion =
  | "petrol"
  | "diesel"
  | "hybrid"
  | "electric";

export type VehicleProfile = {
  propulsion: VehiclePropulsion;
  consumptionPer100Km: number | null;
  fuelPricePerLiter: number | null;
  electricityConsumptionKwhPer100Km: number | null;
  electricityPricePerKwh: number | null;
};

export type RouteAvoidOptions = {
  tollRoads: boolean;
  motorways: boolean;
  ferries: boolean;
  unpavedRoads: boolean;
  tunnels: boolean;
  lowEmissionZones: boolean;
};

export type RoutingTiming =
  | { kind: "depart_now" }
  | { kind: "depart_at"; at: string }
  | { kind: "arrive_at"; at: string };

export type RoutingRequest = {
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints: RoutePoint[];
  mode: RouteMode;
  preference: RoutePreference;
  departureTime: string | "now";
  timing?: RoutingTiming;
  alternatives: number;
  avoid: RouteAvoidOptions;
  vehicleProfile: VehicleProfile | null;
  locale?: string;
};

export type RouteSectionType =
  | "traffic"
  | "toll"
  | "ferry"
  | "tunnel"
  | "motorway"
  | "unpaved"
  | "low_emission_zone"
  | "pedestrian"
  | "country"
  | "other";

export type RouteSection = {
  type: RouteSectionType;
  startOffsetMeters: number | null;
  endOffsetMeters: number | null;
  startPointIndex: number | null;
  endPointIndex: number | null;
  delaySeconds: number | null;
  effectiveSpeedKph: number | null;
  simpleCategory: string | null;
  magnitudeOfDelay: number | null;
  countryCode: string | null;
  metadata: Record<string, unknown>;
};

export type RouteInstruction = {
  index: number;
  message: string;
  streetName: string | null;
  maneuver: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  point: { latitude: number; longitude: number } | null;
};

export type RouteLeg = {
  distanceMeters: number;
  durationSeconds: number;
  trafficDelaySeconds: number | null;
};

export type RouteWarningCode =
  | "toll_detected"
  | "ferry_detected"
  | "tunnel_detected"
  | "lez_detected"
  | "roadworks_on_route"
  | "closure_on_route"
  | "traffic_delay"
  | "outside_coverage"
  | "provider_degraded";

export type RouteWarning = {
  code: RouteWarningCode;
  messageKey: string;
  severity: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
};

export type NormalizedRoute = {
  id: string;
  provider: "tomtom";
  mode: RouteMode;
  distanceMeters: number;
  durationSeconds: number;
  trafficDelaySeconds: number | null;
  noTrafficDurationSeconds: number | null;
  departureTime: string | null;
  arrivalTime: string | null;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  legs: RouteLeg[];
  instructions: RouteInstruction[];
  sections: RouteSection[];
  estimatedCosts: {
    fuelOrEnergy: number | null;
    fuelOrEnergyAmount: number | null;
    fuelOrEnergyUnit: "L" | "kWh" | null;
    tollExact: null;
    currency: "EUR";
  };
  warnings: RouteWarning[];
  countriesTraversed: string[];
  hasTolls: boolean;
  hasFerry: boolean;
  hasTunnel: boolean;
  hasLowEmissionZone: boolean;
};

export type RoutingResult = {
  routes: NormalizedRoute[];
  provider: "tomtom";
  calculatedAt: string;
};

export type RoutingProviderStatus =
  | "operational"
  | "misconfigured"
  | "unavailable";

export type RoutingErrorCode =
  | "origin_required"
  | "destination_required"
  | "invalid_request"
  | "point_outside_coverage"
  | "route_outside_coverage"
  | "no_route_found"
  | "provider_unavailable"
  | "provider_misconfigured"
  | "aborted"
  | "timeout";

export class RoutingError extends Error {
  readonly code: RoutingErrorCode;
  readonly status: number;

  constructor(code: RoutingErrorCode, message: string, status = 400) {
    super(message);
    this.name = "RoutingError";
    this.code = code;
    this.status = status;
  }
}

export const DEFAULT_ROUTE_AVOID: RouteAvoidOptions = {
  tollRoads: false,
  motorways: false,
  ferries: false,
  unpavedRoads: false,
  tunnels: false,
  lowEmissionZones: false,
};

export const MAX_ROUTE_ALTERNATIVES_UI = 2;
export const MAX_ROUTE_WAYPOINTS_UI = 5;
