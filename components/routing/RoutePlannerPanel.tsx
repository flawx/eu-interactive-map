"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
import { buildLocalSearchIndex, type MapSearchResult } from "@/lib/search/mapSearch";

export type RoutePlannerPickTarget =
  | "origin"
  | "destination"
  | `waypoint:${number}`;

type RoutePlannerPanelProps = {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  initialDestination?: RoutePoint | null;
  initialOrigin?: RoutePoint | null;
  pickTarget: RoutePlannerPickTarget | null;
  onPickTargetChange: (target: RoutePlannerPickTarget | null) => void;
  mapPickPoint: RoutePoint | null;
  onRoutesChange: (routes: NormalizedRoute[], selectedId: string | null) => void;
  onPointsChange: (
    origin: RoutePoint | null,
    destination: RoutePoint | null,
    waypoints: RoutePoint[],
  ) => void;
  onSelectIncident: (alertId: string) => void;
  onFocusPoint: (longitude: number, latitude: number, zoom?: number) => void;
  onFocusRoute: (coordinates: [number, number][]) => void;
};

function pointFromSearch(result: MapSearchResult): RoutePoint {
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.title,
    countryCode: result.countryCode ?? null,
  };
}

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
    case "provider_misconfigured":
    case "provider_unavailable":
      return t.serviceUnavailable;
    default:
      return t.serviceUnavailable;
  }
}

