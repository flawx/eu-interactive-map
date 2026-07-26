"use client";

import { useEffect, useState } from "react";
import { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { WildfireOperationalSummary } from "@/lib/incidents/wildfireOperational";
import { formatIncidentDate } from "@/components/incidents/operational/format";
import {
  OperationalTabs,
  type OpsTabId,
} from "@/components/incidents/operational/OperationalTabs";
import { SafetyTab } from "@/components/incidents/operational/SafetyTab";
import { SituationTab } from "@/components/incidents/operational/SituationTab";
import { SourcesTab } from "@/components/incidents/operational/SourcesTab";
import { TimelinePanel } from "@/components/incidents/operational/TimelinePanel";

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
  const [opsTab, setOpsTab] = useState<OpsTabId>("situation");
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

  const firmsStatusLabel =
    firmsSnapshotStatus === "live"
      ? t.incidents.firmsLiveData
      : firmsSnapshotStatus === "cached"
        ? t.incidents.firmsCachedData
        : null;

  const tabs: Array<{ id: OpsTabId; label: string }> = [
    { id: "situation", label: t.incidents.opsTabSituation },
    { id: "safety", label: t.incidents.opsTabSafety },
    { id: "timeline", label: t.incidents.opsTabTimeline },
    { id: "sources", label: t.incidents.opsTabSources },
  ];

  return (
    <aside className="absolute bottom-4 left-4 top-4 z-20 flex w-[min(100%-2rem,24rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/92 text-xs text-slate-200 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] tracking-[0.14em] text-slate-400">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-3 pb-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${alertClasses}`}
          >
            <span className={`h-2 w-2 rounded-full ${alertDot}`} />
            <span className="text-[11px] font-medium">{alertLabel}</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.country}:
              </span>
              <span className="text-slate-100">
                {incident.countryName ||
                  incident.countryCode ||
                  t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.startedAt}:
              </span>
              <span className="text-slate-100">
                {startedAt || t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.updatedAt}:
              </span>
              <span className="text-slate-100">
                {updatedAt || t.incidents.dataUnavailable}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="shrink-0 text-slate-400">
                {t.incidents.source}:
              </span>
              <span className="text-slate-100">{incident.sourceName}</span>
            </div>
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

          {snapshot && (
            <p className="text-[10px] leading-snug text-slate-500">
              {t.incidents.effisDisclaimer}
            </p>
          )}
        </div>

        <OperationalTabs tabs={tabs} active={opsTab} onChange={setOpsTab} />

        <div className="space-y-3 pt-3">
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
            <SituationTab
              summary={opsSummary}
              incident={incident}
              locale={locale}
              t={t}
              firmsSnapshot={firmsSnapshot}
              firmsHistorySnapshot={firmsHistorySnapshot}
              firmsStatusLabel={firmsStatusLabel}
            />
          )}

          {!opsLoading && !opsError && opsSummary && opsTab === "safety" && (
            <SafetyTab
              summary={opsSummary}
              locale={locale}
              t={t}
              onFocusGeometry={onFocusGeometry}
            />
          )}

          {!opsLoading && !opsError && opsSummary && opsTab === "timeline" && (
            <TimelinePanel
              items={opsSummary.timeline}
              locale={locale}
              t={t}
            />
          )}

          {!opsLoading && !opsError && opsSummary && opsTab === "sources" && (
            <SourcesTab summary={opsSummary} locale={locale} t={t} />
          )}
        </div>
      </div>
    </aside>
  );
}
