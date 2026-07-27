"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  TrainFront,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getEurostarStationById } from "@/lib/transport/eurostarNetwork";
import type { EurostarStationDetails } from "@/lib/transport/transportDetails";

const CLIENT_FETCH_TIMEOUT_MS = 12_000;

type EurostarStationPanelProps = {
  stationId: string;
  locale: Locale;
  onClose: () => void;
};

function flagCode(countryCode: string): string {
  return countryCode === "EL" ? "GR" : countryCode;
}

export default function EurostarStationPanel({
  stationId,
  locale,
  onClose,
}: EurostarStationPanelProps) {
  const t = getMessages(locale);
  const tp = t.eurostarPanel;
  const station = getEurostarStationById(stationId) ?? null;
  const [details, setDetails] = useState<EurostarStationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [stationId]);

  useEffect(() => {
    if (!station) return;

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      CLIENT_FETCH_TIMEOUT_MS,
    );

    setLoading(true);
    setError(false);
    setDetails(null);

    const load = async () => {
      try {
        const response = await fetch(
          `/api/transport/eurostar/${encodeURIComponent(station.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (!active) return;
        if (response.ok) {
          const data = (await response.json()) as EurostarStationDetails;
          if (!active) return;
          setDetails(data);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        if (!active) return;
        setError(true);
      } finally {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [station, locale]);

  if (!station) return null;

  const images = details?.images ?? [];
  const photo = images[photoIndex] ?? null;
  const countryName =
    regionNames?.of(flagCode(station.countryCode)) ?? station.countryCode;
  const destinations = details?.directDestinations ?? [];
  const isSeasonal = station.serviceStatus === "seasonal";

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-900/50 text-amber-200 shadow-sm">
            <TrainFront className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{station.name}</p>
            <p className="text-[11px] text-slate-300">
              {station.city} · {countryName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.countryPanel.close}
            title={t.countryPanel.close}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-slate-300 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <X aria-hidden="true" size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-100">
            {tp.badge}
          </span>
          <span
            className={
              isSeasonal
                ? "inline-flex rounded-full border border-orange-400/30 bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-100"
                : "inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-100"
            }
          >
            {isSeasonal ? tp.seasonalService : tp.regularService}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label={tp.loadingDetails}>
            <div className="h-40 animate-pulse rounded-xl bg-white/10" />
            <div className="h-3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-white/10" />
            <div className="mt-2 space-y-2">
              <div className="h-8 animate-pulse rounded-lg bg-white/10" />
              <div className="h-8 animate-pulse rounded-lg bg-white/10" />
            </div>
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-amber-200/90">{tp.detailsUnavailable}</p>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            {photo ? (
              <section>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailUrl ?? photo.url}
                    alt={photo.title ?? station.name}
                    className="h-40 w-full object-cover"
                  />
                  {images.length > 1 ? (
                    <div className="flex items-center justify-between gap-2 bg-black/40 px-2 py-1.5">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-200"
                        onClick={() =>
                          setPhotoIndex(
                            (photoIndex - 1 + images.length) % images.length,
                          )
                        }
                        aria-label={tp.previousPhoto}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <p className="min-w-0 flex-1 text-center text-[10px] leading-snug text-slate-300">
                        {tp.photoCredit}: {photo.author} · {photo.license}
                      </p>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-200"
                        onClick={() =>
                          setPhotoIndex((photoIndex + 1) % images.length)
                        }
                        aria-label={tp.nextPhoto}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="bg-black/40 px-2 py-1.5 text-center text-[10px] leading-snug text-slate-300">
                      {tp.photoCredit}: {photo.author} · {photo.license}
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <TrainFront className="h-4 w-4 text-amber-400" />
                {tp.presentation}
              </h3>
              {details?.description ? (
                <p className="text-sm leading-relaxed text-slate-200">
                  {details.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  {tp.presentationUnavailable}
                </p>
              )}
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tp.directDestinations}
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-200">
                {destinations.map((dest) => (
                  <li
                    key={dest.stationId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
                  >
                    <span>
                      {dest.name}
                      <span className="text-slate-400"> · {dest.city}</span>
                    </span>
                    <span className="text-[11px] font-medium uppercase text-slate-400">
                      {dest.serviceStatus === "seasonal"
                        ? tp.seasonalService
                        : tp.regularService}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-400">
                {tp.schematicLink}. {tp.schematicDisclaimer}
              </p>
            </section>

            {(details?.recommendedArrivalInfo ||
              details?.borderControlInfo ||
              details?.accessibilityInfo) && (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {tp.practicalInfo}
                </h3>
                {details.recommendedArrivalInfo ? (
                  <p className="text-sm text-slate-200">
                    {tp.recommendedArrival}: {details.recommendedArrivalInfo}
                  </p>
                ) : null}
                {details.borderControlInfo ? (
                  <p className="text-sm text-slate-200">
                    {tp.borderControl}: {details.borderControlInfo}
                  </p>
                ) : null}
                {details.accessibilityInfo ? (
                  <p className="text-sm text-slate-200">
                    {tp.accessibility}: {details.accessibilityInfo}
                  </p>
                ) : null}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tp.officialLinks}
              </h3>
              <ul className="space-y-1.5 text-sm">
                <li>
                  <a
                    href={station.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                  >
                    {tp.eurostarGuide}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
                {station.stationWebsite ? (
                  <li>
                    <a
                      href={station.stationWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                    >
                      {tp.stationWebsite}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ) : null}
                {details?.wikipediaUrl ? (
                  <li>
                    <a
                      href={details.wikipediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                    >
                      {tp.wikipedia}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>

            {details?.sources?.length ? (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {tp.sources}
                </h3>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  {details.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-sky-300 hover:underline"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}
