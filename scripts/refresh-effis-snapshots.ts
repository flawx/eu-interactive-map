import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fetchEuWildfireIncidents } from "@/lib/incidents/gdacsWildfires";
import {
  refreshEffisSnapshotForIncident,
  SupabaseConfigError,
} from "@/lib/incidents/refreshEffisSnapshot";

const INCIDENT_GAP_MS = 2_000;
const INCIDENT_TIMEOUT_MS = 35_000;

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function logUnavailable(incidentId: string, preservedPrevious: boolean): void {
  if (preservedPrevious) {
    console.log(
      `[EFFIS unavailable] ${incidentId} — previous snapshot preserved`,
    );
  } else {
    console.log(
      `[EFFIS unavailable] ${incidentId} — no snapshot available yet`,
    );
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    console.error("Supabase configuration is incomplete");
    process.exit(1);
  }

  let incidents;
  try {
    incidents = await fetchEuWildfireIncidents();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GDACS fetch failed";
    console.error(`[config] ${message}`);
    process.exit(1);
  }

  console.log(`[GDACS] ${incidents.length} EU wildfire incident(s)`);

  let updatedCount = 0;
  let preservedCount = 0;
  let unavailableCount = 0;

  for (let index = 0; index < incidents.length; index++) {
    const incident = incidents[index];

    try {
      const result = await refreshEffisSnapshotForIncident(
        {
          incidentId: incident.id,
          longitude: incident.longitude,
          latitude: incident.latitude,
          countryCode: incident.countryCode,
        },
        { timeoutMs: INCIDENT_TIMEOUT_MS },
      );

      if (result.updated) {
        updatedCount += 1;
        console.log(`[updated] ${incident.id}`);
      } else if (result.effisUnavailable) {
        unavailableCount += 1;
        preservedCount += result.preservedPrevious ? 1 : 0;
        logUnavailable(incident.id, result.preservedPrevious);
      } else if (result.preservedPrevious) {
        preservedCount += 1;
        console.log(`[preserved] ${incident.id}`);
      } else {
        unavailableCount += 1;
        logUnavailable(incident.id, false);
      }
    } catch (error) {
      if (error instanceof SupabaseConfigError) {
        console.error(`[config] ${error.message}`);
        process.exit(1);
      }

      unavailableCount += 1;
      logUnavailable(incident.id, false);
    }

    if (index < incidents.length - 1) {
      await sleep(INCIDENT_GAP_MS);
    }
  }

  console.log(
    `[done] updated=${updatedCount} preserved=${preservedCount} unavailable=${unavailableCount}`,
  );
}

main().catch((error) => {
  if (error instanceof SupabaseConfigError) {
    console.error(`[config] ${error.message}`);
    process.exit(1);
  }

  const message =
    error instanceof Error ? error.message : "Unexpected application error";
  console.error(`[error] ${message}`);
  process.exit(1);
});
