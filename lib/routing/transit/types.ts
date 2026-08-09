/** Multimodal transit journey model — independent from TomTom road routing. */

export type TransitMode =
  | "walk"
  | "bus"
  | "trolleybus"
  | "coach"
  | "tram"
  | "metro"
  | "subway"
  | "light_rail"
  | "commuter_rail"
  | "regional_rail"
  | "rail"
  | "train"
  | "long_distance_rail"
  | "high_speed_rail"
  | "ferry"
  | "funicular"
  | "monorail"
  | "cable_car"
  | "flight"
  | "other";

export type TransitProviderId = "google_routes" | "navitia" | "mock";

export type TransitProviderStatus =
  | "operational"
  | "misconfigured"
  | "not_entitled"
  | "rate_limited"
  | "unavailable";

export type TransitFareStatus =
  | "confirmed"
  | "estimated"
  | "partial"
  | "unavailable";

export type TransitFare = {
  amount: number;
  currency: string;
  status: TransitFareStatus;
  source: string;
};

export type TransitPlace = {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type TransitStop = TransitPlace & {
  arrivalAt?: string | null;
  departureAt?: string | null;
};

export type TransitAgency = {
  name: string | null;
  uri: string | null;
  phoneNumber: string | null;
};

export type TransitLine = {
  name: string | null;
  nameShort: string | null;
  color: string | null;
  textColor: string | null;
  vehicleType: string | null;
  headsign: string | null;
  iconUri: string | null;
};

export type TransitVehicle = {
  type: string | null;
  name: string | null;
  iconUri: string | null;
  localIconUri: string | null;
};

export type TransitWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "critical";
};

export type TransitLeg = {
  id: string;
  mode: TransitMode;
  vehicleType: string | null;
  departureAt: string | null;
  arrivalAt: string | null;
  scheduledDepartureAt: string | null;
  scheduledArrivalAt: string | null;
  localizedDepartureTime: string | null;
  localizedArrivalTime: string | null;
  timezone: string | null;
  delaySeconds: number | null;
  durationSeconds: number;
  from: TransitPlace;
  to: TransitPlace;
  line: TransitLine | null;
  vehicle: TransitVehicle | null;
  agency: TransitAgency | null;
  headsign: string | null;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  } | null;
  intermediateStops: TransitStop[];
  stopCount: number | null;
  distanceMeters: number | null;
  realtime: boolean;
  instruction: string | null;
  lineColorSource: "provider" | "fallback";
};

export type TransitJourney = {
  id: string;
  provider: TransitProviderId;
  departureAt: string | null;
  arrivalAt: string | null;
  durationSeconds: number;
  distanceMeters: number | null;
  transfers: number;
  walkingDurationSeconds: number;
  waitingDurationSeconds: number;
  transitDurationSeconds: number;
  fare: TransitFare | null;
  legs: TransitLeg[];
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: [number, number][] | [number, number][][];
  };
  warnings: TransitWarning[];
  modeSummary: TransitMode[];
};

export type TransitAllowedMode =
  | "BUS"
  | "SUBWAY"
  | "TRAIN"
  | "LIGHT_RAIL"
  | "RAIL";

/** UI preference — maps to Google allowedTravelModes (or null = all). */
export type TransitModeFilter =
  | "all"
  | "bus"
  | "metro_tram"
  | "train";

export type TransitRoutingPreference =
  | "fewer_transfers"
  | "less_walking"
  | null;

export type TransitTiming =
  | { kind: "depart_now" }
  | { kind: "depart_at"; at: string }
  | { kind: "arrive_at"; at: string };

export type TransitRoutingRequest = {
  origin: {
    latitude: number;
    longitude: number;
    name?: string | null;
  };
  destination: {
    latitude: number;
    longitude: number;
    name?: string | null;
  };
  timing: TransitTiming;
  allowedModes: TransitAllowedMode[] | null;
  routingPreference: TransitRoutingPreference;
  alternatives: boolean;
  locale?: string;
};

export type TransitRoutingResult = {
  journeys: TransitJourney[];
  provider: TransitProviderId;
  status: TransitProviderStatus;
  calculatedAt: string;
};

export type TransitErrorCode =
  | "invalid_request"
  | "origin_required"
  | "destination_required"
  | "point_outside_coverage"
  | "no_route_found"
  | "transit_date_out_of_range"
  | "provider_misconfigured"
  | "provider_not_entitled"
  | "provider_rate_limited"
  | "provider_unavailable"
  | "aborted";

export class TransitError extends Error {
  readonly code: TransitErrorCode;
  readonly status: number;

  constructor(code: TransitErrorCode, message: string, status = 400) {
    super(message);
    this.name = "TransitError";
    this.code = code;
    this.status = status;
  }
}

export function transitModeFilterToAllowedModes(
  filter: TransitModeFilter,
): TransitAllowedMode[] | null {
  switch (filter) {
    case "bus":
      return ["BUS"];
    case "metro_tram":
      return ["SUBWAY", "LIGHT_RAIL"];
    case "train":
      return ["TRAIN", "RAIL"];
    case "all":
    default:
      return null;
  }
}

/** Flight provider stub — commercial integration is a follow-up commit. */
export type FlightOffer = {
  id: string;
  carrier: string | null;
  flightNumber: string | null;
  departureAirport: string;
  arrivalAirport: string;
  departureAt: string;
  arrivalAt: string;
  durationSeconds: number;
  price: { amount: number; currency: string } | null;
};

export interface FlightProvider {
  id: "serpapi_google_flights";
  getStatus(): Promise<TransitProviderStatus>;
  search(input: {
    origin: string;
    destination: string;
    departureDate: string;
    adults?: number;
    currency?: string;
    signal?: AbortSignal;
  }): Promise<FlightOffer[]>;
}
