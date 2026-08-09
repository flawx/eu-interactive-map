/**
 * Live diagnostic for the SerpApi Google Flights integration.
 * Never logs or prints SERPAPI_API_KEY, or any URL containing it.
 *
 * Usage: npm run test:flight-provider
 * (Requires SERPAPI_API_KEY in .env.local or the environment. Without it,
 * this reports "misconfigured" and exits 1.)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvValue(name: string): string | null {
  if (process.env[name]?.trim()) return process.env[name]!.trim();
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const text = readFileSync(envPath, "utf8");
  const match = text.match(new RegExp(`^${name}=(.+)$`, "m"));
  return match?.[1]?.trim() || null;
}

function futureDate(daysFromNow: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

type SerpApiSearchResponse = {
  search_metadata?: { status?: string; id?: string };
  error?: string;
  best_flights?: unknown[];
  other_flights?: unknown[];
};

async function main() {
  const apiKey = loadEnvValue("SERPAPI_API_KEY");
  if (!apiKey) {
    console.log("SERPAPI_API_KEY: missing");
    console.log("Status: misconfigured");
    process.exit(1);
  }
  console.log(`SERPAPI_API_KEY: present (length=${apiKey.length})`);
  console.log("");

  const outboundDate = futureDate(14);
  const params = {
    engine: "google_flights",
    departure_id: "CDG,ORY",
    arrival_id: "FCO,CIA",
    outbound_date: outboundDate,
    type: "2",
    adults: "1",
    currency: "EUR",
    hl: "en",
    gl: "fr",
  };

  console.log("Request (api_key omitted):");
  console.log(`  ${JSON.stringify(params)}`);
  console.log(`  outbound_date: ${outboundDate} (+14 days)`);
  console.log("");

  const url = new URL("https://serpapi.com/search.json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("api_key", apiKey);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  console.log(`HTTP status: ${response.status}`);

  const payload = (await response.json().catch(() => null)) as SerpApiSearchResponse | null;
  if (!payload) {
    console.log("Interpretation: response body was not valid JSON.");
    process.exit(1);
  }

  console.log(`search_metadata.status: ${payload.search_metadata?.status ?? "n/a"}`);
  if (payload.error) {
    console.log(`error: ${payload.error}`);
  }

  const bestCount = Array.isArray(payload.best_flights) ? payload.best_flights.length : 0;
  const otherCount = Array.isArray(payload.other_flights) ? payload.other_flights.length : 0;
  console.log(`best_flights: ${bestCount}`);
  console.log(`other_flights: ${otherCount}`);
  console.log("");

  console.log("SUMMARY");
  if (response.status === 200 && payload.search_metadata?.status === "Success") {
    if (bestCount + otherCount > 0) {
      console.log("Interpretation: SerpApi Google Flights is operational and returned results.");
    } else {
      console.log("Interpretation: SerpApi Google Flights is operational but returned no flights for this route/date.");
    }
    process.exit(0);
  }
  if (response.status === 401) {
    console.log("Interpretation: authentication rejected — check the API key.");
    process.exit(1);
  }
  if (response.status === 429) {
    console.log("Interpretation: rate limited or search quota exhausted.");
    process.exit(1);
  }
  console.log("Interpretation: unexpected result — inspect the status/error above.");
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
