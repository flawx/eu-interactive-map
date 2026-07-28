import sharp from "sharp";
import {
  PROJECT_EUROPE_ALERT_BOUNDS,
  isEuropeanTileBounds,
  type GeographicBounds,
} from "@/lib/alerts/geography";

export const TRANSPARENT_TILE_CACHE_CONTROL =
  "public, max-age=900, stale-while-revalidate=1800";

let transparentTilePromise: Promise<Buffer> | null = null;

export function transparentPng256(): Promise<Buffer> {
  transparentTilePromise ??= sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  return transparentTilePromise;
}

export function tileBounds4326(
  z: number,
  x: number,
  y: number,
): GeographicBounds {
  const tiles = 2 ** z;
  const longitude = (tileX: number) => (tileX / tiles) * 360 - 180;
  const latitude = (tileY: number) => {
    const n = Math.PI - (2 * Math.PI * tileY) / tiles;
    return (180 / Math.PI) * Math.atan(Math.sinh(n));
  };
  return {
    west: longitude(x),
    east: longitude(x + 1),
    north: latitude(y),
    south: latitude(y + 1),
  };
}

export function validateTileCoordinates(
  z: number,
  x: number,
  y: number,
): boolean {
  if (!Number.isInteger(z) || z < 0 || z > 22) return false;
  const max = 2 ** z;
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < max &&
    y < max
  );
}

export function tileIntersectsProjectEurope(
  z: number,
  x: number,
  y: number,
): boolean {
  return (
    validateTileCoordinates(z, x, y) &&
    isEuropeanTileBounds(tileBounds4326(z, x, y))
  );
}

function tilePixelLngLat(
  z: number,
  x: number,
  y: number,
  pixelX: number,
  pixelY: number,
): [number, number] {
  const scale = 256 * 2 ** z;
  const worldX = x * 256 + pixelX + 0.5;
  const worldY = y * 256 + pixelY + 0.5;
  const longitude = (worldX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * worldY) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return [longitude, latitude];
}

function isObservedFloodPalettePixel(
  red: number,
  green: number,
  blue: number,
  alpha: number,
): boolean {
  if (alpha === 0) return false;
  // GFM v3 uses magenta; the current STAC/TiTiler product uses blue-teal.
  const magenta = red >= 140 && blue >= 90 && green <= 145;
  const teal = red <= 110 && green >= 80 && blue >= 125 && blue > green;
  return magenta || teal;
}

export async function sanitizeObservedFloodExtentTile(
  input: ArrayBuffer | Uint8Array,
  z: number,
  x: number,
  y: number,
): Promise<Buffer> {
  const inputBuffer =
    input instanceof ArrayBuffer
      ? Buffer.from(input)
      : Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .resize(256, 256, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const project = PROJECT_EUROPE_ALERT_BOUNDS;

  for (let pixelY = 0; pixelY < info.height; pixelY += 1) {
    for (let pixelX = 0; pixelX < info.width; pixelX += 1) {
      const index = (pixelY * info.width + pixelX) * 4;
      const [longitude, latitude] = tilePixelLngLat(
        z,
        x,
        y,
        pixelX,
        pixelY,
      );
      const inside =
        longitude >= project.west &&
        longitude <= project.east &&
        latitude >= project.south &&
        latitude <= project.north;
      if (
        !inside ||
        !isObservedFloodPalettePixel(
          data[index],
          data[index + 1],
          data[index + 2],
          data[index + 3],
        )
      ) {
        data[index + 3] = 0;
      }
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}
