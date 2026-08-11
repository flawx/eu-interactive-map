"use client";

import { AlertTriangle, ExternalLink, Waves, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type {
  BathingWaterClassification,
  BathingWaterType,
} from "@/lib/travel/bathingWaters/types";
import { BATHING_WATER_CLASSIFICATION_COLORS } from "@/lib/travel/bathingWaters/types";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";
import type { Messages } from "@/lib/i18n/messages/types";

export type BathingWaterPanelSite = {
  id: string;
  name: string;
  countryCode: string;
  waterType: BathingWaterType;
  classification: BathingWaterClassification;
  seasonYear: number | null;
  longitude: number;
  latitude: number;
  sourceIds: string[];
};

type BathingWaterPanelProps = {
  site: BathingWaterPanelSite | null;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function classificationLabel(
  classification: BathingWaterClassification,
  tp: Messages["bathingWaterPanel"],
): string {
  switch (classification) {
    case "excellent":
      return tp.classificationExcellent;
    case "good":
      return tp.classificationGood;
    case "sufficient":
      return tp.classificationSufficient;
    case "poor":
      return tp.classificationPoor;
    default:
      return tp.classificationNotClassified;
  }
}

function waterTypeLabel(
  waterType: BathingWaterType,
  tp: Messages["bathingWaterPanel"],
): string {
  if (waterType === "coastal") return tp.waterTypeCoastal;
  if (waterType === "inland") return tp.waterTypeInland;
  return tp.waterTypeUnknown;
}

export default function BathingWaterPanel({
  site,
  locale,
  onClose,
  onRouteToPlace,
}: BathingWaterPanelProps) {
  const t = getMessages(locale);
  const tp = t.bathingWaterPanel;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!site) return null;

  const countryLabel =
    regionNames?.of(site.countryCode === "EL" ? "GR" : site.countryCode) ??
    site.countryCode;
  const color = BATHING_WATER_CLASSIFICATION_COLORS[site.classification];
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    site.sourceIds.includes(entry.id),
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
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-300/30 text-cyan-50 shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Waves className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{site.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{countryLabel}</p>
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
              name={site.name}
              latitude={site.latitude}
              longitude={site.longitude}
              countryCode={site.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-3 flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-[11px] leading-relaxed text-[var(--map-ui-text)]">
            {tp.disclaimer}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.waterType}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {waterTypeLabel(site.waterType, tp)}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.classification}
          </h2>
          <p
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {classificationLabel(site.classification, tp)}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.seasonYear}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {site.seasonYear ?? tp.seasonYearUnavailable}
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
              className="inline-flex items-center gap-1 text-[11px] text-[var(--map-ui-muted)] hover:text-sky-300 hover:underline"
            >
              {source.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
