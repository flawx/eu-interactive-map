import AdmZip from "adm-zip";
import { fetchEuWildfireIncidents } from "@/lib/incidents/gdacsWildfires";
import type { WildfireIncident } from "@/lib/incidents/types";

export const FIRMS_SOURCE = "NASA FIRMS";
export const FIRMS_SOURCE_URL = "https://firms.modaps.eosdis.nasa.gov/";

export type FirmsPeriod = "24h" | "7d";

/**
 * Exact KMZ links from NASA FIRMS kml_fire_footprints API
 * (region=europe, sensors Suomi-NPP / NOAA-20 / NOAA-21).
 * Verified against https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/
 */
const KMZ_SOURCES_BY_PERIOD: Record<
  FirmsPeriod,
  readonly { sensor: string; url: string }[]
> = {
  "24h": [
    {
      sensor: "Suomi-NPP VIIRS",
      url: "https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/europe/24h/suomi-npp-viirs-c2/FirespotArea_europe_suomi-npp-viirs-c2_24h.kmz",
    },
    {
      sensor: "NOAA-20 VIIRS",
      url: "https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/europe/24h/noaa-20-viirs-c2/FirespotArea_europe_noaa-20-viirs-c2_24h.kmz",
    },
    {
      sensor: "NOAA-21 VIIRS",
      url: "https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/europe/24h/noaa-21-viirs-c2/FirespotArea_europe_noaa-21-viirs-c2_24h.kmz",
    },
  ],
  "7d": [
    {
      sensor: "Suomi-NPP VIIRS",
      url: "https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/europe/7d/suomi-npp-viirs-c2/FirespotArea_europe_suomi-npp-viirs-c2_7d.kmz",
    },
    {
      sensor: "NOAA-20 VIIRS",
      url: "https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/europe/7d/noaa-20-viirs-c2/FirespotArea_europe_noaa-20-viirs-c2_7d.kmz",
    },
    {
      sensor: "NOAA-21 VIIRS",
      url: "https://firms.modaps.eosdis.nasa.gov/api/kml_fire_footprints/europe/7d/noaa-21-viirs-c2/FirespotArea_europe_noaa-21-viirs-c2_7d.kmz",
    },
  ],
};

const FETCH_TIMEOUT_MS = 45_000;
const MAX_ASSOCIATION_METERS = 60_000;
/** ~375 m grid cells for de-duplicating repeated satellite passes. */
const CLUSTER_CELL_DEGREES = 0.0035;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

export type FirmsFootprint = {
  sensor: string;
  acquiredAt: string | null;
  longitude: number;
  latitude: number;
  confidence: string | null;
  ring: [number, number][];
  areaHectares: number;
};

