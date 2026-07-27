import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  getDisplayableMountainPlaces,
  type MountainPlaceCategory,
} from "@/lib/tourism/europeanMountainDestinations";

export type MountainCategoryFilters = Record<MountainPlaceCategory, boolean>;

export const MOUNTAIN_PLACE_CATEGORY_COLORS: Record<
  MountainPlaceCategory,
  string
> = {
  ski_resort: "#0284c7",
  mountain_destination: "#166534",
  iconic_peak: "#64748b",
  mountain_range: "#7c3aed",
};

export const MOUNTAIN_PLACE_CATEGORIES: readonly MountainPlaceCategory[] = [
  "ski_resort",
  "mountain_destination",
  "iconic_peak",
  "mountain_range",
] as const;

export const MOUNTAIN_SOURCE_ID = "european-mountain-places";
export const MOUNTAIN_CLUSTER_LAYER_ID = "mountain-place-clusters";
export const MOUNTAIN_CLUSTER_COUNT_LAYER_ID = "mountain-place-cluster-count";
export const MOUNTAIN_SELECTED_LAYER_ID = "mountain-place-selected";
export const MOUNTAIN_SYMBOL_LAYER_ID = "mountain-places-symbol";
export const MOUNTAIN_LABEL_LAYER_ID = "mountain-places-label";

export function mountainPlaceIconImageId(
  category: MountainPlaceCategory,
): string {
  return `mountain-place-icon-${category}`;
}

export function buildMountainPlaceCollection(
  locale: Locale,
  filters: MountainCategoryFilters,
): GeoJSON.FeatureCollection {
  const mp = getMessages(locale).mountainPanel;

  const places = getDisplayableMountainPlaces().filter(
    (place) => filters[place.category],
  );

  return {
    type: "FeatureCollection",
    features: places.map((place, index) => ({
      type: "Feature",
      id: index + 1,
      properties: {
        placeId: place.id,
        displayName:
          place.category === "iconic_peak" &&
          place.summitElevationMeters != null
            ? `${place.canonicalName} · ${place.summitElevationMeters.toLocaleString(locale)} m`
            : place.canonicalName,
        cityOrRegion: place.cityOrRegion,
        countryCodes: place.countryCodes.join(","),
        category: place.category,
        categoryLabel: mp.categories[place.category],
        seasonalOperation: place.seasonalOperation,
        iconImageId: mountainPlaceIconImageId(place.category),
        mountainRange: place.mountainRange,
        primaryElevationMeters:
          place.category === "iconic_peak"
            ? place.summitElevationMeters
            : place.resortTopElevationMeters,
      },
      geometry: {
        type: "Point",
        coordinates: [place.longitude, place.latitude],
      },
    })),
  };
}

export function mountainPlaceSelectionCaseExpression(
  selectedPlaceId: string | null,
  selectedValue: number,
  defaultValue: number,
): ["case", ["==", ["get", "placeId"], string], number, number] {
  return [
    "case",
    ["==", ["get", "placeId"], selectedPlaceId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

/**
 * Colored medallion icon per mountain category (64×64 @ pixelRatio 2).
 */
export function createMountainPlaceIcon(
  category: MountainPlaceCategory,
): { width: number; height: number; data: Uint8Array } {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }

  const color = MOUNTAIN_PLACE_CATEGORY_COLORS[category];
  const cx = size / 2;
  const cy = size / 2;
  const radius = 16;

  ctx.beginPath();
  ctx.arc(cx, cy + 2, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (category) {
    case "ski_resort": {
      const spokes = 6;
      for (let i = 0; i < spokes; i += 1) {
        const angle = (Math.PI * 2 * i) / spokes - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "mountain_destination":
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 7);
      ctx.lineTo(cx - 2, cy - 8);
      ctx.lineTo(cx + 2, cy - 2);
      ctx.lineTo(cx + 5, cy - 6);
      ctx.lineTo(cx + 11, cy + 7);
      ctx.closePath();
      ctx.fill();
      break;
    case "iconic_peak":
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 7);
      ctx.lineTo(cx, cy - 9);
      ctx.lineTo(cx + 8, cy + 7);
      ctx.closePath();
      ctx.fill();
      break;
    case "mountain_range":
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy + 7);
      ctx.lineTo(cx - 6, cy - 2);
      ctx.lineTo(cx - 1, cy + 7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy + 7);
      ctx.lineTo(cx + 3, cy - 7);
      ctx.lineTo(cx + 8, cy + 7);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + 5, cy + 7);
      ctx.lineTo(cx + 9, cy - 1);
      ctx.lineTo(cx + 13, cy + 7);
      ctx.closePath();
      ctx.fill();
      break;
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data.buffer),
  };
}
