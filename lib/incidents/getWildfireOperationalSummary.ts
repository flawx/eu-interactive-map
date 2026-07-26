import { validateEffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import {
  FIRMS_SOURCE,
  FIRMS_SOURCE_URL,
  type FirmsIncidentSnapshot,
} from "@/lib/incidents/firmsFootprints";
import { validateFirmsIncidentSnapshot } from "@/lib/incidents/firmsSnapshot";
import { normalizeFirmsHistorySnapshot } from "@/lib/incidents/firmsHistorySnapshot";
import { fetchEuWildfireIncidents } from "@/lib/incidents/gdacsWildfires";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import {
  listObservationsForIncident,
  recordEffisBurnedAreaObservation,
  recordFirmsActiveDetectionObservation,
  recordFirmsSevenDayHistoryObservation,
} from "@/lib/incidents/wildfireObservations";
import type {
  WildfireAreaMeasurement,
  WildfireCauseInfo,
  WildfireDeployedResources,
  WildfireOperationalSummary,
  WildfireOperationalUpdate,
  WildfireSafetyLocation,
  WildfireSituationInfo,
  WildfireSourceType,
  WildfireTimelineItem,
  WildfireUpdateCategory,
  WildfireVerificationStatus,
} from "@/lib/incidents/wildfireOperational";
import {
  isActiveOfficialEvacuation,
  isOfficiallyOpenSafetyLocation,
} from "@/lib/incidents/wildfireOperational";

type OperationalUpdateRow = {
  id: string;
  incident_id: string;
  external_id: string | null;
  category: string;
  title: string | null;
  body: string | null;
  status: string | null;
  source_type: string;
  source_name: string;
  source_url: string | null;
  verification_status: string;
  published_at: string | null;
  effective_from: string | null;
  expires_at: string | null;
  last_verified_at: string | null;
  location_name: string | null;
  geometry_geojson: unknown;
  structured_data: unknown;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
};

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  return /(does not exist|Could not find the table|schema cache)/i.test(
    message,
  );
}

function asGeometry(value: unknown): GeoJSON.Geometry | null {
  if (!value || typeof value !== "object") return null;
  const geometry = value as { type?: unknown };
  if (typeof geometry.type !== "string") return null;
  return value as GeoJSON.Geometry;
}

function rowToOperationalUpdate(
  row: OperationalUpdateRow,
): WildfireOperationalUpdate | null {
  if (
    typeof row.incident_id !== "string" ||
    !row.incident_id.trim() ||
    typeof row.source_name !== "string" ||
    !row.source_name.trim()
  ) {
    return null;
  }

  return {
    id: row.id,
    incidentId: row.incident_id,
    externalId: row.external_id,
    category: row.category as WildfireUpdateCategory,
    title: row.title,
    body: row.body,
    status: row.status,
    sourceType: row.source_type as WildfireSourceType,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    verificationStatus: row.verification_status as WildfireVerificationStatus,
    publishedAt: row.published_at,
    effectiveFrom: row.effective_from,
    expiresAt: row.expires_at,
    lastVerifiedAt: row.last_verified_at,
    locationName: row.location_name,
    geometry: asGeometry(row.geometry_geojson),
    structuredData:
      row.structured_data && typeof row.structured_data === "object"
        ? (row.structured_data as Record<string, unknown>)
        : {},
    contentHash: row.content_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listOperationalUpdates(
  incidentId: string,
): Promise<WildfireOperationalUpdate[]> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("wildfire_operational_updates")
      .select(
        "id, incident_id, external_id, category, title, body, status, source_type, source_name, source_url, verification_status, published_at, effective_from, expires_at, last_verified_at, location_name, geometry_geojson, structured_data, content_hash, created_at, updated_at",
      )
      .eq("incident_id", incidentId)
      .order("published_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error.message)) return [];
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row) => rowToOperationalUpdate(row as OperationalUpdateRow))
      .filter((item): item is WildfireOperationalUpdate => item !== null);
  } catch {
    return [];
  }
}

