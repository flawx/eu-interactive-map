import { buildFirmsIncidentSnapshots } from "@/lib/incidents/firmsFootprints";
import {
  firmsSnapshotToRow,
  rowToFirmsIncidentSnapshot,
  type FirmsSnapshotRow,
} from "@/lib/incidents/firmsSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import { createSupabaseServiceClient } from "@/lib/supabase/client";

const REFRESH_MAX_AGE_MS = 15 * 60 * 1000;

const SELECT_COLUMNS =
  "incident_id, incident_name, geometry_geojson, bbox, detection_count, sensors, approximate_area_hectares, source_updated_at, fetched_at, source, source_url, metadata";

export async function listFirmsSnapshots(): Promise<FirmsIncidentSnapshot[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("firms_incident_snapshots")
    .select(SELECT_COLUMNS)
    .order("fetched_at", { ascending: false });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to read FIRMS snapshots");
  }

  return data
    .map((row) => rowToFirmsIncidentSnapshot(row as FirmsSnapshotRow))
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

export async function refreshFirmsSnapshots(): Promise<{
  snapshots: FirmsIncidentSnapshot[];
  updated: boolean;
  preservedPrevious: boolean;
  stats?: {
    footprintsParsed: number;
    footprintsAssociated: number;
    incidentsAssociated: number;
    sourcesSucceeded: string[];
    sourcesFailed: string[];
  };
  warning?: string;
}> {
  let previous: FirmsIncidentSnapshot[] = [];
  try {
    previous = await listFirmsSnapshots();
  } catch (error) {
    throw error;
  }

  const newest = newestFetchedAt(previous);
  if (newest !== null && Date.now() - newest < REFRESH_MAX_AGE_MS) {
    return {
      snapshots: previous,
      updated: false,
      preservedPrevious: true,
      warning: "Recent FIRMS refresh still valid; cache reused",
    };
  }

  try {
    const { snapshots, stats } = await buildFirmsIncidentSnapshots();

    if (snapshots.length === 0) {
      return {
        snapshots: previous,
        updated: false,
        preservedPrevious: previous.length > 0,
        stats,
        warning:
          previous.length > 0
            ? "NASA FIRMS returned no footprints; previous snapshots preserved"
            : "NASA FIRMS returned no footprints",
      };
    }

    const supabase = createSupabaseServiceClient();
    const rows = snapshots.map(firmsSnapshotToRow);
    const { error } = await supabase
      .from("firms_incident_snapshots")
      .upsert(rows, { onConflict: "incident_id" });

    if (error) {
      return {
        snapshots: previous,
        updated: false,
        preservedPrevious: previous.length > 0,
        stats,
        warning: "Failed to persist FIRMS snapshots; previous snapshots preserved",
      };
    }

    const saved = await listFirmsSnapshots();
    return {
      snapshots: saved,
      updated: true,
      preservedPrevious: false,
      stats,
    };
  } catch {
    return {
      snapshots: previous,
      updated: false,
      preservedPrevious: previous.length > 0,
      warning:
        previous.length > 0
          ? "NASA FIRMS unavailable; previous snapshots preserved"
          : "NASA FIRMS unavailable",
    };
  }
}
