"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Plane,
  Shield,
  X,
  Zap,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { countActiveMapLayers } from "@/lib/map/mapLayerPreferences";

type MapLegendProps = {
  locale: Locale;
  showEurozone: boolean;
  onToggleEurozone: (value: boolean) => void;
  showNonEurozone: boolean;
  onToggleNonEurozone: (value: boolean) => void;
  showCandidates: boolean;
  onToggleCandidates: (value: boolean) => void;
  showSchengenNonEU: boolean;
  onToggleSchengenNonEU: (value: boolean) => void;
  showWildfires: boolean;
  onToggleWildfires: (value: boolean) => void;
  showSatelliteActiveFires: boolean;
  onToggleSatelliteActiveFires: (value: boolean) => void;
  showSatelliteBurnedAreas: boolean;
  onToggleSatelliteBurnedAreas: (value: boolean) => void;
  highlight?: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

type LegendCategoryId =
  | "europe"
  | "tourism"
  | "security"
  | "alerts"
  | "energy";

export default function MapLegend({
  locale,
  showEurozone,
  onToggleEurozone,
  showNonEurozone,
  onToggleNonEurozone,
  showCandidates,
  onToggleCandidates,
  showSchengenNonEU,
  onToggleSchengenNonEU,
  showWildfires,
  onToggleWildfires,
  showSatelliteActiveFires,
  onToggleSatelliteActiveFires,
  showSatelliteBurnedAreas,
  onToggleSatelliteBurnedAreas,
  highlight,
  collapsed,
  onCollapsedChange,
}: MapLegendProps) {
  const t = getMessages(locale);
  const isHighlighted = Boolean(highlight);
  const open = !collapsed;
  const [expanded, setExpanded] = useState<Record<LegendCategoryId, boolean>>({
    europe: false,
    tourism: false,
    security: false,
    alerts: true,
    energy: false,
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCollapsedChange(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCollapsedChange]);

  const europeActive = [
    showEurozone,
    showNonEurozone,
    showSchengenNonEU,
    showCandidates,
  ].filter(Boolean).length;

  const alertsActive = [
    showWildfires,
    showSatelliteActiveFires,
    showSatelliteBurnedAreas,
  ].filter(Boolean).length;

  const activeLayerCount = countActiveMapLayers({
    euroArea: showEurozone,
    euOutsideEuroArea: showNonEurozone,
    schengenOutsideEu: showSchengenNonEU,
    euCandidates: showCandidates,
    majorWildfires: showWildfires,
    satelliteActiveFires: showSatelliteActiveFires,
    recentSatelliteHistory: showSatelliteBurnedAreas,
  });

  const activeLayersLabel =
    activeLayerCount === 1 ? t.legend.activeLayer : t.legend.activeLayers;

  const toggleCategory = (id: LegendCategoryId) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  const compactButton = (
    <button
      type="button"
      className="map-ui-control inline-flex h-11 items-center gap-2 px-3.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
      aria-label={t.legend.expandLegend}
      aria-expanded={false}
      onClick={() => onCollapsedChange(false)}
    >
      <Layers className="h-4 w-4 text-[#1a73e8]" aria-hidden="true" />
      <span className="hidden sm:inline">{t.legend.title}</span>
      <span
        className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          background: "rgba(26, 115, 232, 0.12)",
          color: "#1a73e8",
        }}
        aria-label={`${activeLayerCount} ${activeLayersLabel}`}
      >
        {activeLayerCount}
      </span>
    </button>
  );

  const panel = (
    <aside
      className={`flex max-h-[min(70vh,34rem)] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--map-ui-radius)] border transition ${
        isHighlighted ? "ring-2 ring-[#1a73e8]/70" : ""
      }`}
      style={{
        background: "var(--map-ui-surface)",
        borderColor: "var(--map-ui-border)",
        boxShadow: "var(--map-ui-shadow)",
        color: "var(--map-ui-text)",
        maxHeight:
          "min(70vh, 34rem, calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px))))",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--map-ui-border)" }}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t.legend.title}</h2>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--map-ui-muted)" }}
          >
            {activeLayerCount} {activeLayersLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="hidden h-10 w-10 items-center justify-center rounded-full outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 md:inline-flex"
            aria-label={t.legend.collapseLegend}
            onClick={() => onCollapsedChange(true)}
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 md:hidden"
            aria-label={t.legend.closeLegend}
            onClick={() => onCollapsedChange(true)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <Category
          id="europe"
          title={t.nav.europe}
          icon={<Layers className="h-4 w-4 text-[#1a73e8]" aria-hidden="true" />}
          activeCount={europeActive}
          expanded={expanded.europe}
          onToggle={() => toggleCategory("europe")}
        >
          <LayerToggle
            checked={showEurozone}
            onChange={onToggleEurozone}
            color="#2563eb"
            label={t.legend.eurozone}
          />
          <LayerToggle
            checked={showNonEurozone}
            onChange={onToggleNonEurozone}
            color="#7c3aed"
            label={t.legend.nonEurozone}
          />
          <LayerToggle
            checked={showSchengenNonEU}
            onChange={onToggleSchengenNonEU}
            color="#14b8a6"
            label={t.legend.schengenNonEU}
          />
          <LayerToggle
            checked={showCandidates}
            onChange={onToggleCandidates}
            color="#f59e0b"
            label={t.legend.officialCandidate}
          />
        </Category>

        <Category
          id="tourism"
          title={t.nav.tourism}
          icon={<Plane className="h-4 w-4 text-[#188038]" aria-hidden="true" />}
          activeCount={0}
          expanded={expanded.tourism}
          onToggle={() => toggleCategory("tourism")}
        >
          <EmptyCategory t={t} />
        </Category>

        <Category
          id="security"
          title={t.nav.security}
          icon={<Shield className="h-4 w-4 text-[#f9ab00]" aria-hidden="true" />}
          activeCount={0}
          expanded={expanded.security}
          onToggle={() => toggleCategory("security")}
        >
          <EmptyCategory t={t} />
        </Category>

        <Category
          id="alerts"
          title={t.nav.alerts}
          icon={
            <AlertTriangle
              className="h-4 w-4 text-[#d93025]"
              aria-hidden="true"
            />
          }
          activeCount={alertsActive}
          expanded={expanded.alerts}
          onToggle={() => toggleCategory("alerts")}
        >
          <LayerToggle
            checked={showWildfires}
            onChange={onToggleWildfires}
            color="#ef4444"
            label={t.legend.majorWildfires}
            swatchClassName="rounded-full"
            swatchStyle={{
              background:
                "linear-gradient(135deg, #ef4444 0%, #ef4444 55%, #f59e0b 55%, #f59e0b 100%)",
            }}
          />
          <LayerToggle
            checked={showSatelliteActiveFires}
            onChange={onToggleSatelliteActiveFires}
            color="#f97316"
            label={t.legend.satelliteActiveFires}
          />
          <LayerToggle
            checked={showSatelliteBurnedAreas}
            onChange={onToggleSatelliteBurnedAreas}
            color="#7c2d12"
            label={t.legend.satelliteBurnedAreas}
          />
          <p
            className="px-2 pb-1 text-[10px] leading-snug"
            style={{ color: "var(--map-ui-muted)" }}
          >
            {t.legend.satelliteHistoryNote}
          </p>
          <p
            className="px-2 pb-1 text-[10px] leading-snug"
            style={{ color: "var(--map-ui-muted)" }}
          >
            {t.incidents.gdacsScopeDisclaimer}
          </p>
          <p
            className="px-2 pb-2 text-[10px] leading-snug"
            style={{ color: "var(--map-ui-muted)" }}
          >
            {t.incidents.satelliteDetectionDisclaimer}
          </p>
        </Category>

        <Category
          id="energy"
          title={t.nav.energy}
          icon={<Zap className="h-4 w-4 text-[#f9ab00]" aria-hidden="true" />}
          activeCount={0}
          expanded={expanded.energy}
          onToggle={() => toggleCategory("energy")}
        >
          <EmptyCategory t={t} />
        </Category>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile compact trigger */}
      <div
        className="absolute left-1/2 -translate-x-1/2 md:hidden"
        style={{
          zIndex: 900,
          bottom: "max(1rem, calc(16px + env(safe-area-inset-bottom, 0px)))",
        }}
      >
        {compactButton}
      </div>

      {/* Desktop */}
      <div
        className="absolute right-4 hidden md:block"
        style={{
          zIndex: 900,
          top: "var(--map-panel-top-offset)",
        }}
      >
        {collapsed ? compactButton : panel}
      </div>

      {/* Mobile bottom drawer */}
      {open ? (
        <div
          className="fixed inset-0 md:hidden"
          style={{ zIndex: 950 }}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            aria-label={t.legend.closeLegend}
            onClick={() => onCollapsedChange(true)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center p-3"
            style={{
              paddingBottom:
                "max(0.75rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            {panel}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Category({
  id,
  title,
  icon,
  activeCount,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  activeCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="mb-1 rounded-xl">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
        aria-expanded={expanded}
        aria-controls={`legend-category-${id}`}
        onClick={onToggle}
      >
        {icon}
        <span className="min-w-0 flex-1 text-sm font-medium">{title}</span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          style={{
            background: "rgba(26, 115, 232, 0.1)",
            color: "#1a73e8",
          }}
        >
          {activeCount}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--map-ui-muted)" }}
          aria-hidden="true"
        />
      </button>
      {expanded ? (
        <div id={`legend-category-${id}`} className="space-y-1 px-1 pb-2 pt-1">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function LayerToggle({
  checked,
  onChange,
  color,
  label,
  swatchClassName = "rounded-sm",
  swatchStyle,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  color: string;
  label: string;
  swatchClassName?: string;
  swatchStyle?: CSSProperties;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[var(--map-ui-surface-hover)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded-sm border"
        style={{ accentColor: color }}
      />
      <span
        className={`h-3.5 w-3.5 shrink-0 border ${swatchClassName}`}
        style={{
          backgroundColor: color,
          borderColor: "var(--map-ui-border)",
          ...swatchStyle,
        }}
      />
      <span className="text-xs leading-snug">{label}</span>
    </label>
  );
}

function EmptyCategory({
  t,
}: {
  t: ReturnType<typeof getMessages>;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2">
      <p className="text-xs" style={{ color: "var(--map-ui-muted)" }}>
        {t.legend.noLayersYet}
      </p>
      <span
        className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
        style={{
          borderColor: "var(--map-ui-border)",
          color: "var(--map-ui-muted)",
        }}
      >
        {t.nav.comingSoon}
      </span>
    </div>
  );
}
