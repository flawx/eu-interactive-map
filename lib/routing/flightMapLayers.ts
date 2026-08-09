export const FLIGHT_ROUTE_SOURCE_ID = "flight-route-source";
export const FLIGHT_AIRPORTS_SOURCE_ID = "flight-route-airports";

export const FLIGHT_LAYER_HALO = "flight-route-halo";
export const FLIGHT_LAYER_MAIN = "flight-route-main";
export const FLIGHT_LAYER_AIRPORTS = "flight-route-airports";
export const FLIGHT_LAYER_AIRPORT_LABELS = "flight-route-airport-labels";

export type FlightMapAirportRole = "departure" | "arrival" | "layover";

export type FlightMapAirportPoint = {
  id: string;
  role: FlightMapAirportRole;
  longitude: number;
  latitude: number;
  iataCode: string;
  label: string;
  subtitle?: string | null;
};

/** Distinct from transit blue (#1a73e8/#1d4ed8) — signals "in the air". */
export const FLIGHT_ROUTE_COLOR = "#0ea5e9";
