"use client";

import { MapPin, ShieldCheck, Wifi, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

export type Wifi4EuPanelHotspot = {
  id: string;
  name: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  address: string | null;
  municipality: string;
  indoorOutdoor: string;
  programme: string;
  sourceIds: string[];
};

type Wifi4EuPanelProps = {
  hotspot: Wifi4EuPanelHotspot | null;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

export default function Wifi4EuPanel({
  hotspot,
  locale,
  onClose,
  onRouteToPlace,
}: Wifi4EuPanelProps) {
  const t = getMessages(locale);
  const tp = t.wifi4EuPanel;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!hotspot) return null;

  const countryLabel =
    regionNames?.of(hotspot.countryCode === "EL" ? "GR" : hotspot.countryCode) ??
    hotspot.countryCode;
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    hotspot.sourceIds.includes(entry.id),
  );

  return (
    <aside
      className="absolute left-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl map-ui-panel backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-[5] shrink-0 border-b border-[var(--map-ui-border)] bg-[var(--map-ui-surface)] px-4 py-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-300/30 bg-[#0891b2] text-cyan-100 shadow-sm">
            <Wifi className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{hotspot.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">
              {hotspot.municipality}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tp.close}
            title={tp.close}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--map-ui-muted)] outline-none transition hover:bg-[var(--map-ui-surface-hover)] hover:text-[var(--map-ui-text)] focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <X aria-hidden="true" size={22} strokeWidth={2} />
          </button>
        </div>
        <p className="mt-2 inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
          {tp.badge}
        </p>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={hotspot.name}
              latitude={hotspot.latitude}
              longitude={hotspot.longitude}
              countryCode={hotspot.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.location}
          </h2>
          <p className="flex items-center gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
            <MapPin className="h-4 w-4 shrink-0 text-cyan-300" />
            {hotspot.address ?? hotspot.municipality}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.municipality}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {hotspot.municipality}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.country}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {countryLabel}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.freePublicWifi}
          </h2>
          <p className="flex items-center gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
            {tp.freePublicWifiNote}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.programme}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {hotspot.programme}
          </p>
        </section>

        {source ? (
          <section className="mb-2">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.source}
            </h2>
            <a
              href={source.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--map-ui-muted)] hover:text-sky-300 hover:underline"
            >
              {source.name}
            </a>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
