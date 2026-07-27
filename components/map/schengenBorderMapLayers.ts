import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  SCHENGEN_BORDER_CROSSING_POINTS,
  type BorderCrossingMode,
  type TemporaryInternalBorderControl,
} from "@/lib/security/schengenBorders";

export const BORDER_MODE_COLORS: Record<BorderCrossingMode, string> = {
  road: "#1e3a8a",
  motorway: "#1e40af",
  rail: "#1d4ed8",
  air: "#1e3a8a",
  sea: "#0e4d8b",
  river: "#075985",
  pedestrian: "#1e3a8a",
  other: "#1e3a8a",
};

export type BorderModeFilters = {
  road: boolean;
  rail: boolean;
  air: boolean;
  sea: boolean;
};

export function borderModeMatchesFilter(
  mode: BorderCrossingMode,
  filters: BorderModeFilters,
): boolean {
  if (mode === "road" || mode === "motorway" || mode === "pedestrian") {
    return filters.road;
  }
  if (mode === "rail") return filters.rail;
  if (mode === "air") return filters.air;
  if (mode === "sea" || mode === "river") return filters.sea;
  return filters.road;
}

export function borderCrossingIconId(mode: BorderCrossingMode): string {
  if (mode === "rail") return "schengen-bcp-icon-rail";
  if (mode === "air") return "schengen-bcp-icon-air";
  if (mode === "sea" || mode === "river") return "schengen-bcp-icon-sea";
  return "schengen-bcp-icon-road";
}

export function buildSchengenBorderCrossingCollection(
  locale: Locale,
  filters: BorderModeFilters,
): GeoJSON.FeatureCollection {
  const t = getMessages(locale).borderCrossingPanel;
  const points = SCHENGEN_BORDER_CROSSING_POINTS.filter((point) =>
    borderModeMatchesFilter(point.mode, filters),
  );

  return {
    type: "FeatureCollection",
    features: points.map((point, index) => ({
      type: "Feature" as const,
      id: index + 1,
      properties: {
        crossingId: point.id,
        displayName: point.officialName,
        countryCode: point.countryCode,
        neighbouringCountryCode: point.neighbouringCountryCode,
        mode: point.mode,
        modeLabel: t.modes[point.mode],
        status: point.status,
        statusLabel: t.statuses[point.status],
        lastVerifiedAt: point.lastVerifiedAt,
        iconImageId: borderCrossingIconId(point.mode),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [point.longitude, point.latitude],
      },
    })),
  };
}

/** Approximate midpoints for notified bilateral internal borders (not precise posts). */
const BORDER_PAIR_POINTS: Record<string, [number, number]> = {
  "AT-CZ": [15.5, 48.75],
  "AT-HU": [16.6, 47.7],
  "AT-SI": [15.2, 46.6],
  "AT-SK": [17.0, 48.2],
  "BE-DE": [6.1, 50.4],
  "BE-FR": [3.5, 50.3],
  "BE-LU": [5.85, 49.8],
  "BE-NL": [4.7, 51.35],
  "CH-DE": [8.6, 47.7],
  "CH-FR": [6.1, 46.4],
  "CH-IT": [9.0, 46.2],
  "CZ-DE": [13.5, 50.5],
  "CZ-PL": [16.5, 50.3],
  "DE-DK": [9.4, 54.8],
  "DE-FR": [7.6, 48.9],
  "DE-LU": [6.4, 49.8],
  "DE-NL": [6.8, 52.0],
  "DE-PL": [14.6, 52.5],
  "DK-SE": [12.7, 55.7],
  "ES-FR": [0.5, 42.7],
  "FR-IT": [6.9, 44.4],
  "FR-LU": [6.1, 49.5],
  "IT-SI": [13.6, 45.8],
  "LT-PL": [23.4, 54.3],
};

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("-");
}

