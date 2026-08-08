/**
 * Diagnostics for TomTom product entitlements.
 * Never logs or prints the API key or full URLs containing the key.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvKey(): string | null {
  if (process.env.TOMTOM_API_KEY?.trim()) {
    return process.env.TOMTOM_API_KEY.trim();
  }
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const text = readFileSync(envPath, "utf8");
  const match = text.match(/^TOMTOM_API_KEY=(.+)$/m);
  return match?.[1]?.trim() || null;
}

function redactKey(url: string, key: string): string {
  return url.split(key).join("***");
}

type ProbeResult = {
  product: string;
  method: string;
  auth: string;
  endpoint: string;
  status: number;
  contentType: string | null;
  errorBody: string | null;
};

async function probe(options: {
  product: string;
  method: string;
  auth: string;
  url: string;
  key: string;
  headers?: Record<string, string>;
}): Promise<ProbeResult> {
  const response = await fetch(options.url, {
    method: options.method,
    headers: {
      Accept: "*/*",
      ...options.headers,
    },
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type");
  let errorBody: string | null = null;
  if (!response.ok || (contentType ?? "").includes("json")) {
    const text = await response.text();
    errorBody = text.slice(0, 240).replace(/\s+/g, " ").trim() || null;
  }
  return {
    product: options.product,
    method: options.method,
    auth: options.auth,
    endpoint: redactKey(options.url.split("?")[0] ?? options.url, options.key),
    status: response.status,
    contentType,
    errorBody: response.ok ? null : errorBody,
  };
}

async function main() {
  const key = loadEnvKey();
  if (!key) {
    console.log("TOMTOM_API_KEY: missing");
    process.exit(1);
  }
  console.log("TOMTOM_API_KEY: present (length=%d)", key.length);
  console.log("");

  const trafficUrl =
    "https://api.tomtom.com/maps/orbis/traffic/flow/vector/tile/8/128/87" +
    `?apiVersion=2&attributes=${encodeURIComponent(
      "tags(road_category,relative_speed,display_class),roadCategories(motorway,primary,secondary,street)",
    )}`;

  const searchClassic = new URL(
    "https://api.tomtom.com/search/2/search/Paris.json",
  );
  searchClassic.searchParams.set("key", key);
  searchClassic.searchParams.set("limit", "1");
  searchClassic.searchParams.set("countrySet", "FR");

  const searchOrbis = new URL(
    "https://api.tomtom.com/maps/orbis/places/search/Paris.json",
  );
  searchOrbis.searchParams.set("apiVersion", "1");
  searchOrbis.searchParams.set("limit", "1");
  searchOrbis.searchParams.set("countrySet", "FR");

  const routing = new URL(
    "https://api.tomtom.com/routing/1/calculateRoute/44.8378,-0.5792:48.8566,2.3522/json",
  );
  routing.searchParams.set("key", key);
  routing.searchParams.set("travelMode", "car");
  routing.searchParams.set("traffic", "true");
  routing.searchParams.set("routeType", "fastest");

  const results = await Promise.all([
    probe({
      product: "Traffic Orbis v2",
      method: "GET",
      auth: "header TomTom-Api-Key + TomTom-Api-Version:2",
      url: trafficUrl,
      key,
      headers: {
        "TomTom-Api-Key": key,
        "TomTom-Api-Version": "2",
        Accept: "application/vnd.mapbox-vector-tile",
      },
    }),
    probe({
      product: "Search classic v2",
      method: "GET",
      auth: "query param key",
      url: searchClassic.toString(),
      key,
    }),
    probe({
      product: "Search Orbis Places v1",
      method: "GET",
      auth: "header TomTom-Api-Key + TomTom-Api-Version:1",
      url: searchOrbis.toString(),
      key,
      headers: {
        "TomTom-Api-Key": key,
        "TomTom-Api-Version": "1",
      },
    }),
    probe({
      product: "Routing classic v1",
      method: "GET",
      auth: "query param key",
      url: routing.toString(),
      key,
      headers: { Accept: "application/json" },
    }),
  ]);

  for (const row of results) {
    console.log(`--- ${row.product}`);
    console.log(`endpoint: ${row.endpoint}`);
    console.log(`method: ${row.method}`);
    console.log(`auth: ${row.auth}`);
    console.log(`status: ${row.status}`);
    console.log(`content-type: ${row.contentType ?? "n/a"}`);
    if (row.errorBody) console.log(`error: ${row.errorBody}`);
    console.log("");
  }

  const traffic = results[0]!;
  const search = results[1]!;
  const routingRow = results[3]!;
  console.log("SUMMARY");
  console.log(`Traffic: HTTP ${traffic.status}`);
  console.log(`Search: HTTP ${search.status}`);
  console.log(`Routing: HTTP ${routingRow.status}`);
  console.log("");
  if (traffic.status === 200 && search.status === 403 && routingRow.status === 403) {
    console.log(
      "Interpretation: key works for Traffic but is NOT entitled for Search/Routing products.",
    );
  } else if (search.status === 200 && routingRow.status === 200) {
    console.log("Interpretation: Search/Routing authorized — local auth OK.");
  } else {
    console.log("Interpretation: mixed results — inspect per-product details above.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
