import type {
  RouteAvoidOptions,
  RouteMode,
  RoutePoint,
  RoutePreference,
  RoutingTiming,
} from "@/lib/routing/types";
import { DEFAULT_ROUTE_AVOID } from "@/lib/routing/types";

export type ShareableRouteState = {
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints: RoutePoint[];
  mode: RouteMode;
  preference: RoutePreference;
  avoid: RouteAvoidOptions;
  timing: RoutingTiming;
};

function encodePoint(point: RoutePoint): string {
  const name = point.name ? encodeURIComponent(point.name) : "";
  const country = point.countryCode ?? "";
  return `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)},${name},${country}`;
}

function decodePoint(raw: string): RoutePoint | null {
  const parts = raw.split(",");
  if (parts.length < 2) return null;
  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const name = parts[2] ? decodeURIComponent(parts[2]) : null;
  const countryCode = parts[3] ? parts[3].toUpperCase() : null;
  return {
    latitude,
    longitude,
    name: name || null,
    countryCode,
  };
}

export function encodeShareableRoute(state: ShareableRouteState): string {
  const payload = {
    o: encodePoint(state.origin),
    d: encodePoint(state.destination),
    w: state.waypoints.map(encodePoint),
    m: state.mode,
    p: state.preference,
    a: [
      state.avoid.tollRoads ? 1 : 0,
      state.avoid.motorways ? 1 : 0,
      state.avoid.ferries ? 1 : 0,
      state.avoid.unpavedRoads ? 1 : 0,
      state.avoid.tunnels ? 1 : 0,
      state.avoid.lowEmissionZones ? 1 : 0,
    ].join(""),
    t:
      state.timing.kind === "depart_now"
        ? "now"
        : state.timing.kind === "depart_at"
          ? `dep:${state.timing.at}`
          : `arr:${state.timing.at}`,
  };
  const json = JSON.stringify(payload);
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(json)));
  }
  return Buffer.from(json, "utf8").toString("base64");
}

export function decodeShareableRoute(
  value: string,
): ShareableRouteState | null {
  try {
    const json =
      typeof atob === "function"
        ? decodeURIComponent(escape(atob(value)))
        : Buffer.from(value, "base64").toString("utf8");
    const payload = JSON.parse(json) as {
      o?: string;
      d?: string;
      w?: string[];
      m?: string;
      p?: string;
      a?: string;
      t?: string;
    };
    const origin = payload.o ? decodePoint(payload.o) : null;
    const destination = payload.d ? decodePoint(payload.d) : null;
    if (!origin || !destination) return null;
    const mode =
      payload.m === "bicycle" || payload.m === "pedestrian"
        ? payload.m
        : "car";
    const preference =
      payload.p === "shortest" || payload.p === "eco"
        ? payload.p
        : "fastest";
    const flags = (payload.a ?? "000000").padEnd(6, "0");
    const avoid: RouteAvoidOptions = {
      tollRoads: flags[0] === "1",
      motorways: flags[1] === "1",
      ferries: flags[2] === "1",
      unpavedRoads: flags[3] === "1",
      tunnels: flags[4] === "1",
      lowEmissionZones: flags[5] === "1",
    };
    let timing: RoutingTiming = { kind: "depart_now" };
    if (payload.t?.startsWith("dep:")) {
      timing = { kind: "depart_at", at: payload.t.slice(4) };
    } else if (payload.t?.startsWith("arr:")) {
      timing = { kind: "arrive_at", at: payload.t.slice(4) };
    }
    return {
      origin,
      destination,
      waypoints: (payload.w ?? [])
        .map(decodePoint)
        .filter((p): p is RoutePoint => Boolean(p))
        .slice(0, 5),
      mode,
      preference,
      avoid: { ...DEFAULT_ROUTE_AVOID, ...avoid },
      timing,
    };
  } catch {
    return null;
  }
}

export function applyShareableRouteToUrl(
  state: ShareableRouteState,
): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("route", encodeShareableRoute(state));
  window.history.replaceState({}, "", url.toString());
}

export function clearShareableRouteFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has("route")) return;
  url.searchParams.delete("route");
  window.history.replaceState({}, "", url.toString());
}

export function readShareableRouteFromUrl(): ShareableRouteState | null {
  if (typeof window === "undefined") return null;
  const value = new URL(window.location.href).searchParams.get("route");
  if (!value) return null;
  return decodeShareableRoute(value);
}