export type FirmsIncidentSnapshot = {
  incidentId: string;
  incidentName: string;
  geometry: GeoJSON.MultiPolygon;
  bbox: [number, number, number, number];
  detectionCount: number;
  sensors: string[];
  sourceUpdatedAt: string | null;
  fetchedAt: string;
  approximateAreaHectares: number | null;
  isApproximate: true;
  source: typeof FIRMS_SOURCE;
  sourceUrl: typeof FIRMS_SOURCE_URL;
  metadata: Record<string, unknown>;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export type FirmsBuildStats = {
  footprintsParsed: number;
  footprintsAfterAgeFilter: number;
  footprintsAssociated: number;
  incidentsAssociated: number;
  sourcesSucceeded: string[];
  sourcesFailed: string[];
  period: FirmsPeriod;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineMeters(
  a: [number, number],
  b: [number, number],
): number {
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

function ringAreaHectares(ring: [number, number][]): number {
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
  return Math.abs((total * radius * radius) / 2) / 10_000;
}

function closeRing(ring: [number, number][]): [number, number][] {
  if (ring.length < 3) return ring;
  const [lng0, lat0] = ring[0];
  const [lngN, latN] = ring[ring.length - 1];
  if (lng0 === lngN && lat0 === latN) return ring;
  return [...ring, [lng0, lat0]];
}

function parseCoordinatesRing(raw: string): [number, number][] | null {
  const pairs = raw
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const [lonRaw, latRaw] = token.split(",");
      const longitude = Number(lonRaw);
      const latitude = Number(latRaw);
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
      return [longitude, latitude] as [number, number];
    });

  if (pairs.some((pair) => pair === null)) return null;
  const ring = closeRing(pairs as [number, number][]);
  return ring.length >= 4 ? ring : null;
}

function extractCdataField(description: string, label: string): string | null {
  const pattern = new RegExp(
    `<b>${label}:\\s*</b>\\s*([^<]+)`,
    "i",
  );
  const match = description.match(pattern);
  if (!match) return null;
  const value = match[1].trim();
  return value.length > 0 ? value : null;
}

function parseDetectionTime(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+UTC$/i, "").trim();
  const isoCandidate = cleaned.includes("T")
    ? cleaned
    : cleaned.replace(" ", "T") + "Z";
  const timestamp = Date.parse(isoCandidate);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function extractKmlFromKmz(buffer: Buffer): string | null {
  const zip = new AdmZip(buffer);
  const entry =
    zip
      .getEntries()
      .find(
        (item) =>
          !item.isDirectory && /\.kml$/i.test(item.entryName),
      ) ?? null;

  if (!entry) return null;
  const text = entry.getData().toString("utf8");
  return text.includes("<kml") ? text : null;
}

function parseFootprintsFromKml(
  kml: string,
  fallbackSensor: string,
): FirmsFootprint[] {
  const footprints: FirmsFootprint[] = [];
  const placemarks = [
    ...kml.matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi),
  ];

  for (const match of placemarks) {
    const block = match[1];
    const nameMatch = block.match(/<name>\s*([^<]+?)\s*<\/name>/i);
    const name = nameMatch?.[1]?.trim() ?? "";
    if (!/footprint/i.test(name)) continue;

    const descriptionMatch = block.match(
      /<description>\s*(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i,
    );
    const description =
      descriptionMatch?.[1] ?? descriptionMatch?.[2] ?? "";

    const polygonBlocks = [
      ...block.matchAll(/<Polygon\b[^>]*>([\s\S]*?)<\/Polygon>/gi),
    ];
    if (polygonBlocks.length === 0) continue;

    for (const polygonMatch of polygonBlocks) {
      const coordsMatch = polygonMatch[1].match(
        /<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/i,
      );
      if (!coordsMatch) continue;
      const ring = parseCoordinatesRing(coordsMatch[1]);
      if (!ring) continue;

      const latRaw = extractCdataField(description, "Latitude");
      const lonRaw = extractCdataField(description, "Longitude");
      const latitude =
        latRaw !== null && Number.isFinite(Number(latRaw))
          ? Number(latRaw)
          : ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length;
      const longitude =
        lonRaw !== null && Number.isFinite(Number(lonRaw))
          ? Number(lonRaw)
          : ring.reduce((sum, [lng]) => sum + lng, 0) / ring.length;

      const sensor =
        extractCdataField(description, "Sensor") ?? fallbackSensor;
      const confidence = extractCdataField(description, "Confidence");
      const acquiredAt = parseDetectionTime(
        extractCdataField(description, "Detection Time"),
      );
      const areaHectares = ringAreaHectares(ring);
      if (!(areaHectares > 0)) continue;

      footprints.push({
        sensor,
        acquiredAt,
        longitude,
        latitude,
        confidence,
        ring,
        areaHectares,
      });
    }
  }

  return footprints;
}

async function downloadKmzFootprints(
  url: string,
  fallbackSensor: string,
): Promise<FirmsFootprint[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.google-earth.kmz,application/zip,*/*",
        "User-Agent": "EUInteractiveMap/0.1",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new Error("Invalid KMZ archive");
    }

    const kml = extractKmlFromKmz(buffer);
    if (!kml) {
      throw new Error("KML missing from KMZ");
    }

    return parseFootprintsFromKml(kml, fallbackSensor);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Keep the newest observation per cell and merge sensor names across passes.
 */
function clusterFootprints(footprints: FirmsFootprint[]): FirmsFootprint[] {
  const cells = new Map<
    string,
    { footprint: FirmsFootprint; sensors: Set<string> }
  >();

  for (const footprint of footprints) {
    const cellX = Math.round(footprint.longitude / CLUSTER_CELL_DEGREES);
    const cellY = Math.round(footprint.latitude / CLUSTER_CELL_DEGREES);
    const key = `${cellX}:${cellY}`;
    const existing = cells.get(key);

    const sensorParts = footprint.sensor
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (!existing) {
      cells.set(key, {
        footprint,
        sensors: new Set(sensorParts),
      });
      continue;
    }

    for (const sensor of sensorParts) {
      existing.sensors.add(sensor);
    }

    const existingTime = existing.footprint.acquiredAt
      ? Date.parse(existing.footprint.acquiredAt)
      : 0;
    const nextTime = footprint.acquiredAt
      ? Date.parse(footprint.acquiredAt)
      : 0;

    if (nextTime >= existingTime) {
      existing.footprint = footprint;
    }
  }

  return Array.from(cells.values()).map(({ footprint, sensors }) => ({
    ...footprint,
    sensor: Array.from(sensors).sort().join(", "),
  }));
}

/**
 * Age windows:
 * - 24h active layer: detections from the last 24 hours (inclusive)
 * - 7d history layer: older than 24h and at most 7 days (no overlap with red)
 */
function filterFootprintsByPeriod(
  footprints: FirmsFootprint[],
  period: FirmsPeriod,
  nowMs: number = Date.now(),
): FirmsFootprint[] {
  return footprints.filter((footprint) => {
    if (!footprint.acquiredAt) {
      // Without a timestamp we cannot safely place a detection in either window.
      return period === "24h";
    }

    const acquiredMs = Date.parse(footprint.acquiredAt);
    if (Number.isNaN(acquiredMs)) {
      return period === "24h";
    }

    const ageMs = nowMs - acquiredMs;
    if (ageMs < 0) return false;

    if (period === "24h") {
      return ageMs <= ONE_DAY_MS;
    }

    return ageMs > ONE_DAY_MS && ageMs <= SEVEN_DAYS_MS;
  });
}

function bboxFromRings(
  rings: [number, number][][],
): [number, number, number, number] {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
  }

  return [minLon, minLat, maxLon, maxLat];
}

function associateFootprintsToIncidents(
  footprints: FirmsFootprint[],
  incidents: WildfireIncident[],
  fetchedAt: string,
  period: FirmsPeriod,
): FirmsIncidentSnapshot[] {
  if (incidents.length === 0 || footprints.length === 0) return [];

  type Assignment = {
    incident: WildfireIncident;
    footprints: FirmsFootprint[];
  };

  const byIncident = new Map<string, Assignment>();

  for (const footprint of footprints) {
    let best: { incident: WildfireIncident; distance: number } | null = null;

    for (const incident of incidents) {
      const distance = haversineMeters(
        [footprint.longitude, footprint.latitude],
        [incident.longitude, incident.latitude],
      );
      if (distance > MAX_ASSOCIATION_METERS) continue;
      if (!best || distance < best.distance) {
        best = { incident, distance };
      }
    }

    if (!best) continue;

    const existing = byIncident.get(best.incident.id);
    if (existing) {
      existing.footprints.push(footprint);
    } else {
      byIncident.set(best.incident.id, {
        incident: best.incident,
        footprints: [footprint],
      });
    }
  }

  const snapshots: FirmsIncidentSnapshot[] = [];
  const now = Date.parse(fetchedAt);
  const periodStart =
    period === "7d"
      ? new Date(now - SEVEN_DAYS_MS).toISOString()
      : new Date(now - ONE_DAY_MS).toISOString();
  const periodEnd =
    period === "7d"
      ? new Date(now - ONE_DAY_MS).toISOString()
      : fetchedAt;

  for (const { incident, footprints: assigned } of byIncident.values()) {
    const rings = assigned.map((item) => item.ring);
    const geometry: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: rings.map((ring) => [ring]),
    };

    const sensors = Array.from(
      new Set(
        assigned.flatMap((item) =>
          item.sensor.split(",").map((part) => part.trim()).filter(Boolean),
        ),
      ),
    ).sort();

    const acquiredTimes = assigned
      .map((item) => item.acquiredAt)
      .filter((value): value is string => Boolean(value))
      .sort();

    const approximateAreaHectares = assigned.reduce(
      (sum, item) => sum + item.areaHectares,
      0,
    );

    snapshots.push({
      incidentId: incident.id,
      incidentName: incident.title,
      geometry,
      bbox: bboxFromRings(rings),
      detectionCount: assigned.length,
      sensors,
      sourceUpdatedAt: acquiredTimes.at(-1) ?? null,
      fetchedAt,
      approximateAreaHectares:
        approximateAreaHectares > 0 ? approximateAreaHectares : null,
      isApproximate: true,
      source: FIRMS_SOURCE,
      sourceUrl: FIRMS_SOURCE_URL,
      periodStart: acquiredTimes[0] ?? periodStart,
      periodEnd: acquiredTimes.at(-1) ?? periodEnd,
      metadata: {
        associationMaxKm: MAX_ASSOCIATION_METERS / 1000,
        clustered: true,
        period,
        windowStart: periodStart,
        windowEnd: periodEnd,
      },
    });
  }

  return snapshots.sort((a, b) => a.incidentId.localeCompare(b.incidentId));
}

