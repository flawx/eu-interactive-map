"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type {
  AlertActivityMode,
  AlertConnectorStatus,
  EarthquakeTimeMode,
  VolcanoTimeMode,
  CemsActivationTimeMode,
  TrafficIncidentTimeMode,
} from "@/lib/alerts/types";
import type { CopernicusFloodLayerStatus } from "@/lib/alerts/copernicusFlood";

const TRAFFIC_PANEL_COLLAPSED_KEY = "eu-map-traffic-panel-collapsed-v1";

type Props = {
  locale: Locale;
  mode: AlertActivityMode;
  onModeChange: (mode: AlertActivityMode) => void;
  statuses: Record<string, AlertConnectorStatus>;
  gdacsActiveCount: number;
  meteoalarmActiveCount: number;
  copernicus: CopernicusFloodLayerStatus | null;
  demoMode: boolean;
  showGeneralModes?: boolean;
  earthquakeEnabled?: boolean;
  earthquakeMode?: EarthquakeTimeMode;
  onEarthquakeModeChange?: (mode: EarthquakeTimeMode) => void;
  volcanoEnabled?: boolean;
  volcanoMode?: VolcanoTimeMode;
  onVolcanoModeChange?: (mode: VolcanoTimeMode) => void;
  showCems?: boolean;
  cemsMode?: CemsActivationTimeMode;
  onCemsModeChange?: (mode: CemsActivationTimeMode) => void;
  showLhasa?: boolean;
  lhasaValidAt?: string | null;
  trafficEnabled?: boolean;
  trafficMode?: TrafficIncidentTimeMode;
  onTrafficModeChange?: (mode: TrafficIncidentTimeMode) => void;
  trafficCounts?: {
    visible: number;
    active: number;
    accidents: number;
    jams: number;
    closures: number;
    roadworks: number;
  };
  forceCollapsedToken?: number;
};

function statusLabel(
  status: AlertConnectorStatus | undefined,
  activeCount: number,
  t: ReturnType<typeof getMessages>["alertPanel"],
): string {
  if (status === "misconfigured") return t.configurationRequired;
  if (status === "unavailable") return t.connectorUnavailable;
  if (status === "delayed") return t.connectorDelayed;
  if (status === "operational" && activeCount === 0) {
    return t.noActiveEventsEurope;
  }
  return status === "operational"
    ? t.connectorOperational
    : t.noRecentData;
}

