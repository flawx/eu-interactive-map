import "server-only";

const USER_AGENT = "EUInteractiveMap/0.1 (educational; contact: local-dev)";
const FETCH_TIMEOUT_MS = 10_000;

async function fetchJson(
  url: string,
  signal: AbortSignal,
): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal,
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchWikidataOpenedYear(
  wikidataId: string,
  signal: AbortSignal,
): Promise<number | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(wikidataId)}.json`;
  const json = (await fetchJson(url, signal)) as {
    entities?: Record<
      string,
      {
        claims?: Record<
          string,
          Array<{
            mainsnak?: {
              datavalue?: { value?: { time?: string } | string };
            };
          }>
        >;
      }
    >;
  } | null;
  const claims = json?.entities?.[wikidataId]?.claims?.P1619 ??
    json?.entities?.[wikidataId]?.claims?.P571;
  const raw = claims?.[0]?.mainsnak?.datavalue?.value;
  const time =
    typeof raw === "object" && raw && "time" in raw
      ? raw.time
      : typeof raw === "string"
        ? raw
        : null;
  if (!time) return null;
  const year = Number.parseInt(time.replace(/^\+/, "").slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

export function withTimeoutSignal(parent?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  parent?.addEventListener("abort", () => {
    clearTimeout(timer);
    controller.abort();
  });
  return controller.signal;
}
