"use client";

import {
  Anchor,
  Car,
  ExternalLink,
  Plane,
  Shield,
  TrainFront,
  X,
} from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  getSchengenBorderCrossingById,
  type BorderCrossingMode,
} from "@/lib/security/schengenBorders";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

type BorderCrossingPointPanelProps = {
  crossingId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function flagCode(code: string): string {
  return code === "EL" ? "GR" : code;
}

function ModeIcon({ mode }: { mode: BorderCrossingMode }) {
  if (mode === "air") return <Plane className="h-5 w-5" aria-hidden />;
  if (mode === "rail") return <TrainFront className="h-5 w-5" aria-hidden />;
  if (mode === "sea" || mode === "river") {
    return <Anchor className="h-5 w-5" aria-hidden />;
  }
  return <Car className="h-5 w-5" aria-hidden />;
}

export default function BorderCrossingPointPanel({
  crossingId,
  locale,
  onClose,
  onRouteToPlace,
}: BorderCrossingPointPanelProps) {
  const t = getMessages(locale);
  const tp = t.borderCrossingPanel;
  const point = getSchengenBorderCrossingById(crossingId) ?? null;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!point) return null;

  const country =
    regionNames?.of(flagCode(point.countryCode)) ?? point.countryCode;
  const neighbour = point.neighbouringCountryCode
    ? regionNames?.of(flagCode(point.neighbouringCountryCode)) ??
      point.neighbouringCountryCode
    : null;
  const placeHasCoords =
    Number.isFinite(point.latitude) && Number.isFinite(point.longitude);

  return (
    <aside
      className="absolute left-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/85 text-white shadow-xl backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-[5] shrink-0 border-b border-white/10 bg-slate-950/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-400/40 bg-blue-950/70 text-blue-100">
            <ModeIcon mode={point.mode} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">
              {point.officialName}
            </p>
            <p className="text-[11px] text-slate-300">
              {country}
              {neighbour ? ` · ${neighbour}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.countryPanel.close}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <X size={22} />
          </button>
        </div>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-100">
          <Shield className="h-3 w-3" />
          {tp.externalBadge}
        </p>
        {onRouteToPlace && placeHasCoords ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={point.officialName}
              latitude={point.latitude}
              longitude={point.longitude}
              countryCode={point.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
        <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-100">
          {tp.verifyBeforeTravel}
        </p>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.status}
          </h2>
          <p className="text-slate-100">{tp.statuses[point.status]}</p>
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.mode}
          </h2>
          <p className="text-slate-100">{tp.modes[point.mode]}</p>
        </section>

        {(point.passengerTraffic != null || point.freightTraffic != null) && (
          <section className="grid grid-cols-2 gap-2 text-[12px]">
            {point.passengerTraffic != null ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-slate-400">{tp.passengers}</p>
                <p className="font-medium">
                  {point.passengerTraffic ? tp.yes : tp.no}
                </p>
              </div>
            ) : null}
            {point.freightTraffic != null ? (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-slate-400">{tp.freight}</p>
                <p className="font-medium">
                  {point.freightTraffic ? tp.yes : tp.no}
                </p>
              </div>
            ) : null}
          </section>
        )}

        {point.openingHours ? (
          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {tp.openingHours}
            </h2>
            <p className="text-slate-100">{point.openingHours}</p>
          </section>
        ) : null}

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.location}
          </h2>
          <p className="text-slate-100">
            {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
          </p>
          {neighbour ? (
            <p className="mt-1 text-[12px] text-slate-300">
              {tp.neighbouringCountry}: {neighbour}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.officialSource}
          </h2>
          <a
            href={point.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
          >
            {point.officialSourceName}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="mt-2 text-[11px] text-slate-400">
            {tp.lastVerified}: {point.lastVerifiedAt}
          </p>
        </section>
      </div>
    </aside>
  );
}
