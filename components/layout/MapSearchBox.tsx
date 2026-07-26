"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  Building2,
  Flame,
  Landmark,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/types";
import type { WildfireIncident } from "@/lib/incidents/types";
import {
  buildLocalSearchIndex,
  flattenSearchGroups,
  searchLocalIndex,
  type MapSearchCategory,
  type MapSearchResult,
} from "@/lib/search/mapSearch";
import {
  pushSearchHistory,
  readSearchHistory,
  type SearchHistoryEntry,
} from "@/lib/search/searchHistory";

type MapSearchBoxProps = {
  locale: Locale;
  t: Messages;
  wildfires: readonly WildfireIncident[];
  compact?: boolean;
  autoFocus?: boolean;
  onSelectResult: (result: MapSearchResult) => void;
  onCloseCompact?: () => void;
};

function categoryLabel(category: MapSearchCategory, t: Messages): string {
  switch (category) {
    case "countries_capitals":
      return t.search.groupCountriesCapitals;
    case "eu_institutions":
      return t.search.groupInstitutions;
    case "active_alerts":
      return t.search.groupAlerts;
    case "app_places":
      return t.search.groupAppPlaces;
    case "external":
      return t.search.groupExternal;
  }
}

function ResultIcon({ type }: { type: MapSearchResult["type"] }) {
  switch (type) {
    case "country":
      return <Landmark className="h-4 w-4 text-sky-400" aria-hidden="true" />;
    case "capital":
      return <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />;
    case "wildfire":
      return <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />;
    case "eu_institution":
      return <Building2 className="h-4 w-4 text-indigo-300" aria-hidden="true" />;
    default:
      return <MapPin className="h-4 w-4 text-amber-300" aria-hidden="true" />;
  }
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return <>{text}</>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index < 0) {
    return <>{text}</>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + normalizedQuery.length);
  const after = text.slice(index + normalizedQuery.length);

  return (
    <>
      {before}
      <mark className="rounded-sm bg-sky-400/30 text-inherit">{match}</mark>
      {after}
    </>
  );
}

