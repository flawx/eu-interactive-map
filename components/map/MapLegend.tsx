"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
  MoreHorizontal,
  Plane,
  Shield,
  X,
  Zap,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { Messages } from "@/lib/i18n/messages/types";
import {
  DEFAULT_EXPANDED_CATEGORIES,
  getActiveLayerCountForCategory,
  getActiveMainLayerCount,
  getFilterActiveTotal,
  getGroupActiveTotal,
  getVisibleLegendCategories,
  loadLegendGroupExpanded,
  saveLegendGroupExpanded,
  type LegendCategoryId,
  type LegendLayerDefinition,
  type LegendTranslationKey,
} from "@/lib/map/legendConfiguration";
import type { MapLayerPreferences } from "@/lib/map/mapLayerPreferences";

type MapLegendProps = {
  locale: Locale;
  preferences: MapLayerPreferences;
  onTogglePreference: (
    key: keyof MapLayerPreferences,
    value: boolean,
  ) => void;
  onResetLayers: () => void;
  highlight?: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  disabledPreferences?: Partial<Record<keyof MapLayerPreferences, boolean>>;
  preferenceStatusLabels?: Partial<
    Record<keyof MapLayerPreferences, string>
  >;
};

function resolveLegendText(
  messages: Messages,
  key: LegendTranslationKey,
): string {
  if (key.ns === "nav") return messages.nav[key.key];
  return messages.legend[key.key];
}

