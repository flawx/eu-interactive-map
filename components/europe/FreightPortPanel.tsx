"use client";

import { Anchor, ExternalLink, MapPin, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getMajorFreightPortById } from "@/lib/europe/majorFreightPorts";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

type FreightPortPanelProps = {
  portId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

export default function FreightPortPanel({
  portId,
  locale,
  onClose,
  onRouteToPlace,
}: FreightPortPanelProps) {
  const t = getMessages(locale);
  const tp = t.freightPortPanel;
  const port = getMajorFreightPortById(portId) ?? null;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!port) return null;

  const countryLabel =
    regionNames?.of(port.countryCode === "EL" ? "GR" : port.countryCode) ??
    port.countryCode;
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    port.sourceIds.includes(entry.id),
  );

  const tenTLabel =
    port.tenTStatus === "core"
      ? tp.tenTCore
      : port.tenTStatus === "comprehensive"
        ? tp.tenTComprehensive
        : tp.tenTUnknown;
  const portTypeLabel =
    port.portType === "inland" ? tp.portTypeInland : tp.portTypeMaritime;

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-300/30 bg-[#1d4ed8] text-blue-100 shadow-sm">
            <Anchor className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{port.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{port.city}</p>
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
          <p className="inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
            {portTypeLabel}
          </p>
        </div>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={port.name}
              latitude={port.latitude}
              longitude={port.longitude}
              countryCode={port.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.location}
          </h2>
          <p className="flex items-center gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
            <MapPin className="h-4 w-4 shrink-0 text-blue-300" />
            {port.city}
            {" · "}
            {countryLabel}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.tenTStatus}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {tenTLabel}
          </p>
        </section>

        {port.officialUrl ? (
          <section className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.officialWebsite}
            </h2>
            <a
              href={port.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
            >
              {port.officialUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
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
      </div>
    </aside>
  );
}