async function loadFirmsSnapshot(
  incidentId: string,
): Promise<FirmsIncidentSnapshot | null> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("firms_incident_snapshots")
      .select(
        "incident_id, incident_name, geometry_geojson, bbox, detection_count, sensors, approximate_area_hectares, source_updated_at, fetched_at, source, source_url, metadata",
      )
      .eq("incident_id", incidentId)
      .maybeSingle();

    if (error || !data) return null;

    return validateFirmsIncidentSnapshot({
      incidentId: data.incident_id,
      incidentName: data.incident_name,
      geometry: data.geometry_geojson,
      bbox: data.bbox,
      detectionCount: data.detection_count,
      sensors: data.sensors ?? [],
      sourceUpdatedAt: data.source_updated_at,
      fetchedAt: data.fetched_at,
      approximateAreaHectares: data.approximate_area_hectares,
      isApproximate: true,
      source: data.source,
      sourceUrl: data.source_url ?? FIRMS_SOURCE_URL,
      metadata:
        data.metadata && typeof data.metadata === "object"
          ? data.metadata
          : {},
    });
  } catch {
    return null;
  }
}

async function loadFirmsHistorySnapshot(
  incidentId: string,
): Promise<FirmsIncidentSnapshot | null> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("firms_recent_detection_snapshots")
      .select(
        "incident_id, incident_name, geometry_geojson, bbox, detection_count, sensors, approximate_area_hectares, period_start, period_end, source_updated_at, fetched_at, source, source_url, metadata",
      )
      .eq("incident_id", incidentId)
      .maybeSingle();

    if (error || !data) return null;
    return normalizeFirmsHistorySnapshot(data);
  } catch {
    return null;
  }
}

async function loadEffisSnapshot(
  incidentId: string,
): Promise<EffisBurnedAreaSnapshot | null> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("effis_burned_area_snapshots")
      .select(
        "incident_id, country_code, source_layer, geometry_geojson, area_hectares, fire_date, final_date, source_updated_at, fetched_at, source_url, metadata",
      )
      .eq("incident_id", incidentId)
      .maybeSingle();

    if (error || !data) return null;

    return validateEffisBurnedAreaSnapshot({
      incidentId: data.incident_id,
      countryCode: data.country_code,
      sourceLayer: data.source_layer,
      geometry: data.geometry_geojson,
      areaHectares: data.area_hectares,
      fireDate: data.fire_date,
      finalDate: data.final_date,
      sourceUpdatedAt: data.source_updated_at,
      fetchedAt: data.fetched_at,
      sourceUrl: data.source_url,
      metadata:
        data.metadata && typeof data.metadata === "object"
          ? data.metadata
          : {},
    });
  } catch {
    return null;
  }
}

function buildCause(
  updates: WildfireOperationalUpdate[],
): WildfireCauseInfo {
  const causeUpdates = updates.filter((item) => item.category === "cause");
  const latest = causeUpdates[0] ?? null;
  if (!latest) {
    return {
      status: "unknown",
      description: null,
      sourceName: null,
      sourceUrl: null,
      verificationStatus: null,
      publishedAt: null,
      lastVerifiedAt: null,
    };
  }

  const status =
    latest.verificationStatus === "disputed"
      ? "disputed"
      : latest.body || latest.title
        ? "known"
        : "unknown";

  return {
    status,
    description: latest.body ?? latest.title,
    sourceName: latest.sourceName,
    sourceUrl: latest.sourceUrl,
    verificationStatus: latest.verificationStatus,
    publishedAt: latest.publishedAt,
    lastVerifiedAt: latest.lastVerifiedAt,
  };
}

function buildSituation(
  updates: WildfireOperationalUpdate[],
): WildfireSituationInfo | null {
  const situation = updates.find((item) => item.category === "situation");
  if (!situation) return null;
  return {
    title: situation.title,
    body: situation.body,
    sourceName: situation.sourceName,
    sourceUrl: situation.sourceUrl,
    verificationStatus: situation.verificationStatus,
    publishedAt: situation.publishedAt,
    lastVerifiedAt: situation.lastVerifiedAt,
  };
}

function buildResources(
  updates: WildfireOperationalUpdate[],
): WildfireDeployedResources | null {
  const resources = updates.find((item) => item.category === "resources");
  if (!resources) return null;
  return {
    summary: resources.body ?? resources.title,
    sourceName: resources.sourceName,
    sourceUrl: resources.sourceUrl,
    verificationStatus: resources.verificationStatus,
    publishedAt: resources.publishedAt,
    lastVerifiedAt: resources.lastVerifiedAt,
    structuredData: resources.structuredData,
  };
}

function toSafetyLocation(
  update: WildfireOperationalUpdate,
): WildfireSafetyLocation | null {
  if (
    update.category !== "gathering_point" &&
    update.category !== "shelter" &&
    update.category !== "reception_center"
  ) {
    return null;
  }

  return {
    id: update.id,
    category: update.category,
    title: update.title,
    body: update.body,
    status: update.status,
    locationName: update.locationName,
    sourceType: update.sourceType,
    sourceName: update.sourceName,
    sourceUrl: update.sourceUrl,
    verificationStatus: update.verificationStatus,
    publishedAt: update.publishedAt,
    expiresAt: update.expiresAt,
    lastVerifiedAt: update.lastVerifiedAt,
    geometry: update.geometry,
    isOfficiallyOpen: isOfficiallyOpenSafetyLocation(update),
  };
}

