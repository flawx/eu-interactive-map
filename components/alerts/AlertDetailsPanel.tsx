"use client";

import { ExternalLink, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type {
  AlertConnectorStatus,
  AlertDataNature,
  NormalizedAlert,
} from "@/lib/alerts/types";
import { severityColor } from "@/lib/alerts/severity";

type Props = {
  alert: NormalizedAlert;
  locale: Locale;
  connectorStatus?: AlertConnectorStatus;
  onClose: () => void;
};

function formatDate(value: string | null, locale: Locale): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AlertDetailsPanel({
  alert,
  locale,
  connectorStatus = "operational",
  onClose,
}: Props) {
  const t = getMessages(locale).alertPanel;
  const nature = String(alert.metadata.dataNature ?? (
    alert.observed ? "satellite-observation" : alert.forecast ? "forecast-model" : "impact-estimation"
  )) as AlertDataNature;
  const natureLabel =
    nature === "official-warning"
      ? t.officialWarning
      : nature === "satellite-observation"
        ? t.satelliteObservation
        : nature === "forecast-model"
          ? t.forecastModel
          : t.impactEstimate;
  const statusLabel =
    alert.status === "active"
      ? t.activeAlert
      : alert.status === "upcoming"
        ? t.upcomingAlert
        : alert.status === "cancelled"
          ? t.cancelledAlert
          : alert.status === "ended"
            ? t.expiredAlert
            : t.unknownStatus;
  const connectorLabel =
    connectorStatus === "operational"
      ? t.connectorOperational
      : connectorStatus === "delayed"
        ? t.connectorDelayed
        : connectorStatus === "misconfigured"
          ? t.connectorMisconfigured
          : t.connectorUnavailable;
  const updatedAt = formatDate(alert.updatedAt, locale);
  const onsetAt = formatDate(alert.onsetAt, locale);
  const expiresAt = formatDate(alert.expiresAt, locale);
  const areaSquareKilometers =
    typeof alert.metadata.affectedAreaSquareKilometers === "number" &&
    Number.isFinite(alert.metadata.affectedAreaSquareKilometers)
      ? alert.metadata.affectedAreaSquareKilometers
      : null;
  const affectedPopulation =
    typeof alert.metadata.populationExposure === "number" &&
    Number.isFinite(alert.metadata.populationExposure)
      ? alert.metadata.populationExposure
      : null;
  const acquisitionTime = formatDate(
    typeof alert.metadata.acquisitionTime === "string"
      ? alert.metadata.acquisitionTime
      : null,
    locale,
  );
  const publishedAt = formatDate(
    typeof alert.metadata.publishedAt === "string"
      ? alert.metadata.publishedAt
      : null,
    locale,
  );

  return (
    <aside
      className="absolute left-4 z-30 flex w-[min(100%-2rem,25rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 text-xs text-slate-200 shadow-2xl backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {natureLabel}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">{alert.title}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                borderColor: `${severityColor(alert.severity)}88`,
                backgroundColor: `${severityColor(alert.severity)}22`,
                color: severityColor(alert.severity),
              }}
            >
              {t.severity}: {alert.severity}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px]">
              {statusLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t.summary}
          </h3>
          <p className="mt-1.5 whitespace-pre-line leading-relaxed text-slate-100">
            {alert.description ?? t.unavailable}
          </p>
        </section>

        {alert.category === "flood" && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t.observedArea}
            </h3>
            <p className="mt-1.5 text-slate-100">
              {areaSquareKilometers == null
                ? t.areaUnavailable
                : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(areaSquareKilometers)} km²`}
            </p>
            {affectedPopulation != null && (
              <p className="mt-1 text-slate-300">
                {t.potentiallyAffectedPopulation}:{" "}
                {new Intl.NumberFormat(locale).format(affectedPopulation)}
              </p>
            )}
          </section>
        )}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t.affectedArea}
          </h3>
          <p className="mt-1.5 text-slate-100">
            {[...alert.affectedAreaNames, ...alert.countryCodes].join(" · ") || t.unavailable}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t.timing}
          </h3>
          <dl className="mt-1.5 space-y-1.5">
            {onsetAt && <div><dt className="inline text-slate-400">{t.onsetAt}: </dt><dd className="inline text-slate-100">{onsetAt}</dd></div>}
            {expiresAt && <div><dt className="inline text-slate-400">{t.expiresAt}: </dt><dd className="inline text-slate-100">{expiresAt}</dd></div>}
            <div><dt className="inline text-slate-400">{t.updatedAt}: </dt><dd className="inline text-slate-100">{updatedAt ?? t.unavailable}</dd></div>
          </dl>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t.severityAndCertainty}
          </h3>
          <p className="mt-1.5 text-slate-100">
            {t.severity}: {alert.severity}
            {alert.certainty ? ` · ${t.certainty}: ${alert.certainty}` : ""}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t.instructions}
          </h3>
          <p className="mt-1.5 whitespace-pre-line leading-relaxed text-slate-100">
            {alert.instructions ?? t.noInstructions}
          </p>
        </section>

        {nature === "satellite-observation" && (
          <>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t.associatedData}
              </h3>
              <dl className="mt-1.5 space-y-1.5">
                {acquisitionTime && (
                  <div><dt className="inline text-slate-400">{t.acquisitionTime}: </dt><dd className="inline text-slate-100">{acquisitionTime}</dd></div>
                )}
                {publishedAt && (
                  <div><dt className="inline text-slate-400">{t.publishedAt}: </dt><dd className="inline text-slate-100">{publishedAt}</dd></div>
                )}
                {typeof alert.metadata.satellite === "string" && (
                  <div><dt className="inline text-slate-400">{t.satellite}: </dt><dd className="inline text-slate-100">{alert.metadata.satellite}</dd></div>
                )}
                {typeof alert.metadata.confidencePercent === "number" && (
                  <div><dt className="inline text-slate-400">{t.confidence}: </dt><dd className="inline text-slate-100">{alert.metadata.confidencePercent}%</dd></div>
                )}
              </dl>
            </section>
            <div className="space-y-1.5 rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-100">
              <p>{t.automaticDetection}</p>
              <p>{t.notOfficialConfirmation}</p>
              <p>{t.falsePositivesPossible}</p>
            </div>
          </>
        )}

        {alert.source === "gdacs" && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
            {t.gdacsIndicative}
          </p>
        )}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t.sourceAndAttribution}
          </h3>
          <p className="mt-1.5 text-slate-100">{alert.officialSourceName}</p>
          <p className="mt-1 text-[10px] text-slate-400">{natureLabel} · {connectorLabel}</p>
          {alert.sourceUrl && (
            <a
              href={alert.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-sky-300 hover:bg-white/5"
            >
              {t.openOfficialSource}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </section>
      </div>
    </aside>
  );
}
