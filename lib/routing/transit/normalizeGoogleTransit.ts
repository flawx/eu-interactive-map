import {
  decodeGooglePolyline,
  mergeLineCoordinates,
} from "@/lib/routing/transit/decodePolyline";
import type {
  TransitAgency,
  TransitFare,
  TransitJourney,
  TransitLeg,
  TransitLine,
  TransitMode,
  TransitPlace,
  TransitWarning,
} from "@/lib/routing/transit/types";

type LatLng = { latitude?: number; longitude?: number };
type Money = {
  currencyCode?: string;
  units?: string | number;
  nanos?: number;
};

type GoogleTransitLine = {
  name?: string;
  nameShort?: string;
  color?: string;
  textColor?: string;
  agencies?: Array<{
    name?: string;
    uri?: string;
    phoneNumber?: string;
  }>;
  vehicle?: {
    name?: { text?: string };
    type?: string;
  };
};

type GoogleStep = {
  travelMode?: string;
  staticDuration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  startLocation?: { latLng?: LatLng };
  endLocation?: { latLng?: LatLng };
  navigationInstruction?: { instructions?: string };
  transitDetails?: {
    stopDetails?: {
      departureStop?: { name?: string; location?: { latLng?: LatLng } };
      arrivalStop?: { name?: string; location?: { latLng?: LatLng } };
      departureTime?: string;
      arrivalTime?: string;
    };
    localizedValues?: {
      departureTime?: { time?: { text?: string }; timeZone?: string };
      arrivalTime?: { time?: { text?: string }; timeZone?: string };
    };
    headsign?: string;
    stopCount?: number;
    transitLine?: GoogleTransitLine;
  };
};

type GoogleRoute = {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  legs?: Array<{
    duration?: string;
    distanceMeters?: number;
    polyline?: { encodedPolyline?: string };
    steps?: GoogleStep[];
  }>;
  travelAdvisory?: { transitFare?: Money };
  localizedValues?: {
    transitFare?: { text?: string };
  };
  routeLabels?: string[];
  warnings?: string[];
};

export type GoogleComputeRoutesResponse = {
  routes?: GoogleRoute[];
  error?: { code?: number; message?: string; status?: string };
};

function parseDurationSeconds(value: string | undefined): number {
  if (!value) return 0;
  if (value.endsWith("s")) {
    const n = Number(value.slice(0, -1));
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }
  return 0;
}

function placeFromLatLng(
  latLng: LatLng | undefined,
  name?: string | null,
): TransitPlace {
  const latitude =
    typeof latLng?.latitude === "number" ? latLng.latitude : null;
  const longitude =
    typeof latLng?.longitude === "number" ? latLng.longitude : null;
  return {
    name: name ?? null,
    latitude,
    longitude,
  };
}

export function mapGoogleVehicleType(type: string | undefined): TransitMode {
  switch ((type ?? "").toUpperCase()) {
    case "BUS":
    case "INTERCITY_BUS":
    case "TROLLEYBUS":
      return "bus";
    case "TRAM":
      return "tram";
    case "SUBWAY":
    case "METRO_RAIL":
      return "subway";
    case "LIGHT_RAIL":
      return "light_rail";
    case "COMMUTER_TRAIN":
      return "regional_rail";
    case "HEAVY_RAIL":
    case "RAIL":
    case "LONG_DISTANCE_TRAIN":
      return "train";
    case "HIGH_SPEED_TRAIN":
      return "high_speed_rail";
    case "FERRY":
      return "ferry";
    case "GONDOLA_LIFT":
    case "FUNICULAR":
    case "CABLE_CAR":
    case "MONORAIL":
      return "other";
    default:
      return "other";
  }
}

function mapStepMode(step: GoogleStep): TransitMode {
  const travel = (step.travelMode ?? "").toUpperCase();
  if (travel === "WALK" || travel === "WALKING") return "walk";
  if (travel === "TRANSIT") {
    return mapGoogleVehicleType(step.transitDetails?.transitLine?.vehicle?.type);
  }
  return "other";
}

function moneyToFare(money: Money | undefined): TransitFare | null {
  if (!money || !money.currencyCode) return null;
  const units =
    typeof money.units === "string"
      ? Number(money.units)
      : typeof money.units === "number"
        ? money.units
        : 0;
  const nanos =
    typeof money.nanos === "number" ? money.nanos / 1_000_000_000 : 0;
  const amount = units + nanos;
  if (!Number.isFinite(amount) || amount < 0) return null;
  return {
    amount,
    currency: money.currencyCode,
    // Google only returns fare when all steps have fare info — treat as estimated.
    status: "estimated",
    source: "google_routes",
  };
}

function countTransfers(legs: TransitLeg[]): number {
  const transitLegs = legs.filter((leg) => leg.mode !== "walk");
  return Math.max(0, transitLegs.length - 1);
}

function computeWaitingSeconds(legs: TransitLeg[]): number {
  let waiting = 0;
  for (let i = 0; i < legs.length - 1; i += 1) {
    const current = legs[i]!;
    const next = legs[i + 1]!;
    // Waiting is the dwell before boarding the next transit vehicle.
    if (next.mode === "walk") continue;
    if (!current.arrivalAt || !next.departureAt) continue;
    const gap =
      (Date.parse(next.departureAt) - Date.parse(current.arrivalAt)) / 1000;
    if (Number.isFinite(gap) && gap > 0) waiting += Math.round(gap);
  }
  return waiting;
}

