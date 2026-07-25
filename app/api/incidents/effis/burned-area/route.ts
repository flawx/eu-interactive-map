import type { EffisBurnedArea } from "@/lib/incidents/types";

const EFFIS_WFS_BASE =
  "https://maps.effis.emergency.copernicus.eu/effis";

const EFFIS_SOURCE_URL =
  "https://forest-fire.emergency.copernicus.eu/apps/effis.viewer/current-situation";

/** Validated FeatureType via DescribeFeatureType (nrt WFS types timed out / unavailable). */
const PRIMARY_TYPENAME = "ms:modis.ba.poly";
const FALLBACK_TYPENAME = "ms:modis.ba.poly";

const OUTPUT_FORMAT = "text/xml; subtype=gml/3.1.1";
const SRS_NAME = "EPSG:4326";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_NEAR_DISTANCE_METERS = 25_000;

const TIME_RANGE_PATTERN = /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/;

type RequestBody = {
  longitude: number;
  latitude: number;
  bbox: [number, number, number, number];
  time: string;
};

type LngLat = [number, number];

type ParsedFeature = {
  id: string;
  properties: Record<string, string>;
  polygons: LngLat[][];
  sourceLayer: string;
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

function parsePositiveNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function toIsoDateString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate =
    /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(trimmed) &&
    !/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)
      ? trimmed.replace(" ", "T") + "Z"
      : trimmed;

  const timestamp = Date.parse(candidate);
  if (Number.isNaN(timestamp)) {
    const fallback = Date.parse(trimmed);
    if (Number.isNaN(fallback)) return null;
    return new Date(fallback).toISOString();
  }

  return new Date(timestamp).toISOString();
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * EFFIS GML 3.1.1 for EPSG:4326 returns posList as lat lon pairs
 * (observed: "41.321391 -2.830211 ...").
 */
function parsePosListLatLon(posList: string): LngLat[] {
  const numbers = posList
    .trim()
    .split(/\s+/)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));

  const ring: LngLat[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    const lat = numbers[index];
    const lon = numbers[index + 1];
    ring.push([lon, lat]);
  }
  return ring;
}

function extractPolygonsFromGeometryXml(geometryXml: string): LngLat[][] {
  const polygons: LngLat[][] = [];
  const posLists = [
    ...geometryXml.matchAll(
      /<(?:[\w-]+:)?posList\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?posList>/gi,
    ),
  ];

  for (const match of posLists) {
    const ring = parsePosListLatLon(match[1]);
    if (ring.length >= 3) {
      polygons.push(ring);
    }
  }

  return polygons;
}

function parseGmlFeatures(xml: string, sourceLayer: string): ParsedFeature[] {
  if (/ServiceException|ows:Exception/i.test(xml.slice(0, 1200))) {
    return [];
  }

  const members = [
    ...xml.matchAll(
      /<(?:[\w-]+:)?featureMember\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?featureMember>/gi,
    ),
  ];

  const features: ParsedFeature[] = [];

  for (const member of members) {
    const block = member[1];
    const featureMatch = block.match(
      /<(?:[\w-]+:)?([\w.-]+)\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?\1>/,
    );
    if (!featureMatch) continue;

    const inner = featureMatch[3];
    const gmlIdMatch = featureMatch[2].match(/\bgml:id="([^"]+)"/);
    const properties: Record<string, string> = {};

    for (const propMatch of inner.matchAll(
      /<(?:[\w-]+:)?([A-Za-z_][\w.-]*)>([^<]*)<\/(?:[\w-]+:)?\1>/g,
    )) {
      const key = propMatch[1];
      if (
        ["boundedBy", "msGeometry", "Envelope", "lowerCorner", "upperCorner"].includes(
          key,
        )
      ) {
        continue;
      }
      const value = decodeXml(propMatch[2].trim());
      if (value) {
        properties[key] = value;
      }
    }

    const geometryMatch = inner.match(
      /<(?:[\w-]+:)?msGeometry\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?msGeometry>/i,
    );
    const polygons = geometryMatch
      ? extractPolygonsFromGeometryXml(geometryMatch[1])
      : [];

    const id =
      properties.id ||
      gmlIdMatch?.[1]?.replace(/^.*\./, "") ||
      null;

    if (!id) continue;

    features.push({
      id: String(id),
      properties,
      polygons,
      sourceLayer,
    });
  }

  return features;
}

