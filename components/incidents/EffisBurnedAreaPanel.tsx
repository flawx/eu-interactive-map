"use client";

import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import type { EffisBurnedArea } from "@/lib/incidents/types";

type EffisBurnedAreaPanelProps = {
  burnedArea: EffisBurnedArea;
  locale: Locale;
  onClose: () => void;
};

function formatDate(value: string | null, locale: Locale): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function EffisBurnedAreaPanel({
  burnedArea,
  locale,
  onClose,
}: EffisBurnedAreaPanelProps) {
  const t = getMessages(locale);
  const numberFormatter = new Intl.NumberFormat(locale);

  const areaLabel =
    burnedArea.areaHectares !== null &&
    Number.isFinite(burnedArea.areaHectares)
      ? `${numberFormatter.format(burnedArea.areaHectares)} ha`
      : null;

  const detectedAt = formatDate(burnedArea.detectedAt, locale);
  const updatedAt = formatDate(burnedArea.updatedAt, locale);

  return (
    <aside className="absolute bottom-4 left-4 z-10 w-80 max-w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/85 p-4 text-white shadow-xl backdrop-blur-md">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        ×
      </button>

      <p className="pr-8 text-sm font-semibold leading-snug">
        {t.incidents.satelliteBurnedAreaTitle}
      </p>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">
            {t.incidents.satelliteArea}:
          </span>
          <span className="text-slate-100">
            {areaLabel || t.incidents.dataUnavailable}
          </span>
        </div>

        {burnedArea.areaSource === "calculated-from-geometry" && areaLabel && (
          <p className="text-[10px] leading-snug text-slate-400">
            {t.incidents.calculatedArea}
          </p>
        )}

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">
            {t.incidents.satelliteDetectedAt}:
          </span>
          <span className="text-slate-100">
            {detectedAt || t.incidents.dataUnavailable}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">
            {t.incidents.satelliteUpdatedAt}:
          </span>
          <span className="text-slate-100">
            {updatedAt || t.incidents.dataUnavailable}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.country}:</span>
          <span className="text-slate-100">
            {burnedArea.countryName || t.incidents.dataUnavailable}
          </span>
        </div>

        {burnedArea.regionName && (
          <p className="text-slate-200">{burnedArea.regionName}</p>
        )}

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">
            {t.incidents.sourceLayer}:
          </span>
          <span className="text-slate-100">{burnedArea.sourceLayer}</span>
        </div>

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.source}:</span>
          <span className="text-slate-100">{burnedArea.sourceName}</span>
        </div>

        <a
          href={burnedArea.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex text-sky-400 outline-none transition hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-400/70"
        >
          {t.incidents.openSource}
        </a>

        <p className="text-[10px] leading-snug text-slate-400">
          {t.incidents.effisDisclaimer}
        </p>
      </div>
    </aside>
  );
}
