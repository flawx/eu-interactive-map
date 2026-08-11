"use client";

import { ExternalLink, Landmark, MapPin, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  getDiplomaticMissionById,
  type DiplomaticMissionType,
} from "@/lib/travel/diplomaticMissions";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";
import type { Messages } from "@/lib/i18n/messages/types";

type DiplomaticMissionPanelProps = {
  missionId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function missionTypeLabel(
  type: DiplomaticMissionType,
  tp: Messages["diplomaticMissionPanel"],
): string {
  switch (type) {
    case "embassy":
      return tp.missionTypeEmbassy;
    case "consulate":
      return tp.missionTypeConsulate;
    case "permanentRepresentation":
      return tp.missionTypePermanentRepresentation;
    default:
      return tp.missionTypeOther;
  }
}

export default function DiplomaticMissionPanel({
  missionId,
  locale,
  onClose,
  onRouteToPlace,
}: DiplomaticMissionPanelProps) {
  const t = getMessages(locale);
  const tp = t.diplomaticMissionPanel;
  const mission = getDiplomaticMissionById(missionId) ?? null;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!mission) return null;

  const resolveCountryLabel = (code: string) =>
    regionNames?.of(code === "EL" ? "GR" : code) ?? code;
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    mission.sourceIds.includes(entry.id),
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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-300/30 bg-[#334155] text-slate-100 shadow-sm">
            <Landmark className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{mission.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{mission.city}</p>
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
        <p className="mt-2 inline-flex rounded-full border border-slate-400/40 bg-slate-500/15 px-2 py-0.5 text-[10px] font-medium text-slate-200">
          {tp.badge}
        </p>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={mission.name}
              latitude={mission.latitude}
              longitude={mission.longitude}
              countryCode={mission.hostCountry}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.missionType}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {missionTypeLabel(mission.missionType, tp)}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.sendingCountry}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {resolveCountryLabel(mission.sendingCountry)}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.hostCountry}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {mission.city} · {resolveCountryLabel(mission.hostCountry)}
          </p>
        </section>

        {mission.address ? (
          <section className="mb-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.address}
            </h2>
            <p className="flex items-start gap-1.5 text-sm leading-relaxed text-[var(--map-ui-text)]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
              {mission.address}
            </p>
            {mission.coordinatesApproximate ? (
              <p className="mt-1 text-[10px] italic leading-snug text-[var(--map-ui-muted)]">
                {tp.coordinatesApproximateNote}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.emergencyPhone}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {mission.emergencyPhone ?? tp.emergencyPhoneUnavailable}
          </p>
        </section>

        {mission.officialWebsite ? (
          <section className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.officialWebsite}
            </h2>
            <a
              href={mission.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
            >
              {mission.officialWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
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
