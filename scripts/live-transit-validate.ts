/**
 * Live Google Routes TRANSIT validation (server-side).
 * Loads GOOGLE_ROUTES_API_KEY from .env.local without printing it.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  GOOGLE_TRANSIT_FIELD_MASK,
  googleTransitRoutingProvider,
} from "../lib/routing/transit/providers/googleTransit";
import { calculateTransitJourneys } from "../lib/routing/transit/calculateTransit";
import { clearTransitCacheForTests } from "../lib/routing/transit/transitCache";
import type { TransitAllowedMode, TransitJourney } from "../lib/routing/transit/types";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
    if (!process.env[key]) process.env[key] = value;
  }
}

function summarizeJourney(journey: TransitJourney) {
  return {
    id: journey.id,
    departureAt: journey.departureAt,
    arrivalAt: journey.arrivalAt,
    durationSeconds: journey.durationSeconds,
    transfers: journey.transfers,
    modes: journey.modeSummary,
    fare: journey.fare
      ? {
          amount: journey.fare.amount,
          currency: journey.fare.currency,
          status: journey.fare.status,
        }
      : null,
    geometryType: journey.geometry.type,
    geometryPoints:
      journey.geometry.type === "LineString"
        ? journey.geometry.coordinates.length
        : journey.geometry.coordinates.reduce(
            (n, line) => n + line.length,
            0,
          ),
    legs: journey.legs.map((leg) => ({
      mode: leg.mode,
      line: leg.line?.name ?? leg.line?.nameShort,
      agency: leg.agency?.name,
      from: leg.from.name,
      to: leg.to.name,
      departureAt: leg.departureAt,
      arrivalAt: leg.arrivalAt,
      geometryPoints: leg.geometry?.coordinates.length ?? 0,
    })),
  };
}

async function directGoogleCall(label: string, body: Record<string, unknown>) {
  const key = process.env.GOOGLE_ROUTES_API_KEY?.trim();
  if (!key) {
    console.log(`[${label}] SKIP no key`);
    return { http: 0, routes: 0, error: "no_key" as string | null };
  }
  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": GOOGLE_TRANSIT_FIELD_MASK,
      },
      body: JSON.stringify(body),
    },
  );
  const json = (await response.json().catch(() => ({}))) as {
    routes?: unknown[];
    error?: { code?: number; message?: string; status?: string };
  };
  const scrubbed = json.error
    ? {
        code: json.error.code,
        status: json.error.status,
        message: (json.error.message ?? "")
          .replace(/key[=:]\s*\S+/gi, "key=***")
          .slice(0, 400),
      }
    : null;
  console.log(`[${label}] Google HTTP=${response.status} routes=${json.routes?.length ?? 0}`);
  if (scrubbed) console.log(`[${label}] error`, scrubbed);
  // Field presence sample from first route
  if (json.routes?.[0] && typeof json.routes[0] === "object") {
    const route = json.routes[0] as Record<string, unknown>;
    const leg0 = Array.isArray(route.legs) ? (route.legs[0] as Record<string, unknown>) : null;
    const step0 = leg0 && Array.isArray(leg0.steps) ? (leg0.steps[0] as Record<string, unknown>) : null;
    console.log(`[${label}] fieldPresence`, {
      duration: "duration" in route,
      distanceMeters: "distanceMeters" in route,
      polyline: Boolean(route.polyline),
      legs: Array.isArray(route.legs),
      steps: Boolean(leg0 && Array.isArray(leg0.steps)),
      travelMode: step0 ? "travelMode" in step0 : false,
      transitDetails: step0 ? "transitDetails" in step0 : false,
      travelAdvisory: "travelAdvisory" in route,
      warnings: "warnings" in route,
    });
  }
  return {
    http: response.status,
    routes: json.routes?.length ?? 0,
    error: scrubbed?.message ?? null,
  };
}

async function viaProvider(
  label: string,
  origin: { latitude: number; longitude: number; name: string },
  destination: { latitude: number; longitude: number; name: string },
  opts: {
    timing?:
      | { kind: "depart_now" }
      | { kind: "depart_at"; at: string }
      | { kind: "arrive_at"; at: string };
    allowedModes?: TransitAllowedMode[] | null;
  } = {},
) {
  clearTransitCacheForTests();
  try {
    const result = await calculateTransitJourneys({
      origin,
      destination,
      timing: opts.timing ?? { kind: "depart_now" },
      allowedModes: opts.allowedModes ?? null,
      routingPreference: null,
      alternatives: true,
      locale: "en",
    });
    console.log(
      `[${label}] provider status=${result.status} journeys=${result.journeys.length}`,
    );
    if (result.journeys[0]) {
      console.log(`[${label}] first`, JSON.stringify(summarizeJourney(result.journeys[0]), null, 2));
    }
    return result;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "unknown";
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status: number }).status)
        : 0;
    console.log(`[${label}] provider ERROR code=${code} status=${status}`);
    return null;
  }
}

async function main() {
  loadEnvLocal();
  const keyPresent = Boolean(process.env.GOOGLE_ROUTES_API_KEY?.trim());
  console.log("GOOGLE_ROUTES_API_KEY détectée:", keyPresent ? "oui" : "non");
  console.log("provider getStatus:", await googleTransitRoutingProvider.getStatus());

  const parisLyon = {
    origin: { latitude: 48.8443, longitude: 2.3744, name: "Gare de Lyon" },
    destination: {
      latitude: 48.85837,
      longitude: 2.294481,
      name: "Eiffel Tower",
    },
  };

  await directGoogleCall("Paris local direct", {
    origin: {
      location: {
        latLng: {
          latitude: parisLyon.origin.latitude,
          longitude: parisLyon.origin.longitude,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: parisLyon.destination.latitude,
          longitude: parisLyon.destination.longitude,
        },
      },
    },
    travelMode: "TRANSIT",
    computeAlternativeRoutes: true,
    languageCode: "en",
    units: "METRIC",
  });

  await viaProvider("Paris local", parisLyon.origin, parisLyon.destination);

  await viaProvider(
    "Bordeaux local",
    { latitude: 44.8258, longitude: -0.5569, name: "Gare Saint-Jean" },
    { latitude: 44.8456, longitude: -0.5736, name: "Place des Quinconces" },
  );

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(8, 0, 0, 0);
  const departAt = tomorrow.toISOString();
  const arriveBy = new Date(tomorrow.getTime() + 10 * 3600_000).toISOString();

  await viaProvider(
    "Bordeaux→Paris train",
    { latitude: 44.8258, longitude: -0.5569, name: "Bordeaux" },
    { latitude: 48.8566, longitude: 2.3522, name: "Paris" },
    {
      timing: { kind: "depart_at", at: departAt },
      allowedModes: ["TRAIN", "RAIL", "SUBWAY", "BUS", "LIGHT_RAIL"],
    },
  );

  await viaProvider(
    "Paris→London",
    { latitude: 48.8566, longitude: 2.3522, name: "Paris" },
    { latitude: 51.5074, longitude: -0.1278, name: "London" },
    {
      timing: { kind: "depart_at", at: departAt },
      allowedModes: ["TRAIN", "RAIL"],
    },
  );

  await viaProvider(
    "Paris→London arrive_by",
    { latitude: 48.8566, longitude: 2.3522, name: "Paris" },
    { latitude: 51.5074, longitude: -0.1278, name: "London" },
    {
      timing: { kind: "arrive_at", at: arriveBy },
      allowedModes: ["TRAIN", "RAIL"],
    },
  );

  await viaProvider(
    "Paris→Brussels",
    { latitude: 48.8566, longitude: 2.3522, name: "Paris" },
    { latitude: 50.8503, longitude: 4.3517, name: "Brussels" },
    {
      timing: { kind: "depart_at", at: departAt },
      allowedModes: ["TRAIN", "RAIL"],
    },
  );

  await viaProvider(
    "Paris→Amsterdam",
    { latitude: 48.8566, longitude: 2.3522, name: "Paris" },
    { latitude: 52.3676, longitude: 4.9041, name: "Amsterdam" },
    {
      timing: { kind: "depart_at", at: departAt },
      allowedModes: ["TRAIN", "RAIL"],
    },
  );

  console.log("departAt sent:", departAt);
  console.log("arriveBy sent:", arriveBy);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
