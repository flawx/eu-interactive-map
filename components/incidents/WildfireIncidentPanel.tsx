"use client";

import { useEffect, useMemo, useState } from "react";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type { WildfireIncident } from "@/lib/incidents/types";
import type {
  WildfireAreaMeasurement,
  WildfireOperationalSummary,
  WildfireOperationalUpdate,
  WildfireSafetyLocation,
  WildfireTimelineItem,
  WildfireVerificationStatus,
} from "@/lib/incidents/wildfireOperational";
import { isActiveOfficialEvacuation } from "@/lib/incidents/wildfireOperational";

type OpsTab = "situation" | "safety" | "timeline" | "sources";

type WildfireIncidentPanelProps = {
  incident: WildfireIncident;
  locale: Locale;
  snapshot?: EffisBurnedAreaSnapshot | null;
  firmsSnapshot?: FirmsIncidentSnapshot | null;
  firmsSnapshotStatus?: "live" | "cached" | null;
  firmsHistorySnapshot?: FirmsIncidentSnapshot | null;
  onClose: () => void;
  onFocusGeometry?: (geometry: GeoJSON.Geometry) => void;
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

function verificationLabel(
  status: WildfireVerificationStatus | null | undefined,
  t: ReturnType<typeof getMessages>,
): string | null {
  if (!status) return null;
  if (status === "official") return t.incidents.opsOfficialSource;
  if (status === "verified") return t.incidents.opsVerifiedInfo;
  if (status === "disputed") return t.incidents.opsDisputedInfo;
  return t.incidents.opsUnverifiedInfo;
}

function areaLabel(
  measurement: WildfireAreaMeasurement,
  t: ReturnType<typeof getMessages>,
): string {
  switch (measurement.labelKey) {
    case "areaFirms24h":
      return t.incidents.opsAreaFirms24h;
    case "areaFirms7d":
      return t.incidents.opsAreaFirms7d;
    case "areaEffis":
      return t.incidents.opsAreaEffis;
    case "areaGdacs":
      return t.incidents.opsAreaGdacs;
  }
}

function areaBadgeLabel(
  measurement: WildfireAreaMeasurement,
  t: ReturnType<typeof getMessages>,
): string {
  if (measurement.badge === "official") return t.incidents.opsOfficialBadge;
  if (measurement.badge === "gdacs_declared") return t.incidents.opsGdacsDeclared;
  return t.incidents.opsSatelliteEstimate;
}

function UpdateCard({
  update,
  locale,
  t,
  emphasize,
  onFocusGeometry,
}: {
  update: WildfireOperationalUpdate | WildfireSafetyLocation;
  locale: Locale;
  t: ReturnType<typeof getMessages>;
  emphasize?: boolean;
  onFocusGeometry?: (geometry: GeoJSON.Geometry) => void;
}) {
  const published = formatIncidentDate(update.publishedAt, locale);
  const verified = formatIncidentDate(update.lastVerifiedAt, locale);
  const expires = formatIncidentDate(update.expiresAt, locale);
  const verification = verificationLabel(update.verificationStatus, t);

  return (
    <div
      className={`space-y-1.5 rounded-md border px-2.5 py-2 ${
        emphasize
          ? "border-red-400/40 bg-red-500/10"
          : "border-white/10 bg-white/5"
      }`}
    >
      <p className="text-xs font-semibold text-slate-100">
        {update.title || t.incidents.dataUnavailable}
      </p>
      {update.body && (
        <p className="text-[11px] leading-snug text-slate-300">{update.body}</p>
      )}
      {"locationName" in update && update.locationName && (
        <p className="text-[11px] text-slate-300">{update.locationName}</p>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
        <span>
          {t.incidents.source}: {update.sourceName}
        </span>
        {verification && <span>{verification}</span>}
        {published && (
          <span>
            {t.incidents.updatedAt}: {published}
          </span>
        )}
        {verified && (
          <span>
            {t.incidents.opsLastVerification}: {verified}
          </span>
        )}
        {expires && (
          <span>
            {t.incidents.opsExpires}: {expires}
          </span>
        )}
        {"status" in update && update.status && (
          <span>
            {t.incidents.opsStatus}: {update.status}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        {update.geometry && onFocusGeometry && (
          <button
            type="button"
            onClick={() => onFocusGeometry(update.geometry!)}
            className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-sky-300 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            {t.incidents.opsFocusOnMap}
          </button>
        )}
        {update.sourceUrl && (
          <a
            href={update.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-sky-300 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            {t.incidents.opsOpenSource}
          </a>
        )}
      </div>
    </div>
  );
}

function TimelineRow({
  item,
  locale,
  t,
}: {
  item: WildfireTimelineItem;
  locale: Locale;
  t: ReturnType<typeof getMessages>;
}) {
  const when = formatIncidentDate(item.occurredAt, locale);
  return (
    <div className="relative border-l border-white/15 pl-3">
      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-sky-400/80" />
      <p className="text-[10px] text-slate-400">{when || t.incidents.dataUnavailable}</p>
      <p className="text-xs font-medium text-slate-100">{item.title}</p>
      {item.body && (
        <p className="text-[11px] leading-snug text-slate-300">{item.body}</p>
      )}
      <p className="text-[10px] text-slate-400">
        {item.sourceName} · {verificationLabel(item.verificationStatus, t)}
      </p>
    </div>
  );
}

export default function WildfireIncidentPanel({
  incident,
  locale,
  snapshot = null,
  firmsSnapshot = null,
  firmsSnapshotStatus = null,
  firmsHistorySnapshot = null,
  onClose,
  onFocusGeometry,
}: WildfireIncidentPanelProps) {
  const t = getMessages(locale);
  const numberFormatter = new Intl.NumberFormat(locale);
  const [opsTab, setOpsTab] = useState<OpsTab>("situation");
  const [opsSummary, setOpsSummary] = useState<WildfireOperationalSummary | null>(
    null,
  );
  const [opsLoading, setOpsLoading] = useState(true);
  const [opsError, setOpsError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setOpsLoading(true);
    setOpsError(false);

    const load = async () => {
      try {
        const response = await fetch(
          `/api/incidents/wildfires/${encodeURIComponent(incident.id)}/operational`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          if (!controller.signal.aborted) {
            setOpsError(true);
            setOpsSummary(null);
          }
          return;
        }
        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "summary" in data &&
          data.summary &&
          typeof data.summary === "object"
        ) {
          if (!controller.signal.aborted) {
            setOpsSummary(data.summary as WildfireOperationalSummary);
            setOpsError(false);
          }
        } else if (!controller.signal.aborted) {
          setOpsError(true);
          setOpsSummary(null);
        }
      } catch {
        if (!controller.signal.aborted) {
          setOpsError(true);
          setOpsSummary(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setOpsLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [incident.id]);

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

  const firmsLastObservation = firmsSnapshot
    ? formatIncidentDate(
        firmsSnapshot.sourceUpdatedAt ?? firmsSnapshot.fetchedAt,
        locale,
      )
    : null;

  const firmsApproximateArea =
    firmsSnapshot &&
    firmsSnapshot.approximateAreaHectares !== null &&
    Number.isFinite(firmsSnapshot.approximateAreaHectares)
      ? `${numberFormatter.format(firmsSnapshot.approximateAreaHectares)} ha`
      : null;

  const firmsSensors = firmsSnapshot?.sensors.join(", ") ?? null;
  const firmsStatusLabel =
    firmsSnapshotStatus === "live"
      ? t.incidents.firmsLiveData
      : firmsSnapshotStatus === "cached"
        ? t.incidents.firmsCachedData
        : null;

  const firmsHistoryPeriodLabel = useMemo(() => {
    if (!firmsHistorySnapshot) return null;
    const start = formatIncidentDate(firmsHistorySnapshot.periodStart ?? null, locale);
    const end = formatIncidentDate(firmsHistorySnapshot.periodEnd ?? null, locale);
    if (start && end) return `${start} – ${end}`;
    return start || end;
  }, [firmsHistorySnapshot, locale]);

  const firmsHistorySensors = firmsHistorySnapshot?.sensors.join(", ") ?? null;
  const firmsHistoryApproximateArea =
    firmsHistorySnapshot &&
    firmsHistorySnapshot.approximateAreaHectares !== null &&
    Number.isFinite(firmsHistorySnapshot.approximateAreaHectares)
      ? `${numberFormatter.format(firmsHistorySnapshot.approximateAreaHectares)} ha`
      : null;
  const firmsHistoryRefreshedAt = firmsHistorySnapshot
    ? formatIncidentDate(firmsHistorySnapshot.fetchedAt, locale)
    : null;

  const tabs: Array<{ id: OpsTab; label: string }> = [
    { id: "situation", label: t.incidents.opsTabSituation },
    { id: "safety", label: t.incidents.opsTabSafety },
    { id: "timeline", label: t.incidents.opsTabTimeline },
    { id: "sources", label: t.incidents.opsTabSourcesCommunity },
  ];

  const activeEvacuations =
    opsSummary?.evacuationOrders.filter((item) =>
      isActiveOfficialEvacuation(item),
    ) ?? [];
  const otherEvacuations =
    opsSummary?.evacuationOrders.filter(
      (item) => !isActiveOfficialEvacuation(item),
    ) ?? [];

  const hasSafetyContent =
    !!opsSummary &&
    (opsSummary.evacuationOrders.length > 0 ||
      opsSummary.safetyInstructions.length > 0 ||
      opsSummary.gatheringPoints.length > 0 ||
      opsSummary.shelters.length > 0 ||
      opsSummary.receptionCenters.length > 0 ||
      opsSummary.roadClosures.length > 0);

  return (
    <aside className="absolute bottom-4 left-4 top-4 z-20 flex w-[min(100%-2rem,24rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/92 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
            {t.incidents.wildfireTitle}
          </p>
          <h2 className="truncate text-sm font-semibold text-white">
            {incident.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 outline-none transition hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400/70"
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${alertClasses}`}
        >
          <span className={`h-2 w-2 rounded-full ${alertDot}`} />
          <span className="text-[11px] font-medium">{alertLabel}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-slate-400">{t.incidents.country}:</span>
            <span className="text-slate-100">
              {incident.countryName ||
                incident.countryCode ||
                t.incidents.dataUnavailable}
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
          <div className="flex items-start gap-2">
            <span className="shrink-0 text-slate-400">
              {t.incidents.exposedPopulation}:
            </span>
            <span className="text-slate-100">
              {exposedPopulation || t.incidents.dataUnavailable}
            </span>
          </div>
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

        {firmsSnapshot && (
          <div className="mt-1 space-y-2 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold leading-snug text-slate-100">
                {t.incidents.firmsDataTitle}
              </p>
              {firmsStatusLabel && (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300">
                  {firmsStatusLabel}
                </span>
              )}
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">{t.incidents.source}:</span>
              <span className="text-slate-100">NASA FIRMS / VIIRS</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.firmsLastObservation}:
              </span>
              <span className="text-slate-100">
                {firmsLastObservation || t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.firmsDetectionCount}:
              </span>
              <span className="text-slate-100">
                {numberFormatter.format(firmsSnapshot.detectionCount)}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">{t.incidents.firmsSensors}:</span>
              <span className="text-slate-100">
                {firmsSensors || t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.firmsApproximateArea}:
              </span>
              <span className="text-slate-100">
                {firmsApproximateArea || t.incidents.dataUnavailable}
              </span>
            </div>
            <p className="text-[10px] leading-snug text-slate-400">
              {t.incidents.firmsAreaDisclaimer}
            </p>
          </div>
        )}

        {firmsHistorySnapshot && (
          <div className="mt-1 space-y-2 border-t border-white/10 pt-3">
            <p className="text-xs font-semibold leading-snug text-slate-100">
              {t.incidents.firmsHistoryTitle}
            </p>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.firmsHistoryPeriod}:
              </span>
              <span className="text-slate-100">
                {firmsHistoryPeriodLabel || t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.firmsHistoryDetectionCount}:
              </span>
              <span className="text-slate-100">
                {numberFormatter.format(firmsHistorySnapshot.detectionCount)}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">{t.incidents.firmsSensors}:</span>
              <span className="text-slate-100">
                {firmsHistorySensors || t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.firmsApproximateArea}:
              </span>
              <span className="text-slate-100">
                {firmsHistoryApproximateArea || t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">{t.incidents.source}:</span>
              <span className="text-slate-100">NASA FIRMS / VIIRS</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.firmsHistoryRefreshedAt}:
              </span>
              <span className="text-slate-100">
                {firmsHistoryRefreshedAt || t.incidents.dataUnavailable}
              </span>
            </div>
            <p className="text-[10px] leading-snug text-slate-400">
              {t.incidents.firmsHistoryDisclaimer}
            </p>
          </div>
        )}

        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="grid grid-cols-2 gap-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOpsTab(tab.id)}
                className={`rounded-md border px-2 py-1.5 text-[10px] outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                  opsTab === tab.id
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {opsLoading && (
            <div className="space-y-2" aria-busy="true">
              <div className="h-3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="h-16 animate-pulse rounded bg-white/5" />
              <p className="text-[10px] text-slate-400">{t.incidents.opsLoading}</p>
            </div>
          )}

          {!opsLoading && opsError && (
            <p className="text-[11px] leading-snug text-amber-200/90">
              {t.incidents.opsUnavailable}
            </p>
          )}

          {!opsLoading && !opsError && opsSummary && opsTab === "situation" && (
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {t.incidents.opsCause}
                </p>
                <p className="text-xs text-slate-100">
                  {opsSummary.cause.status === "unknown" ||
                  !opsSummary.cause.description
                    ? t.incidents.opsCauseUnconfirmed
                    : opsSummary.cause.description}
                </p>
              </div>

              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {t.incidents.opsCurrentSituation}
                </p>
                <p className="text-xs text-slate-100">
                  {opsSummary.currentSituation?.body ||
                    opsSummary.currentSituation?.title ||
                    t.incidents.dataUnavailable}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t.incidents.opsLastKnownArea}
                </p>
                {opsSummary.areaMeasurements.length === 0 && (
                  <p className="text-xs text-slate-300">
                    {t.incidents.dataUnavailable}
                  </p>
                )}
                {opsSummary.areaMeasurements.map((measurement) => (
                  <div
                    key={measurement.kind}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-medium text-slate-100">
                        {areaLabel(measurement, t)}
                      </p>
                      <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-slate-300">
                        {areaBadgeLabel(measurement, t)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-200">
                      {measurement.valueHectares !== null
                        ? `${numberFormatter.format(measurement.valueHectares)} ha`
                        : t.incidents.dataUnavailable}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {measurement.source}
                      {measurement.observedAt
                        ? ` · ${formatIncidentDate(measurement.observedAt, locale)}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {t.incidents.opsDeployedResources}
                </p>
                <p className="text-xs text-slate-100">
                  {opsSummary.deployedResources?.summary ||
                    t.incidents.opsResourcesUnknown}
                </p>
              </div>

              <p className="text-[10px] text-slate-400">
                {t.incidents.opsLastUpdate}:{" "}
                {formatIncidentDate(opsSummary.lastUpdatedAt, locale) ||
                  t.incidents.dataUnavailable}
              </p>
            </div>
          )}

          {!opsLoading && !opsError && opsSummary && opsTab === "safety" && (
            <div className="space-y-3">
              {!hasSafetyContent && (
                <p className="text-[11px] leading-snug text-slate-300">
                  {t.incidents.opsNoOfficialInstructions}
                </p>
              )}

              {activeEvacuations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-red-300">
                    {t.incidents.opsActiveEvacuation}
                  </p>
                  {activeEvacuations.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      locale={locale}
                      t={t}
                      emphasize
                      onFocusGeometry={onFocusGeometry}
                    />
                  ))}
                </div>
              )}

              {otherEvacuations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t.incidents.opsEvacuationOrder}
                  </p>
                  {otherEvacuations.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      locale={locale}
                      t={t}
                      onFocusGeometry={onFocusGeometry}
                    />
                  ))}
                </div>
              )}

              {opsSummary.safetyInstructions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t.incidents.opsSafetyInstruction}
                  </p>
                  {opsSummary.safetyInstructions.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      locale={locale}
                      t={t}
                      onFocusGeometry={onFocusGeometry}
                    />
                  ))}
                </div>
              )}

              {opsSummary.gatheringPoints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t.incidents.opsGatheringPoint}
                  </p>
                  {opsSummary.gatheringPoints.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      locale={locale}
                      t={t}
                      onFocusGeometry={onFocusGeometry}
                    />
                  ))}
                </div>
              )}

              {opsSummary.shelters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t.incidents.opsShelter}
                  </p>
                  {opsSummary.shelters.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      locale={locale}
                      t={t}
                      onFocusGeometry={onFocusGeometry}
                    />
                  ))}
                </div>
              )}

              {opsSummary.receptionCenters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t.incidents.opsReceptionCenter}
                  </p>
                  {opsSummary.receptionCenters.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      locale={locale}
                      t={t}
                      onFocusGeometry={onFocusGeometry}
                    />
                  ))}
                </div>
              )}

              {opsSummary.roadClosures.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {t.incidents.opsRoadClosure}
                  </p>
                  {opsSummary.roadClosures.map((update) => (
                    <UpdateCard
                      key={update.id}
                      update={update}
                      locale={locale}
                      t={t}
                      onFocusGeometry={onFocusGeometry}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!opsLoading && !opsError && opsSummary && opsTab === "timeline" && (
            <div className="space-y-3">
              {opsSummary.timeline.length === 0 && (
                <p className="text-[11px] text-slate-300">
                  {t.incidents.opsEmptyTimeline}
                </p>
              )}
              {opsSummary.timeline.map((item) => (
                <TimelineRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          )}

          {!opsLoading && !opsError && opsSummary && opsTab === "sources" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t.incidents.opsOfficialSources}
                </p>
                {[
                  ...opsSummary.authorityMessages,
                  ...opsSummary.evacuationOrders,
                  ...opsSummary.safetyInstructions,
                ].length === 0 && (
                  <p className="text-[11px] text-slate-300">
                    {t.incidents.opsNoOfficialInstructions}
                  </p>
                )}
                {[
                  ...opsSummary.authorityMessages,
                  ...opsSummary.evacuationOrders,
                  ...opsSummary.safetyInstructions,
                ].map((update) => (
                  <UpdateCard
                    key={update.id}
                    update={update}
                    locale={locale}
                    t={t}
                    onFocusGeometry={onFocusGeometry}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t.incidents.opsMedia}
                </p>
                {opsSummary.mediaUpdates.length === 0 && (
                  <p className="text-[11px] text-slate-300">
                    {t.incidents.dataUnavailable}
                  </p>
                )}
                {opsSummary.mediaUpdates.map((update) => (
                  <UpdateCard
                    key={update.id}
                    update={update}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t.incidents.opsCommunity}
                </p>
                {opsSummary.communityUpdates.length === 0 && (
                  <p className="text-[11px] text-slate-300">
                    {t.incidents.dataUnavailable}
                  </p>
                )}
                {opsSummary.communityUpdates.map((update) => (
                  <div key={update.id} className="space-y-1">
                    <p className="text-[10px] font-medium text-amber-200/90">
                      {t.incidents.opsCommunityUnverified}
                    </p>
                    <UpdateCard update={update} locale={locale} t={t} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
