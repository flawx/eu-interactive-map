"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  MapPin,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { getEuropeanHeritageLabelSiteById } from "@/lib/tourism/europeanHeritageLabel";
import type { EuropeanHeritageLabelDetails } from "@/lib/tourism/europeanHeritageLabelDetails";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

type EuropeanHeritageLabelPanelProps = {
  siteId: string;
  locationId: string | null;
  locale: Locale;
  onClose: () => void;
  onFocusLocation?: (locationId: string) => void;
  onOpenCountry?: (countryCode: string) => void;
  onOpenUnescoSite?: (unescoSiteId: string) => void;
  onOpenTouristPlace?: (touristPlaceId: string) => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function flagCode(countryCode: string): string {
  return countryCode === "EL" ? "GR" : countryCode;
}

export default function EuropeanHeritageLabelPanel({
  siteId,
  locationId,
  locale,
  onClose,
  onFocusLocation,
  onOpenCountry,
  onRouteToPlace,
}: EuropeanHeritageLabelPanelProps) {
  // `onOpenUnescoSite` / `onOpenTouristPlace` are accepted for API symmetry
  // with other tourism panels; the current dataset has no cross-reference
  // to specific UNESCO sites or curated tourist places, so they are not
  // rendered as links yet.
  const t = getMessages(locale);
  const tp = t.ehlPanel;
  const site = getEuropeanHeritageLabelSiteById(siteId) ?? null;
  const [details, setDetails] = useState<EuropeanHeritageLabelDetails | null>(
    null,
  );
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
  }, [siteId]);

  useEffect(() => {
    if (!site) return;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setDetails(null);

    const load = async () => {
      try {
        const response = await fetch(
          `/api/tourism/european-heritage-label/${encodeURIComponent(site.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (response.ok) {
          const data = (await response.json()) as EuropeanHeritageLabelDetails;
          if (!controller.signal.aborted) setDetails(data);
        } else if (!controller.signal.aborted) {
          setError(true);
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          err.name === "AbortError"
        ) {
          return;
        }
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [site, locale]);

  if (!site) return null;

  const displayName = site.canonicalName;
  const photos = details?.images ?? [];
  const currentPhoto = photos[photoIndex] ?? null;

  const countryLabels = site.countryCodes.map((code) => {
    const region = flagCode(code);
    return {
      code,
      region,
      label: regionNames?.of(region) ?? code,
    };
  });

  const hasRepresentativePoint = site.locations.some(
    (location) => location.representativePoint,
  );

  const routeLocation =
    site.locations.find((location) => location.id === locationId) ??
    site.locations.find((location) => location.representativePoint) ??
    site.locations[0] ??
    null;
  const placeHasCoords =
    routeLocation != null &&
    Number.isFinite(routeLocation.latitude) &&
    Number.isFinite(routeLocation.longitude);

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#facc15]/40 bg-[#003399] text-[#facc15] shadow-sm">
            <Award className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{displayName}</p>
            <p className="text-[11px] text-slate-300">
              {countryLabels.map((c) => c.label).join(" · ")}
              {" · "}
              {site.awardYear}
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
          <span className="inline-flex rounded-full border border-[#003399]/40 bg-[#003399]/25 px-2 py-0.5 text-[10px] font-medium text-[#facc15]">
            {tp.badge}
          </span>
          {site.transnational ? (
            <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
              {tp.transnational}
            </span>
          ) : null}
          {site.serial ? (
            <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-100">
              {tp.serial}
            </span>
          ) : null}
        </div>
        {onRouteToPlace && placeHasCoords && routeLocation ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={routeLocation.name}
              latitude={routeLocation.latitude}
              longitude={routeLocation.longitude}
              countryCode={routeLocation.countryCode}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          {currentPhoto ? (
            <div className="overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentPhoto.thumbnailUrl ?? currentPhoto.url}
                alt={currentPhoto.title ?? displayName}
                className="h-40 w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 bg-black/40 px-2 py-1.5">
                <button
                  type="button"
                  disabled={photos.length < 2}
                  onClick={() =>
                    setPhotoIndex(
                      (index) => (index - 1 + photos.length) % photos.length,
                    )
                  }
                  aria-label={tp.previousPhoto}
                  className="rounded p-1 text-slate-200 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-0 flex-1 text-center text-[10px] leading-snug text-slate-300">
                  {currentPhoto.representedLocationName
                    ? `${currentPhoto.representedLocationName} · `
                    : ""}
                  {tp.photoCredit}
                  {": "}
                  {[currentPhoto.author, currentPhoto.license]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <button
                  type="button"
                  disabled={photos.length < 2}
                  onClick={() =>
                    setPhotoIndex((index) => (index + 1) % photos.length)
                  }
                  aria-label={tp.nextPhoto}
                  className="rounded p-1 text-slate-200 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/5 text-slate-400">
              <Award className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
        </section>

        {details?.europeanSignificance ? (
          <section className="mb-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {tp.europeanSignificance}
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
              {details.europeanSignificance}
            </p>
          </section>
        ) : null}

        {details?.description || loading || error ? (
          <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.presentation}
          </h2>
          {loading && !details?.description ? (
            <div className="space-y-2">
              <div className="h-3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
            </div>
          ) : error && !details?.description ? (
            <p className="text-sm text-amber-200/90">{tp.detailsUnavailable}</p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-200">
              {details?.description ?? tp.detailsUnavailable}
            </p>
          )}
          </section>
        ) : null}

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.history}
          </h2>
          <dl className="grid grid-cols-1 gap-2 text-[12px]">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <dt className="text-slate-400">{tp.awardYear}</dt>
              <dd className="font-medium text-slate-100">{site.awardYear}</dd>
            </div>
          </dl>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.locationsSection}
          </h2>
          {site.serial ? (
            <p className="mb-2 text-[11px] leading-relaxed text-amber-100/90">
              {tp.multipleLocations}
            </p>
          ) : null}
          <ul className="space-y-2">
            {site.locations.map((location) => {
              const isActive = locationId === location.id;
              const locationDetails = details?.locations.find(
                (item) => item.locationId === location.id,
              );
              const countryLabel =
                regionNames?.of(flagCode(location.countryCode)) ??
                location.countryCode;
              return (
                <li
                  key={location.id}
                  className={`rounded-lg border px-3 py-2 ${
                    isActive
                      ? "border-sky-400/60 bg-sky-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#facc15]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{location.name}</p>
                      <p className="text-[11px] text-slate-300">
                        {location.cityOrRegion}
                        {" · "}
                        {countryLabel}
                      </p>
                      {onFocusLocation ? (
                        <button
                          type="button"
                          onClick={() => onFocusLocation(location.id)}
                          className="mt-2 inline-flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] text-sky-300 hover:bg-white/10"
                        >
                          {tp.seeOnMap}
                        </button>
                      ) : null}
                      {locationDetails?.officialUrl ? (
                        <a
                          href={locationDetails.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 mt-2 inline-flex items-center gap-1 text-[11px] text-sky-300 hover:underline"
                        >
                          {tp.officialWebsite}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                      {locationDetails?.wikipediaUrl ? (
                        <a
                          href={locationDetails.wikipediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 mt-2 inline-flex items-center gap-1 text-[11px] text-sky-300 hover:underline"
                        >
                          {tp.wikipedia}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {hasRepresentativePoint ? (
            <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {tp.representativePointNote}
            </p>
          ) : null}
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.countries}
          </h2>
          <ul className="space-y-1.5">
            {countryLabels.map((country) => (
              <li
                key={country.code}
                className="flex items-center gap-2 text-sm text-slate-200"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.io/w40/${country.region.toLowerCase()}.png`}
                  alt=""
                  width={20}
                  height={15}
                  className="h-[15px] w-5 rounded-[2px] object-cover"
                />
                <span className="min-w-0 flex-1">{country.label}</span>
                {onOpenCountry ? (
                  <button
                    type="button"
                    onClick={() => onOpenCountry(country.code)}
                    aria-label={tp.openCountry}
                    title={tp.openCountry}
                    className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-sky-300 hover:bg-white/10"
                  >
                    {tp.openCountry}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-4 rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            <p className="text-[11px] leading-relaxed text-sky-100/90">
              {tp.unescoDistinction}
            </p>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.officialLinks}
          </h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href={site.officialCommissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:underline"
              >
                {tp.officialCommissionPage}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
            {site.officialWebsite ? (
              <li>
                <a
                  href={site.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
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
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                >
                  {tp.wikipedia}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="mb-2">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {tp.sources}
          </h2>
          <ul className="space-y-1 text-[11px] text-slate-400">
            {(
              details?.sources ?? [
                { label: tp.dataCommission, url: site.officialCommissionUrl },
              ]
            ).map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-300 hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
            <li className="pt-1 text-slate-500">
              {site.importedAt
                ? new Date(site.importedAt).toLocaleDateString(locale)
                : ""}
            </li>
          </ul>
        </section>
      </div>
    </aside>
  );
}