export default function MapSearchBox({
  locale,
  t,
  wildfires,
  compact = false,
  autoFocus = false,
  onSelectResult,
  onCloseCompact,
}: MapSearchBoxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [externalResults, setExternalResults] = useState<MapSearchResult[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [open, setOpen] = useState(false);

  const localIndex = useMemo(
    () => buildLocalSearchIndex(locale, wildfires),
    [locale, wildfires],
  );

  useEffect(() => {
    setHistory(readSearchHistory());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const localGroups = useMemo(
    () => searchLocalIndex(debouncedQuery, localIndex, 10),
    [debouncedQuery, localIndex],
  );

  const flatLocal = useMemo(
    () => flattenSearchGroups(localGroups),
    [localGroups],
  );

  const flatAll = useMemo(
    () => [...flatLocal, ...externalResults],
    [flatLocal, externalResults],
  );

  useEffect(() => {
    setActiveIndex(flatAll.length > 0 ? 0 : -1);
  }, [flatAll]);

  const runExternalSearch = async () => {
    const q = query.trim();
    if (q.length < 3) return;

    setExternalLoading(true);
    setExternalError(false);
    setOpen(true);

    try {
      const response = await fetch(
        `/api/search/geocode?q=${encodeURIComponent(q)}&lang=${encodeURIComponent(locale)}`,
      );
      const payload = (await response.json()) as {
        results?: MapSearchResult[];
        error?: string;
      };

      if (!response.ok) {
        setExternalResults([]);
        setExternalError(true);
        return;
      }

      setExternalResults(Array.isArray(payload.results) ? payload.results : []);
      setHistory(pushSearchHistory({ query: q, title: q }));
    } catch {
      setExternalResults([]);
      setExternalError(true);
    } finally {
      setExternalLoading(false);
    }
  };

  const selectResult = (result: MapSearchResult) => {
    setHistory(
      pushSearchHistory({
        query: query.trim() || result.title,
        title: result.title,
      }),
    );
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setExternalResults([]);
    onSelectResult(result);
    onCloseCompact?.();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatAll.length === 0) return;
      setOpen(true);
      setActiveIndex((current) =>
        current < flatAll.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatAll.length === 0) return;
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? flatAll.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (open) {
        setOpen(false);
        return;
      }
      setQuery("");
      setExternalResults([]);
      onCloseCompact?.();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (open && activeIndex >= 0 && flatAll[activeIndex]) {
        selectResult(flatAll[activeIndex]);
        return;
      }
      void runExternalSearch();
    }
  };

  const showPanel =
    open &&
    (query.trim().length >= 2 ||
      externalResults.length > 0 ||
      externalLoading ||
      externalError ||
      history.length > 0);

  let optionOffset = 0;

  const localOptionNodes = localGroups.map((group) => {
    const groupNodes = group.results.map((result, index) => {
      const absoluteIndex = optionOffset + index;
      const selected = absoluteIndex === activeIndex;
      return (
        <li key={result.id} role="presentation">
          <button
            type="button"
            id={`${listboxId}-option-${absoluteIndex}`}
            role="option"
            aria-selected={selected}
            onMouseEnter={() => setActiveIndex(absoluteIndex)}
            onClick={() => selectResult(result)}
            className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
              selected ? "bg-white/10" : "hover:bg-white/5"
            }`}
          >
            <ResultIcon type={result.type} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white">
                <HighlightedText text={result.title} query={debouncedQuery} />
              </span>
              <span className="block truncate text-[11px] text-slate-400">
                {categoryLabel(result.category, t)}
                {result.subtitle ? ` · ${result.subtitle}` : ""}
              </span>
            </span>
          </button>
        </li>
      );
    });

    const block = (
      <div key={group.category} className="mb-2">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {categoryLabel(group.category, t)}
        </p>
        <ul className="space-y-0.5">{groupNodes}</ul>
      </div>
    );

    optionOffset += group.results.length;
    return block;
  });

  return (
    <div className={`relative ${compact ? "w-full" : "w-full max-w-xl"}`}>
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/80 px-2 shadow-sm backdrop-blur-md">
        <Search className="ml-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setExternalResults([]);
            setExternalError(false);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t.search.placeholder}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setExternalResults([]);
              setExternalError(false);
              inputRef.current?.focus();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
            aria-label={t.search.clearSearch}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t.search.resultsInApp}
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-[70] max-h-[min(24rem,60vh)] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md"
        >
          {debouncedQuery.length >= 2 ? (
            <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">
              {t.search.resultsInApp}
            </p>
          ) : null}

          {debouncedQuery.length >= 2 && localGroups.length === 0 && !externalLoading ? (
            <p className="px-2 py-2 text-xs text-slate-300">{t.search.noResults}</p>
          ) : null}

          {localOptionNodes}

          {query.trim().length >= 3 ? (
            <button
              type="button"
              onClick={() => void runExternalSearch()}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-sky-200 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              {externalLoading ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {externalLoading ? t.search.searching : t.search.searchThisPlace}
            </button>
          ) : null}

          {externalError ? (
            <p className="px-2 py-2 text-xs text-amber-200">
              {t.search.serviceUnavailable}
            </p>
          ) : null}

          {externalResults.length > 0 ? (
            <div className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t.search.groupExternal}
              </p>
              <ul className="space-y-0.5">
                {externalResults.map((result, index) => {
                  const absoluteIndex = flatLocal.length + index;
                  const selected = absoluteIndex === activeIndex;
                  return (
                    <li key={result.id} role="presentation">
                      <button
                        type="button"
                        id={`${listboxId}-option-${absoluteIndex}`}
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActiveIndex(absoluteIndex)}
                        onClick={() => selectResult(result)}
                        className={`flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                          selected ? "bg-white/10" : "hover:bg-white/5"
                        }`}
                      >
                        <ResultIcon type={result.type} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-white">
                            {result.title}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {String(result.metadata.address ?? result.subtitle)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="px-2 pt-2 text-[10px] text-slate-500">
                {t.search.osmAttribution}
              </p>
            </div>
          ) : null}

          {history.length > 0 && debouncedQuery.length < 2 ? (
            <div>
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t.search.recentHistory}
              </p>
              <ul className="space-y-0.5">
                {history.map((entry) => (
                  <li key={`${entry.query}-${entry.savedAt}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery(entry.query);
                        setOpen(true);
                        inputRef.current?.focus();
                      }}
                      className="flex w-full rounded-lg px-2 py-2 text-left text-sm text-slate-200 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400/70"
                    >
                      {entry.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
