"use client";

import { ExternalLink, Leaf, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { Natura2000DesignationType, Natura2000Site } from "@/lib/travel/natura2000/types";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";
import type { Messages } from "@/lib/i18n/messages/types";

type Natura2000PanelProps = {
  site: Natura2000Site | null;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function designationLabel(
  type: Natura2000DesignationType,
  tp: Messages["natura2000Panel"],
): string {
  switch (type) {
    case "SPA":
      return tp.designationSpa;
    case "SAC":
      return tp.designationSac;
    case "SCI":
      return tp.designationSci;
    case "pSCI":
      return tp.designationPsci;
    default:
      return tp.designationUnknown;
  }
}

export default function Natura2000Panel({
  site,
  locale,
  onClose,
  onRouteToPlace,
}: Natura2000PanelProps) {
  const t = getMessages(locale);
  const tp = t.natura2000Panel;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!site) return null;

  const countryLabel = site.countryCode
    ? regionNames?.of(site.countryCode === "EL" ? "GR" : site.countryCode) ?? site.countryCode
    : null;
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    site.sourceIds.includes(entry.id),
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-emerald-300/30 bg-[#16a34a] text-emerald-50 shadow-sm">
            <Leaf className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{site.siteName}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{site.siteCode}</p>
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
        <p className="mt-2 inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
          {tp.badge}
        </p>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={site.siteName}
              latitude={site.latitude}
              longitude={site.longitude}
              countryCode={site.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
            <p className="mt-1 text-[10px] italic leading-snug text-[var(--map-ui-muted)]">
              {tp.directionsDisclaimer}
            </p>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.designationType}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {designationLabel(site.designationType, tp)}
          </p>
        </section>

        {countryLabel ? (
          <section className="mb-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.country}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
              {countryLabel}
            </p>
          </section>
        ) : null}

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.areaHectares}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {site.areaHectares !== null
              ? `${site.areaHectares.toLocaleString(locale)} ha`
              : tp.areaUnavailable}
          </p>
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
              className="inline-flex items-center gap-1 text-[11px] text-[var(--map-ui-muted)] hover:text-sky-300 hover:underline"
            >
              {source.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
