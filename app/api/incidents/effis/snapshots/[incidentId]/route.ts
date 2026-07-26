import {
  isValidIncidentId,
  rowToEffisBurnedAreaSnapshot,
  type EffisSnapshotRow,
} from "@/lib/incidents/effisSnapshot";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ incidentId: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { incidentId: rawIncidentId } = await context.params;
  const incidentId = decodeURIComponent(rawIncidentId ?? "").trim();

  if (!isValidIncidentId(incidentId)) {
    return Response.json(
      { snapshot: null, cached: false, error: "Invalid incident id" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("effis_burned_area_snapshots")
      .select(
        "incident_id, country_code, source_layer, geometry_geojson, area_hectares, fire_date, final_date, source_updated_at, fetched_at, source_url, metadata",
      )
      .eq("incident_id", incidentId)
      .maybeSingle();

    if (error) {
      return Response.json(
        {
          snapshot: null,
          cached: false,
          error: "Snapshot storage temporarily unavailable",
        },
        { status: 502 },
      );
    }

    if (!data) {
      return Response.json({
        snapshot: null,
        cached: false,
      });
    }

    const snapshot = rowToEffisBurnedAreaSnapshot(data as EffisSnapshotRow);
    if (!snapshot) {
      return Response.json(
        {
          snapshot: null,
          cached: false,
          error: "Stored snapshot is invalid",
        },
        { status: 502 },
      );
    }

    return Response.json({
      snapshot,
      cached: true,
    });
  } catch {
    return Response.json(
      {
        snapshot: null,
        cached: false,
        error: "Snapshot storage temporarily unavailable",
      },
      { status: 502 },
    );
  }
}
