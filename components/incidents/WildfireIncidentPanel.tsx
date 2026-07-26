"use client";

import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { WildfireIncident } from "@/lib/incidents/types";

type WildfireIncidentPanelProps = {
  incident: WildfireIncident;
  locale: Locale;
  snapshot?: EffisBurnedAreaSnapshot | null;
  onClose: () => void;
};

function formatIncidentDate(value: string | null, locale: Locale): string | null {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return null;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(fallback);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function WildfireIncidentPanel({
  incident,
  locale,
  snapshot = null,
  onClose,
}: WildfireIncidentPanelProps) {
  const t = getMessages(locale);
  const numberFormatter = new Intl.NumberFormat(locale);

  const alertLabel =
    incident.alertLevel === "green"
      ? t.incidents.greenAlert
      : incident.alertLevel === "orange"
        ? t.incidents.orangeAlert
        : incident.alertLevel === "red"
          ? t.incidents.redAlert
          : t.incidents.unknownAlert;

  const alertClasses =
    incident.alertLevel === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : incident.alertLevel === "orange"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : incident.alertLevel === "red"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-slate-500/30 bg-slate-500/10 text-slate-300";

  const alertDot =
    incident.alertLevel === "green"
      ? "bg-emerald-500"
      : incident.alertLevel === "orange"
        ? "bg-amber-500"
        : incident.alertLevel === "red"
          ? "bg-red-500"
          : "bg-slate-400";

  const startedAt = formatIncidentDate(incident.startedAt, locale);
  const updatedAt = formatIncidentDate(incident.updatedAt, locale);

  const burnedArea =
    incident.areaHectares !== null && Number.isFinite(incident.areaHectares)
      ? `${numberFormatter.format(incident.areaHectares)} ha`
      : null;

  const exposedPopulation =
    incident.populationExposure !== null &&
    Number.isFinite(incident.populationExposure)
      ? numberFormatter.format(incident.populationExposure)
      : null;

  const snapshotArea =
    snapshot &&
    snapshot.areaHectares !== null &&
    Number.isFinite(snapshot.areaHectares)
      ? `${numberFormatter.format(snapshot.areaHectares)} ha`
      : null;

  const snapshotUpdatedAt = snapshot
    ? formatIncidentDate(
        snapshot.sourceUpdatedAt ?? snapshot.fetchedAt,
        locale,
      )
    : null;

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
        {t.incidents.wildfireTitle}
      </p>
      <p className="mt-1 pr-8 text-xs leading-snug text-slate-200">
        {incident.title}
      </p>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.alertLevel}:</span>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${alertClasses}`}
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${alertDot}`}
              aria-hidden="true"
            />
            {alertLabel}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.country}:</span>
          <span className="text-slate-100">
            {incident.countryName || t.incidents.dataUnavailable}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.startedAt}:</span>
          <span className="text-slate-100">
            {startedAt || t.incidents.dataUnavailable}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.updatedAt}:</span>
          <span className="text-slate-100">
            {updatedAt || t.incidents.dataUnavailable}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.burnedArea}:</span>
          <span className="text-slate-100">
            {burnedArea || t.incidents.dataUnavailable}
          </span>
        </div>

        {snapshot && (
          <>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.savedSatelliteArea}:
              </span>
              <span className="text-slate-100">
                {snapshotArea || t.incidents.dataUnavailable}
              </span>
            </div>

            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.satellitePerimeterUpdated}:
              </span>
              <span className="text-slate-100">
                {snapshotUpdatedAt || t.incidents.dataUnavailable}
              </span>
            </div>
          </>
        )}

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">
            {t.incidents.exposedPopulation}:
          </span>
          <span className="text-slate-100">
            {exposedPopulation || t.incidents.dataUnavailable}
          </span>
        </div>

        {incident.description && (
          <p className="leading-relaxed text-slate-200">{incident.description}</p>
        )}

        <div className="flex items-start gap-2">
          <span className="shrink-0 text-slate-400">{t.incidents.source}:</span>
          <span className="text-slate-100">{incident.sourceName}</span>
        </div>

        {incident.sourceUrl && (
          <a
            href={incident.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sky-400 outline-none transition hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            {t.incidents.openSource}
          </a>
        )}

        <p className="text-[10px] leading-snug text-slate-400">
          {t.incidents.disclaimer}
        </p>

        {snapshot && (
          <p className="text-[10px] leading-snug text-slate-400">
            {t.incidents.effisDisclaimer}
          </p>
        )}
      </div>
    </aside>
  );
}
