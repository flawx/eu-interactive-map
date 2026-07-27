"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Plane, X } from "lucide-react";
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
    <aside className="pointer-events-auto flex max-h-[min(78vh,720px)] w-[min(100%,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-800">
            {tp.badge}
          </p>
          <h2 className="truncate text-base font-semibold text-slate-900">
            {airport.name}
          </h2>
          <p className="truncate text-sm text-slate-500">
            {airport.city} · {countryName}
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
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
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
                    alt={photo.title ?? airport.name}
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
                  {photo.sourceUrl && (
                    <>
                      {" · "}
                      <a
                        href={photo.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                    </>
                  )}
                </p>
              </section>
            )}

            <section>
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Plane className="h-4 w-4 text-cyan-700" />
                {tp.overview}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {details?.description ?? tp.loadingDetails}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  {tp.iataCode}
                </p>
                <p className="font-semibold text-slate-800">
                  {airport.iataCode ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  {tp.icaoCode}
                </p>
                <p className="font-semibold text-slate-800">{airport.icaoCode}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  {tp.europeanRanking}
                </p>
                <p className="font-semibold text-slate-800">
                  {airport.rank2025 != null ? `#${airport.rank2025}` : "—"}
                </p>
              </div>
              {details?.openedYear != null && (
                <div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    {tp.openedYear}
                  </p>
                  <p className="font-semibold text-slate-800">
                    {details.openedYear}
                  </p>
                </div>
              )}
            </section>

            {(details?.terminals?.length ||
              details?.groundTransportSummary ||
              details?.operatorName) && (
              <section>
                <h3 className="mb-1 text-sm font-semibold text-slate-900">
                  {tp.practicalInfo}
                </h3>
                {details.operatorName && (
                  <p className="text-sm text-slate-600">
                    {tp.operator}: {details.operatorName}
                  </p>
                )}
                {details.terminals?.length ? (
                  <p className="text-sm text-slate-600">
                    {tp.terminals}: {details.terminals.join(", ")}
                  </p>
                ) : null}
                {details.groundTransportSummary && (
                  <p className="text-sm text-slate-600">
                    {tp.groundTransport}: {details.groundTransportSummary}
                  </p>
                )}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">
                {tp.officialLinks}
              </h3>
              <ul className="space-y-1 text-sm">
                {airport.officialWebsite && (
                  <li>
                    <a
                      href={airport.officialWebsite}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-800 underline"
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
                      className="inline-flex items-center gap-1 text-cyan-800 underline"
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
