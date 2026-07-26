import "server-only";

import { fetchEuWildfireIncidents } from "@/lib/incidents/gdacsWildfires";
import { extractWildfireUpdates } from "@/lib/incidents/officialSources/extractWildfireUpdates";
import type { WildfireOperationalUpdateDraft } from "@/lib/incidents/officialSources/extractWildfireUpdates";
import { fetchOfficialDocument } from "@/lib/incidents/officialSources/fetchOfficialDocument";
import {
  sourcesForIncidentCountryRegion,
  type FranceWildfireOfficialSource,
} from "@/lib/incidents/officialSources/franceWildfireSources";
import { matchOfficialDocumentToWildfireIncident } from "@/lib/incidents/officialSources/matchOfficialDocument";
import { createSupabaseServiceClient } from "@/lib/supabase/client";
import { isActiveOfficialEvacuation } from "@/lib/incidents/wildfireOperational";

export type OfficialImportReport = {
  incidentId: string;
  sourcesChecked: number;
  documentsMatched: number;
  updatesCreated: number;
  updatesUpdated: number;
  updatesIgnored: number;
  errors: string[];
  categories: Record<string, number>;
};

function validateUpdateSafety(
  draft: WildfireOperationalUpdateDraft,
): string | null {
  if (
    draft.category === "evacuation_order" &&
    draft.verificationStatus === "official" &&
    draft.sourceType !== "authority" &&
    draft.sourceType !== "emergency_service"
  ) {
    return "Evacuation rejected: source must be authority or emergency_service";
  }

  if (
    (draft.category === "shelter" ||
      draft.category === "reception_center" ||
      draft.category === "gathering_point") &&
    (!draft.locationName || !draft.locationName.trim())
  ) {
    return "Safety location rejected: missing location";
  }

  if (draft.category === "community") {
    return "Community updates are out of scope for official ingest";
  }

  if (draft.category === "media") {
    return "Media updates are out of scope for official ingest";
  }

  // Ensure active official evacuations remain policy-compliant.
  if (draft.category === "evacuation_order" && draft.status === "active") {
    const ok = isActiveOfficialEvacuation({
      ...draft,
      id: "tmp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (!ok) return "Evacuation rejected by official-active policy";
  }

  return null;
}

async function upsertOperationalUpdate(
  draft: WildfireOperationalUpdateDraft,
): Promise<"created" | "updated" | "ignored"> {
  const supabase = createSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data: existing, error: lookupError } = await supabase
    .from("wildfire_operational_updates")
    .select("id, published_at, content_hash")
    .eq("incident_id", draft.incidentId)
    .eq("external_id", draft.externalId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing?.id) {
    if (existing.content_hash === draft.contentHash) {
      const { error: touchError } = await supabase
        .from("wildfire_operational_updates")
        .update({
          last_verified_at: draft.lastVerifiedAt ?? now,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (touchError) throw new Error(touchError.message);
      return "ignored";
    }

    const { error: updateError } = await supabase
      .from("wildfire_operational_updates")
      .update({
        category: draft.category,
        title: draft.title,
        body: draft.body,
        status: draft.status,
        source_type: draft.sourceType,
        source_name: draft.sourceName,
        source_url: draft.sourceUrl,
        verification_status: draft.verificationStatus,
        // Preserve original publication date when present.
        published_at: existing.published_at ?? draft.publishedAt,
        effective_from: draft.effectiveFrom,
        expires_at: draft.expiresAt,
        last_verified_at: draft.lastVerifiedAt ?? now,
        location_name: draft.locationName,
        geometry_geojson: draft.geometry,
        structured_data: draft.structuredData,
        content_hash: draft.contentHash,
        updated_at: now,
      })
      .eq("id", existing.id);

    if (updateError) throw new Error(updateError.message);
    return "updated";
  }

  const { error: insertError } = await supabase
    .from("wildfire_operational_updates")
    .insert({
      incident_id: draft.incidentId,
      external_id: draft.externalId,
      category: draft.category,
      title: draft.title,
      body: draft.body,
      status: draft.status,
      source_type: draft.sourceType,
      source_name: draft.sourceName,
      source_url: draft.sourceUrl,
      verification_status: draft.verificationStatus,
      published_at: draft.publishedAt,
      effective_from: draft.effectiveFrom,
      expires_at: draft.expiresAt,
      last_verified_at: draft.lastVerifiedAt ?? now,
      location_name: draft.locationName,
      geometry_geojson: draft.geometry,
      structured_data: draft.structuredData,
      content_hash: draft.contentHash,
      created_at: now,
      updated_at: now,
    });

  if (insertError) {
    // Concurrent insert race: treat unique violation as update path.
    if (/duplicate|unique/i.test(insertError.message)) {
      return "ignored";
    }
    throw new Error(insertError.message);
  }

  return "created";
}

function regionHintFromIncident(title: string, description: string | null): string | null {
  const blob = `${title} ${description ?? ""}`;
  if (/gironde|saumos|porge|lège|lege|médoc|medoc|arcachon/i.test(blob)) {
    return "Gironde";
  }
  return null;
}

export async function importOfficialWildfireUpdates(
  incidentId: string,
): Promise<OfficialImportReport> {
  const trimmedId = incidentId.trim();
  const report: OfficialImportReport = {
    incidentId: trimmedId,
    sourcesChecked: 0,
    documentsMatched: 0,
    updatesCreated: 0,
    updatesUpdated: 0,
    updatesIgnored: 0,
    errors: [],
    categories: {},
  };

  if (!trimmedId) {
    report.errors.push("Missing incident id");
    return report;
  }

  const incidents = await fetchEuWildfireIncidents();
  const incident = incidents.find((item) => item.id === trimmedId) ?? null;
  if (!incident) {
    report.errors.push("Wildfire incident not found");
    return report;
  }

  const sources: FranceWildfireOfficialSource[] = sourcesForIncidentCountryRegion({
    incidentId: trimmedId,
    countryCode: incident.countryCode,
    regionHint: regionHintFromIncident(incident.title, incident.description),
    longitude: incident.longitude,
    latitude: incident.latitude,
  });

  for (const source of sources) {
    report.sourcesChecked += 1;
    try {
      const document = await fetchOfficialDocument(source.url);
      const match = matchOfficialDocumentToWildfireIncident({
        document,
        incident,
        source,
      });

      if (!match.matched) {
        continue;
      }

      report.documentsMatched += 1;
      const drafts = extractWildfireUpdates({
        document,
        incident,
        source,
        relevantText: match.relevantText,
      });

      for (const draft of drafts) {
        const validationError = validateUpdateSafety(draft);
        if (validationError) {
          report.updatesIgnored += 1;
          report.errors.push(`${source.id}: ${validationError}`);
          continue;
        }

        try {
          const result = await upsertOperationalUpdate(draft);
          if (result === "created") {
            report.updatesCreated += 1;
            report.categories[draft.category] =
              (report.categories[draft.category] ?? 0) + 1;
          } else if (result === "updated") {
            report.updatesUpdated += 1;
          } else {
            report.updatesIgnored += 1;
          }
        } catch (error) {
          report.errors.push(
            `${source.id}/${draft.category}: ${
              error instanceof Error ? error.message : "upsert failed"
            }`,
          );
        }
      }
    } catch (error) {
      report.errors.push(
        `${source.id}: ${error instanceof Error ? error.message : "fetch failed"}`,
      );
    }
  }

  return report;
}
