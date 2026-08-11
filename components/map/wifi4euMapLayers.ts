/**
 * MapLibre icon helpers for WiFi4EU hotspots and municipality markers.
 */

export const WIFI4EU_HOTSPOT_ICON_ID = "wifi4eu-hotspot-icon";
export const WIFI4EU_MUNICIPALITY_ICON_ID = "wifi4eu-municipality-icon";

function drawWifiGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.8 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy + 4 * scale, 3 * scale, Math.PI, 0, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + 4 * scale, 7 * scale, Math.PI * 1.15, Math.PI * -0.15, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + 4 * scale, 11 * scale, Math.PI * 1.22, Math.PI * -0.22, false);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy + 4 * scale, 2.2 * scale, 0, Math.PI * 2);
  ctx.fill();
}

export function createWifi4EuHotspotIcon(): {
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
  const cy = size / 2 - 2;

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#0891b2";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  drawWifiGlyph(ctx, cx, cy - 2, 1, "#ffffff");

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}

export function createWifi4EuMunicipalityIcon(): {
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
  const cy = size / 2 - 2;

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#06b6d4";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  drawWifiGlyph(ctx, cx, cy - 2, 0.85, "#ffffff");

  // municipality ring indicator
  ctx.beginPath();
  ctx.arc(cx, cy + 16, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#fef08a";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: new Uint8Array(imageData.data.buffer) };
}

export function wifi4EuIconExpression(): ["case", ["==", ["get", "entityType"], string], string, string] {
  return [
    "case",
    ["==", ["get", "entityType"], "wifi4eu_municipality"],
    WIFI4EU_MUNICIPALITY_ICON_ID,
    WIFI4EU_HOTSPOT_ICON_ID,
  ];
}
