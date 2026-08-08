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
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  formatRouteDistance,
  formatRouteDuration,
  formatTrafficDelay,
} from "@/lib/routing/formatRoute";
import { isRoutingPointAllowed } from "@/lib/routing/routingGeofence";
import {
  applyShareableRouteToUrl,
  clearShareableRouteFromUrl,
} from "@/lib/routing/shareableRoute";
import {
  resolvedWaypoints,
  type RoutePlannerPointsState,
} from "@/lib/routing/routePlannerPoints";
import {
  DEFAULT_ROUTE_AVOID,
  MAX_ROUTE_WAYPOINTS_UI,
  type NormalizedRoute,
  type RouteAvoidOptions,
  type RouteMode,
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
  onSelectIncident: (alertId: string) => void;
  onFocusPoint: (longitude: number, latitude: number, zoom?: number) => void;
  onFocusRoute: (coordinates: [number, number][]) => void;
  userLocation?: { latitude: number; longitude: number } | null;
  focusOriginOnOpen?: boolean;
};

function errorMessage(
  code: string | undefined,
  t: ReturnType<typeof getMessages>["routePlanner"],
): string {
  switch (code) {
    case "origin_required":
      return t.originRequired;
    case "destination_required":
      return t.destinationRequired;
    case "point_outside_coverage":
      return t.outsideCoverage;
    case "route_outside_coverage":
      return t.routeLeavesCoverage;
    case "no_route_found":
      return t.noRouteFound;
    case "aborted":
      return t.calculationAborted;
    case "provider_not_entitled":
    case "provider_misconfigured":
    case "provider_rate_limited":
      return t.serviceUnavailable;
    default:
      return t.serviceUnavailable;
  }
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
  onSelectIncident,
  onFocusPoint,
  onFocusRoute,
  userLocation = null,
  focusOriginOnOpen = false,
}: RoutePlannerPanelProps) {
  const t = getMessages(locale).routePlanner;
  const { origin, destination } = points;
  const [waypointDrafts, setWaypointDrafts] = useState<WaypointDraft[]>([]);
  const [mode, setMode] = useState<RouteMode>("car");
  const [preference, setPreference] = useState<RoutePreference>("fastest");
  const [avoid, setAvoid] = useState<RouteAvoidOptions>({ ...DEFAULT_ROUTE_AVOID });
  const [timing, setTiming] = useState<RoutingTiming>({ kind: "depart_now" });
  const [departAtLocal, setDepartAtLocal] = useState("");
  const [arriveAtLocal, setArriveAtLocal] = useState("");
  const [routes, setRoutes] = useState<NormalizedRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<NormalizedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [showVehicle, setShowVehicle] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleProfile>(() => loadVehicleProfile());
  const [focusOrigin, setFocusOrigin] = useState(false);
  const [devProviderHint, setDevProviderHint] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoCalcKeyRef = useRef<string | null>(null);

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

  const calculate = useCallback(async () => {
    if (!origin || !destination) {
      setError(!origin ? t.originRequired : t.destinationRequired);
      return;
    }
    if (!isRoutingPointAllowed(origin) || !isRoutingPointAllowed(destination)) {
      setError(t.outsideCoverage);
      return;
    }

    const waypoints = resolvedWaypoints(points.waypoints);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const timingPayload: RoutingTiming =
      timing.kind === "depart_at" && departAtLocal
        ? { kind: "depart_at", at: new Date(departAtLocal).toISOString() }
        : timing.kind === "arrive_at" && arriveAtLocal
          ? { kind: "arrive_at", at: new Date(arriveAtLocal).toISOString() }
          : { kind: "depart_now" };

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
        setError(errorMessage(payload.error?.code, t));
        setDevProviderHint(
          process.env.NODE_ENV === "development" &&
            (payload.error?.code === "provider_not_entitled" ||
              payload.error?.code === "provider_misconfigured")
            ? t.providerNotEntitledDev
            : null,
        );
        return;
      }

      setDevProviderHint(null);
      const nextRoutes = payload.routes ?? [];
      const selectedId = nextRoutes[0]?.id ?? null;
      setRoutes(nextRoutes);
      setSelectedRouteId(selectedId);
      setIncidents(payload.incidents ?? []);
      onRoutesChange(nextRoutes, selectedId);
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
      if (
        (err instanceof DOMException && err.name === "AbortError") ||
        (typeof err === "object" &&
          err !== null &&
          "name" in err &&
          (err as { name?: string }).name === "AbortError")
      ) {
        return;
      }
      setError(t.serviceUnavailable);
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
    vehicle,
    locale,
    t,
    onFocusRoute,
    onRoutesChange,
  ]);

  // Auto-calc once per origin/destination/mode/options key when both points valid.
  useEffect(() => {
    if (!open || !origin || !destination) return;
    if (waypointDrafts.some((draft) => draft.point == null)) return;
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
    calculate,
  ]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const useMyLocation = async (target: "origin" | "destination") => {
    if (!navigator.geolocation) {
      setError(t.geolocationDenied);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isRoutingPointAllowed({ latitude, longitude })) {
          setError(t.outsideCoverage);
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
      () => setError(t.geolocationDenied),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setRoutes([]);
    setSelectedRouteId(null);
    setIncidents([]);
    setWaypointDrafts([]);
    onRoutesChange([], null);
    onPickTargetChange(null);
    clearShareableRouteFromUrl();
    onClose();
  };

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

          {waypointDrafts.map((draft, index) => (
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
          ))}

          {waypointDrafts.length < MAX_ROUTE_WAYPOINTS_UI ? (
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

        <div className="mt-4 grid grid-cols-3 gap-1.5" role="tablist">
          {(
            [
              ["car", Car, t.car],
              ["bicycle", Bike, t.bicycle],
              ["pedestrian", Footprints, t.pedestrian],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-medium ${
                mode === value
                  ? "bg-[#1a73e8] text-white"
                  : "bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
              onClick={() => setMode(value)}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

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

        {showOptions ? (
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

        {error ? (
          <div
            className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
            role="alert"
          >
            <p>{error}</p>
            {devProviderHint ? (
              <p className="mt-1 text-[11px] text-amber-200/80">
                {devProviderHint}
              </p>
            ) : null}
          </div>
        ) : null}

        {routes.length > 0 ? (
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

        {incidents.length > 0 ? (
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

        {routes.find((r) => r.id === selectedRouteId)?.instructions?.length ? (
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
