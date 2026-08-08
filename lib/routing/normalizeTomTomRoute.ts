import { estimateFuelOrEnergyCost } from "@/lib/routing/costs/fuelCost";
import { normalizeAlertCountryCode } from "@/lib/alerts/geography";
import type {
  NormalizedRoute,
  RouteInstruction,
  RouteLeg,
  RouteMode,
  RouteSection,
  RouteSectionType,
  RouteWarning,
  RoutingRequest,
  VehicleProfile,
} from "@/lib/routing/types";

type TomTomLatLon = { latitude: number; longitude: number };

type TomTomPoint = {
  latitude?: number;
  longitude?: number;
};

type TomTomSection = {
  startPointIndex?: number;
  endPointIndex?: number;
  sectionType?: string;
  travelMode?: string;
  simpleCategory?: string;
  effectiveSpeedInKmh?: number;
  delayInSeconds?: number;
  magnitudeOfDelay?: number;
  countryCode?: string;
};

type TomTomGuidanceInstruction = {
  routeOffsetInMeters?: number;
  travelTimeInSeconds?: number;
  point?: TomTomPoint;
  instructionType?: string;
  street?: string;
  roadNumbers?: string[];
  maneuver?: string;
  message?: string;
};

type TomTomLeg = {
  summary?: {
    lengthInMeters?: number;
    travelTimeInSeconds?: number;
    trafficDelayInSeconds?: number;
    noTrafficTravelTimeInSeconds?: number;
  };
  points?: TomTomLatLon[];
};

type TomTomRoute = {
  summary?: {
    lengthInMeters?: number;
    travelTimeInSeconds?: number;
    trafficDelayInSeconds?: number;
    trafficLengthInMeters?: number;
    departureTime?: string;
    arrivalTime?: string;
    noTrafficTravelTimeInSeconds?: number;
  };
  legs?: TomTomLeg[];
  sections?: TomTomSection[];
  guidance?: {
    instructions?: TomTomGuidanceInstruction[];
  };
};

export type TomTomCalculateRouteResponse = {
  formatVersion?: string;
  routes?: TomTomRoute[];
};

const SECTION_MAP: Record<string, RouteSectionType> = {
  TRAFFIC: "traffic",
  TOLL_ROAD: "toll",
  TOLL: "toll",
  FERRY: "ferry",
  TUNNEL: "tunnel",
  MOTORWAY: "motorway",
  UNPAVED: "unpaved",
  LOW_EMISSION_ZONE: "low_emission_zone",
  PEDESTRIAN: "pedestrian",
  COUNTRY: "country",
};

function mapSectionType(raw: string | undefined): RouteSectionType {
  if (!raw) return "other";
  return SECTION_MAP[raw.toUpperCase()] ?? "other";
}

function cumulativeOffsets(
  points: Array<[number, number]>,
): number[] {
  const offsets = [0];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    offsets.push(offsets[i - 1]! + haversineMeters(prev, curr));
  }
  return offsets;
}

