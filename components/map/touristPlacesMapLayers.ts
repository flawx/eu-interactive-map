import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  MAJOR_TOURIST_PLACES,
  type TouristPlaceCategory,
} from "@/lib/tourism/majorTouristPlaces";

export type TouristCategoryFilters = Record<TouristPlaceCategory, boolean>;

export const TOURIST_PLACE_CATEGORY_COLORS: Record<
  TouristPlaceCategory,
  string
> = {
  landmark: "#c2410c",
  historic_area: "#7c3aed",
  museum: "#0369a1",
  park_garden: "#15803d",
  natural_landscape: "#0f766e",
  coastal_destination: "#0284c7",
  mountain_destination: "#57534e",
};

export const TOURIST_PLACE_CATEGORIES: readonly TouristPlaceCategory[] = [
  "landmark",
  "historic_area",
  "museum",
  "park_garden",
  "natural_landscape",
  "coastal_destination",
  "mountain_destination",
] as const;

export function touristPlaceIconImageId(category: TouristPlaceCategory): string {
  return `tourist-place-icon-${category}`;
}

export function buildTouristPlaceCollection(
  locale: Locale,
  filters: TouristCategoryFilters,
): GeoJSON.FeatureCollection {
  const tp = getMessages(locale).touristPlacePanel;

  const places = MAJOR_TOURIST_PLACES.filter(
    (place) => filters[place.category],
  );

  return {
    type: "FeatureCollection",
    features: places.map((place, index) => ({
      type: "Feature",
      id: index + 1,
      properties: {
        placeId: place.id,
        displayName: place.canonicalName,
        cityOrRegion: place.cityOrRegion,
        countryCode: place.countryCode,
        category: place.category,
        categoryLabel: tp.categories[place.category],
        unescoSiteId: place.unescoSiteId,
        iconImageId: touristPlaceIconImageId(place.category),
      },
      geometry: {
        type: "Point",
        coordinates: [place.longitude, place.latitude],
      },
    })),
  };
}

export function touristPlaceSelectionCaseExpression(
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
 * Colored medallion icon per tourist category (64×64 @ pixelRatio 2).
 */
export function createTouristPlaceIcon(
  category: TouristPlaceCategory,
): { width: number; height: number; data: Uint8Array } {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }

  const color = TOURIST_PLACE_CATEGORY_COLORS[category];
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
    case "landmark":
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx + 7, cy + 7);
      ctx.lineTo(cx - 7, cy + 7);
      ctx.closePath();
      ctx.fill();
      break;
    case "historic_area":
      ctx.fillRect(cx - 7, cy - 2, 3, 9);
      ctx.fillRect(cx - 1.5, cy - 5, 3, 12);
      ctx.fillRect(cx + 4, cy - 2, 3, 9);
      ctx.fillRect(cx - 8, cy + 6, 16, 2);
      break;
    case "museum":
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 6, cy + 3, 12, 5);
      break;
    case "park_garden":
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.quadraticCurveTo(cx + 9, cy - 4, cx, cy + 8);
      ctx.quadraticCurveTo(cx - 9, cy - 4, cx, cy - 8);
      ctx.closePath();
      ctx.fill();
      break;
    case "natural_landscape":
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy + 6);
      ctx.lineTo(cx - 2, cy - 8);
      ctx.lineTo(cx + 3, cy - 1);
      ctx.lineTo(cx + 9, cy + 6);
      ctx.closePath();
      ctx.fill();
      break;
    case "coastal_destination":
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy);
      ctx.quadraticCurveTo(cx - 4, cy - 5, cx, cy);
      ctx.quadraticCurveTo(cx + 4, cy + 5, cx + 9, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 5, cy - 5, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
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
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data.buffer),
  };
}
