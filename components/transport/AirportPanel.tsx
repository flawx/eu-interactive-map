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
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

const CLIENT_FETCH_TIMEOUT_MS = 12_000;

type AirportPanelProps = {
  airportId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function flagCode(countryCode: string): string {
  return countryCode === "EL" ? "GR" : countryCode;
}

export default function AirportPanel({
  airportId,
  locale,
  onClose,
  onRouteToPlace,
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
          `/api/transport/airports/${encodeURIComponent(airport.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (!active) return;
        if (response.ok) {
          const data = (await response.json()) as EuropeanAirportDetails;
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
  }, [airport, locale]);

  if (!airport) return null;

  const images = details?.images ?? [];
  const photo = images[photoIndex] ?? null;
  const countryName =
    regionNames?.of(flagCode(airport.countryCode)) ?? airport.countryCode;
  const placeHasCoords =
    Number.isFinite(airport.latitude) && Number.isFinite(airport.longitude);

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
        {onRouteToPlace && placeHasCoords ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={airport.name}
              latitude={airport.latitude}
              longitude={airport.longitude}
              countryCode={airport.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {loading && (
          <div className="space-y-3" aria-busy="true" aria-label={tp.loadingDetails}>
            <div className="h-40 animate-pulse rounded-xl bg-white/10" />
            <div className="h-3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-white/10" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="h-14 animate-pulse rounded-lg bg-white/10" />
              <div className="h-14 animate-pulse rounded-lg bg-white/10" />
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
                    alt={photo.title ?? airport.name}
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
                      {photo.sourceUrl ? (
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
                      ) : null}
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
              {details?.description ? (
                <p className="text-sm leading-relaxed text-slate-200">
                  {details.description}
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  {tp.presentationUnavailable}
                </p>
              )}
              <p className="mt-2 text-[11px] text-slate-400">
                {airport.city} · {countryName}
                {details?.openedYear != null
                  ? ` · ${tp.openedYear} ${details.openedYear}`
                  : ""}
                {details?.operatorName
                  ? ` · ${tp.operator}: ${details.operatorName}`
                  : ""}
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
              {details?.openedYear != null ? (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase text-slate-400">
                    {tp.openedYear}
                  </p>
                  <p className="font-semibold text-slate-100">
                    {details.openedYear}
                  </p>
                </div>
              ) : null}
            </section>

            {(details?.terminals?.length ||
              details?.groundTransportSummary ||
              details?.operatorName) && (
              <section>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {tp.practicalInfo}
                </h3>
                {details.operatorName ? (
                  <p className="text-sm text-slate-200">
                    {tp.operator}: {details.operatorName}
                  </p>
                ) : null}
                {details.terminals?.length ? (
                  <p className="text-sm text-slate-200">
                    {tp.terminals}: {details.terminals.join(", ")}
                  </p>
                ) : null}
                {details.groundTransportSummary ? (
                  <p className="text-sm text-slate-200">
                    {tp.groundTransport}: {details.groundTransportSummary}
                  </p>
                ) : null}
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tp.officialLinks}
              </h3>
              <ul className="space-y-1.5 text-sm">
                {airport.officialWebsite ? (
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