export default function RoutePlannerPanel({
  locale,
  open,
  onClose,
  initialDestination = null,
  initialOrigin = null,
  pickTarget,
  onPickTargetChange,
  mapPickPoint,
  onRoutesChange,
  onPointsChange,
  onSelectIncident,
  onFocusPoint,
  onFocusRoute,
}: RoutePlannerPanelProps) {
  const t = getMessages(locale).routePlanner;
  const [origin, setOrigin] = useState<RoutePoint | null>(initialOrigin);
  const [destination, setDestination] = useState<RoutePoint | null>(
    initialDestination,
  );
  const [waypoints, setWaypoints] = useState<RoutePoint[]>([]);
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
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [activeField, setActiveField] = useState<"origin" | "destination" | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const searchIndex = useMemo(
    () => buildLocalSearchIndex(locale, [], [], []),
    [locale],
  );

  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination);
      setDestinationQuery(initialDestination.name ?? "");
    }
  }, [initialDestination]);

  useEffect(() => {
    if (initialOrigin) {
      setOrigin(initialOrigin);
      setOriginQuery(initialOrigin.name ?? "");
    }
  }, [initialOrigin]);

  useEffect(() => {
    if (!mapPickPoint || !pickTarget) return;
    if (pickTarget === "origin") {
      setOrigin(mapPickPoint);
      setOriginQuery(mapPickPoint.name ?? t.origin);
    } else if (pickTarget === "destination") {
      setDestination(mapPickPoint);
      setDestinationQuery(mapPickPoint.name ?? t.destination);
    } else if (pickTarget.startsWith("waypoint:")) {
      const index = Number(pickTarget.split(":")[1]);
      setWaypoints((prev) => {
        const next = [...prev];
        if (Number.isFinite(index) && index >= 0 && index < next.length) {
          next[index] = mapPickPoint;
        }
        return next;
      });
    }
    onPickTargetChange(null);
  }, [mapPickPoint, pickTarget, onPickTargetChange, t.origin, t.destination]);

  useEffect(() => {
    onPointsChange(origin, destination, waypoints);
  }, [origin, destination, waypoints, onPointsChange]);

  useEffect(() => {
    onRoutesChange(routes, selectedRouteId);
  }, [routes, selectedRouteId, onRoutesChange]);

  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? routes[0] ?? null;

  const suggestions = useMemo(() => {
    const query = (activeField === "origin" ? originQuery : destinationQuery)
      .trim()
      .toLowerCase();
    if (!query || query.length < 2) return [];
    return searchIndex
      .filter((item) => {
        const hay = `${item.title} ${item.subtitle ?? ""}`.toLowerCase();
        return hay.includes(query);
      })
      .slice(0, 8);
  }, [activeField, originQuery, destinationQuery, searchIndex]);

  const calculate = useCallback(async () => {
    if (!origin || !destination) return;
    if (!isRoutingPointAllowed(origin) || !isRoutingPointAllowed(destination)) {
      setError(t.outsideCoverage);
      return;
    }

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
        error?: { code?: string; message?: string };
      };

      if (!response.ok) {
        setRoutes([]);
        setSelectedRouteId(null);
        setIncidents([]);
        setError(errorMessage(payload.error?.code, t));
        return;
      }

      const nextRoutes = payload.routes ?? [];
      setRoutes(nextRoutes);
      setSelectedRouteId(nextRoutes[0]?.id ?? null);
      setIncidents(payload.incidents ?? []);
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
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [
    origin,
    destination,
    waypoints,
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
  ]);

  useEffect(() => {
    if (!open || !origin || !destination) return;
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void calculate();
    }, 500);
    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
  }, [
    open,
    origin,
    destination,
    waypoints,
    mode,
    preference,
    avoid,
    timing,
    departAtLocal,
    arriveAtLocal,
    vehicle,
    calculate,
  ]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
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
              result?: MapSearchResult | null;
            };
            if (payload.result?.title) name = payload.result.title;
          }
        } catch {
          // keep fallback name
        }
        const point: RoutePoint = {
          latitude,
          longitude,
          name,
          countryCode: null,
        };
        if (target === "origin") {
          setOrigin(point);
          setOriginQuery(name);
        } else {
          setDestination(point);
          setDestinationQuery(name);
        }
      },
      () => setError(t.geolocationDenied),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const swapPoints = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginQuery(destinationQuery);
    setDestinationQuery(originQuery);
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setRoutes([]);
    setSelectedRouteId(null);
    setIncidents([]);
    onRoutesChange([], null);
    onPointsChange(null, null, []);
    onPickTargetChange(null);
    clearShareableRouteFromUrl();
    onClose();
  };

  if (!open) return null;

  const renderPointField = (
    kind: "origin" | "destination",
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
  ) => (
    <div className="relative">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {placeholder}
      </label>
      <div className="flex gap-1.5">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setActiveField(kind);
          }}
          onFocus={() => setActiveField(kind)}
          placeholder={placeholder}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none ring-[#1a73e8]/50 focus:ring-2"
          aria-label={placeholder}
        />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10"
          onClick={() => void useMyLocation(kind)}
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden />
          {t.useMyLocation}
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-white/5 px-2.5 text-xs text-slate-200 hover:bg-white/10"
          onClick={() => onPickTargetChange(kind)}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {pickTarget === kind ? t.choosingOnMap : t.chooseOnMap}
        </button>
      </div>
      {activeField === kind && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-white/10 bg-slate-950/95 shadow-xl">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-white/10"
                onClick={() => {
                  const point = pointFromSearch(item);
                  if (kind === "origin") {
                    setOrigin(point);
                    setOriginQuery(item.title);
                  } else {
                    setDestination(point);
                    setDestinationQuery(item.title);
                  }
                  setActiveField(null);
                }}
              >
                <span className="text-sm text-slate-100">{item.title}</span>
                <span className="text-xs text-slate-400">{item.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

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
          {renderPointField("origin", originQuery, setOriginQuery, t.origin)}
          <div className="flex justify-center">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-slate-200 hover:bg-white/10"
              aria-label={t.swap}
              onClick={swapPoints}
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>
          {renderPointField(
            "destination",
            destinationQuery,
            setDestinationQuery,
            t.destination,
          )}

          {waypoints.map((waypoint, index) => (
            <div
              key={`wp-${index}`}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-2.5"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {t.stop} {index + 1}
                </span>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"
                  aria-label={t.removeStop}
                  onClick={() =>
                    setWaypoints((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-slate-100">
                {waypoint.name ??
                  `${waypoint.latitude.toFixed(4)}, ${waypoint.longitude.toFixed(4)}`}
              </p>
              <button
                type="button"
                className="mt-1 text-xs text-[#8ab4f8]"
                onClick={() => onPickTargetChange(`waypoint:${index}`)}
              >
                {t.chooseOnMap}
              </button>
            </div>
          ))}

          {waypoints.length < MAX_ROUTE_WAYPOINTS_UI ? (
            <button
              type="button"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 text-sm text-slate-200 hover:bg-white/5"
              onClick={() => {
                const seed = destination ?? origin;
                if (!seed) return;
                setWaypoints((prev) => [
                  ...prev,
                  { ...seed, name: `${t.stop} ${prev.length + 1}` },
                ]);
                onPickTargetChange(`waypoint:${waypoints.length}`);
              }}
            >
              <Plus className="h-4 w-4" />
              {t.addStop}
            </button>
          ) : null}
        </div>

        <div
          className="mt-4 grid grid-cols-3 gap-1.5"
          role="tablist"
          aria-label={t.routes}
        >
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

        {mode === "car" ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className={`min-h-10 rounded-lg px-2.5 text-xs ${
                  timing.kind === "depart_now"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-slate-300"
                }`}
                onClick={() => setTiming({ kind: "depart_now" })}
              >
                {t.departNow}
              </button>
              <button
                type="button"
                className={`min-h-10 rounded-lg px-2.5 text-xs ${
                  timing.kind === "depart_at"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-slate-300"
                }`}
                onClick={() => setTiming({ kind: "depart_at", at: "" })}
              >
                {t.departAt}
              </button>
              <button
                type="button"
                className={`min-h-10 rounded-lg px-2.5 text-xs ${
                  timing.kind === "arrive_at"
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-slate-300"
                }`}
                onClick={() => setTiming({ kind: "arrive_at", at: "" })}
              >
                {t.arriveAt}
              </button>
            </div>
            {timing.kind === "depart_at" ? (
              <input
                type="datetime-local"
                value={departAtLocal}
                onChange={(event) => setDepartAtLocal(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100"
                aria-label={t.departAt}
              />
            ) : null}
            {timing.kind === "arrive_at" ? (
              <input
                type="datetime-local"
                value={arriveAtLocal}
                onChange={(event) => setArriveAtLocal(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100"
                aria-label={t.arriveAt}
              />
            ) : null}
          </div>
        ) : null}

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
                  disabled={mode !== "car" && key !== "ferries" && key !== "unpavedRoads"}
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
          <form
            className="mt-2 space-y-2 rounded-xl border border-white/10 p-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              saveVehicleProfile(vehicle);
            }}
          >
            <label className="block text-xs text-slate-400">{t.propulsion}</label>
            <select
              className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm"
              value={vehicle.propulsion}
              onChange={(event) => {
                const propulsion = event.target.value as VehicleProfile["propulsion"];
                const next = { ...vehicle, propulsion };
                setVehicle(next);
                saveVehicleProfile(next);
              }}
            >
              <option value="petrol">{t.petrol}</option>
              <option value="diesel">{t.diesel}</option>
              <option value="hybrid">{t.hybrid}</option>
              <option value="electric">{t.electric}</option>
            </select>
            {vehicle.propulsion === "electric" ? (
              <>
                <label className="block text-xs text-slate-400">
                  {t.consumption} (kWh/100 km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm"
                  value={vehicle.electricityConsumptionKwhPer100Km ?? ""}
                  onChange={(event) => {
                    const next = {
                      ...vehicle,
                      electricityConsumptionKwhPer100Km: Number(event.target.value),
                    };
                    setVehicle(next);
                    saveVehicleProfile(next);
                  }}
                />
                <label className="block text-xs text-slate-400">
                  {t.electricityPrice} (€/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm"
                  value={vehicle.electricityPricePerKwh ?? ""}
                  onChange={(event) => {
                    const next = {
                      ...vehicle,
                      electricityPricePerKwh: Number(event.target.value),
                    };
                    setVehicle(next);
                    saveVehicleProfile(next);
                  }}
                />
              </>
            ) : (
              <>
                <label className="block text-xs text-slate-400">
                  {t.consumption} (L/100 km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm"
                  value={vehicle.consumptionPer100Km ?? ""}
                  onChange={(event) => {
                    const next = {
                      ...vehicle,
                      consumptionPer100Km: Number(event.target.value),
                    };
                    setVehicle(next);
                    saveVehicleProfile(next);
                  }}
                />
                <label className="block text-xs text-slate-400">
                  {t.fuelPrice} (€/L)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm"
                  value={vehicle.fuelPricePerLiter ?? ""}
                  onChange={(event) => {
                    const next = {
                      ...vehicle,
                      fuelPricePerLiter: Number(event.target.value),
                    };
                    setVehicle(next);
                    saveVehicleProfile(next);
                  }}
                />
              </>
            )}
          </form>
        ) : null}

        {loading ? (
          <div
            className="mt-4 animate-pulse space-y-2"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="h-16 rounded-xl bg-white/5" />
            <div className="h-16 rounded-xl bg-white/5" />
            <p className="text-xs text-slate-400">{t.calculating}</p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {routes.map((route) => {
            const selected = route.id === selectedRoute?.id;
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
                  onFocusRoute(route.geometry.coordinates);
                }}
              >
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
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-200">
                      {t.tollsPresent}
                    </span>
                  ) : null}
                  {route.hasFerry ? (
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-200">
                      {t.ferry}
                    </span>
                  ) : null}
                  {route.hasTunnel ? (
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-200">
                      {t.tunnel}
                    </span>
                  ) : null}
                  {route.hasLowEmissionZone ? (
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-200">
                      {t.lowEmissionZone}
                    </span>
                  ) : null}
                  {route.warnings.some((w) => w.code === "closure_on_route") ? (
                    <span className="rounded-md bg-red-500/20 px-1.5 py-0.5 text-[10px] text-red-100">
                      {t.closureOnRoute}
                    </span>
                  ) : null}
                  {route.warnings.some((w) => w.code === "roadworks_on_route") ? (
                    <span className="rounded-md bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-100">
                      {t.roadworksOnRoute}
                    </span>
                  ) : null}
                </div>
                {route.hasTolls ? (
                  <p className="mt-1 text-[11px] text-slate-400">
                    {t.tollPriceUnavailable}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">
                    {t.noTollsDetected}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {selectedRoute && mode === "car" && incidents.length > 0 ? (
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

        {selectedRoute?.estimatedCosts.fuelOrEnergy != null ? (
          <div className="mt-3 rounded-xl border border-white/10 p-3 text-sm text-slate-200">
            <p className="font-medium">
              {selectedRoute.estimatedCosts.fuelOrEnergyUnit === "kWh"
                ? t.energyEstimate
                : t.fuelEstimate}
            </p>
            <p className="mt-1 text-slate-300">
              {selectedRoute.estimatedCosts.fuelOrEnergyAmount}{" "}
              {selectedRoute.estimatedCosts.fuelOrEnergyUnit} ≈{" "}
              {selectedRoute.estimatedCosts.fuelOrEnergy.toFixed(2)} €
            </p>
          </div>
        ) : null}

        {selectedRoute?.instructions?.length ? (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-slate-100">
              {t.instructions}
            </h3>
            <ol className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
              {selectedRoute.instructions.map((instruction) => (
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
                    {instruction.distanceMeters != null ? (
                      <p className="text-[11px] text-slate-400">
                        {formatRouteDistance(instruction.distanceMeters, locale)}
                      </p>
                    ) : null}
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
    <>
      <aside
        className="pointer-events-auto absolute left-4 z-[40] hidden w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-xl md:block"
        style={{
          top: "var(--map-panel-top-offset)",
          maxHeight: "calc(100vh - var(--map-panel-top-offset) - 1.5rem)",
        }}
        aria-label={t.title}
      >
        <div className="max-h-[inherit] overflow-y-auto p-4">{content}</div>
      </aside>

      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 z-[40] rounded-t-2xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur-xl md:hidden"
        style={{
          maxHeight: mobileExpanded ? "78vh" : "30vh",
        }}
        aria-label={t.title}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />
        <div className="max-h-[inherit] overflow-y-auto p-4 pb-6">{content}</div>
      </div>
    </>
  );
}
