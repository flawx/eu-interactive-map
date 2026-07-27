"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  Award,
  Building2,
  Camera,
  Car,
  Flame,
  Landmark,
  Leaf,
  LoaderCircle,
  MapPin,
  Mountain,
  Plane,
  Search,
  Shield,
  ShieldAlert,
  TrainFront,
  TreePine,
  Waves,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/types";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { TemporaryInternalBorderControl } from "@/lib/security/schengenBorders";
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
import { useAnchoredPortalRect } from "@/lib/ui/useAnchoredPortalRect";

type MapSearchBoxProps = {
  locale: Locale;
  t: Messages;
  wildfires: readonly WildfireIncident[];
  temporaryBorderControls?: readonly TemporaryInternalBorderControl[];
  compact?: boolean;
  autoFocus?: boolean;
  onSelectResult: (result: MapSearchResult) => void;
  onCloseCompact?: () => void;
};

function categoryLabel(category: MapSearchCategory, t: Messages): string {
  switch (category) {
    case "eu_capitals":
      return t.search.groupEuCapitals;
    case "countries_capitals":
      return t.search.groupCountriesCapitals;
    case "eu_institutions":
      return t.search.groupInstitutions;
    case "unesco_sites":
      return t.search.groupUnesco;
    case "european_heritage_label_sites":
      return t.search.groupEuropeanHeritageLabel;
    case "tourist_places":
      return t.search.groupTouristPlaces;
    case "mountain_places":
      return t.search.groupMountainPlaces;
    case "airports":
      return t.search.groupAirports;
    case "international_stations":
      return t.search.groupInternationalStations;
    case "borders_and_controls":
      return t.search.groupBordersAndControls;
    case "active_alerts":
      return t.search.groupAlerts;
    case "app_places":
      return t.search.groupAppPlaces;
    case "external":
      return t.search.groupExternal;
  }
}

function unescoCategoryColor(category: unknown): string {
  switch (category) {
    case "natural":
      return "#15803d";
    case "mixed":
      return "#0891b2";
    default:
      return "#7c3aed";
  }
}

function UnescoCategoryPictogram({ category }: { category: unknown }) {
  if (category === "natural") {
    return <Leaf className="h-3 w-3" strokeWidth={2.25} />;
  }
  if (category === "mixed") {
    return <Mountain className="h-3 w-3" strokeWidth={2.25} />;
  }
  return <Landmark className="h-3 w-3" strokeWidth={2.25} />;
}

