export type MapBaseMode = "map" | "relief";
export type MapDimensionMode = "2d" | "3d";

const BASE_KEY = "eu-map-base-mode-v1";
const DIMENSION_KEY = "eu-map-dimension-mode-v1";

function isBaseMode(value: unknown): value is MapBaseMode {
  return value === "map" || value === "relief";
}

function isDimensionMode(value: unknown): value is MapDimensionMode {
  return value === "2d" || value === "3d";
}

export function readMapViewPreferences(): {
  baseMode: MapBaseMode;
  dimensionMode: MapDimensionMode;
} {
  if (typeof window === "undefined") {
    return { baseMode: "map", dimensionMode: "2d" };
  }

  try {
    const baseRaw = window.localStorage.getItem(BASE_KEY);
    const dimensionRaw = window.localStorage.getItem(DIMENSION_KEY);
    return {
      baseMode: isBaseMode(baseRaw) ? baseRaw : "map",
      dimensionMode: isDimensionMode(dimensionRaw) ? dimensionRaw : "2d",
    };
  } catch {
    return { baseMode: "map", dimensionMode: "2d" };
  }
}

export function writeMapBaseMode(mode: MapBaseMode): void {
  try {
    window.localStorage.setItem(BASE_KEY, mode);
  } catch {
    // ignore quota / private mode
  }
}

export function writeMapDimensionMode(mode: MapDimensionMode): void {
  try {
    window.localStorage.setItem(DIMENSION_KEY, mode);
  } catch {
    // ignore quota / private mode
  }
}