function pointInRing(point: LngLat, ring: LngLat[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function pointInPolygons(point: LngLat, polygons: LngLat[][]): boolean {
  return polygons.some((ring) => pointInRing(point, ring));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/** Spherical ring area in m² for [lng, lat] rings. */
function ringAreaSquareMeters(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  const radius = 6371008.8;
  let total = 0;

  for (let i = 0; i < ring.length; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[(i + 1) % ring.length];
    total +=
      toRadians(lon2 - lon1) *
      (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }

  return Math.abs((total * radius * radius) / 2);
}

function featureAreaSquareMeters(feature: ParsedFeature): number {
  return feature.polygons.reduce(
    (sum, ring) => sum + ringAreaSquareMeters(ring),
    0,
  );
}

function haversineMeters(a: LngLat, b: LngLat): number {
  const radius = 6371008.8;
  const dLat = toRadians(b[1] - a[1]);
  const dLon = toRadians(b[0] - a[0]);
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(h)));
}

function featureCentroid(feature: ParsedFeature): LngLat | null {
  const points = feature.polygons.flat();
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, [lng, lat]) => {
      acc[0] += lng;
      acc[1] += lat;
      return acc;
    },
    [0, 0] as LngLat,
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

function selectFeature(
  features: ParsedFeature[],
  longitude: number,
  latitude: number,
): ParsedFeature | null {
  if (features.length === 0) return null;

  const point: LngLat = [longitude, latitude];
  const containing = features.filter((feature) =>
    pointInPolygons(point, feature.polygons),
  );

  if (containing.length === 1) return containing[0];

  if (containing.length > 1) {
    return containing
      .map((feature) => {
        const attributeArea = parsePositiveNumber(feature.properties.AREA_HA);
        const area =
          attributeArea !== null
            ? attributeArea
            : featureAreaSquareMeters(feature) / 10_000;
        return { feature, area };
      })
      .sort((a, b) => a.area - b.area)[0]?.feature ?? containing[0];
  }

  const nearest = features
    .map((feature) => {
      const centroid = featureCentroid(feature);
      const distance = centroid
        ? haversineMeters(point, centroid)
        : Number.POSITIVE_INFINITY;
      return { feature, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0];

  if (!nearest || !Number.isFinite(nearest.distance)) return null;
  if (nearest.distance > MAX_NEAR_DISTANCE_METERS) return null;
  return nearest.feature;
}

function normalizeArea(
  feature: ParsedFeature,
): Pick<EffisBurnedArea, "areaHectares" | "areaSource"> {
  // Official EFFIS attribute from DescribeFeatureType (no separate unit field).
  // Observed values are hectare magnitudes (e.g. AREA_HA=13).
  const areaHa = parsePositiveNumber(feature.properties.AREA_HA);
  if (areaHa !== null) {
    return {
      areaHectares: areaHa,
      areaSource: "effis-attribute",
    };
  }

  const squareMeters = featureAreaSquareMeters(feature);
  if (squareMeters > 0) {
    return {
      areaHectares: squareMeters / 10_000,
      areaSource: "calculated-from-geometry",
    };
  }

  return {
    areaHectares: null,
    areaSource: null,
  };
}

function normalizeBurnedArea(feature: ParsedFeature): EffisBurnedArea {
  const area = normalizeArea(feature);
  const province = feature.properties.PROVINCE?.trim() || null;
  const commune = feature.properties.COMMUNE?.trim() || null;
  const regionName =
    province && commune
      ? `${commune}, ${province}`
      : province || commune;

  return {
    id: feature.id,
    areaHectares: area.areaHectares,
    areaSource: area.areaSource,
    detectedAt: toIsoDateString(feature.properties.FIREDATE ?? null),
    updatedAt: toIsoDateString(feature.properties.LASTUPDATE ?? null),
    countryName: feature.properties.COUNTRY?.trim() || null,
    regionName,
    sourceLayer: feature.sourceLayer,
    sourceName: "EFFIS",
    sourceUrl: EFFIS_SOURCE_URL,
  };
}

async function fetchWfsFeatures(
  typeName: string,
  bbox: [number, number, number, number],
  signal: AbortSignal,
): Promise<ParsedFeature[]> {
  // Validated request shape: BBOX without CRS suffix + SRSNAME=EPSG:4326
  // (lon,lat,lon,lat order).
  const params = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "1.1.0",
    REQUEST: "GetFeature",
    TYPENAME: typeName,
    MAXFEATURES: "10",
    SRSNAME: SRS_NAME,
    BBOX: bbox.join(","),
    OUTPUTFORMAT: OUTPUT_FORMAT,
  });

  const response = await fetch(`${EFFIS_WFS_BASE}?${params.toString()}`, {
    headers: {
      Accept: OUTPUT_FORMAT,
      "User-Agent": "EUInteractiveMap/0.1",
    },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error(`EFFIS WFS failed with ${response.status}`);
  }

  const xml = await response.text();
  return parseGmlFeatures(xml, typeName);
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
    let features = await fetchWfsFeatures(
      PRIMARY_TYPENAME,
      body.bbox,
      controller.signal,
    );

    if (
      features.length === 0 &&
      FALLBACK_TYPENAME !== PRIMARY_TYPENAME
    ) {
      features = await fetchWfsFeatures(
        FALLBACK_TYPENAME,
        body.bbox,
        controller.signal,
      );
    }

    const selected = selectFeature(features, body.longitude, body.latitude);
    if (!selected) {
      return Response.json({ burnedArea: null });
    }

    return Response.json({
      burnedArea: normalizeBurnedArea(selected),
    });
  } catch (error: unknown) {
    const aborted =
      (error instanceof DOMException && error.name === "AbortError") ||
      (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError");

    return Response.json(
      {
        burnedArea: null,
        error: aborted
          ? "EFFIS information temporarily unavailable"
          : "EFFIS information temporarily unavailable",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