export function buildTemporaryControlsCollection(
  controls: readonly TemporaryInternalBorderControl[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const control of controls) {
    // Centroid-ish points for implementing country (for symbol clicks)
    const centroids: Record<string, [number, number]> = {
      AT: [14.55, 47.52],
      BE: [4.47, 50.5],
      DE: [10.45, 51.16],
      DK: [10.0, 56.0],
      ES: [-3.7, 40.4],
      FR: [2.35, 46.6],
      HU: [19.5, 47.16],
      IT: [12.5, 42.5],
      LT: [23.9, 55.17],
      LU: [6.13, 49.75],
      NL: [5.29, 52.13],
      NO: [8.5, 60.5],
      PL: [19.15, 52.1],
      SE: [15.0, 62.0],
      SI: [14.8, 46.15],
      SK: [19.5, 48.7],
      CH: [8.23, 46.82],
      CZ: [15.47, 49.82],
    };
    const center = centroids[control.implementingCountryCode];
    if (center) {
      features.push({
        type: "Feature",
        properties: {
          controlId: control.id,
          featureKind: "country-marker",
          implementingCountryCode: control.implementingCountryCode,
          displayName: control.implementingCountryCode,
          endAt: control.endAt,
          geometryAccuracy: "notified-scope",
        },
        geometry: { type: "Point", coordinates: center },
      });
    }

    for (const neighbour of control.affectedCountryCodes) {
      const key = pairKey(control.implementingCountryCode, neighbour);
      const mid = BORDER_PAIR_POINTS[key];
      if (!mid) continue;
      // Short line segment around midpoint to style as border highlight
      const [lon, lat] = mid;
      features.push({
        type: "Feature",
        properties: {
          controlId: control.id,
          featureKind: "border-line",
          implementingCountryCode: control.implementingCountryCode,
          neighbouringCountryCode: neighbour,
          geometryAccuracy: "notified-scope",
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [lon - 0.35, lat - 0.15],
            [lon + 0.35, lat + 0.15],
          ],
        },
      });
    }
  }

  return { type: "FeatureCollection", features };
}

export function borderCrossingSelectionExpression(
  selectedId: string | null,
  selectedValue: number,
  defaultValue: number,
): ["case", ["==", ["get", "crossingId"], string], number, number] {
  return [
    "case",
    ["==", ["get", "crossingId"], selectedId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

export function temporaryControlSelectionExpression(
  selectedId: string | null,
  selectedValue: number,
  defaultValue: number,
): ["case", ["==", ["get", "controlId"], string], number, number] {
  return [
    "case",
    ["==", ["get", "controlId"], selectedId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

export function createSchengenBorderCrossingIcon(
  kind: "road" | "rail" | "air" | "sea",
): { width: number; height: number; data: Uint8Array } {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }

  const cx = size / 2;
  const cy = size / 2;
  const color = "#1e3a8a";

  // shield / gate plate
  ctx.beginPath();
  ctx.moveTo(cx - 14, cy - 16);
  ctx.lineTo(cx + 14, cy - 16);
  ctx.lineTo(cx + 14, cy + 6);
  ctx.quadraticCurveTo(cx + 14, cy + 16, cx, cy + 18);
  ctx.quadraticCurveTo(cx - 14, cy + 16, cx - 14, cy + 6);
  ctx.closePath();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 13, cy - 17);
  ctx.lineTo(cx + 13, cy - 17);
  ctx.lineTo(cx + 13, cy + 5);
  ctx.quadraticCurveTo(cx + 13, cy + 15, cx, cy + 17);
  ctx.quadraticCurveTo(cx - 13, cy + 15, cx - 13, cy + 5);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 14);
  ctx.lineTo(cx + 10, cy - 14);
  ctx.lineTo(cx + 10, cy + 4);
  ctx.quadraticCurveTo(cx + 10, cy + 12, cx, cy + 14);
  ctx.quadraticCurveTo(cx - 10, cy + 12, cx - 10, cy + 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (kind === "air") {
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy);
    ctx.lineTo(cx + 8, cy);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 6, cy + 2);
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx - 6, cy + 2);
    ctx.stroke();
  } else if (kind === "rail") {
    ctx.strokeRect(cx - 6, cy - 5, 12, 8);
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 5);
    ctx.lineTo(cx - 8, cy + 8);
    ctx.moveTo(cx + 6, cy + 5);
    ctx.lineTo(cx + 8, cy + 8);
    ctx.stroke();
  } else if (kind === "sea") {
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.lineTo(cx + 4, cy + 5);
    ctx.lineTo(cx - 4, cy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 7);
    ctx.stroke();
  } else {
    // car / road arrows
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 2);
    ctx.lineTo(cx - 2, cy - 2);
    ctx.lineTo(cx - 2, cy - 5);
    ctx.lineTo(cx + 3, cy);
    ctx.lineTo(cx - 2, cy + 5);
    ctx.lineTo(cx - 2, cy + 2);
    ctx.lineTo(cx - 7, cy + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy + 2);
    ctx.lineTo(cx + 2, cy + 2);
    ctx.lineTo(cx + 2, cy + 5);
    ctx.lineTo(cx - 3, cy);
    ctx.lineTo(cx + 2, cy - 5);
    ctx.lineTo(cx + 2, cy - 2);
    ctx.lineTo(cx + 7, cy - 2);
    ctx.closePath();
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data.buffer),
  };
}