export default function MapLegend({
  locale,
  preferences,
  onTogglePreference,
  onResetLayers,
  highlight,
  collapsed,
  onCollapsedChange,
  disabledPreferences = {},
  preferenceStatusLabels = {},
}: MapLegendProps) {
  const t = getMessages(locale);
  const isHighlighted = Boolean(highlight);
  const open = !collapsed;
  const categories = useMemo(() => getVisibleLegendCategories(), []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [expandedCategories, setExpandedCategories] = useState<
    Record<LegendCategoryId, boolean>
  >(DEFAULT_EXPANDED_CATEGORIES);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => getDefaultGroupsForHydration(),
  );
  const [expandedFilters, setExpandedFilters] = useState<
    Record<string, boolean>
  >({});
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [openDescriptionId, setOpenDescriptionId] = useState<string | null>(
    null,
  );
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setExpandedGroups(loadLegendGroupExpanded());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (openDescriptionId) {
          setOpenDescriptionId(null);
          return;
        }
        if (actionsOpen || confirmReset) {
          setActionsOpen(false);
          setConfirmReset(false);
          return;
        }
        onCollapsedChange(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCollapsedChange, actionsOpen, confirmReset, openDescriptionId]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
        setConfirmReset(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [actionsOpen]);

  const activeLayerCount = getActiveMainLayerCount(preferences);
  const activeLayersLabel =
    activeLayerCount === 0
      ? t.legend.noActiveLayers
      : activeLayerCount === 1
        ? `1 ${t.legend.activeLayer}`
        : `${activeLayerCount} ${t.legend.activeLayers}`;

  const toggleCategory = (id: LegendCategoryId) => {
    setExpandedCategories((current) => ({
      ...current,
      [id]: !current[id],
    }));
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((current) => {
      const next = { ...current, [id]: !current[id] };
      saveLegendGroupExpanded(next);
      return next;
    });
  };

  const toggleFilters = (layerId: string) => {
    setExpandedFilters((current) => ({
      ...current,
      [layerId]: !(current[layerId] ?? false),
    }));
  };

  const collapseAll = () => {
    const nextCategories = { ...DEFAULT_EXPANDED_CATEGORIES };
    for (const key of Object.keys(nextCategories) as LegendCategoryId[]) {
      nextCategories[key] = false;
    }
    setExpandedCategories(nextCategories);
    const nextGroups: Record<string, boolean> = {};
    for (const category of categories) {
      for (const group of category.groups) {
        nextGroups[group.id] = false;
      }
    }
    setExpandedGroups(nextGroups);
    saveLegendGroupExpanded(nextGroups);
    setExpandedFilters({});
    setActionsOpen(false);
    setConfirmReset(false);
  };

  const expandActiveCategories = () => {
    setExpandedCategories((current) => {
      const next = { ...current };
      for (const category of categories) {
        next[category.id] =
          getActiveLayerCountForCategory(category.id, preferences) > 0;
      }
      return next;
    });
    setExpandedGroups((current) => {
      const next = { ...current };
      for (const category of categories) {
        for (const group of category.groups) {
          const { active } = getGroupActiveTotal(group, preferences);
          if (active > 0) next[group.id] = true;
        }
      }
      saveLegendGroupExpanded(next);
      return next;
    });
    setActionsOpen(false);
    setConfirmReset(false);
  };

  const handleReset = () => {
    onResetLayers();
    setConfirmReset(false);
    setActionsOpen(false);
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
        aria-label={activeLayersLabel}
      >
        {activeLayerCount}
      </span>
    </button>
  );

  const panel = (
    <aside
      className={`flex w-full flex-col overflow-hidden rounded-[var(--map-ui-radius)] border transition ${
        isHighlighted ? "ring-2 ring-[#1a73e8]/70" : ""
      }`}
      style={{
        background: "var(--map-ui-surface)",
        borderColor: "var(--map-ui-border)",
        boxShadow: "var(--map-ui-shadow)",
        color: "var(--map-ui-text)",
        pointerEvents: "auto",
        width: "min(340px, calc(100vw - 32px))",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset, 76px) - 24px - env(safe-area-inset-bottom, 0px))",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5"
        style={{ borderColor: "var(--map-ui-border)", flex: "0 0 auto" }}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t.legend.title}</h2>
          <p
            className="mt-0.5 text-[11px]"
            style={{ color: "var(--map-ui-muted)" }}
          >
            {activeLayersLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <div className="relative" ref={actionsRef}>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
              aria-label={t.legend.legendActions}
              aria-expanded={actionsOpen}
              aria-haspopup="menu"
              onClick={() => {
                setActionsOpen((value) => !value);
                setConfirmReset(false);
              }}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
            {actionsOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border py-1 text-sm shadow-lg"
                style={{
                  background: "var(--map-ui-surface)",
                  borderColor: "var(--map-ui-border)",
                  color: "var(--map-ui-text)",
                }}
              >
                {!confirmReset ? (
                  <>
                    <ActionItem
                      label={t.legend.collapseAll}
                      onClick={collapseAll}
                    />
                    <ActionItem
                      label={t.legend.expandActiveCategories}
                      onClick={expandActiveCategories}
                    />
                    <ActionItem
                      label={t.legend.resetLayers}
                      onClick={() => setConfirmReset(true)}
                    />
                  </>
                ) : (
                  <>
                    <p
                      className="px-3 py-2 text-[11px] leading-snug"
                      style={{ color: "var(--map-ui-muted)" }}
                    >
                      {t.legend.confirmResetLayers}
                    </p>
                    <ActionItem
                      label={t.legend.confirmReset}
                      onClick={handleReset}
                    />
                    <ActionItem
                      label={t.legend.cancelReset}
                      onClick={() => setConfirmReset(false)}
                    />
                  </>
                )}
              </div>
            ) : null}
          </div>
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

      <div
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1.5 py-1.5"
        style={{ flex: "1 1 auto", minHeight: 0 }}
      >
        {categories.map((category) => {
          const categoryActive = getActiveLayerCountForCategory(
            category.id,
            preferences,
          );
          const categoryExpanded = expandedCategories[category.id] ?? false;
          return (
            <Category
              key={category.id}
              id={category.id}
              title={resolveLegendText(t, category.titleKey)}
              icon={<CategoryIcon id={category.icon} />}
              activeCount={categoryActive}
              expanded={categoryExpanded}
              onToggle={() => toggleCategory(category.id)}
            >
              {category.groups.map((group) => {
                const groupExpanded = expandedGroups[group.id] ?? false;
                const groupCounts = getGroupActiveTotal(group, preferences);
                return (
                  <Group
                    key={group.id}
                    id={group.id}
                    title={resolveLegendText(t, group.titleKey)}
                    active={groupCounts.active}
                    total={groupCounts.total}
                    expanded={groupExpanded}
                    onToggle={() => toggleGroup(group.id)}
                    activeLabel={t.legend.activeLayers}
                  >
                    {group.layers.map((layer) => (
                      <LayerRow
                        key={layer.id}
                        layer={layer}
                        preferences={preferences}
                        messages={t}
                        filtersExpanded={expandedFilters[layer.id] ?? false}
                        onToggleFilters={() => toggleFilters(layer.id)}
                        onTogglePreference={onTogglePreference}
                        disabled={Boolean(
                          disabledPreferences[layer.preferenceKey],
                        )}
                        statusLabel={
                          preferenceStatusLabels[layer.preferenceKey] ?? null
                        }
                        descriptionOpen={openDescriptionId === layer.id}
                        onToggleDescription={() =>
                          setOpenDescriptionId((current) =>
                            current === layer.id ? null : layer.id,
                          )
                        }
                      />
                    ))}
                    {group.footerNoteKeys?.map((noteKey) => (
                      <p
                        key={`${group.id}-${noteKey.key}`}
                        className="px-2 pb-1 pt-0.5 text-[10px] leading-snug"
                        style={{ color: "var(--map-ui-muted)" }}
                      >
                        {resolveLegendText(t, noteKey)}
                      </p>
                    ))}
                  </Group>
                );
              })}
            </Category>
          );
        })}
      </div>
    </aside>
  );

  if (!mounted) return null;

  const desktopAnchorStyle: CSSProperties = {
    position: "fixed",
    top: "calc(var(--map-panel-top-offset, 76px) - 4px)",
    right: "16px",
    zIndex: 920,
    pointerEvents: "none",
  };

  const legendUi = (
    <>
      {/* Desktop: fixed top-right */}
      <div className="hidden md:block" style={desktopAnchorStyle}>
        <div style={{ pointerEvents: "auto" }}>
          {open ? panel : compactButton}
        </div>
      </div>

      {/* Mobile: compact trigger */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: "max(1rem, calc(16px + env(safe-area-inset-bottom, 0px)))",
          zIndex: 920,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>{compactButton}</div>
      </div>

      {/* Mobile: bottom drawer when open */}
      {open ? (
        <div
          className="md:hidden"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 950,
            pointerEvents: "none",
          }}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/25"
            style={{ pointerEvents: "auto" }}
            aria-label={t.legend.closeLegend}
            onClick={() => onCollapsedChange(true)}
          />
          <div
            className="absolute inset-x-0 bottom-0 flex justify-center p-3"
            style={{
              pointerEvents: "none",
              paddingBottom:
                "max(0.75rem, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>{panel}</div>
          </div>
        </div>
      ) : null}
    </>
  );

  return createPortal(legendUi, document.body);
}

