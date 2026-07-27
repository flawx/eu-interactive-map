"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plane,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getEuropeanAirportById } from "@/lib/transport/europeanAirports";
import type { EuropeanAirportDetails } from "@/lib/transport/transportDetails";

type AirportPanelProps = {
  airportId: string;
  locale: Locale;
  onClose: () => void;
};

function flagCode(countryCode: string): string {
  return countryCode === "EL" ? "GR" : countryCode;
}

export default function AirportPanel({
  airportId,
  locale,
  onClose,
}: AirportPanelProps) {
  const t = getMessages(locale);
  const tp = t.airportPanel;
  const airport = getEuropeanAirportById(airportId) ?? null;
  const [details, setDetails] = useState<EuropeanAirportDetails | null>(null);
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
  }, [airportId]);

  useEffect(() => {
    if (!airport) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setDetails(null);

    const load = async () => {
      try {
        const response = await fetch(
          `/api/transport/airports/${encodeURIComponent(airport.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (response.ok) {
          const data = (await response.json()) as EuropeanAirportDetails;
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
  }, [airport, locale]);

  if (!airport) return null;

  const images = details?.images ?? [];
  const photo = images[photoIndex] ?? null;
  const countryName =
    regionNames?.of(flagCode(airport.countryCode)) ?? airport.countryCode;

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-900/60 text-cyan-200 shadow-sm">
            <Plane className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{airport.name}</p>
            <p className="text-[11px] text-slate-300">
              {airport.city} · {countryName}
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
        <p className="mt-2 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-medium text-cyan-200">
          {tp.badge}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {loading && (
          <div className="space-y-3">
            <div className="h-40 animate-pulse rounded-xl bg-white/10" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
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
                    alt={photo.title ?? airport.name}
                    className="h-40 w-full object-cover"
                  />
                  {images.length > 1 && (
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
                  )}
                  {images.length <= 1 && (
                    <p className="bg-black/40 px-2 py-1.5 text-center text-[10px] leading-snug text-slate-300">
                      {tp.photoCredit}: {photo.author} · {photo.license}
                      {photo.sourceUrl && (
                        <>
                          {" · "}
                          <a
                            href={photo.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline"
                          >
                            source
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Plane className="h-4 w-4 text-cyan-400" />
                {tp.overview}
              </h3>
              <p className="text-sm leading-relaxed text-slate-200">
                {details?.description ?? tp.loadingDetails}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] font-medium uppercase text-slate-400">
                  {tp.iataCode}
                </p>
                <p className="font-semibold text-slate-100">
                  {airport.iataCode ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] font-medium uppercase text-slate-400">
                  {tp.icaoCode}
                </p>
                <p className="font-semibold text-slate-100">{airport.icaoCode}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-[10px] font-medium uppercase text-slate-400">
                  {tp.europeanRanking}
                </p>
                <p className="font-semibold text-slate-100">
                  {airport.rank2025 != null ? `#${airport.rank2025}` : "—"}
                </p>
              </div>
              {details?.openedYear != null && (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase text-slate-400">
                    {tp.openedYear}
                  </p>
                  <p className="font-semibold text-slate-100">
                    {details.openedYear}
                  </p>
                </div>
              )}
            </section>

            {(details?.terminals?.length ||
              details?.groundTransportSummary ||
              details?.operatorName) && (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {tp.practicalInfo}
                </h3>
                {details.operatorName && (
                  <p className="text-sm text-slate-200">
                    {tp.operator}: {details.operatorName}
                  </p>
                )}
                {details.terminals?.length ? (
                  <p className="text-sm text-slate-200">
                    {tp.terminals}: {details.terminals.join(", ")}
                  </p>
                ) : null}
                {details.groundTransportSummary && (
                  <p className="text-sm text-slate-200">
                    {tp.groundTransport}: {details.groundTransportSummary}
                  </p>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tp.officialLinks}
              </h3>
              <ul className="space-y-1.5 text-sm">
                {airport.officialWebsite && (
                  <li>
                    <a
                      href={airport.officialWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                    >
                      {tp.officialWebsite}
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
                      className="inline-flex items-center gap-1 text-sky-400 hover:underline"
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
