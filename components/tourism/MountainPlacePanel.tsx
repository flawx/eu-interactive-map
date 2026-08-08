"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Mountain,
  Snowflake,
  Trees,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  getEuropeanMountainPlaceById,
  type MountainPlaceCategory,
} from "@/lib/tourism/europeanMountainDestinations";
import type { EuropeanMountainPlaceDetails } from "@/lib/tourism/europeanMountainPlaceDetails";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

const FETCH_TIMEOUT_MS = 12_000;

type Props = {
  placeId: string;
  locale: Locale;
  onClose: () => void;
  onOpenTouristPlace?: (id: string) => void;
  onOpenUnescoSite?: (id: string) => void;
  onOpenCountry?: (code: string) => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function CategoryIcon({ category }: { category: MountainPlaceCategory }) {
  if (category === "ski_resort") return <Snowflake className="h-6 w-6" />;
  if (category === "mountain_destination") return <Trees className="h-6 w-6" />;
  if (category === "mountain_range") return <Layers className="h-6 w-6" />;
  return <Mountain className="h-6 w-6" />;
}

const COLORS: Record<MountainPlaceCategory, string> = {
  ski_resort: "#0284c7",
  mountain_destination: "#166534",
  iconic_peak: "#64748b",
  mountain_range: "#7c3aed",
};

export default function MountainPlacePanel({
  placeId,
  locale,
  onClose,
  onOpenTouristPlace,
  onOpenUnescoSite,
  onOpenCountry,
  onRouteToPlace,
}: Props) {
  const place = getEuropeanMountainPlaceById(placeId);
  const t = getMessages(locale);
  const mp = t.mountainPanel;
  const [details, setDetails] = useState<EuropeanMountainPlaceDetails | null>(null);
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
    if (!place) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    setLoading(true);
    setError(false);
    setDetails(null);
    void fetch(
      `/api/tourism/mountains/${encodeURIComponent(place.id)}?locale=${locale}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as EuropeanMountainPlaceDetails;
      })
      .then((data) => {
        if (active) setDetails(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [place, locale]);

  if (!place) return null;
  const accent = COLORS[place.category];
  const photos = details?.images ?? [];
  const photo = photos[photoIndex] ?? null;
  const countryNames = place.countryCodes.map(
    (code) => regionNames?.of(code === "EL" ? "GR" : code) ?? code,
  );
  const placeHasCoords =
    Number.isFinite(place.latitude) && Number.isFinite(place.longitude);

  return (
    <aside
      className="absolute left-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 text-white shadow-xl backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight: "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-slate-950/95 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border" style={{ color: accent, borderColor: `${accent}88`, background: `${accent}22` }}>
            <CategoryIcon category={place.category} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{place.canonicalName}</p>
            <p className="text-[11px] text-slate-300">{place.cityOrRegion} · {countryNames.join(", ")}</p>
            <span className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: `${accent}88`, color: accent }}>
              {mp.categories[place.category]}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label={t.countryPanel.close} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-white/10">
            <X size={22} />
          </button>
        </div>
        {onRouteToPlace && placeHasCoords ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={place.canonicalName}
              latitude={place.latitude}
              longitude={place.longitude}
              countryCode={place.countryCodes[0] ?? null}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
        {loading ? <div className="h-40 animate-pulse rounded-xl bg-white/10" aria-label={mp.loadingDetails} /> : null}
        {!loading && error ? <p className="text-sm text-amber-200">{mp.detailsUnavailable}</p> : null}
        {photo ? (
          <section className="overflow-hidden rounded-lg border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.thumbnailUrl ?? photo.url} alt={photo.title ?? place.canonicalName} className="h-40 w-full object-cover" />
            <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 text-[10px] text-slate-300">
              {photos.length > 1 ? <button onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)} aria-label={mp.previousPhoto}><ChevronLeft className="h-4 w-4" /></button> : null}
              <p className="flex-1 text-center">{mp.photoCredit}: {photo.author ?? "Wikimedia Commons"} · {photo.license ?? ""}</p>
              {photos.length > 1 ? <button onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)} aria-label={mp.nextPhoto}><ChevronRight className="h-4 w-4" /></button> : null}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{mp.overview}</h2>
          <p className="text-sm leading-relaxed text-slate-200">{details?.description ?? mp.presentationUnavailable}</p>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{mp.altitudeGeography}</h2>
          <dl className="space-y-2 text-xs">
            {place.summitElevationMeters != null ? <div><dt className="text-slate-400">{mp.summitElevation}</dt><dd>{place.summitElevationMeters.toLocaleString(locale)} m</dd></div> : null}
            {place.resortBaseElevationMeters != null ? <div><dt className="text-slate-400">{mp.baseElevation}</dt><dd>{place.resortBaseElevationMeters.toLocaleString(locale)} m</dd></div> : null}
            {place.resortTopElevationMeters != null ? <div><dt className="text-slate-400">{mp.topElevation}</dt><dd>{place.resortTopElevationMeters.toLocaleString(locale)} m</dd></div> : null}
            {place.mountainRange ? <div><dt className="text-slate-400">{mp.mountainRange}</dt><dd>{place.mountainRange}</dd></div> : null}
          </dl>
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{mp.seasonality}</h2>
          <p className="text-sm text-slate-200">{mp.seasonal[place.seasonalOperation]}</p>
          <p className="mt-2 text-xs text-amber-200/90">{mp.officialWarning}</p>
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{mp.links}</h2>
          <ul className="space-y-2 text-sm">
            {place.officialWebsite ? <li><a className="inline-flex gap-1 text-sky-300" href={place.officialWebsite} target="_blank" rel="noopener noreferrer">{mp.officialWebsite}<ExternalLink className="h-4 w-4" /></a></li> : null}
            {place.tourismWebsite ? <li><a className="inline-flex gap-1 text-sky-300" href={place.tourismWebsite} target="_blank" rel="noopener noreferrer">{mp.tourismWebsite}<ExternalLink className="h-4 w-4" /></a></li> : null}
            {place.liftStatusUrl ? <li><a className="inline-flex gap-1 text-sky-300" href={place.liftStatusUrl} target="_blank" rel="noopener noreferrer">{mp.liftStatus}<ExternalLink className="h-4 w-4" /></a></li> : null}
            {place.snowReportUrl ? <li><a className="inline-flex gap-1 text-sky-300" href={place.snowReportUrl} target="_blank" rel="noopener noreferrer">{mp.snowReport}<ExternalLink className="h-4 w-4" /></a></li> : null}
            {place.linkedTouristPlaceId && onOpenTouristPlace ? <li><button className="text-violet-300" onClick={() => onOpenTouristPlace(place.linkedTouristPlaceId!)}>{mp.openTouristPlace}</button></li> : null}
            {place.linkedUnescoSiteId && onOpenUnescoSite ? <li><button className="text-violet-300" onClick={() => onOpenUnescoSite(place.linkedUnescoSiteId!)}>{mp.openUnescoSite}</button></li> : null}
            {onOpenCountry ? <li><button className="text-violet-300" onClick={() => onOpenCountry(place.countryCodes[0])}>{mp.openCountry}</button></li> : null}
          </ul>
        </section>

        {details?.sources.length ? (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{mp.sourcesCredits}</h2>
            <ul className="space-y-1 text-[11px] text-slate-400">{details.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
