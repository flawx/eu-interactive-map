"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  Bike,
  Car,
  ChevronDown,
  ChevronUp,
  Footprints,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Trash2,
  TrainFront,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  formatRouteDistance,
  formatRouteDuration,
  formatTrafficDelay,
} from "@/lib/routing/formatRoute";
import {
  collapseTransitLegsForDisplay,
  formatTransitClock,
  journeyCoordinates,
} from "@/lib/routing/formatTransit";
import {
  formatFlightClock,
  formatFlightDuration,
  multimodalCoordinates,
  summarizeFlightJourney,
  tomorrowDateInputValue,
} from "@/lib/routing/formatFlight";
import { isRoutingPointAllowed } from "@/lib/routing/routingGeofence";
import {
  applyShareableRouteToUrl,
  clearShareableRouteFromUrl,
} from "@/lib/routing/shareableRoute";
import {
  resolvedWaypoints,
  type RoutePlannerPointsState,
} from "@/lib/routing/routePlannerPoints";
import type {
  TransitJourney,
  TransitMode,
  TransitModeFilter,
  TransitRoutingPreference,
} from "@/lib/routing/transit/types";
import { transitModeFilterToAllowedModes } from "@/lib/routing/transit/types";
import type {
  FlightBookingOption,
  FlightLegSegment,
  FlightSortOrder,
  MultimodalJourney,
} from "@/lib/routing/flights/types";
import {
  DEFAULT_ROUTE_AVOID,
  MAX_ROUTE_WAYPOINTS_UI,
  type NormalizedRoute,
  type PlannerTravelMode,
  type RouteAvoidOptions,
  type RoutePoint,
  type RoutePreference,
  type RoutingTiming,
  type VehicleProfile,
} from "@/lib/routing/types";
import {
  loadVehicleProfile,
  saveVehicleProfile,
} from "@/lib/routing/vehicleProfileStorage";
import type { NormalizedAlert } from "@/lib/alerts/types";
import UnifiedLocationField from "@/components/routing/UnifiedLocationField";
import {
  TransitModeChain,
  TransitModeIcon,
  TransitLineBadge,
} from "@/components/routing/TransitIcons";

const TRANSIT_FILTER_CHIPS: Array<{
  value: TransitModeFilter;
  labelKey:
    | "allPublicTransport"
    | "preferBus"
    | "preferMetroTram"
    | "preferTrain";
}> = [
  { value: "all", labelKey: "allPublicTransport" },
  { value: "bus", labelKey: "preferBus" },
  { value: "metro_tram", labelKey: "preferMetroTram" },
  { value: "train", labelKey: "preferTrain" },
];

function modeLabel(
  mode: TransitMode,
  t: ReturnType<typeof getMessages>["routePlanner"],
): string {
  switch (mode) {
    case "walk":
      return t.walking;
    case "bus":
    case "trolleybus":
      return t.preferBus;
    case "coach":
      return t.coach;
    case "tram":
    case "light_rail":
      return t.tram;
    case "metro":
    case "subway":
      return t.metro;
    case "commuter_rail":
    case "regional_rail":
      return t.regionalTrain;
    case "high_speed_rail":
      return t.highSpeedTrain;
    case "long_distance_rail":
      return t.longDistanceTrain;
    case "ferry":
      return t.ferry;
    case "rail":
    case "train":
      return t.train;
    default:
      return mode.replace(/_/g, " ");
  }
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (typeof err === "object" &&
      err !== null &&
      "name" in err &&
      (err as { name?: string }).name === "AbortError")
  );
}

export type RoutePlannerPickTarget =
  | "origin"
  | "destination"
  | `waypoint-draft:${number}`;

type WaypointDraft = {
  id: string;
  point: RoutePoint | null;
};

type RoutePlannerPanelProps = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  points: RoutePlannerPointsState;
  onPointsChange: (next: RoutePlannerPointsState) => void;
  pickTarget: RoutePlannerPickTarget | null;
  onPickTargetChange: (target: RoutePlannerPickTarget | null) => void;
  mapPickPoint: RoutePoint | null;
  onClearMapPick: () => void;
  onRoutesChange: (routes: NormalizedRoute[], selectedId: string | null) => void;
  onTransitChange?: (
    journeys: TransitJourney[],
    selectedId: string | null,
  ) => void;
  onFlightChange?: (
    journeys: MultimodalJourney[],
    selectedId: string | null,
  ) => void;
  onSelectIncident: (alertId: string) => void;
  onFocusPoint: (longitude: number, latitude: number, zoom?: number) => void;
  onFocusRoute: (coordinates: [number, number][]) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  focusOriginOnOpen?: boolean;
};

function errorMessage(
  code: string | undefined,
  t: ReturnType<typeof getMessages>["routePlanner"],
  scope: "road" | "transit" | "flight",
): string {
  const unavailableMessage =
    scope === "transit"
      ? t.transitServiceUnavailable
      : scope === "flight"
        ? t.flightServiceUnavailable
        : t.serviceUnavailable;
  switch (code) {
    case "origin_required":
      return t.originRequired;
    case "destination_required":
      return t.destinationRequired;
    case "point_outside_coverage":
    case "airport_not_resolved":
      return t.outsideCoverage;
    case "route_outside_coverage":
      return t.routeLeavesCoverage;
    case "no_route_found":
      return t.noRouteFound;
    case "no_offers_found":
      return t.noFlightsFound;
    case "aborted":
      return t.calculationAborted;
    case "transit_date_out_of_range":
      return t.transitDateOutOfRange;
    case "provider_not_entitled":
    case "provider_misconfigured":
    case "provider_rate_limited":
    case "provider_unavailable":
    case "authentication_error":
      return unavailableMessage;
    default:
      return unavailableMessage;
  }
}

