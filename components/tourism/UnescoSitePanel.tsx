"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Landmark,
  Leaf,
  MapPin,
  Mountain,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { UnescoSiteDetails } from "@/lib/tourism/unescoSiteDetails";
import {
  getUnescoSiteById,
  type UnescoSiteCategory,
} from "@/lib/tourism/unescoWorldHeritage";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";

type UnescoSitePanelProps = {
  siteId: string;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function categoryColor(category: UnescoSiteCategory): string {
  switch (category) {
    case "cultural":
      return "#7c3aed";
    case "natural":
      return "#15803d";
    case "mixed":
      return "#0891b2";
  }
}

function CategoryIcon({
  category,
  className,
}: {
  category: UnescoSiteCategory;
  className?: string;
}) {
  if (category === "natural") return <Leaf className={className} />;
  if (category === "mixed") return <Mountain className={className} />;
  return <Landmark className={className} />;
}

function flagCode(countryCode: string): string {
  return countryCode === "EL" ? "GR" : countryCode;
}

export default function UnescoSitePanel({
  siteId,
  locale,
  onClose,
  onRouteToPlace,
}: UnescoSitePanelProps) {
  const t = getMessages(locale);
  const tp = t.unescoPanel;
  const site = getUnescoSiteById(siteId) ?? null;
  const [details, setDetails] = useState<UnescoSiteDetails | null>(null);
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
          `/api/tourism/unesco/${encodeURIComponent(site.id)}?locale=${locale}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (response.ok) {
          const data = (await response.json()) as UnescoSiteDetails;
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

  const displayName = details?.name ?? site.canonicalName;
  const category = details?.category ?? site.category;
  const color = categoryColor(category);
  const photos = details?.images ?? [];
  const currentPhoto = photos[photoIndex] ?? null;
  const categoryLabel =
    category === "cultural"
      ? tp.cultural
      : category === "natural"
        ? tp.natural
        : tp.mixed;

  const countryLabels = site.countryCodes.map((code) => {
    const region = flagCode(code);
    return {
      code,
      region,
      label: regionNames?.of(region) ?? code,
    };
  });

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale).format(value);

  const placeHasCoords =
    Number.isFinite(site.latitude) && Number.isFinite(site.longitude);

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
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--map-ui-border)] text-[#facc15] shadow-sm"
            style={{ backgroundColor: color }}
          >
            <CategoryIcon category={category} className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{displayName}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">
              {countryLabels.map((c) => c.label).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.countryPanel.close}
            title={t.countryPanel.close}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--map-ui-muted)] outline-none transition hover:bg-[var(--map-ui-surface-hover)] hover:text-[var(--map-ui-text)] focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <X aria-hidden="true" size={22} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-2 py-0.5 text-[10px] font-medium text-[#facc15]">
            {tp.badge}
          </span>
          <span
            className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium text-[var(--map-ui-text)]"
            style={{
              borderColor: `${color}66`,
              backgroundColor: `${color}33`,
            }}
          >
            {categoryLabel}
          </span>
          {site.dangerStatus === "in-danger" ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-400/40 bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-200">
              <AlertTriangle className="h-3 w-3" />
              {tp.inDanger}
            </span>
          ) : null}
          {site.transboundary ? (
            <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">
              {tp.transboundary}
            </span>
          ) : null}
          {site.serial ? (
            <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-100">
              {tp.serial}
            </span>
          ) : null}
        </div>
        {onRouteToPlace && placeHasCoords ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={displayName}
              latitude={site.latitude}
              longitude={site.longitude}
              countryCode={site.countryCodes[0] ?? null}
              onDirectionsTo={onRouteToPlace}
            />
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          {currentPhoto ? (
            <div className="overflow-hidden rounded-lg border border-[var(--map-ui-border)]">
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
                  className="rounded p-1 text-[var(--map-ui-text)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-0 flex-1 text-center text-[10px] leading-snug text-[var(--map-ui-muted)]">
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
                  className="rounded p-1 text-[var(--map-ui-text)] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="h-40 animate-pulse rounded-lg bg-[var(--map-ui-surface-muted)]" />
          ) : (
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] text-[var(--map-ui-muted)]">
              <CategoryIcon category={category} className="h-8 w-8" />
            </div>
          )}
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.presentation}
          </h2>
          {loading && !details?.description && !site.shortDescription ? (
            <div className="space-y-2">
              <div className="h-3 animate-pulse rounded bg-[var(--map-ui-surface-muted)]" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--map-ui-surface-muted)]" />
            </div>
          ) : error && !details?.description && !site.shortDescription ? (
            <p className="text-sm text-amber-200/90">{tp.detailsUnavailable}</p>
          ) : (
            <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
              {details?.description ??
                site.shortDescription ??
                tp.detailsUnavailable}
            </p>
          )}
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.unescoInfo}
          </h2>
          <dl className="grid grid-cols-1 gap-2 text-[12px]">
            <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
              <dt className="text-[var(--map-ui-muted)]">{tp.category}</dt>
              <dd className="font-medium text-[var(--map-ui-text)]">{categoryLabel}</dd>
            </div>
            <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
              <dt className="text-[var(--map-ui-muted)]">{tp.inscriptionYear}</dt>
              <dd className="font-medium text-[var(--map-ui-text)]">
                {site.inscriptionYear}
              </dd>
            </div>
            {site.extensionYears.length > 0 ? (
              <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
                <dt className="text-[var(--map-ui-muted)]">{tp.extensionYears}</dt>
                <dd className="font-medium text-[var(--map-ui-text)]">
                  {site.extensionYears.join(", ")}
                </dd>
              </div>
            ) : null}
            <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
              <dt className="text-[var(--map-ui-muted)]">{tp.criteria}</dt>
              <dd className="font-medium text-[var(--map-ui-text)]">
                {site.criteria.join(" ") || "—"}
              </dd>
              <p className="mt-1 text-[10px] leading-snug text-[var(--map-ui-muted)]">
                {tp.criteriaHint}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
              <dt className="text-[var(--map-ui-muted)]">{tp.area}</dt>
              <dd className="font-medium text-[var(--map-ui-text)]">
                {site.areaHectares != null
                  ? `${formatNumber(site.areaHectares)} ${tp.hectares}`
                  : "—"}
              </dd>
            </div>
            <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
              <dt className="text-[var(--map-ui-muted)]">{tp.bufferZone}</dt>
              <dd className="font-medium text-[var(--map-ui-text)]">
                {site.bufferZoneHectares != null
                  ? `${formatNumber(site.bufferZoneHectares)} ${tp.hectares}`
                  : "—"}
              </dd>
            </div>
            <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
              <dt className="text-[var(--map-ui-muted)]">{tp.dangerStatus}</dt>
              <dd className="font-medium text-[var(--map-ui-text)]">
                {site.dangerStatus === "in-danger"
                  ? `${tp.inDanger}${
                      site.dangerYears.length
                        ? ` (${site.dangerYears.join(", ")})`
                        : ""
                    }`
                  : tp.notInDanger}
              </dd>
            </div>
            <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
              <dt className="text-[var(--map-ui-muted)]">{tp.unescoId}</dt>
              <dd className="font-medium text-[var(--map-ui-text)]">{site.unescoId}</dd>
            </div>
          </dl>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.location}
          </h2>
          {site.location ? (
            <p className="mb-1 text-sm text-[var(--map-ui-text)]">{site.location}</p>
          ) : null}
          <p className="inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--map-ui-muted)]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {tp.representativePoint}
          </p>
          {site.serial ? (
            <p className="mt-2 text-[11px] leading-relaxed text-amber-100/90">
              {tp.serialNote}
            </p>
          ) : null}
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.countries}
          </h2>
          {site.transboundary ? (
            <p className="mb-2 text-[11px] text-sky-200/90">
              {tp.transboundaryNote}
            </p>
          ) : null}
          <ul className="space-y-1.5">
            {countryLabels.map((country) => (
              <li
                key={country.code}
                className="flex items-center gap-2 text-sm text-[var(--map-ui-text)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://flagcdn.io/w40/${country.region.toLowerCase()}.png`}
                  alt=""
                  width={20}
                  height={15}
                  className="h-[15px] w-5 rounded-[2px] object-cover"
                />
                {country.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.officialLinks}
          </h2>
          <ul className="space-y-1.5 text-sm">
            <li>
              <a
                href={site.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-400 hover:underline"
              >
                {tp.officialUnescoPage}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
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
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.sources}
          </h2>
          <ul className="space-y-1 text-[11px] text-[var(--map-ui-muted)]">
            {(details?.sources ?? [{ label: tp.sourceUnesco, url: site.officialUrl }]).map(
              (source) => (
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
              ),
            )}
            <li className="pt-1 text-[var(--map-ui-muted)]">
              {t.legend.unescoAttribution}
              {site.importedAt
                ? ` · ${new Date(site.importedAt).toLocaleDateString(locale)}`
                : ""}
            </li>
          </ul>
        </section>
      </div>
    </aside>
  );
}
