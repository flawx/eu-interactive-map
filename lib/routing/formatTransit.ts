import type {
  TransitJourney,
  TransitMode,
} from "@/lib/routing/transit/types";

const MODE_COLORS: Record<TransitMode, string> = {
  walk: "#94a3b8",
  bus: "#16a34a",
  tram: "#0d9488",
  metro: "#7c3aed",
  subway: "#7c3aed",
  light_rail: "#0891b2",
  regional_rail: "#2563eb",
  train: "#1d4ed8",
  high_speed_rail: "#1e3a8a",
  coach: "#15803d",
  ferry: "#0284c7",
  flight: "#9333ea",
  other: "#64748b",
};

export function transitModeColor(
  mode: TransitMode,
  lineColor?: string | null,
): string {
  if (lineColor && /^#?[0-9a-fA-F]{6}$/.test(lineColor)) {
    return lineColor.startsWith("#") ? lineColor : `#${lineColor}`;
  }
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