function buildAreaMeasurements(input: {
  firms24h: FirmsIncidentSnapshot | null;
  firms7d: FirmsIncidentSnapshot | null;
  effis: EffisBurnedAreaSnapshot | null;
  gdacsAreaHectares: number | null;
  gdacsUpdatedAt: string | null;
  gdacsSourceUrl: string | null;
}): WildfireAreaMeasurement[] {
  const measurements: WildfireAreaMeasurement[] = [];

  if (input.firms24h) {
    measurements.push({
      kind: "firms_24h",
      labelKey: "areaFirms24h",
      valueHectares: input.firms24h.approximateAreaHectares,
      source: FIRMS_SOURCE,
      observedAt: input.firms24h.sourceUpdatedAt ?? input.firms24h.fetchedAt,
      isApproximate: true,
      sourceUrl: input.firms24h.sourceUrl,
      badge: "satellite_estimate",
    });
  }

  if (input.firms7d) {
    measurements.push({
      kind: "firms_7d",
      labelKey: "areaFirms7d",
      valueHectares: input.firms7d.approximateAreaHectares,
      source: FIRMS_SOURCE,
      observedAt: input.firms7d.sourceUpdatedAt ?? input.firms7d.fetchedAt,
      isApproximate: true,
      sourceUrl: input.firms7d.sourceUrl,
      badge: "satellite_estimate",
    });
  }

  if (input.effis) {
    measurements.push({
      kind: "effis",
      labelKey: "areaEffis",
      valueHectares: input.effis.areaHectares,
      source: "EFFIS",
      observedAt: input.effis.sourceUpdatedAt ?? input.effis.fetchedAt,
      isApproximate: true,
      sourceUrl: input.effis.sourceUrl,
      badge: "satellite_estimate",
    });
  }

  if (
    input.gdacsAreaHectares !== null &&
    Number.isFinite(input.gdacsAreaHectares)
  ) {
    measurements.push({
      kind: "gdacs",
      labelKey: "areaGdacs",
      valueHectares: input.gdacsAreaHectares,
      source: "GDACS",
      observedAt: input.gdacsUpdatedAt,
      isApproximate: true,
      sourceUrl: input.gdacsSourceUrl,
      badge: "gdacs_declared",
    });
  }

  return measurements;
}

function buildTimeline(input: {
  updates: WildfireOperationalUpdate[];
  observations: Awaited<ReturnType<typeof listObservationsForIncident>>;
}): WildfireTimelineItem[] {
  const items: WildfireTimelineItem[] = [];

  for (const observation of input.observations) {
    const title =
      observation.observationType === "firms_active_detection"
        ? "FIRMS 24h detection update"
        : observation.observationType === "firms_seven_day_history"
          ? "FIRMS 7-day history update"
          : observation.observationType === "effis_burned_area"
            ? "EFFIS burned-area update"
            : observation.observationType === "gdacs_reported_area"
              ? "GDACS reported area update"
              : "GDACS alert level update";

    const areaPart =
      observation.areaHectares !== null
        ? `${observation.areaHectares} ha`
        : null;

    items.push({
      id: `obs-${observation.id}`,
      kind: "observation",
      title,
      body: areaPart,
      occurredAt: observation.observedAt,
      sourceName: observation.source,
      sourceType:
        observation.source === "GDACS"
          ? "gdacs"
          : observation.source === "EFFIS" ||
              observation.source === "NASA FIRMS"
            ? "satellite"
            : "satellite",
      verificationStatus: "verified",
      sourceUrl:
        typeof observation.metadata.sourceUrl === "string"
          ? observation.metadata.sourceUrl
          : null,
      observationType: observation.observationType,
    });
  }

  for (const update of input.updates) {
    const kind =
      update.category === "authority_message"
        ? "authority_message"
        : update.category === "evacuation_order"
          ? "evacuation_order"
          : update.category === "safety_instruction"
            ? "safety_instruction"
            : update.category === "resources"
              ? "resources"
              : update.category === "situation"
                ? "situation"
                : update.category === "media"
                  ? "media"
                  : update.category === "community"
                    ? "community"
                    : "other";

    const occurredAt =
      update.publishedAt ??
      update.effectiveFrom ??
      update.lastVerifiedAt ??
      update.updatedAt;

    items.push({
      id: `upd-${update.id}`,
      kind,
      title: update.title ?? update.category,
      body: update.body,
      occurredAt,
      sourceName: update.sourceName,
      sourceType: update.sourceType,
      verificationStatus: update.verificationStatus,
      sourceUrl: update.sourceUrl,
      category: update.category,
    });
  }

  return items.sort(
    (a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt),
  );
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let latest: number | null = null;
  let latestIso: string | null = null;
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    if (latest === null || time > latest) {
      latest = time;
      latestIso = value;
    }
  }
  return latestIso;
}