function formatNStops(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

export default function RoutePlannerPanel({
  locale,
  open,
  onClose,
  points,
  onPointsChange,
  pickTarget,
  onPickTargetChange,
  mapPickPoint,
  onClearMapPick,
  onRoutesChange,
  onTransitChange,
  onFlightChange,
  onSelectIncident,
  onFocusPoint,
  onFocusRoute,
  userLocation = null,
  focusOriginOnOpen = false,
}: RoutePlannerPanelProps) {
  const t = getMessages(locale).routePlanner;
  const { origin, destination } = points;
  const [waypointDrafts, setWaypointDrafts] = useState<WaypointDraft[]>([]);
  const [mode, setMode] = useState<PlannerTravelMode>("car");
  const [preference, setPreference] = useState<RoutePreference>("fastest");
  const [avoid, setAvoid] = useState<RouteAvoidOptions>({ ...DEFAULT_ROUTE_AVOID });
  const [timing, setTiming] = useState<RoutingTiming>({ kind: "depart_now" });
  const [departAtLocal, setDepartAtLocal] = useState("");
  const [arriveAtLocal, setArriveAtLocal] = useState("");
  const [routes, setRoutes] = useState<NormalizedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [journeys, setJourneys] = useState<TransitJourney[]>([]);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
  const [transitRoutingPreference, setTransitRoutingPreference] =
    useState<TransitRoutingPreference>(null);
  const [transitModeFilter, setTransitModeFilter] =
    useState<TransitModeFilter>("all");
  const [incidents, setIncidents] = useState<NormalizedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [roadError, setRoadError] = useState<string | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showVehicle, setShowVehicle] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleProfile>(() => loadVehicleProfile());
  const [focusOrigin, setFocusOrigin] = useState(false);
  const [roadDevHint, setRoadDevHint] = useState<string | null>(null);
  const [transitDevHint, setTransitDevHint] = useState<string | null>(null);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [flightDevHint, setFlightDevHint] = useState<string | null>(null);
  const [multimodalJourneys, setMultimodalJourneys] = useState<
    MultimodalJourney[]
  >([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [flightSort, setFlightSort] = useState<FlightSortOrder>("recommended");
  const [departureDate, setDepartureDate] = useState<string>(() =>
    tomorrowDateInputValue(),
  );
  const [nonStop, setNonStop] = useState(false);
  const [adults, setAdults] = useState(1);
  const [bookingOptionsByJourney, setBookingOptionsByJourney] = useState<
    Record<string, FlightBookingOption[]>
  >({});
  const [bookingOptionsLoadingId, setBookingOptionsLoadingId] = useState<
    string | null
  >(null);
  const [bookingOptionsError, setBookingOptionsError] = useState<
    string | null
  >(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoCalcKeyRef = useRef<string | null>(null);
  const prevModeRef = useRef<PlannerTravelMode>(mode);

  const activeError =
    mode === "transit"
      ? transitError
      : mode === "flight"
        ? flightError
        : roadError;
  const activeDevHint =
    mode === "transit"
      ? transitDevHint
      : mode === "flight"
        ? flightDevHint
        : roadDevHint;

  const bias = userLocation;

  const publishWaypoints = useCallback(
    (drafts: WaypointDraft[], nextOrigin = origin, nextDestination = destination) => {
      onPointsChange({
        origin: nextOrigin,
        destination: nextDestination,
        waypoints: drafts
          .map((draft) => draft.point)
          .filter((point): point is RoutePoint => Boolean(point)),
      });
    },
    [destination, onPointsChange, origin],
  );

  useEffect(() => {
    if (!mapPickPoint || !pickTarget) return;
    if (pickTarget === "origin") {
      onPointsChange({
        origin: mapPickPoint,
        destination,
        waypoints: points.waypoints,
      });
    } else if (pickTarget === "destination") {
      onPointsChange({
        origin,
        destination: mapPickPoint,
        waypoints: points.waypoints,
      });
    } else if (pickTarget.startsWith("waypoint-draft:")) {
      const index = Number(pickTarget.split(":")[1]);
      setWaypointDrafts((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index]!, point: mapPickPoint };
        }
        publishWaypoints(next);
        return next;
      });
    }
    onPickTargetChange(null);
    onClearMapPick();
  }, [
    mapPickPoint,
    pickTarget,
    onPickTargetChange,
    onClearMapPick,
    onPointsChange,
    origin,
    destination,
    points.waypoints,
    publishWaypoints,
  ]);

  useEffect(() => {
    setFocusOrigin(focusOriginOnOpen);
  }, [focusOriginOnOpen, open]);

  // Road (TomTom), transit and flight results/errors are mutually exclusive
  // in the UI — switching mode clears whichever mode's results we're leaving.
  useEffect(() => {
    if (prevModeRef.current === mode) return;
    const previousMode = prevModeRef.current;
    const wasTransit = previousMode === "transit";
    const wasFlight = previousMode === "flight";
    const wasRoad = !wasTransit && !wasFlight;
    const isTransit = mode === "transit";
    const isFlight = mode === "flight";
    const isRoad = !isTransit && !isFlight;

    if (wasTransit && !isTransit) {
      setJourneys([]);
      setSelectedJourneyId(null);
      setTransitError(null);
      setTransitDevHint(null);
      onTransitChange?.([], null);
    }
    if (wasFlight && !isFlight) {
      setMultimodalJourneys([]);
      setSelectedFlightId(null);
      setFlightError(null);
      setFlightDevHint(null);
      setBookingOptionsByJourney({});
      setBookingOptionsError(null);
      onFlightChange?.([], null);
    }
    if (wasRoad && !isRoad) {
      setRoutes([]);
      setSelectedRouteId(null);
      setIncidents([]);
      setRoadError(null);
      setRoadDevHint(null);
      onRoutesChange([], null);
    }
    prevModeRef.current = mode;
  }, [mode, onRoutesChange, onTransitChange, onFlightChange]);

  const calculate = useCallback(async () => {
    if (!origin || !destination) {
      const message = !origin ? t.originRequired : t.destinationRequired;
      if (mode === "transit") setTransitError(message);
      else if (mode === "flight") setFlightError(message);
      else setRoadError(message);
      return;
    }
    if (!isRoutingPointAllowed(origin) || !isRoutingPointAllowed(destination)) {
      if (mode === "transit") setTransitError(t.outsideCoverage);
      else if (mode === "flight") setFlightError(t.outsideCoverage);
      else setRoadError(t.outsideCoverage);
      return;
    }
    if (mode === "flight" && !departureDate) {
      setFlightError(t.flightDateRequired);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    if (mode === "transit") {
      setTransitError(null);
      setTransitDevHint(null);
    } else if (mode === "flight") {
      setFlightError(null);
      setFlightDevHint(null);
      setBookingOptionsByJourney({});
      setBookingOptionsError(null);
    } else {
      setRoadError(null);
      setRoadDevHint(null);
    }

    if (mode === "flight") {
      try {
        const response = await fetch("/api/routing/flights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            origin: {
              latitude: origin.latitude,
              longitude: origin.longitude,
              name: origin.name,
            },
            destination: {
              latitude: destination.latitude,
              longitude: destination.longitude,
              name: destination.name,
            },
            departureDate,
            adults,
            nonStop,
            sort: flightSort,
            includeGroundAccess: true,
            currency: "EUR",
            locale,
          }),
        });

        const payload = (await response.json()) as {
          journeys?: MultimodalJourney[];
          error?: { code?: string };
        };

        if (!response.ok) {
          setMultimodalJourneys([]);
          setSelectedFlightId(null);
          onFlightChange?.([], null);
          setFlightError(errorMessage(payload.error?.code, t, "flight"));
          setFlightDevHint(
            process.env.NODE_ENV === "development" &&
              (payload.error?.code === "provider_misconfigured" ||
                payload.error?.code === "provider_not_entitled" ||
                payload.error?.code === "authentication_error")
              ? t.flightProviderNotConfiguredDev
              : null,
          );
          return;
        }

        setFlightDevHint(null);
        const nextJourneys = payload.journeys ?? [];
        setFlightError(nextJourneys.length === 0 ? t.noFlightsFound : null);
        const selectedId = nextJourneys[0]?.id ?? null;
        setMultimodalJourneys(nextJourneys);
        setSelectedFlightId(selectedId);
        setRoutes([]);
        setSelectedRouteId(null);
        setIncidents([]);
        setRoadError(null);
        setRoadDevHint(null);
        onRoutesChange([], null);
        setJourneys([]);
        setSelectedJourneyId(null);
        setTransitError(null);
        setTransitDevHint(null);
        onTransitChange?.([], null);
        onFlightChange?.(nextJourneys, selectedId);
        if (nextJourneys[0]) {
          onFocusRoute(multimodalCoordinates(nextJourneys[0]));
        }
      } catch (err) {
        if (isAbortError(err)) return;
        setFlightError(t.flightServiceUnavailable);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
      return;
    }

    const timingPayload: RoutingTiming =
      timing.kind === "depart_at" && departAtLocal
        ? { kind: "depart_at", at: new Date(departAtLocal).toISOString() }
        : timing.kind === "arrive_at" && arriveAtLocal
          ? { kind: "arrive_at", at: new Date(arriveAtLocal).toISOString() }
          : { kind: "depart_now" };

    if (mode === "transit") {
      try {
        const allowedModes = transitModeFilterToAllowedModes(transitModeFilter);
        if (process.env.NODE_ENV !== "production") {
          console.info("[transit browser request]", {
            originLabel: origin.name ?? null,
            originLat: origin.latitude,
            originLng: origin.longitude,
            destinationLabel: destination.name ?? null,
            destinationLat: destination.latitude,
            destinationLng: destination.longitude,
            departureTime:
              timingPayload.kind === "depart_at" ? timingPayload.at : null,
            arrivalTime:
              timingPayload.kind === "arrive_at" ? timingPayload.at : null,
            allowedTravelModes: allowedModes,
            routingPreference: transitRoutingPreference,
            modeFilter: transitModeFilter,
          });
        }
        const response = await fetch("/api/routing/transit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            origin,
            destination,
            timing: timingPayload,
            allowedModes,
            routingPreference: transitRoutingPreference,
            alternatives: true,
            locale,
          }),
        });

        const payload = (await response.json()) as {
          journeys?: TransitJourney[];
          error?: { code?: string };
        };

        if (!response.ok) {
          setJourneys([]);
          setSelectedJourneyId(null);
          onTransitChange?.([], null);
          setTransitError(errorMessage(payload.error?.code, t, "transit"));
          setTransitDevHint(
            process.env.NODE_ENV === "development" &&
              (payload.error?.code === "provider_misconfigured" ||
                payload.error?.code === "provider_not_entitled")
              ? t.transitProviderNotConfiguredDev
              : null,
          );
          return;
        }

        setTransitDevHint(null);
        setTransitError(null);
        const nextJourneys = payload.journeys ?? [];
        const selectedId = nextJourneys[0]?.id ?? null;
        setJourneys(nextJourneys);
        setSelectedJourneyId(selectedId);
        setRoutes([]);
        setSelectedRouteId(null);
        setIncidents([]);
        setRoadError(null);
        setRoadDevHint(null);
        onRoutesChange([], null);
        setMultimodalJourneys([]);
        setSelectedFlightId(null);
        setFlightError(null);
        setFlightDevHint(null);
        onFlightChange?.([], null);
        onTransitChange?.(nextJourneys, selectedId);
        if (nextJourneys[0]) {
          onFocusRoute(journeyCoordinates(nextJourneys[0]));
        }
      } catch (err) {
        if (isAbortError(err)) return;
        setTransitError(t.transitServiceUnavailable);
      } finally {
        if (abortRef.current === controller) setLoading(false);
      }
      return;
    }

    const waypoints = resolvedWaypoints(points.waypoints);

    try {
      const response = await fetch("/api/routing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          origin,
          destination,
          waypoints,
          mode,
          preference,
          alternatives: 2,
          avoid,
          timing: timingPayload,
          departureTime:
            timingPayload.kind === "depart_at" ? timingPayload.at : "now",
          vehicleProfile: mode === "car" ? vehicle : null,
          locale,
        }),
      });

      const payload = (await response.json()) as {
        routes?: NormalizedRoute[];
        incidents?: NormalizedAlert[];
        error?: { code?: string };
      };

      if (!response.ok) {
        setRoutes([]);
        setSelectedRouteId(null);
        setIncidents([]);
        onRoutesChange([], null);
        setRoadError(errorMessage(payload.error?.code, t, "road"));
        setRoadDevHint(
          process.env.NODE_ENV === "development" &&
            (payload.error?.code === "provider_not_entitled" ||
              payload.error?.code === "provider_misconfigured")
            ? t.providerNotEntitledDev
            : null,
        );
        return;
      }

      setRoadDevHint(null);
      setRoadError(null);
      const nextRoutes = payload.routes ?? [];
      const selectedId = nextRoutes[0]?.id ?? null;
      setRoutes(nextRoutes);
      setSelectedRouteId(selectedId);
      setIncidents(payload.incidents ?? []);
      onRoutesChange(nextRoutes, selectedId);
      setJourneys([]);
      setSelectedJourneyId(null);
      setTransitError(null);
      setTransitDevHint(null);
      onTransitChange?.([], null);
      setMultimodalJourneys([]);
      setSelectedFlightId(null);
      setFlightError(null);
      setFlightDevHint(null);
      onFlightChange?.([], null);
      if (nextRoutes[0]) {
        onFocusRoute(nextRoutes[0].geometry.coordinates);
      }
      applyShareableRouteToUrl({
        origin,
        destination,
        waypoints,
        mode,
        preference,
        avoid,
        timing: timingPayload,
      });
    } catch (err) {
      if (isAbortError(err)) return;
      setRoadError(t.serviceUnavailable);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [
    origin,
    destination,
    points.waypoints,
    mode,
    preference,
    avoid,
    timing,
    departAtLocal,
    arriveAtLocal,
    transitModeFilter,
    transitRoutingPreference,
    vehicle,
    departureDate,
    adults,
    nonStop,
    flightSort,
    locale,
    t,
    onFocusRoute,
    onRoutesChange,
    onTransitChange,
    onFlightChange,
  ]);

  // Auto-calc once per origin/destination/mode/options key when both points valid.
  useEffect(() => {
    if (!open || !origin || !destination) return;
    if (
      mode !== "transit" &&
      mode !== "flight" &&
      waypointDrafts.some((draft) => draft.point == null)
    ) {
      return;
    }
    if (mode === "flight" && !departureDate) return;
    const timingKey =
      timing.kind === "depart_at"
        ? `dep:${departAtLocal}`
        : timing.kind === "arrive_at"
          ? `arr:${arriveAtLocal}`
          : "now";
    const key = [
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
      points.waypoints
        .map((w) => `${w.latitude},${w.longitude}`)
        .join("|"),
      mode,
      preference,
      JSON.stringify(avoid),
      timingKey,
      mode === "transit" ? (transitRoutingPreference ?? "none") : "",
      mode === "transit" ? transitModeFilter : "",
      mode === "flight" ? departureDate : "",
      mode === "flight" ? String(nonStop) : "",
      mode === "flight" ? flightSort : "",
      mode === "flight" ? String(adults) : "",
    ].join(";");
    if (autoCalcKeyRef.current === key) return;
    autoCalcKeyRef.current = key;
    const timer = window.setTimeout(() => {
      void calculate();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    open,
    origin,
    destination,
    points.waypoints,
    waypointDrafts,
    mode,
    preference,
    avoid,
    timing,
    departAtLocal,
    arriveAtLocal,
    transitRoutingPreference,
    transitModeFilter,
    departureDate,
    nonStop,
    flightSort,
    adults,
    calculate,
  ]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const useMyLocation = async (target: "origin" | "destination") => {
    const setActiveError = (message: string) => {
      if (mode === "transit") setTransitError(message);
      else setRoadError(message);
    };
    if (!navigator.geolocation) {
      setActiveError(t.geolocationDenied);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isRoutingPointAllowed({ latitude, longitude })) {
          setActiveError(t.outsideCoverage);
          return;
        }
        let name = t.useMyLocation;
        try {
          const response = await fetch(
            `/api/search/reverse?lat=${latitude}&lon=${longitude}&lang=${locale}`,
          );
          if (response.ok) {
            const payload = (await response.json()) as {
              result?: { title?: string } | null;
            };
            if (payload.result?.title) name = payload.result.title;
          }
        } catch {
          // keep fallback
        }
        const point: RoutePoint = {
          latitude,
          longitude,
          name,
          countryCode: null,
        };
        if (target === "origin") {
          onPointsChange({
            origin: point,
            destination,
            waypoints: points.waypoints,
          });
        } else {
          onPointsChange({
            origin,
            destination: point,
            waypoints: points.waypoints,
          });
        }
      },
      () => setActiveError(t.geolocationDenied),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setRoutes([]);
    setSelectedRouteId(null);
    setIncidents([]);
    setWaypointDrafts([]);
    setJourneys([]);
    setSelectedJourneyId(null);
    setMultimodalJourneys([]);
    setSelectedFlightId(null);
    setRoadError(null);
    setTransitError(null);
    setFlightError(null);
    setRoadDevHint(null);
    setTransitDevHint(null);
    setFlightDevHint(null);
    setBookingOptionsByJourney({});
    setBookingOptionsError(null);
    onRoutesChange([], null);
    onTransitChange?.([], null);
    onFlightChange?.([], null);
    onPickTargetChange(null);
    clearShareableRouteFromUrl();
    onClose();
  };

  const viewBookingOptions = useCallback(
    async (journeyId: string) => {
      const journey = multimodalJourneys.find((j) => j.id === journeyId);
      const flightSegment = journey?.segments.find(
        (segment): segment is FlightLegSegment => segment.kind === "flight",
      );
      const flightJourney = flightSegment?.journey;
      const bookingToken = flightJourney?.bookingToken;
      const firstSeg = flightJourney?.segments[0];
      const lastSeg = flightJourney?.segments[flightJourney.segments.length - 1];
      const departureId = firstSeg?.departure.place.iataCode;
      const arrivalId = lastSeg?.arrival.place.iataCode;
      const outboundDate = firstSeg?.departure.at?.slice(0, 10);
      if (
        !journey ||
        !flightSegment ||
        !bookingToken ||
        !departureId ||
        !arrivalId ||
        !outboundDate
      ) {
        return;
      }

      setBookingOptionsLoadingId(journeyId);
      setBookingOptionsError(null);
      try {
        const response = await fetch("/api/routing/flights/booking-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingToken,
            departureId,
            arrivalId,
            outboundDate,
            currency: flightJourney.price?.currency ?? "EUR",
          }),
        });
        const payload = (await response.json()) as {
          options?: FlightBookingOption[];
          error?: { code?: string };
        };
        if (!response.ok || !payload.options) {
          setBookingOptionsError(t.bookingOptionsUnavailable);
          return;
        }
        setBookingOptionsByJourney((prev) => ({
          ...prev,
          [journeyId]: payload.options!,
        }));
      } catch {
        setBookingOptionsError(t.bookingOptionsUnavailable);
      } finally {
        setBookingOptionsLoadingId(null);
      }
    },
    [multimodalJourneys, t],
  );

  if (!open) return null;

  const canCalculate = Boolean(origin && destination) && !loading;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-50">{t.title}</h2>
          <p className="text-xs text-slate-400">{t.routes}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200 md:hidden"
            aria-label={mobileExpanded ? t.collapseSheet : t.expandSheet}
            onClick={() => setMobileExpanded((value) => !value)}
          >
            {mobileExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-200 hover:bg-white/10"
            aria-label={t.close}
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={`${mobileExpanded ? "block" : "hidden"} md:block`}>
        <div className="mt-4 space-y-3">
          <UnifiedLocationField
            locale={locale}
            label={t.origin}
            valueLabel={origin?.name ?? ""}
            bias={bias}
            autoFocus={focusOrigin}
            onSelect={(point) => {
              onPointsChange({
                origin: point,
                destination,
                waypoints: points.waypoints,
              });
              setFocusOrigin(false);
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10"
              onClick={() => void useMyLocation("origin")}
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              {t.useMyLocation}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10"
              onClick={() => onPickTargetChange("origin")}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {pickTarget === "origin" ? t.choosingOnMap : t.chooseOnMap}
            </button>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-200 hover:bg-white/10"
              aria-label={t.swap}
              onClick={() =>
                onPointsChange({
                  origin: destination,
                  destination: origin,
                  waypoints: [...points.waypoints].reverse(),
                })
              }
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          <UnifiedLocationField
            locale={locale}
            label={t.destination}
            valueLabel={destination?.name ?? ""}
            bias={bias}
            onSelect={(point) => {
              onPointsChange({
                origin,
                destination: point,
                waypoints: points.waypoints,
              });
            }}
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10"
              onClick={() => void useMyLocation("destination")}
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden />
              {t.useMyLocation}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10"
              onClick={() => onPickTargetChange("destination")}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {pickTarget === "destination" ? t.choosingOnMap : t.chooseOnMap}
            </button>
          </div>

          {mode !== "transit" && mode !== "flight"
            ? waypointDrafts.map((draft, index) => (
                <div
                  key={draft.id}
                  className="rounded-xl border border-white/10 bg-slate-950/40 p-2.5"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {t.stop} {index + 1}
                    </span>
                    <button
                      type="button"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
                      aria-label={t.removeStop}
                      onClick={() => {
                        setWaypointDrafts((prev) => {
                          const next = prev.filter((_, i) => i !== index);
                          publishWaypoints(next);
                          return next;
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <UnifiedLocationField
                    locale={locale}
                    label={t.stop}
                    valueLabel={draft.point?.name ?? ""}
                    bias={bias}
                    onSelect={(point) => {
                      setWaypointDrafts((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index]!, point };
                        publishWaypoints(next);
                        return next;
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="mt-1 text-xs text-[#8ab4f8]"
                    onClick={() => onPickTargetChange(`waypoint-draft:${index}`)}
                  >
                    {t.chooseOnMap}
                  </button>
                </div>
              ))
            : null}

          {mode !== "transit" &&
          mode !== "flight" &&
          waypointDrafts.length < MAX_ROUTE_WAYPOINTS_UI ? (
            <button
              type="button"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-sm text-slate-200 hover:bg-white/5"
              onClick={() => {
                setWaypointDrafts((prev) => [
                  ...prev,
                  { id: `draft-${Date.now()}`, point: null },
                ]);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.addStop}
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1" role="tablist">
          {(
            [
              ["car", Car, t.car],
              ["transit", TrainFront, t.transit],
              ["flight", Plane, t.flight],
              ["bicycle", Bike, t.bicycle],
              ["pedestrian", Footprints, t.pedestrian],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              title={label}
              className={`inline-flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-medium sm:flex-row sm:gap-1.5 sm:text-xs ${
                mode === value
                  ? "bg-[#1a73e8] text-white"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
              onClick={() => setMode(value)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {mode === "transit" ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["depart_now", t.departNow],
                  ["depart_at", t.departAt],
                  ["arrive_at", t.arriveAt],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={timing.kind === value}
                  className={`min-h-10 rounded-lg px-2.5 text-xs ${
                    timing.kind === value
                      ? "bg-white/15 text-white"
                      : "bg-white/5 text-slate-300"
                  }`}
                  onClick={() =>
                    setTiming(
                      value === "depart_now"
                        ? { kind: "depart_now" }
                        : { kind: value, at: "" },
                    )
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {timing.kind === "depart_at" ? (
              <input
                type="datetime-local"
                className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100"
                value={departAtLocal}
                onChange={(event) => setDepartAtLocal(event.target.value)}
              />
            ) : null}
            {timing.kind === "arrive_at" ? (
              <input
                type="datetime-local"
                className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100"
                value={arriveAtLocal}
                onChange={(event) => setArriveAtLocal(event.target.value)}
              />
            ) : null}
          </div>
        ) : mode === "flight" ? (
          <div className="mt-3 space-y-2">
            <input
              type="date"
              min={tomorrowDateInputValue()}
              className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100"
              value={departureDate}
              aria-label={t.departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
            />
            <label className="flex min-h-10 items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={nonStop}
                onChange={(event) => setNonStop(event.target.checked)}
              />
              {t.directFlightsOnly}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["recommended", t.recommended],
                  ["cheapest", t.cheapest],
                  ["fastest", t.fastest],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={flightSort === value}
                  className={`min-h-10 rounded-lg px-2.5 text-xs ${
                    flightSort === value
                      ? "bg-white/15 text-white"
                      : "bg-white/5 text-slate-300"
                  }`}
                  onClick={() => setFlightSort(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(
              [
                ["fastest", t.fastest],
                ["shortest", t.shortest],
                ["eco", t.eco],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`min-h-10 rounded-lg px-2.5 text-xs ${
                  preference === value
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-slate-300"
                }`}
                onClick={() => setPreference(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="min-h-10 flex-1 rounded-lg bg-white/5 text-xs text-slate-200"
            onClick={() => setShowOptions((value) => !value)}
          >
            {t.options}
          </button>
          {mode === "car" ? (
            <button
              type="button"
              className="min-h-10 flex-1 rounded-lg bg-white/5 text-xs text-slate-200"
              onClick={() => setShowVehicle((value) => !value)}
            >
              {t.vehicleSettings}
            </button>
          ) : null}
        </div>

        {showOptions && mode === "transit" ? (
          <fieldset className="mt-2 space-y-3 rounded-xl border border-white/10 p-3">
            <legend className="px-1 text-xs text-slate-400">{t.options}</legend>
            <div>
              <p className="mb-1.5 text-xs text-slate-400">{t.preference}</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["fewer_transfers", t.fewerTransfers],
                    ["less_walking", t.lessWalking],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`min-h-10 rounded-lg px-2.5 text-xs ${
                      transitRoutingPreference === value
                        ? "bg-white/15 text-white"
                        : "bg-white/5 text-slate-300"
                    }`}
                    onClick={() =>
                      setTransitRoutingPreference((prev) =>
                        prev === value ? null : value,
                      )
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-slate-400">{t.transitModes}</p>
              <div className="flex flex-wrap gap-1.5">
                {TRANSIT_FILTER_CHIPS.map(({ value, labelKey }) => {
                  const active = transitModeFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      className={`min-h-10 rounded-lg px-2.5 text-xs ${
                        active
                          ? "bg-white/15 text-white"
                          : "bg-white/5 text-slate-300"
                      }`}
                      onClick={() => setTransitModeFilter(value)}
                    >
                      {t[labelKey]}
                    </button>
                  );
                })}
              </div>
            </div>
          </fieldset>
        ) : null}

        {showOptions && mode === "flight" ? (
          <fieldset className="mt-2 space-y-3 rounded-xl border border-white/10 p-3">
            <legend className="px-1 text-xs text-slate-400">{t.options}</legend>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">
                {t.passengers}
              </label>
              <input
                type="number"
                min={1}
                max={9}
                value={adults}
                className="min-h-11 w-24 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100"
                onChange={(event) =>
                  setAdults(
                    Math.min(9, Math.max(1, Number(event.target.value) || 1)),
                  )
                }
              />
            </div>
          </fieldset>
        ) : null}

        {showOptions && mode !== "transit" && mode !== "flight" ? (
          <fieldset className="mt-2 space-y-1.5 rounded-xl border border-white/10 p-3">
            <legend className="px-1 text-xs text-slate-400">{t.options}</legend>
            {(
              [
                ["tollRoads", t.avoidTolls],
                ["motorways", t.avoidMotorways],
                ["ferries", t.avoidFerries],
                ["tunnels", t.avoidTunnels],
                ["unpavedRoads", t.avoidUnpaved],
                ["lowEmissionZones", t.avoidLez],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex min-h-10 items-center gap-2 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={avoid[key]}
                  disabled={
                    mode !== "car" && key !== "ferries" && key !== "unpavedRoads"
                  }
                  onChange={(event) =>
                    setAvoid((prev) => ({
                      ...prev,
                      [key]: event.target.checked,
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        ) : null}

        {showVehicle && mode === "car" ? (
          <div className="mt-2 space-y-2 rounded-xl border border-white/10 p-3">
            <label className="block text-xs text-slate-400">{t.propulsion}</label>
            <select
              className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm"
              value={vehicle.propulsion}
              onChange={(event) => {
                const next = {
                  ...vehicle,
                  propulsion: event.target
                    .value as VehicleProfile["propulsion"],
                };
                setVehicle(next);
                saveVehicleProfile(next);
              }}
            >
              <option value="petrol">{t.petrol}</option>
              <option value="diesel">{t.diesel}</option>
              <option value="hybrid">{t.hybrid}</option>
              <option value="electric">{t.electric}</option>
            </select>
          </div>
        ) : null}

        <button
          type="button"
          disabled={!canCalculate}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#1a73e8] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => void calculate()}
        >
          {loading ? t.calculatingRoute : t.calculateRoute}
        </button>

        {activeError ? (
          <div
            className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
            role="alert"
          >
            <p>{activeError}</p>
            {activeDevHint ? (
              <p className="mt-1 text-[11px] text-amber-200/80">
                {activeDevHint}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === "transit" && journeys.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.recommendedRoute}
            </h3>
            {journeys.map((journey, index) => {
              const selected = journey.id === selectedJourneyId;
              return (
                <button
                  key={journey.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-[#1a73e8]/60 bg-[#1a73e8]/15"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => {
                    setSelectedJourneyId(journey.id);
                    onTransitChange?.(journeys, journey.id);
                    onFocusRoute(journeyCoordinates(journey));
                  }}
                >
                  {index > 0 ? (
                    <p className="mb-1 text-[11px] text-slate-400">
                      {t.alternativeRoute} {index}
                    </p>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold text-slate-50">
                      {formatRouteDuration(journey.durationSeconds, locale)}
                    </span>
                    <span className="text-sm text-slate-300">
                      {formatTransitClock(journey.departureAt)} →{" "}
                      {formatTransitClock(journey.arrivalAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-300">
                    <span>
                      {journey.transfers}{" "}
                      {journey.transfers === 1 ? t.transfer : t.transfers}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {journey.fare
                        ? `${journey.fare.status === "confirmed" ? "" : `${t.fareEstimated} `}${journey.fare.amount.toFixed(2)} ${journey.fare.currency}`
                        : t.fareUnavailable}
                    </span>
                  </div>
                  <div className="mt-2">
                    <TransitModeChain
                      legs={collapseTransitLegsForDisplay(journey.legs)}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {mode === "transit" &&
        journeys.find((journey) => journey.id === selectedJourneyId) ? (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-slate-100">
              {t.instructions}
            </h3>
            <ol className="mt-2 max-h-64 space-y-2 overflow-auto pr-1">
              {collapseTransitLegsForDisplay(
                journeys.find((journey) => journey.id === selectedJourneyId)!
                  .legs,
              ).map((leg) => {
                const minutes = Math.max(
                  1,
                  Math.round(leg.durationSeconds / 60),
                );
                return (
                  <li
                    key={leg.id}
                    className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-2"
                  >
                    {leg.mode === "walk" ? (
                      <div className="flex items-center gap-2 text-sm text-slate-200">
                        <TransitModeIcon
                          mode="walk"
                          className="h-4 w-4 text-slate-400"
                          title={t.walking}
                        />
                        <span>
                          {t.walking} · {minutes} min
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <TransitLineBadge leg={leg} />
                            <span className="truncate text-sm font-medium text-slate-100">
                              {modeLabel(leg.mode, t)}
                              {leg.line?.name && !leg.line.nameShort
                                ? ` · ${leg.line.name}`
                                : ""}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-slate-300">
                            {formatTransitClock(
                              leg.departureAt,
                              leg.timezone ?? undefined,
                            )}{" "}
                            →{" "}
                            {formatTransitClock(
                              leg.arrivalAt,
                              leg.timezone ?? undefined,
                            )}
                          </span>
                        </div>
                        {leg.headsign ? (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {t.direction} {leg.headsign}
                          </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-slate-400">
                          {leg.from.name ? (
                            <span>
                              {t.board}: {leg.from.name}
                            </span>
                          ) : null}
                          {leg.to.name ? (
                            <span>
                              {t.getOff}: {leg.to.name}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {minutes} min
                          {leg.stopCount != null
                            ? ` · ${leg.stopCount} ${
                                leg.stopCount === 1 ? t.stopSingular : t.stops
                              }`
                            : null}
                          {leg.agency?.name ? ` · ${leg.agency.name}` : null}
                        </p>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {mode === "flight" && multimodalJourneys.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.recommendedRoute}
            </h3>
            {multimodalJourneys.map((journey, index) => {
              const selected = journey.id === selectedFlightId;
              const flightSegment = journey.segments.find(
                (segment): segment is FlightLegSegment =>
                  segment.kind === "flight",
              );
              const summary = flightSegment
                ? summarizeFlightJourney(flightSegment.journey)
                : null;
              const hasAirportChange = journey.warnings.some(
                (warning) => warning.code === "airport_change",
              );
              const hasTightConnection = journey.warnings.some(
                (warning) =>
                  warning.code === "connection_too_tight" ||
                  warning.code === "egress_too_tight",
              );
              return (
                <button
                  key={journey.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-[#1a73e8]/60 bg-[#1a73e8]/15"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => {
                    setSelectedFlightId(journey.id);
                    onFlightChange?.(multimodalJourneys, journey.id);
                    onFocusRoute(multimodalCoordinates(journey));
                  }}
                >
                  {index > 0 ? (
                    <p className="mb-1 text-[11px] text-slate-400">
                      {t.alternativeRoute} {index}
                    </p>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold text-slate-50">
                      {formatFlightDuration(journey.totalDurationSeconds, locale)}
                    </span>
                    <span className="text-sm text-slate-300">
                      {formatFlightClock(journey.departureAt)} →{" "}
                      {formatFlightClock(journey.arrivalAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-300">
                    <Plane className="h-3.5 w-3.5" aria-hidden />
                    {summary?.firstFlightNumber ? (
                      <span>{summary.firstFlightNumber}</span>
                    ) : null}
                    <span aria-hidden>·</span>
                    <span>
                      {summary
                        ? summary.stops === 0
                          ? t.direct
                          : summary.stops === 1
                            ? t.oneStop
                            : formatNStops(t.nStops, summary.stops)
                        : "—"}
                    </span>
                    <span aria-hidden>·</span>
                    <span>
                      {journey.totalPrice
                        ? `${t.searchPrice} ${journey.totalPrice.amount.toFixed(2)} ${journey.totalPrice.currency}`
                        : t.fareUnavailable}
                    </span>
                  </div>
                  {hasAirportChange ? (
                    <p className="mt-1 text-[11px] text-amber-300">
                      {t.airportChangeRequired}
                    </p>
                  ) : null}
                  {hasTightConnection ? (
                    <p className="mt-1 text-[11px] text-amber-300">
                      {t.groundConnectionUnavailable}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {mode === "flight" &&
        multimodalJourneys.find((journey) => journey.id === selectedFlightId) ? (
          <div className="mt-3 space-y-2">
            <h3 className="text-sm font-medium text-slate-100">
              {t.instructions}
            </h3>
            {multimodalJourneys
              .find((journey) => journey.id === selectedFlightId)!
              .segments.map((segment) => {
                if (segment.kind === "ground_transit") {
                  return (
                    <div
                      key={segment.id}
                      className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-2"
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {t.airportTransfer}
                      </p>
                      {collapseTransitLegsForDisplay(segment.journey.legs).map(
                        (leg) => (
                          <div
                            key={leg.id}
                            className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-300"
                          >
                            <span className="flex items-center gap-1.5">
                              <TransitModeIcon
                                mode={leg.mode}
                                className="h-3.5 w-3.5 text-slate-400"
                              />
                              {leg.mode === "walk"
                                ? t.walking
                                : modeLabel(leg.mode, t)}
                            </span>
                            <span className="tabular-nums">
                              {formatTransitClock(
                                leg.departureAt,
                                leg.timezone ?? undefined,
                              )}{" "}
                              →{" "}
                              {formatTransitClock(
                                leg.arrivalAt,
                                leg.timezone ?? undefined,
                              )}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  );
                }

                const flight = segment.journey;
                return (
                  <div
                    key={segment.id}
                    className="space-y-2 rounded-lg border border-white/5 bg-white/5 px-2.5 py-2"
                  >
                    {flight.segments.map((flightSeg, segIndex) => (
                      <div key={flightSeg.id}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <Plane className="h-4 w-4 shrink-0 text-[#0ea5e9]" aria-hidden />
                            <span className="truncate text-sm font-medium text-slate-100">
                              {flightSeg.carrierCode}
                              {flightSeg.flightNumber}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-slate-300">
                            {formatFlightClock(flightSeg.departure.at)} →{" "}
                            {formatFlightClock(flightSeg.arrival.at)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-slate-400">
                          <span>
                            {t.departureAirport}: {flightSeg.departure.place.iataCode}
                            {flightSeg.departure.terminal
                              ? ` (${t.terminal} ${flightSeg.departure.terminal})`
                              : ""}
                          </span>
                          <span>
                            {t.arrivalAirport}: {flightSeg.arrival.place.iataCode}
                            {flightSeg.arrival.terminal
                              ? ` (${t.terminal} ${flightSeg.arrival.terminal})`
                              : ""}
                          </span>
                        </div>
                        {flightSeg.carrierName ? (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {t.operatedBy}: {flightSeg.carrierName}
                          </p>
                        ) : null}
                        {segIndex < flight.segments.length - 1 &&
                        flight.layovers[segIndex] ? (
                          <p className="mt-1.5 text-[11px] text-amber-200">
                            {t.layover}: {flight.layovers[segIndex]!.airport.iataCode}
                            {" · "}
                            {formatFlightDuration(
                              flight.layovers[segIndex]!.durationSeconds,
                              locale,
                            )}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                );
              })}

            {(() => {
              const selected = multimodalJourneys.find(
                (journey) => journey.id === selectedFlightId,
              );
              const flightSegment = selected?.segments.find(
                (segment): segment is FlightLegSegment =>
                  segment.kind === "flight",
              );
              const bookingToken = flightSegment?.journey.bookingToken;
              if (!selected || !flightSegment || !bookingToken) return null;
              const isLoading = bookingOptionsLoadingId === selected.id;
              const options = bookingOptionsByJourney[selected.id];
              return (
                <div className="mt-2 space-y-1.5">
                  <button
                    type="button"
                    disabled={isLoading}
                    className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-white/10 text-xs font-medium text-slate-100 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void viewBookingOptions(selected.id)}
                  >
                    {isLoading ? t.loadingBookingOptions : t.viewBookingOptions}
                  </button>
                  {bookingOptionsError ? (
                    <p className="text-[11px] text-amber-300">{bookingOptionsError}</p>
                  ) : null}
                  {options && options.length > 0 ? (
                    <ul className="space-y-1">
                      {options.slice(0, 5).map((option, index) => {
                        const priceLabel =
                          option.price != null
                            ? `${option.price.toFixed(2)} ${option.currency ?? ""}`.trim()
                            : null;
                        const content = (
                          <>
                            <span className="truncate text-slate-100">
                              {option.bookWith ?? t.viewBookingOptions}
                            </span>
                            {priceLabel ? (
                              <span className="shrink-0 tabular-nums text-slate-300">
                                {priceLabel}
                              </span>
                            ) : null}
                          </>
                        );
                        return (
                          <li key={`${option.bookWith ?? "option"}-${index}`}>
                            {option.url ? (
                              <a
                                href={option.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-xs hover:bg-white/10"
                              >
                                {content}
                              </a>
                            ) : (
                              <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-xs">
                                {content}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })()}
          </div>
        ) : null}

        {mode !== "transit" && mode !== "flight" && routes.length > 0 ? (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t.recommendedRoute}
            </h3>
            {routes.map((route, index) => {
              const selected = route.id === selectedRouteId;
              return (
                <button
                  key={route.id}
                  type="button"
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-[#1a73e8]/60 bg-[#1a73e8]/15"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                  onClick={() => {
                    setSelectedRouteId(route.id);
                    onRoutesChange(routes, route.id);
                    onFocusRoute(route.geometry.coordinates);
                  }}
                >
                  {index > 0 ? (
                    <p className="mb-1 text-[11px] text-slate-400">
                      {t.alternativeRoute} {index}
                    </p>
                  ) : null}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-lg font-semibold text-slate-50">
                      {formatRouteDuration(route.durationSeconds, locale)}
                    </span>
                    <span className="text-sm text-slate-300">
                      {formatRouteDistance(route.distanceMeters, locale)}
                    </span>
                  </div>
                  {route.trafficDelaySeconds != null &&
                  route.trafficDelaySeconds >= 60 ? (
                    <p className="mt-1 text-xs text-amber-200">
                      {formatTrafficDelay(route.trafficDelaySeconds, locale)}{" "}
                      {t.trafficDelayLabel}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {route.hasTolls ? (
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">
                        {t.tollsPresent}
                      </span>
                    ) : null}
                    {route.hasFerry ? (
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">
                        {t.ferry}
                      </span>
                    ) : null}
                    {route.hasTunnel ? (
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">
                        {t.tunnel}
                      </span>
                    ) : null}
                  </div>
                  {route.hasTolls ? (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {t.tollPriceUnavailable}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        {mode !== "transit" && mode !== "flight" && incidents.length > 0 ? (
          <div className="mt-3 rounded-xl border border-white/10 p-3">
            <p className="text-sm font-medium text-slate-100">
              {incidents.length} {t.incidentsOnRoute}
            </p>
            <ul className="mt-2 space-y-1">
              {incidents.slice(0, 8).map((incident) => (
                <li key={incident.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg px-2 py-2 text-left text-xs text-slate-200 hover:bg-white/10"
                    onClick={() => onSelectIncident(incident.id)}
                  >
                    {incident.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {mode !== "transit" &&
        mode !== "flight" &&
        routes.find((r) => r.id === selectedRouteId)?.instructions?.length ? (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-slate-100">
              {t.instructions}
            </h3>
            <ol className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
              {routes
                .find((r) => r.id === selectedRouteId)!
                .instructions.map((instruction) => (
                  <li key={instruction.index}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left hover:bg-white/5"
                      onClick={() => {
                        if (instruction.point) {
                          onFocusPoint(
                            instruction.point.longitude,
                            instruction.point.latitude,
                            14,
                          );
                        }
                      }}
                    >
                      <p className="text-sm text-slate-100">
                        {instruction.index + 1}. {instruction.message}
                      </p>
                    </button>
                  </li>
                ))}
            </ol>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <aside
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-[40] overflow-hidden rounded-t-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl md:inset-x-auto md:bottom-auto md:left-4 md:top-[var(--map-panel-top-offset)] md:w-[min(24rem,calc(100vw-2rem))] md:max-h-[calc(100vh-var(--map-panel-top-offset)-1.5rem)] md:rounded-2xl md:bg-slate-950/80 ${
        mobileExpanded ? "max-h-[78vh]" : "max-h-[30vh]"
      }`}
      aria-label={t.title}
    >
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 md:hidden" />
      <div className="max-h-[inherit] overflow-y-auto p-4 pb-6 md:pb-4">
        {content}
      </div>
    </aside>
  );
}
