"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, TrainFront, X } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getEurostarStationById } from "@/lib/transport/eurostarNetwork";
import type { EurostarStationDetails } from "@/lib/transport/transportDetails";

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
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setDetails(null);

    const load = async () => {
      try {
        const response = await fetch(
          `/api/transport/eurostar/${encodeURIComponent(station.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (response.ok) {
          const data = (await response.json()) as EurostarStationDetails;
          if (!controller.signal.aborted) setDetails(data);
        } else if (!controller.signal.aborted) {
          setError(true);
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [station, locale]);

  if (!station) return null;

  const images = details?.images ?? [];
  const photo = images[photoIndex] ?? null;
  const countryName =
    regionNames?.of(flagCode(station.countryCode)) ?? station.countryCode;
  const destinations = details?.directDestinations ?? [];

  return (
    <aside className="pointer-events-auto flex max-h-[min(78vh,720px)] w-[min(100%,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
            {tp.badge}
          </p>
          <h2 className="truncate text-base font-semibold text-slate-900">
            {station.name}
          </h2>
          <p className="truncate text-sm text-slate-500">
            {station.city} · {countryName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label={t.countryPanel.close}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="space-y-3">
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-slate-600">{tp.detailsUnavailable}</p>
        )}

        {!loading && !error && (
          <div className="space-y-5">
            {photo && (
              <section>
                <div className="relative overflow-hidden rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailUrl ?? photo.url}
                    alt={photo.title ?? station.name}
                    className="h-44 w-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white"
                        onClick={() =>
                          setPhotoIndex(
                            (photoIndex - 1 + images.length) % images.length,
                          )
                        }
                        aria-label={tp.previousPhoto}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white"
                        onClick={() =>
                          setPhotoIndex((photoIndex + 1) % images.length)
                        }
                        aria-label={tp.nextPhoto}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {tp.photoCredit}: {photo.author} · {photo.license}
                </p>
              </section>
            )}

            <section>
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <TrainFront className="h-4 w-4 text-amber-700" />
                {tp.presentation}
              </h3>
              <p className="text-sm text-slate-600">
                {station.serviceStatus === "seasonal"
                  ? tp.seasonalService
                  : tp.regularService}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {details?.description ?? tp.loadingDetails}
              </p>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                {tp.directDestinations}
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {destinations.map((dest) => (
                  <li
                    key={dest.stationId}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5"
                  >
                    <span>
                      {dest.name}
                      <span className="text-slate-400"> · {dest.city}</span>
                    </span>
                    <span className="text-[11px] font-medium uppercase text-slate-500">
                      {dest.serviceStatus === "seasonal"
                        ? tp.seasonalService
                        : tp.regularService}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-slate-500">
                {tp.schematicLink}. {tp.schematicDisclaimer}
              </p>
            </section>

            {(details?.recommendedArrivalInfo ||
              details?.borderControlInfo ||
              details?.accessibilityInfo) && (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-slate-900">
                  {tp.practicalInfo}
                </h3>
                {details.recommendedArrivalInfo && (
                  <p className="text-sm text-slate-600">
                    {tp.recommendedArrival}: {details.recommendedArrivalInfo}
                  </p>
                )}
                {details.borderControlInfo && (
                  <p className="text-sm text-slate-600">
                    {tp.borderControl}: {details.borderControlInfo}
                  </p>
                )}
                {details.accessibilityInfo && (
                  <p className="text-sm text-slate-600">
                    {tp.accessibility}: {details.accessibilityInfo}
                  </p>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                {tp.officialLinks}
              </h3>
              <ul className="space-y-1 text-sm">
                <li>
                  <a
                    href={station.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-amber-800 underline"
                  >
                    {tp.eurostarGuide}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
                {station.stationWebsite && (
                  <li>
                    <a
                      href={station.stationWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-amber-800 underline"
                    >
                      {tp.stationWebsite}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                )}
                {details?.wikipediaUrl && (
                  <li>
                    <a
                      href={details.wikipediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-amber-800 underline"
                    >
                      {tp.wikipedia}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                )}
              </ul>
            </section>

            {details?.sources?.length ? (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-slate-900">
                  {tp.sources}
                </h3>
                <ul className="space-y-1 text-xs text-slate-500">
                  {details.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
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
