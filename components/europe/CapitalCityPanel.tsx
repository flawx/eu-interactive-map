"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  Languages,
  MapPin,
  Mountain,
  Ruler,
  Users,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { EuCapitalDetails } from "@/lib/europe/euCapitalDetails";
import {
  flagRegionCode,
  getEuCapitalById,
} from "@/lib/europe/euCapitals";

type CapitalCityPanelProps = {
  capitalId: string;
  locale: Locale;
  onClose: () => void;
  onOpenCountry: (countryCode: string) => void;
};

type CountryLanguage = {
  code: string | null;
  name: string;
};

export default function CapitalCityPanel({
  capitalId,
  locale,
  onClose,
  onOpenCountry,
}: CapitalCityPanelProps) {
  const t = getMessages(locale);
  const capital = getEuCapitalById(capitalId) ?? null;
  const [details, setDetails] = useState<EuCapitalDetails | null>(null);
  const [languages, setLanguages] = useState<CountryLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const countryName = useMemo(() => {
    if (!capital) return "";
    const region = flagRegionCode(capital.countryCode);
    try {
      return (
        new Intl.DisplayNames([locale], { type: "region" }).of(region) ??
        capital.countryCode
      );
    } catch {
      return capital.countryCode;
    }
  }, [capital, locale]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [capitalId]);

  useEffect(() => {
    if (!capital) return;

    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setDetails(null);
    setLanguages([]);

    const load = async () => {
      try {
        const [detailsResponse, countryResponse] = await Promise.all([
          fetch(
            `/api/europe/capitals/${encodeURIComponent(capital.id)}?locale=${locale}`,
            { signal: controller.signal },
          ),
          fetch(
            `/api/countries/${flagRegionCode(capital.countryCode)}?locale=${locale}`,
            { signal: controller.signal },
          ),
        ]);

        if (controller.signal.aborted) return;

        if (detailsResponse.ok) {
          const data = (await detailsResponse.json()) as EuCapitalDetails;
          if (!controller.signal.aborted) {
            setDetails(data);
          }
        } else if (!controller.signal.aborted) {
          setError(true);
        }

        if (countryResponse.ok) {
          const countryData = (await countryResponse.json()) as {
            languages?: CountryLanguage[];
          };
          if (!controller.signal.aborted && Array.isArray(countryData.languages)) {
            setLanguages(countryData.languages);
          }
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
        if (!controller.signal.aborted) {
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [capital, locale]);

  if (!capital) return null;

  const displayName = details?.name ?? capital.canonicalName;
  const photos = details?.images ?? [];
  const currentPhoto = photos[photoIndex] ?? null;
  const flagUrl = `https://flagcdn.io/flags/4x3/${flagRegionCode(capital.countryCode).toLowerCase()}.svg`;

  const languageDisplayNames = new Intl.DisplayNames([locale], {
    type: "language",
  });

  const formattedLanguages =
    languages.length > 0
      ? languages
          .map((language) => {
            if (!language.code) return language.name;
            try {
              return languageDisplayNames.of(language.code) ?? language.name;
            } catch {
              return language.name;
            }
          })
          .join(", ")
      : null;

  const formatNumber = (value: number) =>
    new Intl.NumberFormat(locale).format(value);

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
        <div className="flex items-start gap-2.5">
          <img
            src={flagUrl}
            alt=""
            width={48}
            height={36}
            className="h-9 w-12 shrink-0 rounded-sm border border-white/20 object-cover shadow-sm"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{displayName}</p>
            {capital.nativeName !== displayName ? (
              <p className="text-[11px] text-slate-300">{capital.nativeName}</p>
            ) : null}
            <p className="text-[11px] text-slate-400">{countryName}</p>
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
        <p className="mt-2 inline-flex rounded-full border border-[#003399]/40 bg-[#003399]/25 px-2 py-0.5 text-[10px] font-medium text-[#facc15]">
          {t.capitalPanel.badge}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        {capital.noteKey === "governmentInTheHague" ? (
          <p className="mb-3 text-[11px] leading-relaxed text-slate-300">
            {t.capitalPanel.governmentInTheHague}
          </p>
        ) : null}

        {currentPhoto ? (
          <div className="space-y-2">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.title ?? displayName}
                className="h-full w-full object-cover"
              />
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label={t.capitalPanel.previousPhoto}
                    onClick={() =>
                      setPhotoIndex(
                        (index) => (index - 1 + photos.length) % photos.length,
                      )
                    }
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={t.capitalPanel.nextPhoto}
                    onClick={() =>
                      setPhotoIndex((index) => (index + 1) % photos.length)
                    }
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
            {(currentPhoto.author || currentPhoto.license) && (
              <p className="text-[10px] leading-snug text-slate-400">
                {t.capitalPanel.photoCredit}
                {": "}
                {[currentPhoto.author, currentPhoto.license]
                  .filter(Boolean)
                  .join(" · ")}
                {currentPhoto.sourceUrl ? (
                  <>
                    {" · "}
                    <a
                      href={currentPhoto.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      Commons
                    </a>
                  </>
                ) : null}
              </p>
            )}
          </div>
        ) : loading ? (
          <div className="mb-3 aspect-video animate-pulse rounded-lg bg-white/10" />
        ) : (
          <div className="mb-3 flex aspect-video items-center justify-center rounded-lg border border-dashed border-white/15 bg-slate-900/60 text-[11px] text-slate-400">
            {displayName}
          </div>
        )}

        <section className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.capitalPanel.presentation}
          </h3>
          {loading && !details?.description ? (
            <div className="space-y-2">
              <div className="h-3 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-4/6 animate-pulse rounded bg-white/10" />
            </div>
          ) : details?.description ? (
            <>
              <p className="text-sm leading-relaxed text-slate-200">
                {details.description.length > 520
                  ? `${details.description.slice(0, 520).trim()}…`
                  : details.description}
              </p>
              {details.wikipediaUrl ? (
                <a
                  href={details.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline"
                >
                  {t.capitalPanel.readOnWikipedia}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </>
          ) : error ? (
            <p className="text-sm text-slate-300">
              {t.capitalPanel.detailsUnavailable}
            </p>
          ) : (
            <p className="text-sm text-slate-400">{t.capitalPanel.unavailable}</p>
          )}
        </section>

        <section className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.capitalPanel.keyFigures}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <StatCard
              icon={<Users className="h-4 w-4 text-sky-400" />}
              label={t.capitalPanel.municipalPopulation}
              value={
                details?.population
                  ? `${formatNumber(details.population.value)}${
                      details.population.year
                        ? ` (${t.capitalPanel.yearLabel} ${details.population.year})`
                        : ""
                    }`
                  : loading
                    ? t.capitalPanel.loadingDetails
                    : t.capitalPanel.unavailable
              }
            />
            <StatCard
              icon={<Ruler className="h-4 w-4 text-emerald-400" />}
              label={t.capitalPanel.area}
              value={
                details?.areaKm2
                  ? `${formatNumber(details.areaKm2.value)} km²`
                  : loading
                    ? t.capitalPanel.loadingDetails
                    : t.capitalPanel.unavailable
              }
            />
            {details?.elevationMeters != null ? (
              <StatCard
                icon={<Mountain className="h-4 w-4 text-amber-400" />}
                label={t.capitalPanel.elevation}
                value={`${formatNumber(details.elevationMeters)} m`}
              />
            ) : null}
            <StatCard
              icon={<MapPin className="h-4 w-4 text-[#facc15]" />}
              label={t.capitalPanel.country}
              value={countryName}
            />
            <StatCard
              icon={<Languages className="h-4 w-4 text-violet-400" />}
              label={t.capitalPanel.languages}
              value={
                formattedLanguages ??
                (loading ? t.capitalPanel.loadingDetails : t.capitalPanel.unavailable)
              }
            />
          </div>
        </section>

        <section className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.capitalPanel.officialLinks}
          </h3>
          {details?.officialWebsite ? (
            <a
              href={details.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-sky-400 hover:underline"
            >
              <Globe2 className="h-4 w-4" />
              {t.capitalPanel.cityWebsite}
            </a>
          ) : null}
          {details?.tourismWebsite ? (
            <a
              href={details.tourismWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-sky-400 hover:underline"
            >
              <Building2 className="h-4 w-4" />
              {t.capitalPanel.tourismWebsite}
            </a>
          ) : null}
          {details?.wikipediaUrl ? (
            <a
              href={details.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-sky-400 hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Wikipedia
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenCountry(capital.countryCode)}
            className="flex w-full items-center gap-2 rounded-md px-0 py-1 text-left text-xs text-sky-400 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <LandmarkIcon />
            {t.capitalPanel.openCountryPanel}
          </button>
        </section>

        <section className="mt-4 space-y-1 border-t border-white/10 pt-3 pb-2 text-[10px] leading-relaxed text-slate-400">
          <p className="font-semibold text-slate-300">{t.capitalPanel.sources}</p>
          <p>{t.capitalPanel.sourceWikidata}</p>
          <p>{t.capitalPanel.sourceWikipedia}</p>
          <p>{t.capitalPanel.sourceCommons}</p>
        </section>
      </div>
    </aside>
  );
}

function LandmarkIcon() {
  return <Building2 className="h-4 w-4" />;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="text-sm font-medium text-slate-100">{value}</p>
      </div>
    </div>
  );
}
