"use client";

import { ExternalLink, Umbrella, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getMajorBeachById, type BeachCoastalType } from "@/lib/travel/majorBeaches";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";
import type { Messages } from "@/lib/i18n/messages/types";

type BeachResortPanelProps = {
  beachId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function coastalTypeLabel(
  type: BeachCoastalType,
  tp: Messages["beachResortPanel"],
): string {
  switch (type) {
    case "atlantic":
      return tp.coastalTypeAtlantic;
    case "mediterranean":
      return tp.coastalTypeMediterranean;
    case "adriatic":
      return tp.coastalTypeAdriatic;
    case "aegean":
      return tp.coastalTypeAegean;
    case "baltic":
      return tp.coastalTypeBaltic;
    default:
      return tp.coastalTypeNorthSea;
  }
}

export default function BeachResortPanel({
  beachId,
  locale,
  onClose,
  onRouteToPlace,
}: BeachResortPanelProps) {
  const t = getMessages(locale);
  const tp = t.beachResortPanel;
  const beach = getMajorBeachById(beachId) ?? null;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!beach) return null;

  const countryLabel =
    regionNames?.of(beach.countryCode === "EL" ? "GR" : beach.countryCode) ??
    beach.countryCode;
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    beach.sourceIds.includes(entry.id),
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-sky-300/30 bg-[#0284c7] text-sky-50 shadow-sm">
            <Umbrella className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{beach.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{beach.municipality}</p>
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
        <p className="mt-2 inline-flex rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-200">
          {tp.badge}
        </p>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={beach.name}
              latitude={beach.latitude}
              longitude={beach.longitude}
              countryCode={beach.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.municipality}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {beach.municipality} · {beach.region} · {countryLabel}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.coastalType}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {coastalTypeLabel(beach.coastalType, tp)}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.officialWebsite}
          </h2>
          <a
            href={beach.officialTourismUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
          >
            {beach.officialTourismUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
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