function normalizeStep(step: GoogleStep, journeyIndex: number, stepIndex: number): TransitLeg {
  const details = step.transitDetails;
  const mode = mapStepMode(step);
  const fromStop = details?.stopDetails?.departureStop;
  const toStop = details?.stopDetails?.arrivalStop;
  const from = placeFromLatLng(
    fromStop?.location?.latLng ?? step.startLocation?.latLng,
    fromStop?.name ?? null,
  );
  const to = placeFromLatLng(
    toStop?.location?.latLng ?? step.endLocation?.latLng,
    toStop?.name ?? null,
  );
  const encoded = step.polyline?.encodedPolyline ?? "";
  const coordinates = decodeGooglePolyline(encoded);
  const agencyRaw = details?.transitLine?.agencies?.[0];
  const agency: TransitAgency | null = agencyRaw
    ? {
        name: agencyRaw.name ?? null,
        uri: agencyRaw.uri ?? null,
        phoneNumber: agencyRaw.phoneNumber ?? null,
      }
    : null;
  const line: TransitLine | null = details?.transitLine
    ? {
        name: details.transitLine.name ?? null,
        nameShort: details.transitLine.nameShort ?? null,
        color: details.transitLine.color ?? null,
        textColor: details.transitLine.textColor ?? null,
        vehicleType: details.transitLine.vehicle?.type ?? null,
        headsign: details.headsign ?? null,
      }
    : null;

  return {
    id: `google-${journeyIndex}-step-${stepIndex}`,
    mode,
    departureAt: details?.stopDetails?.departureTime ?? null,
    arrivalAt: details?.stopDetails?.arrivalTime ?? null,
    scheduledDepartureAt: details?.stopDetails?.departureTime ?? null,
    scheduledArrivalAt: details?.stopDetails?.arrivalTime ?? null,
    delaySeconds: null,
    durationSeconds: parseDurationSeconds(step.staticDuration),
    from,
    to,
    line,
    agency,
    geometry:
      coordinates.length >= 2
        ? { type: "LineString", coordinates }
        : null,
    intermediateStops: [],
    stopCount:
      typeof details?.stopCount === "number" ? details.stopCount : null,
    distanceMeters:
      typeof step.distanceMeters === "number" ? step.distanceMeters : null,
    realtime: false,
    instruction: step.navigationInstruction?.instructions ?? null,
  };
}

export function normalizeGoogleTransitRoutes(
  payload: GoogleComputeRoutesResponse,
): TransitJourney[] {
  const routes = payload.routes ?? [];
  return routes.map((route, journeyIndex) => {
    const steps = (route.legs ?? []).flatMap((leg) => leg.steps ?? []);
    const legs = steps.map((step, stepIndex) =>
      normalizeStep(step, journeyIndex, stepIndex),
    );
    const partCoords = legs
      .map((leg) => leg.geometry?.coordinates ?? [])
      .filter((coords) => coords.length >= 2);
    const merged = mergeLineCoordinates(partCoords);
    const routeEncoded = route.polyline?.encodedPolyline;
    const routeCoords = routeEncoded
      ? decodeGooglePolyline(routeEncoded)
      : merged;

    const durationSeconds = parseDurationSeconds(route.duration);
    const walkingDurationSeconds = legs
      .filter((leg) => leg.mode === "walk")
      .reduce((sum, leg) => sum + leg.durationSeconds, 0);
    const transitDurationSeconds = legs
      .filter((leg) => leg.mode !== "walk")
      .reduce((sum, leg) => sum + leg.durationSeconds, 0);
    const waitingDurationSeconds = computeWaitingSeconds(legs);

    const departureAt =
      legs.find((leg) => leg.departureAt)?.departureAt ??
      legs[0]?.departureAt ??
      null;
    const arrivalAt =
      [...legs].reverse().find((leg) => leg.arrivalAt)?.arrivalAt ??
      legs[legs.length - 1]?.arrivalAt ??
      null;

    const fare = moneyToFare(route.travelAdvisory?.transitFare);
    const warnings: TransitWarning[] = (route.warnings ?? []).map(
      (message, index) => ({
        code: `google_warning_${index}`,
        message,
        severity: "info" as const,
      }),
    );

    const modeSummary = legs
      .map((leg) => leg.mode)
      .filter((mode, index, arr) => arr[index - 1] !== mode);

    return {
      id: `google-transit-${journeyIndex}`,
      provider: "google_routes",
      departureAt,
      arrivalAt,
      durationSeconds,
      distanceMeters:
        typeof route.distanceMeters === "number" ? route.distanceMeters : null,
      transfers: countTransfers(legs),
      walkingDurationSeconds,
      waitingDurationSeconds,
      transitDurationSeconds,
      fare,
      legs,
      geometry:
        routeCoords.length >= 2
          ? { type: "LineString", coordinates: routeCoords }
          : partCoords.length > 1
            ? { type: "MultiLineString", coordinates: partCoords }
            : { type: "LineString", coordinates: merged },
      warnings,
      modeSummary,
    };
  });
}
