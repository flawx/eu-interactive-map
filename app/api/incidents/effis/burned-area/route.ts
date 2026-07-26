import type { EffisBurnedArea } from "@/lib/incidents/types";
import {
  EFFIS_BURNED_AREA_TYPENAME,
  fetchEffisWfsFeatures,
  normalizeBurnedArea,
  selectNearbyEffisFeature,
} from "@/lib/incidents/effisWfs";

const REQUEST_TIMEOUT_MS = 12_000;
const TIME_RANGE_PATTERN = /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/;

type RequestBody = {
  longitude: number;
  latitude: number;
  bbox: [number, number, number, number];
  time: string;
};

function parseRequestBody(value: unknown): RequestBody | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;

  const longitude =
    typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
  const latitude =
    typeof body.latitude === "number" ? body.latitude : Number(body.latitude);

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  if (!Array.isArray(body.bbox) || body.bbox.length !== 4) return null;
  const bboxValues = body.bbox.map((item) =>
    typeof item === "number" ? item : Number(item),
  );
  if (!bboxValues.every((item) => Number.isFinite(item))) return null;

  const [minX, minY, maxX, maxY] = bboxValues;
  if (!(minX < maxX) || !(minY < maxY)) return null;

  const time = typeof body.time === "string" ? body.time.trim() : "";
  if (!TIME_RANGE_PATTERN.test(time)) return null;

  return {
    longitude,
    latitude,
    bbox: [minX, minY, maxX, maxY],
    time,
  };
}

export async function POST(request: Request) {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    return Response.json(
      { burnedArea: null, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const body = parseRequestBody(json);
  if (!body) {
    return Response.json(
      { burnedArea: null, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const features = await fetchEffisWfsFeatures(
      EFFIS_BURNED_AREA_TYPENAME,
      body.bbox,
      controller.signal,
    );

    const selected = selectNearbyEffisFeature(
      features,
      body.longitude,
      body.latitude,
    );
    if (!selected) {
      return Response.json({ burnedArea: null });
    }

    return Response.json({
      burnedArea: normalizeBurnedArea(selected) satisfies EffisBurnedArea,
    });
  } catch {
    return Response.json(
      {
        burnedArea: null,
        error: "EFFIS information temporarily unavailable",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