export async function getWildfireOperationalSummary(
  incidentId: string,
): Promise<WildfireOperationalSummary | null> {
  const trimmedId = incidentId.trim();
  if (!trimmedId) return null;

  const incidents = await fetchEuWildfireIncidents();
  const incident = incidents.find((item) => item.id === trimmedId) ?? null;

  const [firms24h, firms7d, effis, updates, initialObservations] =
    await Promise.all([
      loadFirmsSnapshot(trimmedId),
      loadFirmsHistorySnapshot(trimmedId),
      loadEffisSnapshot(trimmedId),
      listOperationalUpdates(trimmedId),
      listObservationsForIncident(trimmedId),
    ]);

  // Persist satellite observations from already-validated snapshots when new.
  // Never invent values; only record what the snapshots already contain.
  if (firms24h) {
    await recordFirmsActiveDetectionObservation(firms24h);
  }
  if (firms7d) {
    await recordFirmsSevenDayHistoryObservation(firms7d);
  }
  if (effis) {
    await recordEffisBurnedAreaObservation(effis);
  }

  const observations =
    firms24h || firms7d || effis
      ? await listObservationsForIncident(trimmedId)
      : initialObservations;

  // Unknown only when no GDACS incident and no stored satellite/ops data.
  if (
    !incident &&
    !firms24h &&
    !firms7d &&
    !effis &&
    updates.length === 0 &&
    observations.length === 0
  ) {
    return null;
  }

  const authorityMessages = updates.filter(
    (item) => item.category === "authority_message",
  );
  const evacuationOrders = updates
    .filter((item) => item.category === "evacuation_order")
    .sort((a, b) => {
      const aActive = isActiveOfficialEvacuation(a) ? 1 : 0;
      const bActive = isActiveOfficialEvacuation(b) ? 1 : 0;
      return bActive - aActive;
    });
  const safetyInstructions = updates.filter(
    (item) => item.category === "safety_instruction",
  );
  const roadClosures = updates.filter(
    (item) => item.category === "road_closure",
  );
  const mediaUpdates = updates.filter((item) => item.category === "media");
  const communityUpdates = updates.filter(
    (item) => item.category === "community",
  );

  const gatheringPoints = updates
    .map(toSafetyLocation)
    .filter(
      (item): item is WildfireSafetyLocation =>
        item !== null && item.category === "gathering_point",
    );
  const shelters = updates
    .map(toSafetyLocation)
    .filter(
      (item): item is WildfireSafetyLocation =>
        item !== null && item.category === "shelter",
    );
  const receptionCenters = updates
    .map(toSafetyLocation)
    .filter(
      (item): item is WildfireSafetyLocation =>
        item !== null && item.category === "reception_center",
    );

  const areaMeasurements = buildAreaMeasurements({
    firms24h,
    firms7d,
    effis,
    gdacsAreaHectares: incident?.areaHectares ?? null,
    gdacsUpdatedAt: incident?.updatedAt ?? null,
    gdacsSourceUrl: incident?.sourceUrl ?? null,
  });

  const timeline = buildTimeline({ updates, observations });

  return {
    incidentId: trimmedId,
    incident,
    cause: buildCause(updates),
    currentSituation: buildSituation(updates),
    areaMeasurements,
    deployedResources: buildResources(updates),
    timeline,
    authorityMessages,
    evacuationOrders,
    safetyInstructions,
    gatheringPoints,
    shelters,
    receptionCenters,
    roadClosures,
    mediaUpdates,
    communityUpdates,
    lastUpdatedAt: latestTimestamp([
      incident?.updatedAt,
      firms24h?.fetchedAt,
      firms7d?.fetchedAt,
      effis?.fetchedAt,
      ...updates.map((item) => item.updatedAt),
      ...observations.map((item) => item.observedAt),
    ]),
  };
}