function ResultIcon({
  type,
  countryCode,
  metadata,
}: {
  type: MapSearchResult["type"];
  countryCode?: string;
  metadata?: MapSearchResult["metadata"];
}) {
  if (type === "unesco_site") {
    const color = unescoCategoryColor(metadata?.category);
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-white text-white shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        <UnescoCategoryPictogram category={metadata?.category} />
      </span>
    );
  }

  if (type === "european_heritage_label") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#facc15] bg-[#003399] text-[#facc15] shadow-sm"
        aria-hidden="true"
      >
        <Award className="h-3 w-3" strokeWidth={2.25} />
      </span>
    );
  }

  if (type === "tourist_place") {
    const category = String(metadata?.category ?? "landmark");
    const colors: Record<string, string> = {
      landmark: "#c2410c",
      historic_area: "#7c3aed",
      museum: "#0369a1",
      park_garden: "#15803d",
      natural_landscape: "#0f766e",
      coastal_destination: "#0284c7",
      mountain_destination: "#57534e",
    };
    const color = colors[category] ?? "#c2410c";
    let pictogram = <Landmark className="h-3 w-3" strokeWidth={2.25} />;
    if (category === "museum") pictogram = <Camera className="h-3 w-3" strokeWidth={2.25} />;
    if (category === "park_garden") pictogram = <Leaf className="h-3 w-3" strokeWidth={2.25} />;
    if (category === "natural_landscape") pictogram = <TreePine className="h-3 w-3" strokeWidth={2.25} />;
    if (category === "coastal_destination") pictogram = <Waves className="h-3 w-3" strokeWidth={2.25} />;
    if (category === "mountain_destination") pictogram = <Mountain className="h-3 w-3" strokeWidth={2.25} />;
    if (category === "historic_area") pictogram = <MapPin className="h-3 w-3" strokeWidth={2.25} />;
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-white text-white shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        {pictogram}
      </span>
    );
  }

  if (type === "mountain_place") {
    const category = String(metadata?.category ?? "mountain_destination");
    const colors: Record<string, string> = {
      ski_resort: "#0284c7",
      mountain_destination: "#166534",
      iconic_peak: "#64748b",
      mountain_range: "#7c3aed",
    };
    const color = colors[category] ?? "#0284c7";
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white text-white shadow-sm"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      >
        <Mountain className="h-3 w-3" strokeWidth={2.25} />
      </span>
    );
  }

  if (type === "airport") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-white bg-[#0e7490] text-white shadow-sm"
        aria-hidden="true"
      >
        <Plane className="h-3 w-3" strokeWidth={2.25} />
      </span>
    );
  }

  if (type === "eurostar_station") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-[#1e3a8a] bg-[#f59e0b] text-[#1e3a8a] shadow-sm"
        aria-hidden="true"
      >
        <TrainFront className="h-3 w-3" strokeWidth={2.25} />
      </span>
    );
  }

  if (type === "border_crossing") {
    const mode = String(metadata?.mode ?? "road");
    let pictogram = <Car className="h-3 w-3" strokeWidth={2.25} />;
    if (mode === "rail") pictogram = <TrainFront className="h-3 w-3" strokeWidth={2.25} />;
    if (mode === "air") pictogram = <Plane className="h-3 w-3" strokeWidth={2.25} />;
    if (mode === "sea" || mode === "river") {
      pictogram = <Shield className="h-3 w-3" strokeWidth={2.25} />;
    }
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-white bg-[#1e3a8a] text-white shadow-sm"
        aria-hidden="true"
      >
        {pictogram}
      </span>
    );
  }

  if (type === "temporary_border_control") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-white bg-orange-700 text-white shadow-sm"
        aria-hidden="true"
      >
        <ShieldAlert className="h-3 w-3" strokeWidth={2.25} />
      </span>
    );
  }

  if (type === "capital" && countryCode) {
    const region = (countryCode === "EL" ? "GR" : countryCode).toLowerCase();
    return (
      <img
        src={`https://flagcdn.io/w40/${region}.png`}
        alt=""
        width={20}
        height={15}
        className="mt-0.5 h-[15px] w-5 shrink-0 rounded-[2px] object-cover"
      />
    );
  }

  switch (type) {
    case "country":
      return <Landmark className="h-4 w-4 text-[#1a73e8]" aria-hidden="true" />;
    case "capital":
      return <MapPin className="h-4 w-4 text-[#003399]" aria-hidden="true" />;
    case "wildfire":
      return <Flame className="h-4 w-4 text-[#d93025]" aria-hidden="true" />;
    case "eu_institution":
      return (
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-white bg-[#5b21b6] text-[#facc15] shadow-sm"
          aria-hidden="true"
        >
          <Building2 className="h-3 w-3" strokeWidth={2.25} />
        </span>
      );
    default:
      return <MapPin className="h-4 w-4 text-[#f9ab00]" aria-hidden="true" />;
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
      <mark className="rounded-sm bg-[#c2e7ff] text-inherit">{match}</mark>
      {after}
    </>
  );
}

