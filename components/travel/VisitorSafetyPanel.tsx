"use client";

import { ExternalLink, MapPin, ShieldAlert, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  getVisitorSafetyLocationById,
  type VisitorSafetyType,
} from "@/lib/travel/visitorSafety";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";
import type { Messages } from "@/lib/i18n/messages/types";

type VisitorSafetyPanelProps = {
  locationId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function safetyTypeLabel(
  type: VisitorSafetyType,
  tp: Messages["visitorSafetyPanel"],
): string {
  switch (type) {
    case "touristPolice":
      return tp.typeTouristPolice;
    case "emergencyAssistance":
      return tp.typeEmergencyAssistance;
    case "firstAidPost":
      return tp.typeFirstAidPost;
    case "mountainRescue":
      return tp.typeMountainRescue;
    case "beachRescue":
      return tp.typeBeachRescue;
    default:
      return tp.typeVisitorSafetyOffice;
  }
}

export default function VisitorSafetyPanel({
  locationId,
  locale,
  onClose,
  onRouteToPlace,
}: VisitorSafetyPanelProps) {
  const t = getMessages(locale);
  const tp = t.visitorSafetyPanel;
  const location = getVisitorSafetyLocationById(locationId) ?? null;

  if (!location) return null;

  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    location.sourceIds.includes(entry.id),
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-red-300/30 bg-[#dc2626] text-red-100 shadow-sm">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{location.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{location.city}</p>
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
        <p className="mt-2 inline-flex rounded-full border border-red-400/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-200">
          {safetyTypeLabel(location.type, tp)}
        </p>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={location.name}
              latitude={location.latitude}
              longitude={location.longitude}
              countryCode={location.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {location.address ? (
          <section className="mb-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.address}
            </h2>
            <p className="flex items-start gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
              {location.address}
            </p>
            {location.coordinatesApproximate ? (
              <p className="mt-1 text-[10px] italic leading-snug text-[var(--map-ui-muted)]">
                {tp.coordinatesApproximateNote}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.phone}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {location.phone ?? "—"}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.openingHours}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {location.openingHours ?? "—"}
          </p>
        </section>

        {location.officialWebsite ? (
          <section className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.officialWebsite}
            </h2>
            <a
              href={location.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
            >
              {location.officialWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>
        ) : null}

        {source ? (
          <section className="mb-4">
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

        <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[11px] leading-snug text-[var(--map-ui-text)]">
          {tp.emergency112Note}
        </p>
      </div>
    </aside>
  );
}
