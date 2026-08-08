"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  TreePine,
  Waves,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  getMajorTouristPlaceById,
  type TouristPlaceCategory,
} from "@/lib/tourism/majorTouristPlaces";
import type { TouristPlaceDetails } from "@/lib/tourism/touristPlaceDetails";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

const CLIENT_FETCH_TIMEOUT_MS = 12_000;

type TouristPlacePanelProps = {
  placeId: string;
  locale: Locale;
  onClose: () => void;
  onOpenUnescoSite?: (unescoSiteId: string) => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function flagCode(countryCode: string): string {
  return countryCode === "EL" ? "GR" : countryCode;
}

function categoryColor(category: TouristPlaceCategory): string {
  switch (category) {
    case "landmark":
      return "#c2410c";
    case "historic_area":
      return "#7c3aed";
    case "museum":
      return "#0369a1";
    case "park_garden":
      return "#15803d";
    case "natural_landscape":
      return "#0f766e";
    case "coastal_destination":
      return "#0284c7";
    case "mountain_destination":
      return "#57534e";
  }
}

function CategoryIcon({
  category,
  className,
}: {
  category: TouristPlaceCategory;
  className?: string;
}) {
  switch (category) {
    case "landmark":
      return <Landmark className={className} aria-hidden="true" />;
    case "historic_area":
      return <MapPin className={className} aria-hidden="true" />;
    case "museum":
      return <Camera className={className} aria-hidden="true" />;
    case "park_garden":
      return <Leaf className={className} aria-hidden="true" />;
    case "natural_landscape":
      return <TreePine className={className} aria-hidden="true" />;
    case "coastal_destination":
      return <Waves className={className} aria-hidden="true" />;
    case "mountain_destination":
      return <Mountain className={className} aria-hidden="true" />;
  }
}

export default function TouristPlacePanel({
  placeId,
  locale,
  onClose,
  onOpenUnescoSite,
  onRouteToPlace,
}: TouristPlacePanelProps) {
  const t = getMessages(locale);
  const tp = t.touristPlacePanel;
  const place = getMajorTouristPlaceById(placeId) ?? null;
  const [details, setDetails] = useState<TouristPlaceDetails | null>(null);
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
  }, [placeId]);

  useEffect(() => {
    if (!place) return;

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
          `/api/tourism/places/${encodeURIComponent(place.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (!active) return;
        if (response.ok) {
          const data = (await response.json()) as TouristPlaceDetails;
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
  }, [place, locale]);

  if (!place) return null;

  const images = details?.images ?? [];
  const photo = images[photoIndex] ?? null;
  const countryName =
    regionNames?.of(flagCode(place.countryCode)) ?? place.countryCode;
  const accent = categoryColor(place.category);
  const categoryLabel = tp.categories[place.category];

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
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border shadow-sm"
            style={{
              borderColor: `${accent}66`,
              backgroundColor: `${accent}33`,
              color: accent,
            }}
          >
            <CategoryIcon category={place.category} className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">
              {place.canonicalName}
            </p>
            <p className="text-[11px] text-slate-300">
              {place.cityOrRegion} · {countryName}
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
          <span className="inline-flex rounded-full border border-orange-400/30 bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium text-orange-100">
            {tp.badge}
          </span>
          <span
            className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{
              borderColor: `${accent}55`,
              backgroundColor: `${accent}22`,
              color: "#fff7ed",
            }}
          >
            {categoryLabel}
          </span>
        </div>
        {onRouteToPlace ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={place.canonicalName}
              latitude={place.latitude}
              longitude={place.longitude}
              countryCode={place.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {loading && (
          <div
            className="space-y-3"
            aria-busy="true"
            aria-label={tp.loadingDetails}
          >
            <div className="h-40 animate-pulse rounded-xl bg-white/10" />
            <div className="h-3 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-4/6 animate-pulse rounded bg-white/10" />
          </div>
        )}

        {!loading && error && !details && (
          <p className="text-sm text-amber-200/90">{tp.detailsUnavailable}</p>
        )}

        {!loading && (details || !error) && (
          <div className="space-y-5">
            {photo ? (
              <section>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbnailUrl ?? photo.url}
                    alt={photo.title ?? place.canonicalName}
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
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tp.overview}
              </h2>
              <p className="text-sm leading-relaxed text-slate-200">
                {details?.description ??
                  (error ? tp.detailsUnavailable : tp.presentationUnavailable)}
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tp.location}
              </h2>
              <dl className="grid grid-cols-1 gap-2 text-[12px]">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <dt className="text-slate-400">{tp.category}</dt>
                  <dd className="font-medium text-slate-100">{categoryLabel}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <dt className="text-slate-400">{tp.cityOrRegion}</dt>
                  <dd className="font-medium text-slate-100">
                    {place.cityOrRegion}
                  </dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <dt className="text-slate-400">{tp.country}</dt>
                  <dd className="font-medium text-slate-100">{countryName}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {tp.officialLinks}
              </h2>
              <ul className="space-y-2 text-sm">
                {place.officialWebsite ? (
                  <li>
                    <a
                      href={place.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200"
                    >
                      {tp.officialWebsite}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ) : null}
                {place.tourismWebsite ? (
                  <li>
                    <a
                      href={place.tourismWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200"
                    >
                      {tp.tourismWebsite}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ) : null}
                {place.unescoSiteId && onOpenUnescoSite ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpenUnescoSite(place.unescoSiteId!)}
                      className="inline-flex items-center gap-1.5 text-violet-300 hover:text-violet-200"
                    >
                      {tp.openUnescoSite}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ) : null}
                {details?.unescoOfficialUrl ? (
                  <li>
                    <a
                      href={details.unescoOfficialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-violet-300 hover:text-violet-200"
                    >
                      {tp.officialUnescoPage}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ) : null}
                {details?.wikipediaUrl ? (
                  <li>
                    <a
                      href={details.wikipediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sky-300 hover:text-sky-200"
                    >
                      {tp.wikipedia}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ) : null}
              </ul>
            </section>

            {details?.sources && details.sources.length > 0 ? (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {tp.sources}
                </h2>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  {details.sources.map((source) => (
                    <li key={`${source.label}-${source.url}`}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-slate-200"
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
