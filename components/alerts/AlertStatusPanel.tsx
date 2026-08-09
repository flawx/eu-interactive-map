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
    other?: number;
  };
  trafficFlowEnabled?: boolean;
  trafficIncidentsEnabled?: boolean;
  trafficDetailsZoomOk?: boolean;
  forceCollapsedToken?: number;
};

function statusLabel(
  status: AlertConnectorStatus | undefined,
  activeCount: number,
  t: ReturnType<typeof getMessages>["alertPanel"],
  emptyLabel?: string,
): string {
  if (status === "misconfigured") return t.configurationRequired;
  if (status === "unavailable") return t.connectorUnavailable;
  if (status === "delayed") return t.connectorDelayed;
  if (status === "operational" && activeCount === 0) {
    return emptyLabel ?? t.noActiveEventsInView;
  }
  return status === "operational"
    ? t.connectorOperational
    : t.noRecentData;
}

function SegButton({
  active,
  label,
  onClick,
  activeClassName,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 flex-1 rounded-md px-2 py-1 ${
        active
          ? (activeClassName ?? "map-ui-seg-btn-active")
          : "map-ui-seg-btn"
      }`}
    >
      {label}
    </button>
  );
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
    other: 0,
  },
  trafficFlowEnabled = false,
  trafficIncidentsEnabled = false,
  trafficDetailsZoomOk = true,
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
    <section
      className="map-ui-panel absolute bottom-4 left-1/2 z-20 w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl p-3 text-[11px] backdrop-blur-md"
      data-theme-surface="traffic-panel"
    >
      <button
        type="button"
        className="mb-2 flex w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left hover:bg-[var(--map-ui-surface-hover)]"
        aria-expanded={!collapsed}
        onClick={toggleCollapsed}
      >
        <span className="font-semibold" style={{ color: "var(--map-ui-text)" }}>
          {trafficEnabled ? "Road traffic" : "Alerts"}
        </span>
        {collapsed ? (
          <ChevronUp
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--map-ui-muted)" }}
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--map-ui-muted)" }}
            aria-hidden="true"
          />
        )}
      </button>
      {collapsed ? null : (
        <>
          {showGeneralModes && (
            <div className="map-ui-seg flex gap-1 rounded-lg p-1">
              {(
                [
                  ["active", t.activeMode],
                  ["24h", t.last24Hours],
                  ["72h", t.last72Hours],
                ] as const
              ).map(([value, label]) => (
                <SegButton
                  key={value}
                  active={mode === value}
                  label={label}
                  onClick={() => onModeChange(value)}
                />
              ))}
            </div>
          )}
          {earthquakeEnabled && (
            <div className={`${showGeneralModes ? "mt-2" : ""}`}>
              <p
                className="mb-1 font-medium"
                style={{ color: "var(--map-ui-text)" }}
              >
                {t.earthquake}
              </p>
              <div className="map-ui-seg flex gap-1 rounded-lg p-1">
                {(
                  [
                    ["1h", t.lastHour],
                    ["24h", t.last24Hours],
                    ["7d", t.last7Days],
                  ] as const
                ).map(([value, label]) => (
                  <SegButton
                    key={value}
                    active={earthquakeMode === value}
                    label={label}
                    onClick={() => onEarthquakeModeChange?.(value)}
                    activeClassName="bg-[color-mix(in_srgb,var(--warning)_20%,transparent)] text-[var(--warning)]"
                  />
                ))}
              </div>
            </div>
          )}
          {volcanoEnabled && (
            <div className="mt-2">
              <p
                className="mb-1 font-medium"
                style={{ color: "var(--map-ui-text)" }}
              >
                {t.volcano}
              </p>
              <div className="map-ui-seg flex gap-1 rounded-lg p-1">
                {(
                  [
                    ["ongoing", t.ongoingActivity],
                    ["72h", t.last72Hours],
                    ["30d", t.last30Days],
                  ] as const
                ).map(([value, label]) => (
                  <SegButton
                    key={value}
                    active={volcanoMode === value}
                    label={label}
                    onClick={() => onVolcanoModeChange?.(value)}
                    activeClassName="bg-[color-mix(in_srgb,var(--danger)_20%,transparent)] text-[var(--danger)]"
                  />
                ))}
              </div>
            </div>
          )}
          {showCems && (
            <div className="mt-2">
              <p
                className="mb-1 font-medium"
                style={{ color: "var(--map-ui-text)" }}
              >
                Copernicus EMS Mapping
              </p>
              <div className="map-ui-seg flex gap-1 rounded-lg p-1">
                {(
                  [
                    ["ongoing", t.ongoingActivity],
                    ["72h", t.last72Hours],
                    ["30d", t.last30Days],
                  ] as const
                ).map(([value, label]) => (
                  <SegButton
                    key={value}
                    active={cemsMode === value}
                    label={label}
                    onClick={() => onCemsModeChange?.(value)}
                    activeClassName="bg-[color-mix(in_srgb,var(--warning)_20%,transparent)] text-[var(--warning)]"
                  />
                ))}
              </div>
            </div>
          )}
          {trafficEnabled && (
            <div className={showGeneralModes || earthquakeEnabled ? "mt-2" : ""}>
              <p
                className="mb-1 font-medium"
                style={{ color: "var(--map-ui-text)" }}
              >
                Road traffic
              </p>
              <div className="map-ui-seg grid grid-cols-3 gap-1 rounded-lg p-1">
                {(
                  [
                    ["current", "Current"],
                    ["planned", "Planned"],
                    ["recent", "Recently ended"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onTrafficModeChange?.(value)}
                    className={`min-h-10 rounded-md px-2 py-1 ${
                      trafficMode === value
                        ? "map-ui-seg-btn-active"
                        : "map-ui-seg-btn"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {demoMode && (
            <p
              className="mt-2 rounded-md border px-2 py-1 font-semibold"
              style={{
                borderColor: "color-mix(in srgb, var(--warning) 40%, transparent)",
                background:
                  "color-mix(in srgb, var(--warning) 12%, transparent)",
                color: "var(--warning)",
              }}
            >
              {t.demoData}
            </p>
          )}
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {showGeneralModes && (
              <>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  Meteoalarm
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {statusLabel(statuses.meteoalarm, meteoalarmActiveCount, t)}
                </dd>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  GDACS floods
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {statusLabel(statuses.gdacs, gdacsActiveCount, t)}
                </dd>
              </>
            )}
            {copernicus && (
              <>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  Copernicus GFM
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
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
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  USGS
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {statusLabel(statuses.usgs, 1, t)}
                </dd>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  EMSC
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {statusLabel(statuses.emsc, 1, t)}
                </dd>
              </>
            )}
            {(earthquakeEnabled || volcanoEnabled) && (
              <>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  GDACS geological hazards
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {statusLabel(statuses["gdacs-geological"], 1, t)}
                </dd>
              </>
            )}
            {showLhasa && (
              <>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  NASA LHASA
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
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
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  Copernicus EMS Mapping
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {statusLabel(
                    statuses["copernicus-emergency-mapping"],
                    1,
                    t,
                  )}
                </dd>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  eMARS
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  Documentary source · not a live feed
                </dd>
              </>
            )}
            {trafficEnabled && (
              <>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  Traffic flow
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {trafficFlowEnabled
                    ? statusLabel(statuses["tomtom-traffic"], 1, t)
                    : t.layerDisabled}
                </dd>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  Traffic incidents
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {!trafficIncidentsEnabled
                    ? t.layerDisabled
                    : !trafficDetailsZoomOk
                      ? t.zoomInForIncidents
                      : statusLabel(
                          statuses["tomtom-traffic"],
                          trafficCounts.visible,
                          t,
                          t.noActiveEventsInView,
                        )}
                </dd>
                {trafficIncidentsEnabled ? (
                  <>
                    <dt
                      className="font-medium"
                      style={{ color: "var(--map-ui-text)" }}
                    >
                      {t.visibleIncidentsInView}
                    </dt>
                    <dd
                      className="text-right"
                      style={{ color: "var(--map-ui-muted)" }}
                    >
                      {trafficCounts.active} active / {trafficCounts.visible}{" "}
                      visible · {trafficCounts.accidents} accidents ·{" "}
                      {trafficCounts.jams} jams · {trafficCounts.closures}{" "}
                      closures · {trafficCounts.roadworks} roadworks
                      {typeof trafficCounts.other === "number"
                        ? ` · ${trafficCounts.other} other`
                        : ""}
                    </dd>
                  </>
                ) : null}
              </>
            )}
            {demoMode && (
              <>
                <dt className="font-medium" style={{ color: "var(--map-ui-text)" }}>
                  {t.demoUnavailableProvider}
                </dt>
                <dd className="text-right" style={{ color: "var(--map-ui-muted)" }}>
                  {t.connectorUnavailable}
                </dd>
              </>
            )}
          </dl>
          {copernicus && (
            <p
              className="mt-2 border-t pt-2 text-[10px]"
              style={{
                borderColor: "var(--map-ui-border)",
                color: "var(--map-ui-muted)",
              }}
            >
              {t.observationNotForecast}
            </p>
          )}
          {showLhasa && (
            <p
              className="mt-2 border-t pt-2 text-[10px]"
              style={{
                borderColor: "var(--map-ui-border)",
                color: "var(--map-ui-muted)",
              }}
            >
              Modelled landslide likelihood. It does not confirm that a
              landslide occurred.
            </p>
          )}
        </>
      )}
    </section>
  );
}
