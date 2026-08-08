import {
  areCountriesAllowed,
  isRouteGeometryAllowed,
  isRoutingPointAllowed,
} from "@/lib/routing/routingGeofence";
import { getRoutingProvider } from "@/lib/routing/providers/providerRegistry";
import {
  DEFAULT_ROUTE_AVOID,
  MAX_ROUTE_ALTERNATIVES_UI,
  MAX_ROUTE_WAYPOINTS_UI,
  RoutingError,
  type RouteAvoidOptions,
  type RouteMode,
  type RoutePoint,
  type RoutePreference,
  type RoutingRequest,
  type RoutingTiming,
  type VehicleProfile,
} from "@/lib/routing/types";

function parsePoint(value: unknown, label: string): RoutePoint {
  if (!value || typeof value !== "object") {
    throw new RoutingError("invalid_request", `${label} is required`);
  }
  const raw = value as Record<string, unknown>;
  const latitude = Number(raw.latitude);
  const longitude = Number(raw.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new RoutingError("invalid_request", `${label} coordinates invalid`);
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new RoutingError("invalid_request", `${label} coordinates out of range`);
  }
  return {
    latitude,
    longitude,
    name: typeof raw.name === "string" ? raw.name : null,
    countryCode:
      typeof raw.countryCode === "string" ? raw.countryCode.toUpperCase() : null,
  };
}

function parseAvoid(value: unknown): RouteAvoidOptions {
  if (!value || typeof value !== "object") return { ...DEFAULT_ROUTE_AVOID };
  const raw = value as Record<string, unknown>;
  return {
    tollRoads: Boolean(raw.tollRoads),
    motorways: Boolean(raw.motorways),
    ferries: Boolean(raw.ferries),
    unpavedRoads: Boolean(raw.unpavedRoads),
    tunnels: Boolean(raw.tunnels),
    lowEmissionZones: Boolean(raw.lowEmissionZones),
  };
}

function parseVehicleProfile(value: unknown): VehicleProfile | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const propulsion = raw.propulsion;
  if (
    propulsion !== "petrol" &&
    propulsion !== "diesel" &&
    propulsion !== "hybrid" &&
    propulsion !== "electric"
  ) {
    return null;
  }
  return {
    propulsion,
    consumptionPer100Km:
      typeof raw.consumptionPer100Km === "number"
        ? raw.consumptionPer100Km
        : null,
    fuelPricePerLiter:
      typeof raw.fuelPricePerLiter === "number"
        ? raw.fuelPricePerLiter
        : null,
    electricityConsumptionKwhPer100Km:
      typeof raw.electricityConsumptionKwhPer100Km === "number"
        ? raw.electricityConsumptionKwhPer100Km
        : null,
    electricityPricePerKwh:
      typeof raw.electricityPricePerKwh === "number"
        ? raw.electricityPricePerKwh
        : null,
  };
}

function parseTiming(
  body: Record<string, unknown>,
): { departureTime: string | "now"; timing: RoutingTiming } {
  const timingRaw = body.timing;
  if (timingRaw && typeof timingRaw === "object") {
    const t = timingRaw as Record<string, unknown>;
    if (t.kind === "depart_at" && typeof t.at === "string") {
      return { departureTime: t.at, timing: { kind: "depart_at", at: t.at } };
    }
    if (t.kind === "arrive_at" && typeof t.at === "string") {
      return { departureTime: "now", timing: { kind: "arrive_at", at: t.at } };
    }
  }
  if (typeof body.departureTime === "string" && body.departureTime !== "now") {
    return {
      departureTime: body.departureTime,
      timing: { kind: "depart_at", at: body.departureTime },
    };
  }
  return { departureTime: "now", timing: { kind: "depart_now" } };
}

export function parseRoutingRequestBody(body: unknown): RoutingRequest {
  if (!body || typeof body !== "object") {
    throw new RoutingError("invalid_request", "Body must be a JSON object");
  }
  const raw = body as Record<string, unknown>;

  if (!raw.origin) {
    throw new RoutingError("origin_required", "Origin is required");
  }
  if (!raw.destination) {
    throw new RoutingError("destination_required", "Destination is required");
  }

  const origin = parsePoint(raw.origin, "origin");
  const destination = parsePoint(raw.destination, "destination");
  const waypoints = Array.isArray(raw.waypoints)
    ? raw.waypoints
        .slice(0, MAX_ROUTE_WAYPOINTS_UI)
        .map((wp, index) => parsePoint(wp, `waypoint[${index}]`))
    : [];

  const mode: RouteMode =
    raw.mode === "bicycle" || raw.mode === "pedestrian" ? raw.mode : "car";
  if (
    raw.mode != null &&
    raw.mode !== "car" &&
    raw.mode !== "bicycle" &&
    raw.mode !== "pedestrian"
  ) {
    throw new RoutingError("invalid_request", "Unsupported travel mode");
  }

  const preference: RoutePreference =
    raw.preference === "shortest" || raw.preference === "eco"
      ? raw.preference
      : "fastest";

  const alternatives = Math.max(
    0,
    Math.min(
      MAX_ROUTE_ALTERNATIVES_UI,
      typeof raw.alternatives === "number"
        ? Math.floor(raw.alternatives)
        : MAX_ROUTE_ALTERNATIVES_UI,
    ),
  );

  for (const point of [origin, destination, ...waypoints]) {
    if (!isRoutingPointAllowed(point)) {
      throw new RoutingError(
        "point_outside_coverage",
        "Point is outside the supported European coverage",
        422,
      );
    }
  }

  const samePoint =
    Math.abs(origin.latitude - destination.latitude) < 1e-5 &&
    Math.abs(origin.longitude - destination.longitude) < 1e-5 &&
    waypoints.length === 0;
  if (samePoint) {
    throw new RoutingError(
      "no_route_found",
      "Origin and destination are identical",
      404,
    );
  }

  const { departureTime, timing } = parseTiming(raw);

  return {
    origin,
    destination,
    waypoints,
    mode,
    preference,
    departureTime,
    timing,
    alternatives,
    avoid: parseAvoid(raw.avoid),
    vehicleProfile: parseVehicleProfile(raw.vehicleProfile),
    locale: typeof raw.locale === "string" ? raw.locale : "en",
  };
}

export async function calculateNormalizedRoutes(
  request: RoutingRequest,
  signal?: AbortSignal,
) {
  const provider = getRoutingProvider();
  const result = await provider.calculateRoute(request, signal);

  const allowedRoutes = result.routes.filter((route) => {
    if (!isRouteGeometryAllowed(route.geometry)) return false;
    if (!areCountriesAllowed(route.countriesTraversed)) return false;
    return true;
  });

  if (!allowedRoutes.length) {
    throw new RoutingError(
      "route_outside_coverage",
      "Calculated route leaves the supported European coverage",
      422,
    );
  }

  return {
    ...result,
    routes: allowedRoutes,
  };
}