export default function MapSearchBox({
  locale,
  t,
  wildfires,
  temporaryBorderControls,
  compact = false,
  autoFocus = false,
  onSelectResult,
  onCloseCompact,
}: MapSearchBoxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [externalResults, setExternalResults] = useState<MapSearchResult[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [open, setOpen] = useState(false);

  const localIndex = useMemo(
    () => buildLocalSearchIndex(locale, wildfires, temporaryBorderControls),
    [locale, wildfires, temporaryBorderControls],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const anchor = useAnchoredPortalRect(triggerRef, showPanel);

  useEffect(() => {
    if (!showPanel) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showPanel]);

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
            className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 ${
              selected
                ? "bg-[var(--map-ui-surface-hover)]"
                : "hover:bg-[var(--map-ui-surface-hover)]"
            }`}
          >
            <ResultIcon
              type={result.type}
              countryCode={result.countryCode}
              metadata={result.metadata}
            />
            <span className="min-w-0 flex-1">
              <span
                className="block truncate text-sm font-medium"
                style={{ color: "var(--map-ui-text)" }}
              >
                <HighlightedText text={result.title} query={debouncedQuery} />
              </span>
              <span
                className="block truncate text-[11px]"
                style={{ color: "var(--map-ui-muted)" }}
              >
                {categoryLabel(result.category, t)}
                {result.subtitle ? ` · ${result.subtitle}` : ""}
              </span>
            </span>
          </button>
        </li>
      );
    });

    const block = (
      <div
        key={group.category}
        className="mb-2 border-b pb-2 last:mb-0 last:border-b-0 last:pb-0"
        style={{ borderColor: "var(--map-ui-border)" }}
      >
        <p
          className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--map-ui-muted)" }}
        >
          {categoryLabel(group.category, t)}
        </p>
        <ul className="space-y-0.5">{groupNodes}</ul>
      </div>
    );

    optionOffset += group.results.length;
    return block;
  });

  const panelTop = anchor ? anchor.bottom + 8 : 0;
  const panelMaxHeight = anchor
    ? `min(420px, calc(100vh - ${panelTop}px - 16px))`
    : "420px";

  const resultsPanel =
    showPanel && anchor ? (
      <div
        ref={panelRef}
        id={listboxId}
        role="listbox"
        aria-label={t.search.resultsInApp}
        className="fixed overflow-x-hidden overflow-y-auto rounded-[16px] border p-2"
        style={{
          top: panelTop,
          left: anchor.left,
          width: anchor.width,
          zIndex: 1200,
          maxHeight: panelMaxHeight,
          background: "var(--map-ui-surface)",
          borderColor: "var(--map-ui-border)",
          boxShadow: "var(--map-ui-shadow)",
        }}
      >
        {debouncedQuery.length >= 2 ? (
          <p
            className="px-2 py-1 text-[10px] uppercase tracking-wide"
            style={{ color: "var(--map-ui-muted)" }}
          >
            {t.search.resultsInApp}
          </p>
        ) : null}

        {debouncedQuery.length >= 2 &&
        localGroups.length === 0 &&
        !externalLoading ? (
          <p
            className="px-2 py-2 text-xs"
            style={{ color: "var(--map-ui-muted)" }}
          >
            {t.search.noResults}
          </p>
        ) : null}

        {localOptionNodes}

        {query.trim().length >= 3 ? (
          <button
            type="button"
            onClick={() => void runExternalSearch()}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
            style={{
              borderColor: "var(--map-ui-border)",
              color: "#1a73e8",
            }}
          >
            {externalLoading ? (
              <LoaderCircle
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {externalLoading ? t.search.searching : t.search.searchThisPlace}
          </button>
        ) : null}

        {externalError ? (
          <p className="px-2 py-2 text-xs text-[#b06000]">
            {t.search.serviceUnavailable}
          </p>
        ) : null}

        {externalResults.length > 0 ? (
          <div className="mb-2">
            <p
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--map-ui-muted)" }}
            >
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
                      className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 ${
                        selected
                          ? "bg-[var(--map-ui-surface-hover)]"
                          : "hover:bg-[var(--map-ui-surface-hover)]"
                      }`}
                    >
                      <ResultIcon
                        type={result.type}
                        countryCode={result.countryCode}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-sm font-medium"
                          style={{ color: "var(--map-ui-text)" }}
                        >
                          {result.title}
                        </span>
                        <span
                          className="block truncate text-[11px]"
                          style={{ color: "var(--map-ui-muted)" }}
                        >
                          {String(result.metadata.address ?? result.subtitle)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p
              className="px-2 pt-2 text-[10px]"
              style={{ color: "var(--map-ui-muted)" }}
            >
              {t.search.osmAttribution}
            </p>
          </div>
        ) : null}

        {history.length > 0 && debouncedQuery.length < 2 ? (
          <div>
            <p
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--map-ui-muted)" }}
            >
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
                    className="flex w-full rounded-xl px-2.5 py-2 text-left text-sm outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
                    style={{ color: "var(--map-ui-text)" }}
                  >
                    {entry.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      className={`${compact ? "w-full" : "w-full max-w-[600px] min-w-0 md:w-[min(600px,42vw)] md:min-w-[420px]"}`}
    >
      <div
        ref={triggerRef}
        className="flex h-12 items-center gap-2 rounded-[999px] border px-3"
        style={{
          background: "var(--map-ui-surface)",
          borderColor: "var(--map-ui-border)",
          boxShadow: "var(--map-ui-shadow)",
        }}
      >
        <Search
          className="h-4 w-4 shrink-0"
          style={{ color: "var(--map-ui-muted)" }}
          aria-hidden="true"
        />
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
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--map-ui-muted)] focus-visible:outline-none"
          style={{ color: "var(--map-ui-text)" }}
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-full outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
            aria-label={t.search.clearSearch}
            style={{ color: "var(--map-ui-muted)" }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {mounted && resultsPanel
        ? createPortal(resultsPanel, document.body)
        : null}
    </div>
  );
}
