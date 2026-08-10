"use client";

import { ExternalLink, Landmark, MapPin, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getEuProjectById } from "@/lib/europe/euProjects/entities";
import type { EuProjectCategory } from "@/lib/europe/euProjects/types";
import { ENTITY_STATUS_COLORS, type EntityStatus } from "@/lib/map/dataLayers/entityStatus";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

type EuProjectPanelProps = {
  projectId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

type EuProjectPanelMessages = ReturnType<typeof getMessages>["euProjectPanel"];

function categoryLabel(
  category: EuProjectCategory,
  t: EuProjectPanelMessages,
): string {
  switch (category) {
    case "transport":
      return t.categoryTransport;
    case "sportCulture":
      return t.categorySportCulture;
    case "protection":
      return t.categoryProtection;
    case "publicSocial":
      return t.categoryPublicSocial;
    case "research":
      return t.categoryResearch;
    case "environment":
      return t.categoryEnvironment;
  }
}

function statusLabel(status: EntityStatus, t: EuProjectPanelMessages): string {
  switch (status) {
    case "proposed":
      return t.statusProposed;
    case "study":
      return t.statusStudy;
    case "planned":
      return t.statusPlanned;
    case "approved":
      return t.statusApproved;
    case "under_construction":
      return t.statusUnderConstruction;
    case "ongoing":
      return t.statusOngoing;
    case "operational":
      return t.statusOperational;
    case "completed":
      return t.statusCompleted;
    case "suspended":
      return t.statusSuspended;
    case "cancelled":
      return t.statusCancelled;
    case "abandoned":
      return t.statusAbandoned;
    case "unknown":
      return t.statusUnknown;
  }
}

function formatBudget(budgetEUR: number | null, locale: Locale): string | null {
  if (budgetEUR === null) return null;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(budgetEUR);
  } catch {
    return `€${budgetEUR.toLocaleString()}`;
  }
}

export default function EuProjectPanel({
  projectId,
  locale,
  onClose,
  onRouteToPlace,
}: EuProjectPanelProps) {
  const t = getMessages(locale);
  const tp = t.euProjectPanel;
  const project = getEuProjectById(projectId) ?? null;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!project) return null;

  const statusColor = ENTITY_STATUS_COLORS[project.status];
  const countryLabel =
    regionNames?.of(project.countryCode === "EL" ? "GR" : project.countryCode) ??
    project.countryCode;
  const otherCountryLabels = (project.countryCodes ?? [])
    .filter((code) => code !== project.countryCode)
    .map((code) => regionNames?.of(code === "EL" ? "GR" : code) ?? code);
  const budgetLabel = formatBudget(project.budgetEUR, locale);
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    project.sourceIds.includes(entry.id),
  );

  return (
    <aside
      className="absolute left-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl map-ui-panel backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-[5] shrink-0 border-b border-[var(--map-ui-border)] bg-[var(--map-ui-surface)] px-4 py-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/30 text-white shadow-sm"
            style={{ backgroundColor: statusColor }}
          >
            <Landmark className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{project.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">
              {categoryLabel(project.category, tp)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tp.close}
            title={tp.close}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--map-ui-muted)] outline-none transition hover:bg-[var(--map-ui-surface-hover)] hover:text-[var(--map-ui-text)] focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <X aria-hidden="true" size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <p className="inline-flex rounded-full border border-blue-400/40 bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-200">
            {tp.badge}
          </p>
          <p
            className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{
              borderColor: `${statusColor}66`,
              backgroundColor: `${statusColor}26`,
              color: statusColor,
            }}
          >
            {statusLabel(project.status, tp)}
          </p>
        </div>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={project.name}
              latitude={project.latitude}
              longitude={project.longitude}
              countryCode={project.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.countries}
          </h2>
          <p className="flex items-center gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
            <MapPin className="h-4 w-4 shrink-0 text-blue-300" />
            {countryLabel}
            {otherCountryLabels.length > 0
              ? ` · ${otherCountryLabels.join(", ")}`
              : null}
          </p>
        </section>

        {project.fundingProgram ? (
          <section className="mb-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.fundingProgram}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
              {project.fundingProgram}
            </p>
          </section>
        ) : null}

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.budget}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {budgetLabel ?? tp.budgetUnknown}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.description}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {project.description}
          </p>
        </section>

        {project.officialUrl ? (
          <section className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.officialWebsite}
            </h2>
            <a
              href={project.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
            >
              {project.officialUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>
        ) : null}

        {source ? (
          <section className="mb-2">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.source}
            </h2>
            <a
              href={source.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--map-ui-muted)] hover:text-sky-300 hover:underline"
            >
              {source.name}
            </a>
          </section>
        ) : null}

        <p className="mt-2 text-[10px] italic leading-snug text-[var(--map-ui-muted)]">
          {tp.unverifiedNote}
        </p>
      </div>
    </aside>
  );
}