function getDefaultGroupsForHydration(): Record<string, boolean> {
  // Avoid SSR/client mismatch: start with defaults, hydrate from localStorage.
  const result: Record<string, boolean> = {};
  for (const category of getVisibleLegendCategories()) {
    for (const group of category.groups) {
      result[group.id] = group.defaultExpanded;
    }
  }
  return result;
}

function CategoryIcon({ id }: { id: string }) {
  if (id === "plane") {
    return <Plane className="h-4 w-4 text-[#188038]" aria-hidden="true" />;
  }
  if (id === "shield") {
    return <Shield className="h-4 w-4 text-[#f9ab00]" aria-hidden="true" />;
  }
  if (id === "alert") {
    return (
      <AlertTriangle className="h-4 w-4 text-[#d93025]" aria-hidden="true" />
    );
  }
  if (id === "energy") {
    return <Zap className="h-4 w-4 text-[#f9ab00]" aria-hidden="true" />;
  }
  return <Layers className="h-4 w-4 text-[#1a73e8]" aria-hidden="true" />;
}

function ActionItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="flex w-full px-3 py-2.5 text-left text-[13px] outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:bg-[var(--map-ui-surface-hover)]"
      onClick={onClick}
    >
      {label}
    </button>
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
  const panelId = `legend-category-${id}`;
  return (
    <section className="mb-1">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 flex-1 text-sm font-semibold">{title}</span>
        {activeCount > 0 ? (
          <span
            className="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              background: "rgba(26, 115, 232, 0.12)",
              color: "#1a73e8",
            }}
            aria-label={`${activeCount}`}
          >
            {activeCount}
          </span>
        ) : null}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
          style={{ color: "var(--map-ui-muted)" }}
        />
      </button>
      {expanded ? (
        <div id={panelId} className="pb-1 pl-1">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function Group({
  id,
  title,
  active,
  total,
  expanded,
  onToggle,
  activeLabel,
  children,
}: {
  id: string;
  title: string;
  active: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  activeLabel: string;
  children: ReactNode;
}) {
  const panelId = `legend-group-${id}`;
  return (
    <div className="mb-1">
      <button
        type="button"
        className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-1.5 text-left outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span
          className="min-w-0 flex-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--map-ui-muted)" }}
        >
          {title}
        </span>
        <span
          className="text-[10px] font-medium tabular-nums"
          style={{ color: "var(--map-ui-muted)" }}
          aria-label={`${active} / ${total} ${activeLabel}`}
        >
          {active}/{total}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
          style={{ color: "var(--map-ui-muted)" }}
        />
      </button>
      {expanded ? (
        <div id={panelId} className="space-y-0.5 pb-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function LayerRow({
  layer,
  preferences,
  messages,
  filtersExpanded,
  onToggleFilters,
  onTogglePreference,
  descriptionOpen,
  onToggleDescription,
  disabled,
  statusLabel,
}: {
  layer: LegendLayerDefinition;
  preferences: MapLayerPreferences;
  messages: Messages;
  filtersExpanded: boolean;
  onToggleFilters: () => void;
  onTogglePreference: (
    key: keyof MapLayerPreferences,
    value: boolean,
  ) => void;
  descriptionOpen: boolean;
  onToggleDescription: () => void;
  disabled: boolean;
  statusLabel: string | null;
}) {
  const checked = preferences[layer.preferenceKey];
  const title = resolveLegendText(messages, layer.titleKey);
  const description = layer.descriptionKey
    ? resolveLegendText(messages, layer.descriptionKey)
    : null;
  const filters = layer.filters ?? [];
  const filterCounts = getFilterActiveTotal(layer, preferences);
  const filtersPanelId = `legend-filters-${layer.id}`;
  const descriptionId = useId();

  return (
    <div className="rounded-md">
      <div className="flex min-h-11 items-center gap-1.5 px-1.5">
        <label
          className={`flex min-w-0 flex-1 items-center gap-2 py-1 ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
        >
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-[#1a73e8]"
            checked={checked}
            disabled={disabled}
            onChange={(event) =>
              onTogglePreference(layer.preferenceKey, event.target.checked)
            }
          />
          <span
            className={`h-3.5 w-3.5 shrink-0 border border-white/70 shadow-sm ${layer.swatchClassName ?? "rounded-[2px]"}`}
            style={{
              backgroundColor: layer.color,
              ...(layer.swatchStyle as CSSProperties | undefined),
            }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-[13px] leading-snug">
            <span className="block truncate">{title}</span>
            {statusLabel ? (
              <span
                className="block truncate text-[10px] font-normal"
                style={{ color: "var(--map-ui-muted)" }}
              >
                {statusLabel}
              </span>
            ) : null}
          </span>
        </label>
        {description ? (
          <button
            type="button"
            className="inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-full outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
            aria-label={
              descriptionOpen
                ? messages.legend.hideDescription
                : messages.legend.showDescription
            }
            aria-expanded={descriptionOpen}
            aria-controls={descriptionId}
            onClick={onToggleDescription}
          >
            <Info
              className="h-3.5 w-3.5"
              aria-hidden="true"
              style={{ color: "var(--map-ui-muted)" }}
            />
          </button>
        ) : null}
        {filters.length > 0 ? (
          <button
            type="button"
            className="inline-flex h-10 min-w-[3.25rem] shrink-0 items-center justify-end gap-1 rounded-md px-1 outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
            aria-expanded={filtersExpanded}
            aria-controls={filtersPanelId}
            aria-label={`${messages.legend.filters}: ${filterCounts.active}/${filterCounts.total}`}
            onClick={onToggleFilters}
          >
            <span
              className="text-[10px] font-semibold tabular-nums"
              style={{ color: "var(--map-ui-muted)" }}
            >
              {filterCounts.active}/{filterCounts.total}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition ${filtersExpanded ? "rotate-180" : ""}`}
              aria-hidden="true"
              style={{ color: "var(--map-ui-muted)" }}
            />
          </button>
        ) : null}
      </div>
      {description && descriptionOpen ? (
        <p
          id={descriptionId}
          className="px-8 pb-1.5 text-[10px] leading-snug"
          style={{ color: "var(--map-ui-muted)" }}
        >
          {description}
        </p>
      ) : null}
      {filters.length > 0 && filtersExpanded ? (
        <div
          id={filtersPanelId}
          className={`ml-6 space-y-0.5 border-l py-0.5 pl-2 ${checked ? "" : "opacity-50"}`}
          style={{ borderColor: "var(--map-ui-border)" }}
        >
          {filters.map((filter) => (
            <label
              key={filter.id}
              className="flex min-h-10 cursor-pointer items-center gap-2 px-1 py-1"
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-[#1a73e8]"
                checked={preferences[filter.preferenceKey]}
                onChange={(event) =>
                  onTogglePreference(
                    filter.preferenceKey,
                    event.target.checked,
                  )
                }
              />
              <span
                className="h-3 w-3 shrink-0 rounded-[2px] border border-white/70"
                style={{ backgroundColor: filter.color }}
                aria-hidden="true"
              />
              <span className="text-[12px] leading-snug">
                {resolveLegendText(messages, filter.titleKey)}
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
