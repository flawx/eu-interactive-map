const HISTORY_KEY = "eu-map-search-history-v1";
const MAX_HISTORY = 5;

export type SearchHistoryEntry = {
  query: string;
  title: string;
  savedAt: number;
};

export function readSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SearchHistoryEntry =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as SearchHistoryEntry).query === "string" &&
          typeof (item as SearchHistoryEntry).title === "string",
      )
      .slice(0, MAX_HISTORY);
  } catch {
    return [];
  }
}

export function pushSearchHistory(entry: {
  query: string;
  title: string;
}): SearchHistoryEntry[] {
  const next: SearchHistoryEntry = {
    query: entry.query.trim(),
    title: entry.title.trim(),
    savedAt: Date.now(),
  };
  if (!next.query || !next.title) return readSearchHistory();

  const existing = readSearchHistory().filter(
    (item) => item.query.toLowerCase() !== next.query.toLowerCase(),
  );
  const updated = [next, ...existing].slice(0, MAX_HISTORY);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore quota / private mode
  }
  return updated;
}
