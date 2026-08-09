/**
 * Diagnostics for Amadeus Self-Service product entitlements.
 * Never logs or prints the API key, secret, or bearer token.
 *
 * Usage: npm run test:amadeus-products
 * (Requires AMADEUS_API_KEY / AMADEUS_API_SECRET in .env.local or the
 * environment. Without them, this reports "misconfigured" and exits 1.)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

type Credentials = { key: string; secret: string; env: "test" | "production" };

function loadEnvValue(name: string): string | null {
  if (process.env[name]?.trim()) return process.env[name]!.trim();
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const text = readFileSync(envPath, "utf8");
  const match = text.match(new RegExp(`^${name}=(.+)$`, "m"));
  return match?.[1]?.trim() || null;
}

function loadCredentials(): Credentials | null {
  const key = loadEnvValue("AMADEUS_API_KEY");
  const secret = loadEnvValue("AMADEUS_API_SECRET");
  if (!key || !secret) return null;
  const env = loadEnvValue("AMADEUS_ENV")?.toLowerCase() === "production" ? "production" : "test";
  return { key, secret, env };
}

function baseUrlFor(env: "test" | "production"): string {
  return env === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com";
}

async function getAccessToken(
  credentials: Credentials,
): Promise<{ token: string | null; status: number; detail: string | null }> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.key,
    client_secret: credentials.secret,
  });
  const response = await fetch(`${baseUrlFor(credentials.env)}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | { access_token?: string; error_description?: string }
    | null;
  return {
    token: response.ok ? (payload?.access_token ?? null) : null,
    status: response.status,
    detail: response.ok ? null : payload?.error_description ?? null,
  };
}

type ProbeResult = {
  product: string;
  status: number;
  contentType: string | null;
  detail: string | null;
};

async function probe(
  product: string,
  url: string,
  token: string,
): Promise<ProbeResult> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type");
  let detail: string | null = null;
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const first = Array.isArray((payload as { errors?: unknown[] })?.errors)
      ? (payload as { errors: Array<{ title?: string; detail?: string }> }).errors[0]
      : null;
    detail = first?.detail ?? first?.title ?? null;
  }
  return { product, status: response.status, contentType, detail };
}

function futureDate(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const credentials = loadCredentials();
  if (!credentials) {
    console.log("AMADEUS_API_KEY / AMADEUS_API_SECRET: missing");
    console.log("Status: misconfigured");
    process.exit(1);
  }

  console.log(`AMADEUS_API_KEY: present (length=${credentials.key.length})`);
  console.log(`AMADEUS_ENV: ${credentials.env}`);
  console.log("");

  const auth = await getAccessToken(credentials);
  console.log(`OAuth2 token request: HTTP ${auth.status}`);
  if (auth.detail) console.log(`detail: ${auth.detail}`);
  console.log("");

  if (!auth.token) {
    console.log("Interpretation: could not authenticate — check the key/secret pair and AMADEUS_ENV.");
    process.exit(1);
  }
  console.log(`OAuth2 token: acquired (length=${auth.token.length})`);
  console.log("");

  const base = baseUrlFor(credentials.env);
  const departureDate = futureDate(21);

  const flightOffersUrl = new URL(`${base}/v2/shopping/flight-offers`);
  flightOffersUrl.searchParams.set("originLocationCode", "CDG");
  flightOffersUrl.searchParams.set("destinationLocationCode", "MAD");
  flightOffersUrl.searchParams.set("departureDate", departureDate);
  flightOffersUrl.searchParams.set("adults", "1");
  flightOffersUrl.searchParams.set("max", "1");

  const locationsUrl = new URL(`${base}/v1/reference-data/locations`);
  locationsUrl.searchParams.set("subType", "AIRPORT");
  locationsUrl.searchParams.set("keyword", "PAR");

  const results = await Promise.all([
    probe("Flight Offers Search v2", flightOffersUrl.toString(), auth.token),
    probe("Airport & City Search v1", locationsUrl.toString(), auth.token),
  ]);

  for (const row of results) {
    console.log(`--- ${row.product}`);
    console.log(`status: ${row.status}`);
    console.log(`content-type: ${row.contentType ?? "n/a"}`);
    if (row.detail) console.log(`error: ${row.detail}`);
    console.log("");
  }

  const [flightOffers, locations] = results;
  console.log("SUMMARY");
  console.log(`Flight Offers Search: HTTP ${flightOffers!.status}`);
  console.log(`Airport & City Search: HTTP ${locations!.status}`);
  console.log("");
  if (flightOffers!.status === 200 && locations!.status === 200) {
    console.log("Interpretation: Amadeus credentials are entitled for Flight Offers Search + Airport Search.");
  } else if (flightOffers!.status === 401 || locations!.status === 401) {
    console.log("Interpretation: authentication rejected — token may have expired mid-run.");
  } else if (flightOffers!.status === 403 || locations!.status === 403) {
    console.log("Interpretation: authenticated but not entitled for one or more products.");
  } else {
    console.log("Interpretation: mixed results — inspect per-product details above.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
