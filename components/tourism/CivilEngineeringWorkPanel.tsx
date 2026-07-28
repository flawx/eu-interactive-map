"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Construction,
  ExternalLink,
  Route,
  Waves,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  getMajorCivilEngineeringWorkById,
  type CivilEngineeringWorkCategory,
} from "@/lib/tourism/majorCivilEngineeringWorks";
import type { CivilEngineeringWorkDetails } from "@/lib/tourism/majorCivilEngineeringWorkDetails";
import { CIVIL_ENGINEERING_CATEGORY_COLORS } from "@/components/map/civilEngineeringMapLayers";

const FETCH_TIMEOUT_MS = 12_000;

type Props = {
  workId: string;
  locale: Locale;
  onClose: () => void;
  onOpenCountry?: (code: string) => void;
};

function CategoryIcon({ category }: { category: CivilEngineeringWorkCategory }) {
  if (category === "tunnel") return <Route className="h-6 w-6" />;
  if (category === "dam" || category === "canal_lock") {
    return <Waves className="h-6 w-6" />;
  }
  return <Construction className="h-6 w-6" />;
}

export default function CivilEngineeringWorkPanel({
  workId,
  locale,
  onClose,
  onOpenCountry,
}: Props) {
  const item = getMajorCivilEngineeringWorkById(workId);
  const t = getMessages(locale);
  const cp = t.civilEngineeringPanel;
  const [details, setDetails] =
    useState<CivilEngineeringWorkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  useEffect(() => {
    if (!item) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    setDetails(null);
    setLoading(true);
    setFailed(false);
    setPhotoIndex(0);
    void fetch(
      `/api/tourism/civil-engineering/${encodeURIComponent(item.id)}?locale=${locale}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as CivilEngineeringWorkDetails;
      })
      .then((value) => {
        if (active) setDetails(value);
      })
      .catch(() => {
        if (active) setFailed(true);
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
  }, [item, locale]);

  if (!item) return null;
  const accent = CIVIL_ENGINEERING_CATEGORY_COLORS[item.category];
  const photos = details?.images ?? [];
  const photo = photos[photoIndex] ?? null;
  const countries = item.countryCodes.map(
    (code) => regionNames?.of(code === "EL" ? "GR" : code) ?? code,
  );
  const number = (value: number) => value.toLocaleString(locale);

  return (
    <aside
      className="absolute left-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-slate-950/90 text-white shadow-xl backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-slate-950/95 px-4 py-3">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border"
            style={{
              color: accent,
              borderColor: `${accent}88`,
              background: `${accent}22`,
            }}
          >
            <CategoryIcon category={item.category} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-[11px] text-slate-300">
              {item.regionOrCity} · {countries.join(", ")}
            </p>
            <span
              className="mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px]"
              style={{ borderColor: `${accent}88`, color: accent }}
            >
              {cp.categories[item.category]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.countryPanel.close}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-3">
        {photo ? (
          <section className="overflow-hidden rounded-lg border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbnailUrl ?? photo.url}
              alt={photo.title ?? item.name}
              className="h-40 w-full object-cover"
            />
            <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 text-[10px] text-slate-300">
              {photos.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)
                  }
                  aria-label={cp.previousPhoto}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              ) : null}
              <p className="flex-1 text-center">
                {cp.photoCredit}: {photo.author ?? "Wikimedia Commons"}
                {photo.license ? ` · ${photo.license}` : ""}
              </p>
              {photos.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setPhotoIndex((photoIndex + 1) % photos.length)
                  }
                  aria-label={cp.nextPhoto}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </section>
        ) : loading ? (
          <div
            className="h-40 animate-pulse rounded-xl bg-white/10"
            aria-label={cp.loadingDetails}
          />
        ) : null}

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {cp.overview}
          </h2>
          <p className="text-sm leading-relaxed text-slate-200">
            {details?.description ?? item.summary}
          </p>
          {!loading && (failed || !details?.verified) ? (
            <p className="mt-2 text-xs text-slate-400">{cp.detailsUnavailable}</p>
          ) : null}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {cp.engineeringFacts}
          </h2>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div><dt className="text-slate-400">{cp.type}</dt><dd>{cp.categories[item.category]}</dd></div>
            <div><dt className="text-slate-400">{cp.status}</dt><dd>{cp.statuses[item.status]}</dd></div>
            {item.openingYear != null ? <div><dt className="text-slate-400">{cp.openingYear}</dt><dd>{item.openingYear}</dd></div> : null}
            <div><dt className="text-slate-400">{cp.carries}</dt><dd>{cp.carriesValues[item.carries]}</dd></div>
            {item.lengthMeters != null ? <div><dt className="text-slate-400">{cp.length}</dt><dd>{number(item.lengthMeters)} m</dd></div> : null}
            {item.heightMeters != null ? <div><dt className="text-slate-400">{cp.height}</dt><dd>{number(item.heightMeters)} m</dd></div> : null}
            {item.mainSpanMeters != null ? <div><dt className="text-slate-400">{cp.mainSpan}</dt><dd>{number(item.mainSpanMeters)} m</dd></div> : null}
            {item.depthMeters != null ? <div><dt className="text-slate-400">{cp.depth}</dt><dd>{number(item.depthMeters)} m</dd></div> : null}
          </dl>
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {cp.location}
          </h2>
          <p className="text-sm text-slate-200">
            {item.regionOrCity} · {countries.join(", ")}
          </p>
          {onOpenCountry ? (
            <button
              type="button"
              className="mt-2 text-xs text-violet-300"
              onClick={() => onOpenCountry(item.countryCodes[0])}
            >
              {cp.openCountry}
            </button>
          ) : null}
        </section>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {cp.links}
          </h2>
          <ul className="space-y-2 text-sm">
            {item.officialUrl ? (
              <li><a className="inline-flex gap-1 text-sky-300" href={item.officialUrl} target="_blank" rel="noopener noreferrer">{cp.officialWebsite}<ExternalLink className="h-4 w-4" /></a></li>
            ) : null}
            {details?.wikipediaUrl ? (
              <li><a className="inline-flex gap-1 text-sky-300" href={details.wikipediaUrl} target="_blank" rel="noopener noreferrer">{cp.wikipedia}<ExternalLink className="h-4 w-4" /></a></li>
            ) : null}
          </ul>
        </section>

        {details?.sources.length ? (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {cp.sourcesCredits}
            </h2>
            <ul className="space-y-1 text-[11px] text-slate-400">
              {details.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
