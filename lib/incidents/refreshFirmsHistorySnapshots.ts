import { buildFirmsIncidentSnapshots } from "@/lib/incidents/firmsFootprints";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import {
  firmsHistorySnapshotToRow,
  normalizeFirmsHistorySnapshot,
  type FirmsHistorySnapshotRow,
} from "@/lib/incidents/firmsHistorySnapshot";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

const REFRESH_MAX_AGE_MS = 30 * 60 * 1000;

const SELECT_COLUMNS =
  "incident_id, incident_name, geometry_geojson, bbox, detection_count, sensors, approximate_area_hectares, period_start, period_end, source_updated_at, fetched_at, source, source_url, metadata";

function isMissingRelationError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    /firms_recent_detection_snapshots/i.test(message) &&
    /(does not exist|Could not find the table|schema cache)/i.test(message)
  );
}

export async function listFirmsHistorySnapshots(): Promise<
  FirmsIncidentSnapshot[]
> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("firms_recent_detection_snapshots")
    .select(SELECT_COLUMNS)
    .order("fetched_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  if (!data) {
    return [];
  }

  return data
    .map((row) =>
      normalizeFirmsHistorySnapshot(row as FirmsHistorySnapshotRow),
    )
    .filter((snapshot): snapshot is FirmsIncidentSnapshot => snapshot !== null);
}

function newestFetchedAt(snapshots: FirmsIncidentSnapshot[]): number | null {
  let newest: number | null = null;
  for (const snapshot of snapshots) {
    const time = Date.parse(snapshot.fetchedAt);
    if (Number.isNaN(time)) continue;
    if (newest === null || time > newest) newest = time;
  }
  return newest;
}

export async function refreshFirmsHistorySnapshots(): Promise<{
  snapshots: FirmsIncidentSnapshot[];
  updated: boolean;
  preservedPrevious: boolean;
  stats?: {
    footprintsParsed: number;
    footprintsAfterAgeFilter: number;
    footprintsAssociated: number;
    incidentsAssociated: number;
    sourcesSucceeded: string[];
    sourcesFailed: string[];
    period: "7d";
  };
  warning?: string;
}> {
  let previous: FirmsIncidentSnapshot[] = [];
  try {
    previous = await listFirmsHistorySnapshots();
  } catch (error) {
    throw error;
  }

  const newest = newestFetchedAt(previous);
  if (newest !== null && Date.now() - newest < REFRESH_MAX_AGE_MS) {
    return {
      snapshots: previous,
      updated: false,
      preservedPrevious: true,
      warning: "Recent FIRMS 7d refresh still valid; cache reused",
    };
  }

  try {
    const { snapshots, stats } = await buildFirmsIncidentSnapshots(
      undefined,
      "7d",
    );

    if (snapshots.length === 0) {
      return {
        snapshots: previous,
        updated: false,
        preservedPrevious: previous.length > 0,
        stats: { ...stats, period: "7d" },
        warning:
          previous.length > 0
            ? "NASA FIRMS 7d returned no footprints; previous history preserved"
            : "NASA FIRMS 7d returned no footprints",
      };
    }

    const supabase = createSupabaseServiceClient();
    const rows = snapshots.map(firmsHistorySnapshotToRow);
    const { error } = await supabase
      .from("firms_recent_detection_snapshots")
      .upsert(rows, { onConflict: "incident_id" });

    if (error) {
      // Keep serving live NASA results even if the durable cache table is
      // missing or temporarily unwritable — never invent data, never wipe cache.
      return {
        snapshots: previous.length > 0 ? previous : snapshots,
        updated: false,
        preservedPrevious: previous.length > 0,
        stats: { ...stats, period: "7d" },
        warning: isMissingRelationError(error.message)
          ? "FIRMS history table missing; live NASA results returned without cache"
          : "Failed to persist FIRMS history snapshots; previous or live results preserved",
      };
    }

    const saved = await listFirmsHistorySnapshots();
    return {
      snapshots: saved.length > 0 ? saved : snapshots,
      updated: true,
      preservedPrevious: false,
      stats: { ...stats, period: "7d" },
    };
  } catch {
    return {
      snapshots: previous,
      updated: false,
      preservedPrevious: previous.length > 0,
      warning:
        previous.length > 0
          ? "NASA FIRMS 7d unavailable; previous history preserved"
          : "NASA FIRMS 7d unavailable",
    };
  }
}
