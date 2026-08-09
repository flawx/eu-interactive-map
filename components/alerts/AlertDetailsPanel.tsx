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
      : nature === "instrumental-observation"
        ? t.instrumentalObservation
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
      : typeof alert.metadata.affectedPopulation === "number" &&
          Number.isFinite(alert.metadata.affectedPopulation)
        ? alert.metadata.affectedPopulation
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
  const magnitude =
    typeof alert.metadata.magnitude === "number"
      ? alert.metadata.magnitude
      : null;
  const depthKilometers =
    typeof alert.metadata.depthKilometers === "number"
      ? alert.metadata.depthKilometers
      : null;
  const feltReports =
    typeof alert.metadata.feltReports === "number"
      ? alert.metadata.feltReports
      : null;
  const reportedIntensity =
    typeof alert.metadata.maximumReportedIntensity === "number"
      ? alert.metadata.maximumReportedIntensity
      : null;
  const estimatedIntensity =
    typeof alert.metadata.estimatedIntensity === "number"
      ? alert.metadata.estimatedIntensity
      : null;
  const gdacsLevel =
    typeof alert.metadata.gdacsSeverity === "string"
      ? alert.metadata.gdacsSeverity
      : null;
  const providerMagnitudes =
    alert.metadata.providerMagnitudes &&
    typeof alert.metadata.providerMagnitudes === "object"
      ? (alert.metadata.providerMagnitudes as Record<string, number>)
      : {};

  return (
    <aside
      className="absolute left-4 z-30 flex w-[min(100%-2rem,25rem)] flex-col overflow-hidden rounded-xl map-ui-panel text-xs backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[var(--map-ui-border)] bg-[var(--map-ui-surface)] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--map-ui-muted)]">
            {natureLabel}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-[var(--map-ui-text)]">{alert.title}</h2>
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
            <span className="rounded-full border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-2 py-0.5 text-[10px]">
              {statusLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--map-ui-border)] hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {t.summary}
          </h3>
          <p className="mt-1.5 whitespace-pre-line leading-relaxed text-[var(--map-ui-text)]">
            {alert.description ?? t.unavailable}
          </p>
        </section>

        {alert.category === "earthquake" && (
          <>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                {t.earthquake}
              </h3>
              <dl className="mt-1.5 space-y-1.5">
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.magnitude}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {magnitude == null ? t.unavailable : magnitude.toFixed(1)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.magnitudeType}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {typeof alert.metadata.magnitudeType === "string"
                      ? alert.metadata.magnitudeType
                      : t.unavailable}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.depth}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {depthKilometers == null
                      ? t.unavailable
                      : `${depthKilometers.toFixed(1)} km`}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.eventTime}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {onsetAt ?? t.unavailable}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.reviewStatus}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {alert.metadata.reviewStatus === "reviewed"
                      ? t.reviewed
                      : alert.metadata.reviewStatus === "automatic"
                        ? t.automaticReview
                        : t.unavailable}
                  </dd>
                </div>
              </dl>
            </section>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                {t.feltReports}
              </h3>
              <dl className="mt-1.5 space-y-1.5">
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.feltReports}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {feltReports == null
                      ? t.unavailable
                      : new Intl.NumberFormat(locale).format(feltReports)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.reportedIntensity}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {reportedIntensity ?? t.unavailable}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.estimatedIntensity}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {estimatedIntensity ?? t.unavailable}
                  </dd>
                </div>
              </dl>
            </section>
            {Object.keys(providerMagnitudes).length > 1 && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                  {t.providerValues}
                </h3>
                <dl className="mt-1.5 space-y-1.5">
                  {Object.entries(providerMagnitudes).map(([provider, value]) => (
                    <div key={provider}>
                      <dt className="inline uppercase text-[var(--map-ui-muted)]">{provider}: </dt>
                      <dd className="inline text-[var(--map-ui-text)]">M{value.toFixed(1)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {(gdacsLevel || affectedPopulation != null) && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                  {t.impactEstimate}
                </h3>
                {gdacsLevel && (
                  <p className="mt-1.5 text-[var(--map-ui-text)]">
                    {t.gdacsLevel}: {gdacsLevel}
                  </p>
                )}
                {affectedPopulation != null && (
                  <p className="mt-1 text-[var(--map-ui-text)]">
                    {t.potentiallyAffectedPopulation}:{" "}
                    {new Intl.NumberFormat(locale).format(affectedPopulation)}
                  </p>
                )}
              </section>
            )}
            {typeof alert.metadata.tsunamiFlag === "boolean" && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                  {t.tsunamiIndicator}
                </h3>
                <p className="mt-1.5 text-[var(--map-ui-text)]">
                  {alert.metadata.tsunamiFlag ? "true" : "false"}
                </p>
              </section>
            )}
            <div className="space-y-1.5 rounded-lg border border-orange-400/20 bg-orange-400/10 p-3 text-orange-100">
              <p>{t.magnitudeWarning}</p>
              <p>{t.revisionWarning}</p>
              <p>{t.noPrediction}</p>
            </div>
          </>
        )}

        {alert.category === "volcano" && (
          <>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                {t.volcano}
              </h3>
              <dl className="mt-1.5 space-y-1.5">
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.volcanicActivityType}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {typeof alert.metadata.activityType === "string"
                      ? alert.metadata.activityType
                      : t.unavailable}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.eruptionStart}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {formatDate(
                      typeof alert.metadata.eruptionStartAt === "string"
                        ? alert.metadata.eruptionStartAt
                        : null,
                      locale,
                    ) ?? t.unavailable}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--map-ui-muted)]">{t.lastActivity}: </dt>
                  <dd className="inline text-[var(--map-ui-text)]">
                    {formatDate(
                      typeof alert.metadata.lastActivityAt === "string"
                        ? alert.metadata.lastActivityAt
                        : alert.updatedAt,
                      locale,
                    ) ?? t.unavailable}
                  </dd>
                </div>
                {gdacsLevel && (
                  <div>
                    <dt className="inline text-[var(--map-ui-muted)]">{t.gdacsLevel}: </dt>
                    <dd className="inline text-[var(--map-ui-text)]">{gdacsLevel}</dd>
                  </div>
                )}
              </dl>
            </section>
            {typeof alert.metadata.ashCloudInformation === "string" && (
              <section>
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                  {t.ashCloudInformation}
                </h3>
                <p className="mt-1.5 text-[var(--map-ui-text)]">
                  {alert.metadata.ashCloudInformation}
                </p>
              </section>
            )}
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
              {t.volcanoAuthorityWarning}
            </p>
          </>
        )}

        {alert.category === "flood" && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {t.observedArea}
            </h3>
            <p className="mt-1.5 text-[var(--map-ui-text)]">
              {areaSquareKilometers == null
                ? t.areaUnavailable
                : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(areaSquareKilometers)} km²`}
            </p>
            {affectedPopulation != null && (
              <p className="mt-1 text-[var(--map-ui-muted)]">
                {t.potentiallyAffectedPopulation}:{" "}
                {new Intl.NumberFormat(locale).format(affectedPopulation)}
              </p>
            )}
          </section>
        )}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {t.affectedArea}
          </h3>
          <p className="mt-1.5 text-[var(--map-ui-text)]">
            {[...alert.affectedAreaNames, ...alert.countryCodes].join(" · ") || t.unavailable}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {t.timing}
          </h3>
          <dl className="mt-1.5 space-y-1.5">
            {onsetAt && <div><dt className="inline text-[var(--map-ui-muted)]">{t.onsetAt}: </dt><dd className="inline text-[var(--map-ui-text)]">{onsetAt}</dd></div>}
            {expiresAt && <div><dt className="inline text-[var(--map-ui-muted)]">{t.expiresAt}: </dt><dd className="inline text-[var(--map-ui-text)]">{expiresAt}</dd></div>}
            <div><dt className="inline text-[var(--map-ui-muted)]">{t.updatedAt}: </dt><dd className="inline text-[var(--map-ui-text)]">{updatedAt ?? t.unavailable}</dd></div>
          </dl>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {t.severityAndCertainty}
          </h3>
          <p className="mt-1.5 text-[var(--map-ui-text)]">
            {t.severity}: {alert.severity}
            {alert.certainty ? ` · ${t.certainty}: ${alert.certainty}` : ""}
          </p>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {t.instructions}
          </h3>
          <p className="mt-1.5 whitespace-pre-line leading-relaxed text-[var(--map-ui-text)]">
            {alert.instructions ?? t.noInstructions}
          </p>
        </section>

        {nature === "satellite-observation" && (
          <>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
                {t.associatedData}
              </h3>
              <dl className="mt-1.5 space-y-1.5">
                {acquisitionTime && (
                  <div><dt className="inline text-[var(--map-ui-muted)]">{t.acquisitionTime}: </dt><dd className="inline text-[var(--map-ui-text)]">{acquisitionTime}</dd></div>
                )}
                {publishedAt && (
                  <div><dt className="inline text-[var(--map-ui-muted)]">{t.publishedAt}: </dt><dd className="inline text-[var(--map-ui-text)]">{publishedAt}</dd></div>
                )}
                {typeof alert.metadata.satellite === "string" && (
                  <div><dt className="inline text-[var(--map-ui-muted)]">{t.satellite}: </dt><dd className="inline text-[var(--map-ui-text)]">{alert.metadata.satellite}</dd></div>
                )}
                {typeof alert.metadata.confidencePercent === "number" && (
                  <div><dt className="inline text-[var(--map-ui-muted)]">{t.confidence}: </dt><dd className="inline text-[var(--map-ui-text)]">{alert.metadata.confidencePercent}%</dd></div>
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

        {(alert.source === "gdacs" ||
          typeof alert.metadata.gdacsEventId === "string") && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-amber-100">
            {t.gdacsIndicative}
          </p>
        )}

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {t.sourceAndAttribution}
          </h3>
          <p className="mt-1.5 text-[var(--map-ui-text)]">{alert.officialSourceName}</p>
          <p className="mt-1 text-[10px] text-[var(--map-ui-muted)]">{natureLabel} · {connectorLabel}</p>
          {alert.sourceUrl && (
            <a
              href={alert.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--map-ui-border)] px-2.5 py-1.5 text-sky-300 hover:bg-[var(--map-ui-surface-hover)]"
            >
              {t.openOfficialSource}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {Boolean(
            alert.metadata.providerUrls &&
              typeof alert.metadata.providerUrls === "object",
          ) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(
                  alert.metadata.providerUrls as Record<string, string>,
                ).map(([provider, url]) => (
                  <a
                    key={provider}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--map-ui-border)] px-2 py-1 text-[10px] uppercase text-sky-300 hover:bg-[var(--map-ui-surface-hover)]"
                  >
                    {provider}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ))}
              </div>
            )}
        </section>
      </div>
    </aside>
  );
}
