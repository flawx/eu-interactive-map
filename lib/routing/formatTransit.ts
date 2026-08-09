import type {
  TransitJourney,
  TransitLeg,
  TransitMode,
} from "@/lib/routing/transit/types";
import type { TransitMapPoint } from "@/lib/routing/transitMapLayers";

const MODE_COLORS: Record<TransitMode, string> = {
  walk: "#64748b",
  bus: "#ea580c",
  trolleybus: "#c2410c",
  coach: "#9a3412",
  tram: "#0d9488",
  metro: "#7c3aed",
  subway: "#6d28d9",
  light_rail: "#0891b2",
  commuter_rail: "#2563eb",
  regional_rail: "#1d4ed8",
  rail: "#1e40af",
  train: "#1e3a8a",
  long_distance_rail: "#172554",
  high_speed_rail: "#b91c1c",
  ferry: "#0284c7",
  funicular: "#a855f7",
  monorail: "#9333ea",
  cable_car: "#c026d3",
  flight: "#7e22ce",
  other: "#475569",
};

/** Accepts Google RRGGBB / #RRGGBB; rejects invalid/transparent-ish values. */
export function sanitizeTransitColor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  // Reject near-white / near-transparent-looking pale colors for line stroke
  // (still allow as badge bg — callers decide). Near-black OK.
  if (r > 248 && g > 248 && b > 248) return null;
  return `#${value.toUpperCase()}`;
}

export function transitModeColor(
  mode: TransitMode,
  lineColor?: string | null,
): string {
  const sanitized = sanitizeTransitColor(lineColor);
  if (sanitized) return sanitized;
  return MODE_COLORS[mode] ?? MODE_COLORS.other;
}

export function formatTransitClock(iso: string | null, timeZone?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

export function journeyCoordinates(
  journey: TransitJourney | null,
): [number, number][] {
  if (!journey) return [];
  // Prefer concatenating step geometries (accurate multimodal path).
  const fromLegs: [number, number][] = [];
  for (const leg of journey.legs) {
    const coords = leg.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    for (const coord of coords) {
      const prev = fromLegs[fromLegs.length - 1];
      if (prev && prev[0] === coord[0] && prev[1] === coord[1]) continue;
      fromLegs.push(coord);
    }
  }
  if (fromLegs.length >= 2) return fromLegs;

  if (journey.geometry.type === "LineString") {
    return journey.geometry.coordinates as [number, number][];
  }
  const out: [number, number][] = [];
  for (const line of journey.geometry.coordinates as [number, number][][]) {
    for (const coord of line) {
      const prev = out[out.length - 1];
      if (prev && prev[0] === coord[0] && prev[1] === coord[1]) continue;
      out.push(coord);
    }
  }
  return out;
}

/** Collapse consecutive walk micro-steps for compact UI timelines. */
export function collapseTransitLegsForDisplay(legs: TransitLeg[]): TransitLeg[] {
  const out: TransitLeg[] = [];
  for (const leg of legs) {
    const last = out[out.length - 1];
    if (leg.mode === "walk" && last?.mode === "walk") {
      out[out.length - 1] = {
        ...last,
        durationSeconds: last.durationSeconds + leg.durationSeconds,
        distanceMeters: (() => {
          const sum =
            (last.distanceMeters ?? 0) + (leg.distanceMeters ?? 0);
          return sum > 0 ? sum : null;
        })(),
        to: leg.to,
        arrivalAt: leg.arrivalAt ?? last.arrivalAt,
        geometry:
          last.geometry && leg.geometry
            ? {
                type: "LineString",
                coordinates: [
                  ...last.geometry.coordinates,
                  ...leg.geometry.coordinates.slice(1),
                ],
              }
            : last.geometry ?? leg.geometry,
      };
      continue;
    }
    out.push(leg);
  }
  return out;
}

export function buildTransitMapPointsFromJourney(
  journey: TransitJourney | null,
  origin?: { longitude: number; latitude: number } | null,
  destination?: { longitude: number; latitude: number } | null,
): TransitMapPoint[] {
  const points: TransitMapPoint[] = [];
  if (origin) {
    points.push({
      id: "transit-origin",
      role: "origin",
      longitude: origin.longitude,
      latitude: origin.latitude,
      label: "A",
      color: "#16a34a",
      mode: "walk",
    });
  }

  if (journey) {
    const transitLegs = journey.legs.filter((leg) => leg.mode !== "walk");
    transitLegs.forEach((leg, index) => {
      if (
        leg.from.longitude != null &&
        leg.from.latitude != null &&
        Number.isFinite(leg.from.longitude) &&
        Number.isFinite(leg.from.latitude)
      ) {
        points.push({
          id: `board-${leg.id}`,
          role: index === 0 ? "boarding" : "transfer",
          longitude: leg.from.longitude,
          latitude: leg.from.latitude,
          label: formatTransitClock(leg.departureAt, leg.timezone ?? undefined),
          subtitle: leg.from.name,
          color: transitModeColor(leg.mode, leg.line?.color),
          mode: leg.mode,
          lineShortName: leg.line?.nameShort ?? leg.line?.name,
        });
      }
      if (
        leg.to.longitude != null &&
        leg.to.latitude != null &&
        Number.isFinite(leg.to.longitude) &&
        Number.isFinite(leg.to.latitude)
      ) {
        const isLast = index === transitLegs.length - 1;
        points.push({
          id: `alight-${leg.id}`,
          role: isLast ? "alighting" : "transfer",
          longitude: leg.to.longitude,
          latitude: leg.to.latitude,
          label: formatTransitClock(leg.arrivalAt, leg.timezone ?? undefined),
          subtitle: leg.to.name,
          color: transitModeColor(leg.mode, leg.line?.color),
          mode: leg.mode,
          lineShortName: leg.line?.nameShort ?? leg.line?.name,
        });
      }
    });
  }

  if (destination) {
    points.push({
      id: "transit-destination",
      role: "destination",
      longitude: destination.longitude,
      latitude: destination.latitude,
      label: "B",
      color: "#dc2626",
      mode: "walk",
    });
  }
  return points;
}
