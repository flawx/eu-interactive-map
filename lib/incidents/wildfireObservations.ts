import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type {
  WildfireIncidentObservation,
  WildfireObservationType,
} from "@/lib/incidents/wildfireOperational";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

export type WildfireObservationRow = {
  id: string;
  incident_id: string;
  source: string;
  observation_type: string;
  observed_at: string;
  area_hectares: number | null;
  area_is_approximate: boolean;
  detection_count: number | null;
  alert_level: string | null;
  metadata: unknown;
  created_at: string;
};

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /wildfire_incident_observations/i.test(message) &&
    /(does not exist|Could not find the table|schema cache)/i.test(message)
  );
}

export function rowToWildfireIncidentObservation(
  row: WildfireObservationRow,
): WildfireIncidentObservation | null {
  if (
    typeof row.incident_id !== "string" ||
    !row.incident_id.trim() ||
    typeof row.source !== "string" ||
    !row.source.trim() ||
    typeof row.observation_type !== "string" ||
    typeof row.observed_at !== "string" ||
    !row.observed_at
  ) {
    return null;
  }

  return {
    id: row.id,
    incidentId: row.incident_id,
    source: row.source,
    observationType: row.observation_type as WildfireObservationType,
    observedAt: row.observed_at,
    areaHectares:
      typeof row.area_hectares === "number" && Number.isFinite(row.area_hectares)
        ? row.area_hectares
        : null,
    areaIsApproximate: row.area_is_approximate === true,
    detectionCount:
      typeof row.detection_count === "number" &&
      Number.isFinite(row.detection_count)
        ? row.detection_count
        : null,
    alertLevel:
      typeof row.alert_level === "string" && row.alert_level.trim()
        ? row.alert_level
        : null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  };
}

export async function listObservationsForIncident(
  incidentId: string,
): Promise<WildfireIncidentObservation[]> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("wildfire_incident_observations")
      .select(
        "id, incident_id, source, observation_type, observed_at, area_hectares, area_is_approximate, detection_count, alert_level, metadata, created_at",
      )
      .eq("incident_id", incidentId)
      .order("observed_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error.message)) return [];
      throw new Error(error.message);
    }

    return (data ?? [])
      .map((row) =>
        rowToWildfireIncidentObservation(row as WildfireObservationRow),
      )
      .filter((item): item is WildfireIncidentObservation => item !== null);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Supabase server configuration is incomplete")
    ) {
      throw error;
    }
    return [];
  }
}

type ObservationInsert = {
  incident_id: string;
  source: string;
  observation_type: WildfireObservationType;
  observed_at: string;
  area_hectares: number | null;
  area_is_approximate: boolean;
  detection_count: number | null;
  alert_level: string | null;
  metadata: Record<string, unknown>;
};

async function insertObservationIfNew(
  observation: ObservationInsert,
): Promise<boolean> {
  try {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase
      .from("wildfire_incident_observations")
      .upsert(observation, {
        onConflict: "incident_id,source,observation_type,observed_at",
        ignoreDuplicates: true,
      });

    if (error) {
      if (isMissingRelationError(error.message)) return false;
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function recordFirmsActiveDetectionObservation(
  snapshot: FirmsIncidentSnapshot,
): Promise<void> {
  const observedAt = snapshot.sourceUpdatedAt ?? snapshot.fetchedAt;
  if (!observedAt) return;
  if (
    snapshot.approximateAreaHectares === null &&
    !(snapshot.detectionCount > 0)
  ) {
    return;
  }

  await insertObservationIfNew({
    incident_id: snapshot.incidentId,
    source: "NASA FIRMS",
    observation_type: "firms_active_detection",
    observed_at: observedAt,
    area_hectares: snapshot.approximateAreaHectares,
    area_is_approximate: true,
    detection_count: snapshot.detectionCount,
    alert_level: null,
    metadata: {
      sensors: snapshot.sensors,
      sourceUrl: snapshot.sourceUrl,
      period: "24h",
    },
  });
}

export async function recordFirmsSevenDayHistoryObservation(
  snapshot: FirmsIncidentSnapshot,
): Promise<void> {
  const observedAt = snapshot.sourceUpdatedAt ?? snapshot.fetchedAt;
  if (!observedAt) return;
  if (
    snapshot.approximateAreaHectares === null &&
    !(snapshot.detectionCount > 0)
  ) {
    return;
  }

  await insertObservationIfNew({
    incident_id: snapshot.incidentId,
    source: "NASA FIRMS",
    observation_type: "firms_seven_day_history",
    observed_at: observedAt,
    area_hectares: snapshot.approximateAreaHectares,
    area_is_approximate: true,
    detection_count: snapshot.detectionCount,
    alert_level: null,
    metadata: {
      sensors: snapshot.sensors,
      sourceUrl: snapshot.sourceUrl,
      periodStart: snapshot.periodStart ?? null,
      periodEnd: snapshot.periodEnd ?? null,
      period: "7d",
    },
  });
}

export async function recordEffisBurnedAreaObservation(
  snapshot: EffisBurnedAreaSnapshot,
): Promise<void> {
  const observedAt = snapshot.sourceUpdatedAt ?? snapshot.fetchedAt;
  if (!observedAt) return;
  if (
    snapshot.areaHectares === null ||
    !Number.isFinite(snapshot.areaHectares)
  ) {
    return;
  }

  await insertObservationIfNew({
    incident_id: snapshot.incidentId,
    source: "EFFIS",
    observation_type: "effis_burned_area",
    observed_at: observedAt,
    area_hectares: snapshot.areaHectares,
    area_is_approximate: true,
    detection_count: null,
    alert_level: null,
    metadata: {
      sourceLayer: snapshot.sourceLayer,
      sourceUrl: snapshot.sourceUrl,
      fireDate: snapshot.fireDate,
      finalDate: snapshot.finalDate,
    },
  });
}

export async function recordFirmsActiveDetectionObservations(
  snapshots: FirmsIncidentSnapshot[],
): Promise<void> {
  for (const snapshot of snapshots) {
    await recordFirmsActiveDetectionObservation(snapshot);
  }
}

export async function recordFirmsSevenDayHistoryObservations(
  snapshots: FirmsIncidentSnapshot[],
): Promise<void> {
  for (const snapshot of snapshots) {
    await recordFirmsSevenDayHistoryObservation(snapshot);
  }
}