export function getFirmsKmzSources(period: FirmsPeriod) {
  return KMZ_SOURCES_BY_PERIOD[period];
}

export async function downloadAndParseFirmsFootprints(
  period: FirmsPeriod = "24h",
): Promise<{
  footprints: FirmsFootprint[];
  stats: Pick<
    FirmsBuildStats,
    "sourcesSucceeded" | "sourcesFailed" | "footprintsParsed" | "period"
  >;
}> {
  const all: FirmsFootprint[] = [];
  const sourcesSucceeded: string[] = [];
  const sourcesFailed: string[] = [];

  for (const source of KMZ_SOURCES_BY_PERIOD[period]) {
    try {
      const parsed = await downloadKmzFootprints(source.url, source.sensor);
      all.push(...parsed);
      sourcesSucceeded.push(source.sensor);
    } catch {
      // Continue when a single sensor expires or fails.
      sourcesFailed.push(source.sensor);
    }
  }

  return {
    footprints: all,
    stats: {
      footprintsParsed: all.length,
      sourcesSucceeded,
      sourcesFailed,
      period,
    },
  };
}

export async function buildFirmsIncidentSnapshots(
  incidents?: WildfireIncident[],
  period: FirmsPeriod = "24h",
): Promise<{ snapshots: FirmsIncidentSnapshot[]; stats: FirmsBuildStats }> {
  const fetchedAt = new Date().toISOString();
  const gdacsIncidents = incidents ?? (await fetchEuWildfireIncidents());
  const { footprints, stats } = await downloadAndParseFirmsFootprints(period);

  if (footprints.length === 0) {
    return {
      snapshots: [],
      stats: {
        footprintsParsed: 0,
        footprintsAfterAgeFilter: 0,
        footprintsAssociated: 0,
        incidentsAssociated: 0,
        sourcesSucceeded: stats.sourcesSucceeded,
        sourcesFailed: stats.sourcesFailed,
        period,
      },
    };
  }

  const ageFiltered = filterFootprintsByPeriod(footprints, period);
  const clustered = clusterFootprints(ageFiltered);
  const snapshots = associateFootprintsToIncidents(
    clustered,
    gdacsIncidents,
    fetchedAt,
    period,
  );

  return {
    snapshots,
    stats: {
      footprintsParsed: footprints.length,
      footprintsAfterAgeFilter: ageFiltered.length,
      footprintsAssociated: snapshots.reduce(
        (sum, item) => sum + item.detectionCount,
        0,
      ),
      incidentsAssociated: snapshots.length,
      sourcesSucceeded: stats.sourcesSucceeded,
      sourcesFailed: stats.sourcesFailed,
      period,
    },
  };
}
