"use client";

import { MapPin, ShieldCheck, Wifi, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { Wifi4EuEntityType, Wifi4EuSourceType } from "@/lib/travel/wifi4eu/types";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

export type Wifi4EuPanelRecord = {
  id: string;
  entityType: Wifi4EuEntityType;
  name: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  address: string | null;
  municipality: string;
  indoorOutdoor: string | null;
  programme: string;
  sourceType: Wifi4EuSourceType;
  sourceIds: string[];
  locationPrecision: "exact" | "municipality";
};

type Wifi4EuPanelProps = {
  record: Wifi4EuPanelRecord | null;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function sourceLabel(
  sourceType: Wifi4EuSourceType,
  tp: ReturnType<typeof getMessages>["wifi4EuPanel"],
): string {
  if (sourceType === "official") return tp.sourceOfficial;
  if (sourceType === "municipal_official") return tp.sourceMunicipal;
  return tp.sourceCommunity;
}

export default function Wifi4EuPanel({
  record,
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

  if (!record) return null;

  const isMunicipality = record.entityType === "wifi4eu_municipality";
  const countryLabel =
    regionNames?.of(record.countryCode === "EL" ? "GR" : record.countryCode) ??
    record.countryCode;
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    record.sourceIds.includes(entry.id),
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
            <p className="text-sm font-semibold leading-snug">
              {isMunicipality ? tp.municipalityTitle : record.name}
            </p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">
              {record.municipality}
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
          {isMunicipality ? tp.municipalityBadge : tp.badge}
        </p>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={record.name}
              latitude={record.latitude}
              longitude={record.longitude}
              countryCode={record.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {isMunicipality ? (
          <section className="mb-4">
            <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
              {tp.municipalityAvailabilityNote}
            </p>
          </section>
        ) : (
          <>
            <section className="mb-4">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                {tp.location}
              </h2>
              <p className="flex items-center gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
                <MapPin className="h-4 w-4 shrink-0 text-cyan-300" />
                {record.address ?? record.municipality}
              </p>
            </section>
            <section className="mb-4">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                {tp.locationPrecision}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
                {tp.exactHotspotPrecision}
              </p>
            </section>
          </>
        )}

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.municipality}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {record.municipality}
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

        {!isMunicipality ? (
          <section className="mb-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.freePublicWifi}
            </h2>
            <p className="flex items-center gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
              {tp.freePublicWifiNote}
            </p>
          </section>
        ) : null}

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.programme}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {record.programme}
          </p>
        </section>

        <section className="mb-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.source}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {sourceLabel(record.sourceType, tp)}
          </p>
          {source ? (
            <a
              href={source.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[11px] text-[var(--map-ui-muted)] hover:text-sky-300 hover:underline"
            >
              {source.name}
            </a>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
