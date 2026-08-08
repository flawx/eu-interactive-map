"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Building2,
  Landmark,
  LoaderCircle,
  MapPin,
  Navigation,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { UnifiedLocationResult } from "@/lib/search/externalLocation";
import type { RoutePoint } from "@/lib/routing/types";

type UnifiedLocationFieldProps = {
  locale: Locale;
  label: string;
  valueLabel: string;
  onQueryChange?: (query: string) => void;
  onSelect: (point: RoutePoint, result: UnifiedLocationResult) => void;
  bias?: { latitude: number; longitude: number } | null;
  placeholder?: string;
  autoFocus?: boolean;
};

function iconFor(kind: UnifiedLocationResult["kind"]) {
  switch (kind) {
    case "internal":
      return Landmark;
    case "poi":
      return Building2;
    case "city":
    case "geography":
      return Navigation;
    default:
      return MapPin;
  }
}

export default function UnifiedLocationField({
  locale,
  label,
  valueLabel,
  onQueryChange,
  onSelect,
  bias = null,
  placeholder,
  autoFocus = false,
}: UnifiedLocationFieldProps) {
  const t = getMessages(locale).routePlanner;
  const listId = useId();
  const [query, setQuery] = useState(valueLabel);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedLocationResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    skipSearchRef.current = true;
    setQuery(valueLabel);
  }, [valueLabel]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const biasLat = bias?.latitude ?? null;
  const biasLon = bias?.longitude ?? null;

  useEffect(() => {
    const trimmed = query.trim();
    onQueryChange?.(trimmed);
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      const params = new URLSearchParams({
        q: trimmed,
        lang: locale,
        limit: "8",
      });
      if (biasLat != null && biasLon != null) {
        params.set("lat", String(biasLat));
        params.set("lon", String(biasLon));
      }
      void fetch(`/api/search/locations?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return { results: [] as UnifiedLocationResult[] };
          return (await response.json()) as {
            results: UnifiedLocationResult[];
          };
        })
        .then((payload) => {
          if (controller.signal.aborted) return;
          setResults(payload.results ?? []);
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (
            (error instanceof DOMException && error.name === "AbortError") ||
            (typeof error === "object" &&
              error !== null &&
              "name" in error &&
              (error as { name?: string }).name === "AbortError")
          ) {
            return;
          }
          setResults([]);
        })
        .finally(() => {
          if (abortRef.current === controller) setLoading(false);
        });
    }, 280);

    return () => {
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
    };
    // onQueryChange intentionally omitted — parent may pass inline fn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, locale, biasLat, biasLon]);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <div className="relative">
        <input
          value={query}
          autoFocus={autoFocus}
          placeholder={placeholder ?? t.searchAddressOrPlace}
          aria-label={label}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 pr-9 text-sm text-slate-100 outline-none ring-[#1a73e8]/50 focus:ring-2"
          onChange={(event) => {
            skipSearchRef.current = false;
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />
        {loading ? (
          <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        ) : null}
      </div>
      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-slate-950/95 shadow-xl"
        >
          {results.map((result) => {
            const Icon = iconFor(result.kind);
            return (
              <li key={result.id} role="option">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-white/10"
                  onClick={() => {
                    skipSearchRef.current = true;
                    onSelect(
                      {
                        latitude: result.latitude,
                        longitude: result.longitude,
                        name: result.name,
                        countryCode: result.countryCode,
                      },
                      result,
                    );
                    setQuery(result.name);
                    setResults([]);
                    setOpen(false);
                  }}
                >
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-100">
                      {result.name}
                    </span>
                    <span className="block truncate text-xs text-slate-400">
                      {result.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {open && !loading && query.trim().length >= 2 && results.length === 0 ? (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/10 bg-slate-950/95 px-3 py-2 text-xs text-slate-400 shadow-xl">
          {t.noResults}
        </div>
      ) : null}
    </div>
  );
}