export default function AlertStatusPanel({
  locale,
  mode,
  onModeChange,
  statuses,
  gdacsActiveCount,
  meteoalarmActiveCount,
  copernicus,
  demoMode,
  showGeneralModes = true,
  earthquakeEnabled = false,
  earthquakeMode = "24h",
  onEarthquakeModeChange,
  volcanoEnabled = false,
  volcanoMode = "ongoing",
  onVolcanoModeChange,
  showCems = false,
  cemsMode = "ongoing",
  onCemsModeChange,
  showLhasa = false,
  lhasaValidAt = null,
  trafficEnabled = false,
  trafficMode = "current",
  onTrafficModeChange,
  trafficCounts = {
    visible: 0,
    active: 0,
    accidents: 0,
    jams: 0,
    closures: 0,
    roadworks: 0,
  },
  forceCollapsedToken = 0,
}: Props) {
  const t = getMessages(locale).alertPanel;
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TRAFFIC_PANEL_COLLAPSED_KEY);
      if (raw === "false") setCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (forceCollapsedToken <= 0) return;
    setCollapsed(true);
    try {
      window.localStorage.setItem(TRAFFIC_PANEL_COLLAPSED_KEY, "true");
    } catch {
      // ignore
    }
  }, [forceCollapsedToken]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          TRAFFIC_PANEL_COLLAPSED_KEY,
          next ? "true" : "false",
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const acquisition = copernicus?.acquisitionTime
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(copernicus.acquisitionTime))
    : null;
  return (
    <section className="absolute bottom-4 left-1/2 z-20 w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/92 p-3 text-[11px] text-slate-200 shadow-xl backdrop-blur-md">
      <button
        type="button"
        className="mb-2 flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-white/5"
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
      >
        <span className="font-semibold text-slate-100">
          {trafficEnabled ? "Road traffic" : "Alerts"}
        </span>
        {collapsed ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        )}
      </button>
      {collapsed ? null : (
      <>
      {showGeneralModes && (
      <div className="flex gap-1 rounded-lg bg-white/5 p-1">
        {([
          ["active", t.activeMode],
          ["24h", t.last24Hours],
          ["72h", t.last72Hours],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className={`min-h-9 flex-1 rounded-md px-2 py-1 ${mode === value ? "bg-sky-500/25 text-sky-100" : "text-slate-400 hover:bg-white/5"}`}
          >
            {label}
          </button>
        ))}
      </div>
      )}
      {earthquakeEnabled && (
        <div className={`${showGeneralModes ? "mt-2" : ""}`}>
          <p className="mb-1 font-medium text-slate-200">{t.earthquake}</p>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {([
              ["1h", t.lastHour],
              ["24h", t.last24Hours],
              ["7d", t.last7Days],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onEarthquakeModeChange?.(value)}
                className={`min-h-9 flex-1 rounded-md px-2 py-1 ${earthquakeMode === value ? "bg-orange-500/25 text-orange-100" : "text-slate-400 hover:bg-white/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {volcanoEnabled && (
        <div className="mt-2">
          <p className="mb-1 font-medium text-slate-200">{t.volcano}</p>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {([
              ["ongoing", t.ongoingActivity],
              ["72h", t.last72Hours],
              ["30d", t.last30Days],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onVolcanoModeChange?.(value)}
                className={`min-h-9 flex-1 rounded-md px-2 py-1 ${volcanoMode === value ? "bg-red-500/25 text-red-100" : "text-slate-400 hover:bg-white/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {showCems && (
        <div className="mt-2">
          <p className="mb-1 font-medium text-slate-200">Copernicus EMS Mapping</p>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {([
              ["ongoing", t.ongoingActivity],
              ["72h", t.last72Hours],
              ["30d", t.last30Days],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onCemsModeChange?.(value)}
                className={`min-h-9 flex-1 rounded-md px-2 py-1 ${cemsMode === value ? "bg-amber-500/25 text-amber-100" : "text-slate-400 hover:bg-white/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {trafficEnabled && (
        <div className="mt-2">
          <p className="mb-1 font-medium text-slate-200">Road traffic</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/5 p-1">
            {([
              ["current", "Current"],
              ["planned", "Planned"],
              ["recent", "Recently ended"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onTrafficModeChange?.(value)}
                className={`min-h-10 rounded-md px-2 py-1 ${trafficMode === value ? "bg-orange-500/25 text-orange-100" : "text-slate-400 hover:bg-white/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
      {demoMode && (
        <p className="mt-2 rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 font-semibold text-amber-100">
          {t.demoData}
        </p>
      )}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {showGeneralModes && (
          <>
            <dt className="font-medium text-slate-200">Meteoalarm</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(statuses.meteoalarm, meteoalarmActiveCount, t)}
            </dd>
            <dt className="font-medium text-slate-200">GDACS floods</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(statuses.gdacs, gdacsActiveCount, t)}
            </dd>
          </>
        )}
        {copernicus && (
          <>
            <dt className="font-medium text-slate-200">Copernicus GFM</dt>
            <dd className="text-right text-slate-400">
              {copernicus.connectorStatus === "unavailable"
                ? t.connectorUnavailable
                : acquisition
                  ? `${t.acquisitionTime}: ${acquisition} UTC`
                  : t.noRecentData}
            </dd>
          </>
        )}
        {earthquakeEnabled && (
          <>
            <dt className="font-medium text-slate-200">USGS</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(statuses.usgs, 1, t)}
            </dd>
            <dt className="font-medium text-slate-200">EMSC</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(statuses.emsc, 1, t)}
            </dd>
          </>
        )}
        {(earthquakeEnabled || volcanoEnabled) && (
          <>
            <dt className="font-medium text-slate-200">GDACS geological hazards</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(statuses["gdacs-geological"], 1, t)}
            </dd>
          </>
        )}
        {showLhasa && (
          <>
            <dt className="font-medium text-slate-200">NASA LHASA</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(statuses["nasa-lhasa"], 1, t)}
              {lhasaValidAt
                ? ` · ${new Intl.DateTimeFormat(locale, {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "UTC",
                  }).format(new Date(lhasaValidAt))} UTC`
                : ""}
            </dd>
          </>
        )}
        {showCems && (
          <>
            <dt className="font-medium text-slate-200">Copernicus EMS Mapping</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(
                statuses["copernicus-emergency-mapping"],
                1,
                t,
              )}
            </dd>
            <dt className="font-medium text-slate-200">eMARS</dt>
            <dd className="text-right text-slate-400">Documentary source · not a live feed</dd>
          </>
        )}
        {trafficEnabled && (
          <>
            <dt className="font-medium text-slate-200">TomTom Traffic</dt>
            <dd className="text-right text-slate-400">
              {statusLabel(
                statuses["tomtom-traffic"],
                trafficCounts.visible,
                t,
              )}
            </dd>
            <dt className="font-medium text-slate-200">Visible incidents</dt>
            <dd className="text-right text-slate-400">
              {trafficCounts.active} active / {trafficCounts.visible} visible ·{" "}
              {trafficCounts.accidents} accidents ·{" "}
              {trafficCounts.jams} jams · {trafficCounts.closures} closures ·{" "}
              {trafficCounts.roadworks} roadworks
            </dd>
          </>
        )}
        {demoMode && (
          <>
            <dt className="font-medium text-slate-200">
              {t.demoUnavailableProvider}
            </dt>
            <dd className="text-right text-slate-400">
              {t.connectorUnavailable}
            </dd>
          </>
        )}
      </dl>
      {copernicus && (
        <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-cyan-100">
          {t.observationNotForecast}
        </p>
      )}
      {showLhasa && (
        <p className="mt-2 border-t border-white/10 pt-2 text-[10px] text-orange-100">
          Modelled landslide likelihood. It does not confirm that a landslide occurred.
        </p>
      )}
      </>
      )}
    </section>
  );
}
