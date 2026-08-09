import {
  isCountryInEUIMScope,
  isCoordinateInEUIMScope,
} from "@/lib/geography/euimCoverage";
import type { GeographicBounds } from "@/lib/alerts/geography";

const GISCO_COUNTRIES_20M_URL =
  "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson";

export type EuimMaskGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

let maskPromise: Promise<EuimMaskGeometry | null> | null = null;

type GiscoFeature = {
  type: "Feature";
  properties?: { CNTR_ID?: string | null } | null;
  geometry?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  } | null;
};

type GiscoCollection = {
  type: "FeatureCollection";
  features: GiscoFeature[];
};

/**
 * Build a MultiPolygon of EUIM operational countries from GISCO.
 * Used as MapLibre `within` filter geometry for vector traffic layers.
 */
export async function loadEuimCoverageMaskGeometry(): Promise<EuimMaskGeometry | null> {
  maskPromise ??= (async () => {
    try {
      const response = await fetch(GISCO_COUNTRIES_20M_URL, {
        headers: { Accept: "application/geo+json, application/json" },
      });
      if (!response.ok) return null;
      const collection = (await response.json()) as GiscoCollection;
      const polygons: number[][][][] = [];
      for (const feature of collection.features ?? []) {
        const code = feature.properties?.CNTR_ID;
        if (!isCountryInEUIMScope(code)) continue;
        const geometry = feature.geometry;
        if (!geometry) continue;
        if (geometry.type === "Polygon") {
          polygons.push(geometry.coordinates as number[][][]);
        } else if (geometry.type === "MultiPolygon") {
          polygons.push(...(geometry.coordinates as number[][][][]));
        }
      }
      if (polygons.length === 0) return null;
      return { type: "MultiPolygon", coordinates: polygons };
    } catch {
      return null;
    }
  })();
  return maskPromise;
}

/** MapLibre filter: keep features fully inside EUIM operational polygons. */
export function euimWithinFilter(
  geometry: EuimMaskGeometry,
): ["within", EuimMaskGeometry] {
  return ["within", geometry];
}

/**
 * True if a web-mercator tile may contain in-scope EUIM roads.
 * Rejects tiles whose sampled points are all outside operational coverage
 * (UK / CH / NO / IS / ocean-only, etc.).
 */
export function tileMayIntersectEuimCoverage(
  bounds: GeographicBounds,
): boolean {
  const samples: Array<[number, number]> = [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.west, bounds.north],
    [bounds.east, bounds.north],
    [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2],
    [(bounds.west + bounds.east) / 2, bounds.south],
    [(bounds.west + bounds.east) / 2, bounds.north],
    [bounds.west, (bounds.south + bounds.north) / 2],
    [bounds.east, (bounds.south + bounds.north) / 2],
  ];
  // Denser interior samples for large / border tiles
  for (const fx of [0.25, 0.75]) {
    for (const fy of [0.25, 0.75]) {
      samples.push([
        bounds.west + (bounds.east - bounds.west) * fx,
        bounds.south + (bounds.north - bounds.south) * fy,
      ]);
    }
  }
  return samples.some(([longitude, latitude]) =>
    isCoordinateInEUIMScope(longitude, latitude),
  );
}
