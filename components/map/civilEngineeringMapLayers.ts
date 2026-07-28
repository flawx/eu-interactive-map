import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  MAJOR_CIVIL_ENGINEERING_WORKS,
  type CivilEngineeringWorkCategory,
} from "@/lib/tourism/majorCivilEngineeringWorks";

export type CivilEngineeringCategoryFilters = Record<
  CivilEngineeringWorkCategory,
  boolean
>;

export const CIVIL_ENGINEERING_CATEGORIES: readonly CivilEngineeringWorkCategory[] = [
  "bridge",
  "viaduct",
  "tunnel",
  "dam",
  "canal_lock",
] as const;

export const CIVIL_ENGINEERING_CATEGORY_COLORS: Record<
  CivilEngineeringWorkCategory,
  string
> = {
  bridge: "#2563eb",
  viaduct: "#7c3aed",
  tunnel: "#475569",
  dam: "#0891b2",
  canal_lock: "#0f766e",
};

export const CIVIL_ENGINEERING_SOURCE_ID = "major-civil-engineering-works";
export const CIVIL_ENGINEERING_CLUSTER_LAYER_ID = "civil-engineering-clusters";
export const CIVIL_ENGINEERING_CLUSTER_COUNT_LAYER_ID =
  "civil-engineering-cluster-count";
export const CIVIL_ENGINEERING_SELECTED_LAYER_ID =
  "civil-engineering-selected";
export const CIVIL_ENGINEERING_SYMBOL_LAYER_ID = "civil-engineering-symbol";
export const CIVIL_ENGINEERING_LABEL_LAYER_ID = "civil-engineering-label";

export function civilEngineeringIconImageId(
  category: CivilEngineeringWorkCategory,
): string {
  return `civil-engineering-icon-${category}`;
}

export function buildCivilEngineeringCollection(
  locale: Locale,
  filters: CivilEngineeringCategoryFilters,
): GeoJSON.FeatureCollection {
  const labels = getMessages(locale).civilEngineeringPanel.categories;
  return {
    type: "FeatureCollection",
    features: MAJOR_CIVIL_ENGINEERING_WORKS.filter(
      (item) => filters[item.category],
    ).map((item, index) => ({
      type: "Feature",
      id: index + 1,
      properties: {
        workId: item.id,
        displayName: item.name,
        category: item.category,
        categoryLabel: labels[item.category],
        countryCodes: item.countryCodes.join(","),
        regionOrCity: item.regionOrCity,
        status: item.status,
        openingYear: item.openingYear,
        carries: item.carries,
        iconImageId: civilEngineeringIconImageId(item.category),
      },
      geometry: {
        type: "Point",
        coordinates: [item.longitude, item.latitude],
      },
    })),
  };
}

export function civilEngineeringSelectionCaseExpression(
  selectedWorkId: string | null,
  selectedValue: number,
  defaultValue: number,
): ["case", ["==", ["get", "workId"], string], number, number] {
  return [
    "case",
    ["==", ["get", "workId"], selectedWorkId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

export function createCivilEngineeringIcon(
  category: CivilEngineeringWorkCategory,
): { width: number; height: number; data: Uint8Array } {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }

  const color = CIVIL_ENGINEERING_CATEGORY_COLORS[category];
  const cx = size / 2;
  const cy = size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 17, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15,23,42,0.28)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 17, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.fillStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (category === "bridge" || category === "viaduct") {
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 7);
    ctx.lineTo(cx - 10, cy - 3);
    ctx.moveTo(cx + 10, cy + 7);
    ctx.lineTo(cx + 10, cy - 3);
    ctx.moveTo(cx - 11, cy - 3);
    ctx.quadraticCurveTo(cx, cy + (category === "viaduct" ? 7 : -10), cx + 11, cy - 3);
    ctx.moveTo(cx - 12, cy + 7);
    ctx.lineTo(cx + 12, cy + 7);
    ctx.stroke();
  } else if (category === "tunnel") {
    ctx.beginPath();
    ctx.arc(cx, cy + 7, 10, Math.PI, 0);
    ctx.lineTo(cx + 10, cy + 8);
    ctx.moveTo(cx - 10, cy + 8);
    ctx.lineTo(cx - 10, cy);
    ctx.stroke();
    ctx.fillRect(cx - 2, cy, 4, 8);
  } else if (category === "dam") {
    ctx.beginPath();
    ctx.moveTo(cx - 9, cy - 9);
    ctx.lineTo(cx + 8, cy - 4);
    ctx.lineTo(cx + 10, cy + 9);
    ctx.lineTo(cx - 7, cy + 7);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.strokeRect(cx - 10, cy - 7, 20, 14);
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx, cy + 7);
    ctx.moveTo(cx - 7, cy);
    ctx.lineTo(cx + 7, cy);
    ctx.stroke();
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data.buffer),
  };
}
