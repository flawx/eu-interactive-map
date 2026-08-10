"use client";

import { ExternalLink, Globe2, MapPin, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getInternationalOrganisationById } from "@/lib/europe/internationalOrganisations";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

type InternationalOrganisationPanelProps = {
  organisationId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

export default function InternationalOrganisationPanel({
  organisationId,
  locale,
  onClose,
  onRouteToPlace,
}: InternationalOrganisationPanelProps) {
  const t = getMessages(locale);
  const tp = t.internationalOrganisationPanel;
  const organisation = getInternationalOrganisationById(organisationId) ?? null;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!organisation) return null;

  const countryLabel =
    regionNames?.of(
      organisation.countryCode === "EL" ? "GR" : organisation.countryCode,
    ) ?? organisation.countryCode;
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    organisation.sourceIds.includes(entry.id),
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/30 bg-[#0f766e] text-white shadow-sm">
            <Globe2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">
              {organisation.name}
            </p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">
              {organisation.acronym}
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
        <p className="mt-2 inline-flex rounded-full border border-teal-400/40 bg-teal-500/15 px-2 py-0.5 text-[10px] font-medium text-teal-200">
          {tp.badge}
        </p>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={organisation.name}
              latitude={organisation.latitude}
              longitude={organisation.longitude}
              countryCode={organisation.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4 rounded-lg border border-teal-400/25 bg-teal-500/10 px-3 py-2">
          <p className="text-[12px] leading-relaxed text-teal-50/90">
            {tp.notEuInstitutionNote}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.location}
          </h2>
          <p className="flex items-center gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
            <MapPin className="h-4 w-4 shrink-0 text-teal-300" />
            {organisation.city}
            {" · "}
            {countryLabel}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.purpose}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {organisation.purpose}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.officialWebsite}
          </h2>
          <a
            href={organisation.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
          >
            {organisation.officialUrl
              .replace(/^https?:\/\//, "")
              .replace(/\/$/, "")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

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
      </div>
    </aside>
  );
}
