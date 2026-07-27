import type { Locale } from "@/lib/i18n/config";
import {
  EUROPEAN_HERITAGE_LABEL_SITES,
  getDisplayableEhlLocations,
} from "@/lib/tourism/europeanHeritageLabel";

export const EHL_SOURCE_ID = "european-heritage-label-sites";
export const EHL_CLUSTER_LAYER_ID = "ehl-clusters";
export const EHL_CLUSTER_COUNT_LAYER_ID = "ehl-cluster-count";
export const EHL_SELECTED_LAYER_ID = "ehl-selected-site";
export const EHL_SYMBOL_LAYER_ID = "ehl-sites-symbol";
export const EHL_LABEL_LAYER_ID = "ehl-sites-label";

export const EHL_SITE_ICON_ID = "ehl-site-icon";
export const EHL_SITE_ICON_SERIAL_ID = "ehl-site-icon-serial";

export function ehlIconImageId(serial: boolean): string {
  return serial ? EHL_SITE_ICON_SERIAL_ID : EHL_SITE_ICON_ID;
}

/**
 * Flattened, map-ready FeatureCollection: one feature per displayable EHL
 * location (serial sites contribute several features sharing the same
 * `siteId`). `locale` is accepted for API symmetry with the other
 * `build*Collection` helpers and so the source refresh effect can key off
 * locale changes even though the current dataset has no per-locale fields.
 */
export function buildEhlLocationsCollection(
  locale: Locale,
): GeoJSON.FeatureCollection {
  void locale;

  const sitesById = new Map(
    EUROPEAN_HERITAGE_LABEL_SITES.map((site) => [site.id, site] as const),
  );
  const locations = getDisplayableEhlLocations();

  return {
    type: "FeatureCollection",
    features: locations.map((location) => {
      const site = sitesById.get(location.siteId);
      const serial = site?.serial ?? false;
      const displayName = serial
        ? location.name
        : (site?.canonicalName ?? location.name);

      return {
        type: "Feature",
        id: location.id,
        properties: {
          siteId: location.siteId,
          locationId: location.id,
          displayName,
          locationName: location.name,
          countryCode: location.countryCode,
          awardYear: site?.awardYear ?? null,
          transnational: site?.transnational ?? false,
          serial,
          representativePoint: location.representativePoint,
          iconImageId: ehlIconImageId(serial),
        },
        geometry: {
          type: "Point",
          coordinates: [location.longitude, location.latitude],
        },
      };
    }),
  };
}

type EhlCaseExpression = [
  "case",
  ["==", ["get", string], string],
  number,
  number,
];

/**
 * When a single location is selected, only that location is highlighted.
 * When only a site is selected (e.g. from search, before a specific
 * location is focused), every location belonging to that logical site is
 * highlighted — useful for serial/transnational properties.
 */
export function ehlSelectionCaseExpression(
  selectedSiteId: string | null,
  selectedLocationId: string | null,
  selectedValue: number,
  defaultValue: number,
): EhlCaseExpression {
  if (selectedLocationId) {
    return [
      "case",
      ["==", ["get", "locationId"], selectedLocationId],
      selectedValue,
      defaultValue,
    ];
  }

  return [
    "case",
    ["==", ["get", "siteId"], selectedSiteId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points = 5,
): void {
  ctx.beginPath();
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * European Heritage Label medallion: EU-blue disc, gold ring (echoing the
 * EU flag), white/gold star pictogram and a soft drop shadow. The serial
 * variant adds a small twin-dot badge to flag multi-location properties —
 * visually distinct from both the UNESCO medallions and the EU institution
 * pins used elsewhere on the map.
 *
 * Canvas is 64×64 at pixelRatio 2 → ~30-34px display at icon-size 1.0.
 */
export function createEhlSiteIcon(serial: boolean): {
  width: number;
  height: number;
  data: Uint8Array;
} {
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
  const radius = 17;

  // soft shadow
  ctx.beginPath();
  ctx.arc(cx, cy + 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();

  // gold outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#facc15";
  ctx.fill();

  // EU-blue disc
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.fillStyle = "#003399";
  ctx.fill();

  // white outline between ring and disc for contrast
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // white/gold star pictogram
  ctx.fillStyle = "#facc15";
  drawStar(ctx, cx, cy, 9, 3.8, 5);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  if (serial) {
    // twin-dot badge: flags multi-location (serial) properties
    const bx = cx + radius - 4;
    const by = cy + radius - 4;
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx - 2.4, by, 2.1, 0, Math.PI * 2);
    ctx.arc(bx + 2.4, by, 2.1, 0, Math.PI * 2);
    ctx.fillStyle = "#003399";
    ctx.fill();
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}
