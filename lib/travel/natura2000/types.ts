/**
 * Natura 2000 — types.
 *
 * DATA ACCESS REALITY: the EEA `ProtectedSites/Natura2000_Dyna_WM` MapServer
 * exposes the full dataset for on-the-fly WMS raster rendering (scale
 * dependent renderer built into the service) plus an ArcGIS `/query` layer
 * for identify. There is no redistributable "download the whole layer"
 * option appropriate for a client bundle, so:
 *   - low/medium zoom uses a raster WMS tile overlay (see
 *     `lib/map/dataLayers/travelNatureBathingLayers.ts`);
 *   - high zoom click/identify proxies a single-point query server-side
 *     (see `eeaQuery.ts` / `app/api/travel/natura2000/route.ts`).
 * The full Natura 2000 dataset (~27k sites) is NEVER bundled client-side.
 */

export type Natura2000DesignationType = "SPA" | "SAC" | "SCI" | "pSCI" | "unknown";

export type Natura2000Site = {
  siteCode: string;
  siteName: string;
  countryCode: string | null;
  designationType: Natura2000DesignationType;
  /** Site area in hectares, when the service reports it. */
  areaHectares: number | null;
  longitude: number;
  latitude: number;
  sourceIds: string[];
};

const VALID_DESIGNATION_TYPES: ReadonlySet<string> = new Set([
  "SPA",
  "SAC",
  "SCI",
  "pSCI",
]);

/** Normalizes the EEA service's free-text `SITETYPE` / designation attribute. */
export function normalizeDesignationType(raw: unknown): Natura2000DesignationType {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "SPA" || value === "SAC" || value === "SCI") {
    return value as Natura2000DesignationType;
  }
  if (value === "PSCI" || value === "P-SCI") return "pSCI";
  return VALID_DESIGNATION_TYPES.has(value)
    ? (value as Natura2000DesignationType)
    : "unknown";
}

export type Natura2000QueryMeta = {
  fetchedAt: string;
  source: "eea-arcgis-identify" | "eea-arcgis-query";
};
