export type BasemapId =
  | "standard"
  | "light"
  | "dark"
  | "transport"
  | "cycling"
  | "satellite";

export type BasemapDefinition = {
  id: BasemapId;
  nameKey: string;
  category: "general" | "thematic" | "imagery";
  styleType: "raster" | "vector";
  lightStyle: {
    tiles: string[];
    attribution: string;
    maxzoom?: number;
    tileSize?: number;
  } | null;
  darkStyle: {
    tiles: string[];
    attribution: string;
    maxzoom?: number;
    tileSize?: number;
  } | null;
  attribution: string;
  provider: string;
  maxZoom: number;
  supportsTerrain: boolean;
  requiresKey: boolean;
  licenseNotes: string;
  enabled: boolean;
  previewClassName: string;
};

const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const BASEMAP_REGISTRY: readonly BasemapDefinition[] = [
  {
    id: "standard",
    nameKey: "standard",
    category: "general",
    styleType: "raster",
    lightStyle: {
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    darkStyle: {
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    attribution: CARTO_ATTR,
    provider: "CARTO",
    maxZoom: 19,
    supportsTerrain: true,
    requiresKey: false,
    licenseNotes: "CARTO basemap tiles with OSM attribution",
    enabled: true,
    previewClassName: "bg-[#e8e4d8]",
  },
  {
    id: "light",
    nameKey: "light",
    category: "general",
    styleType: "raster",
    lightStyle: {
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    darkStyle: null,
    attribution: CARTO_ATTR,
    provider: "CARTO",
    maxZoom: 19,
    supportsTerrain: true,
    requiresKey: false,
    licenseNotes: "CARTO Positron",
    enabled: true,
    previewClassName: "bg-[#f2f2f2]",
  },
  {
    id: "dark",
    nameKey: "dark",
    category: "general",
    styleType: "raster",
    lightStyle: null,
    darkStyle: {
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    attribution: CARTO_ATTR,
    provider: "CARTO",
    maxZoom: 19,
    supportsTerrain: true,
    requiresKey: false,
    licenseNotes: "CARTO Dark Matter",
    enabled: true,
    previewClassName: "bg-[#1b1b1b]",
  },
  {
    id: "transport",
    nameKey: "transport",
    category: "thematic",
    styleType: "raster",
    lightStyle: {
      // OpenFreeMap / community transport-style raster is not licensed for
      // production here; reuse Voyager until a vetted vector style is wired.
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    darkStyle: {
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    attribution: CARTO_ATTR,
    provider: "CARTO (temporary stand-in)",
    maxZoom: 19,
    supportsTerrain: true,
    requiresKey: false,
    licenseNotes:
      "Transport thematic style pending vetted OpenMapTiles host; Voyager/Dark Matter stand-in enabled.",
    enabled: true,
    previewClassName: "bg-[#dbeafe]",
  },
  {
    id: "cycling",
    nameKey: "cycling",
    category: "thematic",
    styleType: "raster",
    lightStyle: {
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    darkStyle: {
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      attribution: CARTO_ATTR,
      maxzoom: 19,
      tileSize: 256,
    },
    attribution: CARTO_ATTR,
    provider: "CARTO (temporary stand-in)",
    maxZoom: 19,
    supportsTerrain: true,
    requiresKey: false,
    licenseNotes:
      "Cycling thematic style pending vetted cycle-oriented tiles; Voyager stand-in enabled.",
    enabled: true,
    previewClassName: "bg-[#dcfce7]",
  },
  {
    id: "satellite",
    nameKey: "satellite",
    category: "imagery",
    styleType: "raster",
    lightStyle: null,
    darkStyle: null,
    attribution: "",
    provider: "n/a",
    maxZoom: 0,
    supportsTerrain: false,
    requiresKey: true,
    licenseNotes:
      "Satellite provider not enabled: no license-safe free imagery source validated for this deployment.",
    enabled: false,
    previewClassName: "bg-[#334155]",
  },
] as const;

export function getEnabledBasemaps(): BasemapDefinition[] {
  return BASEMAP_REGISTRY.filter((item) => item.enabled);
}

export function getBasemapById(id: string): BasemapDefinition | undefined {
  return BASEMAP_REGISTRY.find((item) => item.id === id);
}

export function resolveBasemapTileConfig(
  basemapId: string,
  resolvedTheme: "light" | "dark",
): NonNullable<BasemapDefinition["lightStyle"]> | null {
  const basemap = getBasemapById(basemapId) ?? getBasemapById("standard");
  if (!basemap || !basemap.enabled) {
    return getBasemapById("standard")?.lightStyle ?? null;
  }
  if (resolvedTheme === "dark") {
    return basemap.darkStyle ?? basemap.lightStyle;
  }
  return basemap.lightStyle ?? basemap.darkStyle;
}