function haversineMeters(
  a: [number, number],
  b: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function flattenPoints(route: TomTomRoute): [number, number][] {
  const coords: [number, number][] = [];
  for (const leg of route.legs ?? []) {
    for (const point of leg.points ?? []) {
      if (
        !Number.isFinite(point.latitude) ||
        !Number.isFinite(point.longitude)
      ) {
        continue;
      }
      // TomTom points are lat/lon objects → GeoJSON [longitude, latitude].
      const next: [number, number] = [point.longitude, point.latitude];
      const prev = coords[coords.length - 1];
      // Drop duplicate junction vertices when concatenating multiple legs.
      if (prev && prev[0] === next[0] && prev[1] === next[1]) {
        continue;
      }
      coords.push(next);
    }
  }
  return coords;
}

function buildWarnings(
  sections: RouteSection[],
  trafficDelaySeconds: number | null,
): RouteWarning[] {
  const warnings: RouteWarning[] = [];
  if (sections.some((s) => s.type === "toll")) {
    warnings.push({
      code: "toll_detected",
      messageKey: "tollDetected",
      severity: "info",
    });
  }
  if (sections.some((s) => s.type === "ferry")) {
    warnings.push({
      code: "ferry_detected",
      messageKey: "ferryDetected",
      severity: "info",
    });
  }
  if (sections.some((s) => s.type === "tunnel")) {
    warnings.push({
      code: "tunnel_detected",
      messageKey: "tunnelDetected",
      severity: "info",
    });
  }
  if (sections.some((s) => s.type === "low_emission_zone")) {
    warnings.push({
      code: "lez_detected",
      messageKey: "lezDetected",
      severity: "info",
    });
  }
  if (
    sections.some(
      (s) =>
        s.type === "traffic" &&
        (s.simpleCategory === "ROAD_CLOSURE" ||
          s.simpleCategory === "ROAD_WORKS" ||
          String(s.metadata.simpleCategory ?? "").includes("CLOSURE")),
    )
  ) {
    const closed = sections.some(
      (s) =>
        s.type === "traffic" &&
        String(s.simpleCategory ?? "")
          .toUpperCase()
          .includes("CLOSURE"),
    );
    warnings.push({
      code: closed ? "closure_on_route" : "roadworks_on_route",
      messageKey: closed ? "closureOnRoute" : "roadworksOnRoute",
      severity: closed ? "critical" : "warning",
    });
  }
  if (trafficDelaySeconds != null && trafficDelaySeconds >= 60) {
    warnings.push({
      code: "traffic_delay",
      messageKey: "trafficDelay",
      severity: "warning",
      metadata: { trafficDelaySeconds },
    });
  }
  return warnings;
}

function applyCosts(
  distanceMeters: number,
  profile: VehicleProfile | null,
): NormalizedRoute["estimatedCosts"] {
  const estimate = estimateFuelOrEnergyCost(distanceMeters, profile);
  return {
    fuelOrEnergy: estimate?.costEur ?? null,
    fuelOrEnergyAmount: estimate?.amount ?? null,
    fuelOrEnergyUnit: estimate?.unit ?? null,
    tollExact: null,
    currency: "EUR",
  };
}

export function normalizeTomTomRoutes(
  payload: TomTomCalculateRouteResponse,
  request: RoutingRequest,
): NormalizedRoute[] {
  const routes = payload.routes ?? [];
  return routes.map((route, routeIndex) =>
    normalizeOneRoute(route, request, routeIndex),
  );
}

function normalizeOneRoute(
  route: TomTomRoute,
  request: RoutingRequest,
  routeIndex: number,
): NormalizedRoute {
  const coordinates = flattenPoints(route);
  const offsets = cumulativeOffsets(coordinates);
  const summary = route.summary ?? {};

  const sections: RouteSection[] = (route.sections ?? []).map((section) => {
    const startIdx = section.startPointIndex ?? null;
    const endIdx = section.endPointIndex ?? null;
    return {
      type: mapSectionType(section.sectionType),
      startOffsetMeters:
        startIdx != null && offsets[startIdx] != null
          ? Math.round(offsets[startIdx]!)
          : null,
      endOffsetMeters:
        endIdx != null && offsets[endIdx] != null
          ? Math.round(offsets[endIdx]!)
          : null,
      startPointIndex: startIdx,
      endPointIndex: endIdx,
      delaySeconds:
        typeof section.delayInSeconds === "number"
          ? section.delayInSeconds
          : null,
      effectiveSpeedKph:
        typeof section.effectiveSpeedInKmh === "number"
          ? section.effectiveSpeedInKmh
          : null,
      simpleCategory: section.simpleCategory ?? null,
      magnitudeOfDelay:
        typeof section.magnitudeOfDelay === "number"
          ? section.magnitudeOfDelay
          : null,
      countryCode: section.countryCode
        ? normalizeAlertCountryCode(section.countryCode) ??
          section.countryCode.toUpperCase()
        : null,
      metadata: {
        sectionType: section.sectionType ?? null,
        travelMode: section.travelMode ?? null,
        simpleCategory: section.simpleCategory ?? null,
      },
    };
  });

  const legs: RouteLeg[] = (route.legs ?? []).map((leg) => ({
    distanceMeters: leg.summary?.lengthInMeters ?? 0,
    durationSeconds: leg.summary?.travelTimeInSeconds ?? 0,
    trafficDelaySeconds:
      typeof leg.summary?.trafficDelayInSeconds === "number"
        ? leg.summary.trafficDelayInSeconds
        : null,
  }));

  const instructions: RouteInstruction[] = (
    route.guidance?.instructions ?? []
  ).map((instruction, index) => ({
    index,
    message: instruction.message?.trim() || instruction.maneuver || "",
    streetName: instruction.street ?? null,
    maneuver: instruction.maneuver ?? instruction.instructionType ?? null,
    distanceMeters:
      typeof instruction.routeOffsetInMeters === "number"
        ? instruction.routeOffsetInMeters
        : null,
    durationSeconds:
      typeof instruction.travelTimeInSeconds === "number"
        ? instruction.travelTimeInSeconds
        : null,
    point:
      instruction.point &&
      Number.isFinite(instruction.point.latitude) &&
      Number.isFinite(instruction.point.longitude)
        ? {
            latitude: instruction.point.latitude!,
            longitude: instruction.point.longitude!,
          }
        : null,
  }));

  const noTraffic =
    typeof summary.noTrafficTravelTimeInSeconds === "number"
      ? summary.noTrafficTravelTimeInSeconds
      : null;
  const withTraffic =
    typeof summary.travelTimeInSeconds === "number"
      ? summary.travelTimeInSeconds
      : null;
  const explicitDelay =
    typeof summary.trafficDelayInSeconds === "number"
      ? summary.trafficDelayInSeconds
      : null;
  const trafficDelaySeconds =
    explicitDelay != null
      ? explicitDelay
      : noTraffic != null && withTraffic != null
        ? Math.max(0, withTraffic - noTraffic)
        : null;

  const countriesTraversed = [
    ...new Set(
      sections
        .filter((s) => s.type === "country" && s.countryCode)
        .map((s) => s.countryCode!)
        .filter(Boolean),
    ),
  ];

  const hasTolls = sections.some((s) => s.type === "toll");
  const hasFerry = sections.some((s) => s.type === "ferry");
  const hasTunnel = sections.some((s) => s.type === "tunnel");
  const hasLowEmissionZone = sections.some(
    (s) => s.type === "low_emission_zone",
  );

  const distanceMeters = summary.lengthInMeters ?? 0;
  const durationSeconds = summary.travelTimeInSeconds ?? 0;

  return {
    id: `tomtom-${request.mode}-${routeIndex}`,
    provider: "tomtom",
    mode: request.mode,
    distanceMeters,
    durationSeconds,
    trafficDelaySeconds,
    noTrafficDurationSeconds: noTraffic,
    departureTime: summary.departureTime ?? null,
    arrivalTime: summary.arrivalTime ?? null,
    geometry: {
      type: "LineString",
      coordinates,
    },
    legs,
    instructions,
    sections,
    estimatedCosts: applyCosts(distanceMeters, request.vehicleProfile),
    warnings: buildWarnings(sections, trafficDelaySeconds),
    countriesTraversed,
    hasTolls,
    hasFerry,
    hasTunnel,
    hasLowEmissionZone,
  };
}

export function tomTomTravelMode(mode: RouteMode): string {
  if (mode === "bicycle") return "bicycle";
  if (mode === "pedestrian") return "pedestrian";
  return "car";
}
