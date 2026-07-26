"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Building, Building2, CalendarDays, ChevronLeft, ChevronRight, Clock3, Coins, Crown, ExternalLink, Globe2, Landmark, Languages, MapPin, Maximize2, Phone, Quote, Shield, TrendingUp, Users } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import {
  euInstitutionsByCountry,
  nationalDaysByCountry,
} from "@/lib/data/countryFacts";
import { getMessages } from "@/lib/i18n/messages";

type CountryInfoPanelProps = {
  countryCode: string;
  locale: Locale;
  onClose: () => void;
};

type PoliticalLeader = {
  name: string;
  role: string | null;
};

type LargestCity = {
  name: string;
  population: number | null;
};

type CountryPhoto = {
  url: string;
  sourceUrl: string | null;
  credit: string | null;
  license: string | null;
  licenseUrl: string | null;
};

type TravelSafetyStatus = "safe" | "caution" | "avoid" | "unknown";

type TravelSafety = {
  level: 1 | 2 | 3 | 4 | null;
  status: TravelSafetyStatus;
  sourceUrl: string | null;
  updatedAt: string | null;
};

type CountryDetails = {
  capital: string | null;
  population: number | null;
  populationYear: string | null;
  area: number | null;
  areaYear: string | null;
  languages: Array<{
    code: string | null;
    name: string;
  }>;
  governmentTypes: string[];
  headOfStates: PoliticalLeader[];
  officialWebsite: string | null;
  wikipediaSummary: string | null;
  wikipediaUrl: string | null;
  largestCity: LargestCity | null;
  gdp: number | null;
  gdpYear: string | null;
  nationalMotto: string | null;
  timeZones: string[];
  photos: CountryPhoto[];
  travelSafety: TravelSafety;
};

function formatMonthAndDay(
  value: string,
  locale: Locale,
): string | null {
  const [monthValue, dayValue] = value.split("-").map(Number);

  if (!Number.isInteger(monthValue) || !Number.isInteger(dayValue)) {
    return null;
  }

  const date = new Date(Date.UTC(2000, monthValue - 1, dayValue));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

type CurrencyInfo = {
  code: string;
  symbol: string;
};

const currencyByCountry: Record<string, CurrencyInfo> = {
  CZ: { code: "CZK", symbol: "Kč" },
  DK: { code: "DKK", symbol: "kr" },
  HU: { code: "HUF", symbol: "Ft" },
  PL: { code: "PLN", symbol: "zł" },
  RO: { code: "RON", symbol: "lei" },
  SE: { code: "SEK", symbol: "kr" },

  IS: { code: "ISK", symbol: "kr" },
  LI: { code: "CHF", symbol: "CHF" },
  NO: { code: "NOK", symbol: "kr" },
  CH: { code: "CHF", symbol: "CHF" },

  AL: { code: "ALL", symbol: "L" },
  BA: { code: "BAM", symbol: "KM" },
  GE: { code: "GEL", symbol: "₾" },
  MD: { code: "MDL", symbol: "L" },
  ME: { code: "EUR", symbol: "€" },
  MK: { code: "MKD", symbol: "ден" },
  RS: { code: "RSD", symbol: "дин." },
  TR: { code: "TRY", symbol: "₺" },
  UA: { code: "UAH", symbol: "₴" },
};

const euroCurrency: CurrencyInfo = {
  code: "EUR",
  symbol: "€",
};

const callingCodeByCountry: Record<string, string> = {
  AT: "+43",
  BE: "+32",
  BG: "+359",
  HR: "+385",
  CY: "+357",
  CZ: "+420",
  DK: "+45",
  EE: "+372",
  FI: "+358",
  FR: "+33",
  DE: "+49",
  EL: "+30",
  HU: "+36",
  IE: "+353",
  IT: "+39",
  LV: "+371",
  LT: "+370",
  LU: "+352",
  MT: "+356",
  NL: "+31",
  PL: "+48",
  PT: "+351",
  RO: "+40",
  SK: "+421",
  SI: "+386",
  ES: "+34",
  SE: "+46",

  IS: "+354",
  LI: "+423",
  NO: "+47",
  CH: "+41",

  AL: "+355",
  BA: "+387",
  GE: "+995",
  MD: "+373",
  ME: "+382",
  MK: "+389",
  RS: "+381",
  TR: "+90",
  UA: "+380",
};

const euAccessionYearByCountry: Record<string, number> = {
  BE: 1958,
  DE: 1958,
  FR: 1958,
  IT: 1958,
  LU: 1958,
  NL: 1958,

  DK: 1973,
  IE: 1973,

  EL: 1981,

  ES: 1986,
  PT: 1986,

  AT: 1995,
  FI: 1995,
  SE: 1995,

  CY: 2004,
  CZ: 2004,
  EE: 2004,
  HU: 2004,
  LV: 2004,
  LT: 2004,
  MT: 2004,
  PL: 2004,
  SK: 2004,
  SI: 2004,

  BG: 2007,
  RO: 2007,

  HR: 2013,
};

const euCountrySlugByCode: Record<string, string> = {
  AT: "austria",
  BE: "belgium",
  BG: "bulgaria",
  HR: "croatia",
  CY: "cyprus",
  CZ: "czechia",
  DK: "denmark",
  EE: "estonia",
  FI: "finland",
  FR: "france",
  DE: "germany",
  EL: "greece",
  HU: "hungary",
  IE: "ireland",
  IT: "italy",
  LV: "latvia",
  LT: "lithuania",
  LU: "luxembourg",
  MT: "malta",
  NL: "netherlands",
  PL: "poland",
  PT: "portugal",
  RO: "romania",
  SK: "slovakia",
  SI: "slovenia",
  ES: "spain",
  SE: "sweden",
};

const nonEurozoneCountries = ["CZ", "DK", "HU", "PL", "RO", "SE"];

const schengenNonEUCountries = ["IS", "LI", "NO", "CH"];

const candidateCountries = [
  "AL",
  "BA",
  "GE",
  "MD",
  "ME",
  "MK",
  "RS",
  "TR",
  "UA",
];

function getCountryStatus(countryCode: string, locale: Locale) {
  const t = getMessages(locale);

  if (candidateCountries.includes(countryCode)) {
    return {
      label: t.legend.officialCandidate,
      color: "#f59e0b",
    };
  }

  if (schengenNonEUCountries.includes(countryCode)) {
    return {
      label: t.legend.schengenNonEU,
      color: "#14b8a6",
    };
  }

  if (nonEurozoneCountries.includes(countryCode)) {
    return {
      label: t.legend.nonEurozone,
      color: "#7c3aed",
    };
  }

  return {
    label: t.legend.eurozone,
    color: "#2563eb",
  };
}

export default function CountryInfoPanel({
  countryCode,
  locale,
  onClose,
}: CountryInfoPanelProps) {
  const regionCode = countryCode === "EL" ? "GR" : countryCode;
  const t = getMessages(locale);

  const [details, setDetails] = useState<CountryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);

  const countryName = useMemo(() => {
    const displayNames = new Intl.DisplayNames([locale], {
      type: "region",
    });
    return displayNames.of(regionCode) ?? countryCode;
  }, [countryCode, locale, regionCode]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [countryCode]);

  useEffect(() => {
    const controller = new AbortController();

    setDetails(null);
    setIsLoading(true);

    fetch(`/api/countries/${regionCode}?locale=${locale}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load country details");
        }

        const data = (await response.json()) as CountryDetails;
        setDetails(data);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [regionCode, locale]);

  const flagUrl = `https://flagcdn.io/flags/4x3/${regionCode.toLowerCase()}.svg`;
  const status = getCountryStatus(countryCode, locale);
  const currency = currencyByCountry[countryCode] ?? euroCurrency;
  const callingCode = callingCodeByCountry[countryCode] ?? "—";
  const euAccessionYear = euAccessionYearByCountry[countryCode] ?? null;
  const euCountrySlug = euCountrySlugByCode[countryCode] ?? null;
  const euCountryProfileUrl = euCountrySlug
    ? `https://european-union.europa.eu/principles-countries-history/eu-countries/${euCountrySlug}_${locale}`
    : null;

  const formattedPopulation =
    details?.population !== null &&
    details?.population !== undefined
      ? new Intl.NumberFormat(locale).format(details.population)
      : null;

  const formattedArea =
    details?.area !== null &&
    details?.area !== undefined
      ? new Intl.NumberFormat(locale, {
          maximumFractionDigits: 0,
        }).format(details.area)
      : null;

  const populationValue = formattedPopulation
    ? `${formattedPopulation}${
        details?.populationYear ? ` (${details.populationYear})` : ""
      }`
    : "—";

  const areaValue = formattedArea
    ? `${formattedArea} km²${
        details?.areaYear ? ` (${details.areaYear})` : ""
      }`
    : "—";

  const languageDisplayNames = new Intl.DisplayNames([locale], {
    type: "language",
  });

  const formattedLanguages =
    details?.languages
      ?.map((language) => {
        if (!language.code) {
          return language.name;
        }

        try {
          return languageDisplayNames.of(language.code) ?? language.name;
        } catch {
          return language.name;
        }
      })
      .join(", ") || null;

  const formattedGovernmentTypes =
    details?.governmentTypes?.join(", ") || null;

  const formattedLargestCityPopulation =
    details?.largestCity?.population !== null &&
    details?.largestCity?.population !== undefined
      ? new Intl.NumberFormat(locale).format(details.largestCity.population)
      : null;

  const formattedGdp =
    details?.gdp !== null && details?.gdp !== undefined
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "USD",
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(details.gdp)
      : null;

  const formattedTimeZones = details?.timeZones.join(", ") || null;

  const nationalDays = nationalDaysByCountry[countryCode] ?? [];
  const formattedNationalDays =
    nationalDays
      .map((date) => formatMonthAndDay(date, locale))
      .filter((date): date is string => typeof date === "string")
      .join(", ") || null;

  const euInstitutions = euInstitutionsByCountry[countryCode] ?? [];
  const euInstitutionCount = euInstitutions.length;

  const travelSafety = details?.travelSafety ?? {
    level: null,
    status: "unknown" as const,
    sourceUrl: null,
    updatedAt: null,
  };

  let travelSafetyLabel = t.countryPanel.safetyUnavailable;
  let travelSafetyDotClass = "bg-slate-400";
  let travelSafetyContainerClass =
    "border-slate-500/30 bg-slate-500/10 text-slate-300";

  if (travelSafety.status === "safe") {
    travelSafetyLabel = t.countryPanel.safetySafe;
    travelSafetyDotClass = "bg-emerald-500";
    travelSafetyContainerClass =
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  } else if (travelSafety.status === "caution") {
    travelSafetyLabel = t.countryPanel.safetyCaution;
    travelSafetyDotClass = "bg-amber-500";
    travelSafetyContainerClass =
      "border-amber-500/30 bg-amber-500/10 text-amber-200";
  } else if (travelSafety.status === "avoid") {
    travelSafetyLabel = t.countryPanel.safetyAvoid;
    travelSafetyDotClass = "bg-red-500";
    travelSafetyContainerClass =
      "border-red-500/30 bg-red-500/10 text-red-200";
  }

  let formattedSafetyUpdatedAt: string | null = null;

  if (travelSafety.updatedAt) {
    const parsedUpdatedAt = new Date(travelSafety.updatedAt);

    if (!Number.isNaN(parsedUpdatedAt.getTime())) {
      formattedSafetyUpdatedAt = new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
      }).format(parsedUpdatedAt);
    }
  }

  const photos = details?.photos ?? [];
  const currentPhoto = photos[photoIndex] ?? null;

  const showPreviousPhoto = () => {
    setPhotoIndex((currentIndex) =>
      currentIndex === 0 ? photos.length - 1 : currentIndex - 1,
    );
  };

  const showNextPhoto = () => {
    setPhotoIndex((currentIndex) =>
      currentIndex === photos.length - 1 ? 0 : currentIndex + 1,
    );
  };

  const formatLeader = (leader: PoliticalLeader) =>
    leader.role ? `${leader.role} — ${leader.name}` : leader.name;

  const photoAttribution = currentPhoto
    ? [currentPhoto.credit, currentPhoto.license].filter(Boolean).join(" · ")
    : null;

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
            alt={`${countryName} flag`}
            width={48}
            height={36}
            className="h-9 w-12 shrink-0 rounded-sm border border-white/20 object-cover shadow-sm"
          />
          <p className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-snug">
            {countryName}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.countryPanel.close}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-300 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            ×
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm"
          style={{ backgroundColor: status.color }}
          aria-hidden="true"
        />
        <p className="text-xs leading-snug text-slate-200">{status.label}</p>
      </div>

      {currentPhoto && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-slate-400">{t.countryPanel.photos}</p>

          <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
            <img
              src={currentPhoto.url}
              alt={`${countryName} — ${photoIndex + 1}`}
              className="h-full w-full object-cover"
            />

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPreviousPhoto}
                  aria-label={t.countryPanel.previousPhoto}
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white outline-none transition hover:bg-slate-950/90 focus-visible:ring-2 focus-visible:ring-sky-400/70"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNextPhoto}
                  aria-label={t.countryPanel.nextPhoto}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/70 text-white outline-none transition hover:bg-slate-950/90 focus-visible:ring-2 focus-visible:ring-sky-400/70"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              {photos.map((photo, index) => (
                <button
                  key={photo.url}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`${t.countryPanel.photos} ${index + 1}`}
                  aria-current={index === photoIndex}
                  className={`h-2 w-2 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                    index === photoIndex
                      ? "bg-sky-400"
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}

          {photoAttribution &&
            (currentPhoto.sourceUrl ? (
              <a
                href={currentPhoto.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] leading-snug text-slate-400 outline-none transition hover:text-sky-400 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-400/70"
              >
                {photoAttribution}
              </a>
            ) : (
              <p className="text-[10px] leading-snug text-slate-400">
                {photoAttribution}
              </p>
            ))}
        </div>
      )}

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{t.countryPanel.code}:</span>
          <span className="text-slate-100">{countryCode}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.capital}:</span>
          {isLoading ? (
            <span className="h-3 w-24 animate-pulse rounded bg-white/15" />
          ) : (
            <span className="text-slate-100">
              {details?.capital || "—"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.nationalDay}:</span>
          <span className="text-slate-100">
            {formattedNationalDays || "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.largestCity}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : details?.largestCity ? (
            <span className="text-slate-100">
              {details.largestCity.name}
              {formattedLargestCityPopulation
                ? ` (${formattedLargestCityPopulation})`
                : ""}
            </span>
          ) : (
            <span className="text-slate-100">—</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.population}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : (
            <span className="text-slate-100">{populationValue}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.gdp}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : formattedGdp ? (
            <span className="text-slate-100">
              {formattedGdp}
              {details?.gdpYear ? ` (${details.gdpYear})` : ""}
            </span>
          ) : (
            <span className="text-slate-100">—</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Maximize2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.area}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : (
            <span className="text-slate-100">{areaValue}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.currency}:</span>
          <span className="text-slate-100">
            {currency.symbol} ({currency.code})
          </span>
        </div>

        <div className="flex items-start gap-2">
          <Languages className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="shrink-0 text-slate-400">{t.countryPanel.languages}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : (
            <span className="text-slate-100">
              {formattedLanguages || "—"}
            </span>
          )}
        </div>

        <div className="flex items-start gap-2">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="shrink-0 text-slate-400">{t.countryPanel.governmentType}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : (
            <span className="text-slate-100">
              {formattedGovernmentTypes || "—"}
            </span>
          )}
        </div>

        <div className="flex items-start gap-2">
          <Crown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1">
            <span className="text-slate-400">{t.countryPanel.headOfState}</span>
            {isLoading ? (
              <span className="block h-3 w-36 animate-pulse rounded bg-white/15" />
            ) : details?.headOfStates?.length ? (
              details.headOfStates.map((leader) => (
                <p
                  key={`${leader.role ?? "role"}-${leader.name}`}
                  className="text-slate-100"
                >
                  {formatLeader(leader)}
                </p>
              ))
            ) : (
              <p className="text-slate-100">—</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.callingCode}:</span>
          <span className="text-slate-100">{callingCode}</span>
        </div>

        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="shrink-0 text-slate-400">{t.countryPanel.timeZones}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : (
            <span className="text-slate-100">
              {formattedTimeZones || "—"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.euAccession}:</span>
          <span className="text-slate-100">
            {euAccessionYear ?? "—"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="text-slate-400">{t.countryPanel.euInstitutions}:</span>
          <span className="text-slate-100">{euInstitutionCount}</span>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="text-slate-400">{t.countryPanel.travelSafety}</span>
            {isLoading ? (
              <span className="block h-8 w-full animate-pulse rounded bg-white/15" />
            ) : (
              <>
                <div
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${travelSafetyContainerClass}`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${travelSafetyDotClass}`}
                    aria-hidden="true"
                  />
                  <span>
                    {travelSafetyLabel}
                    {formattedSafetyUpdatedAt
                      ? ` (${formattedSafetyUpdatedAt})`
                      : ""}
                  </span>
                </div>

                <p className="text-[10px] leading-snug text-slate-400">
                  {t.countryPanel.safetyDisclaimer}
                </p>

                {travelSafety.sourceUrl && (
                  <a
                    href={travelSafety.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sky-400 outline-none transition hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-400/70"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t.countryPanel.safetySource}</span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs">
        <div className="flex items-start gap-2">
          <Quote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="shrink-0 text-slate-400">{t.countryPanel.nationalMotto}:</span>
          {isLoading ? (
            <span className="h-3 w-28 animate-pulse rounded bg-white/15" />
          ) : (
            <span className="text-slate-100">
              {details?.nationalMotto || "—"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
        <div className="flex items-start gap-2">
          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="text-xs text-slate-400">{t.countryPanel.overview}</span>
            {isLoading ? (
              <span className="block h-16 w-full animate-pulse rounded bg-white/15" />
            ) : (
              <p className="max-h-32 overflow-y-auto text-sm leading-relaxed text-slate-200">
                {details?.wikipediaSummary || "—"}
              </p>
            )}

            {details?.wikipediaUrl && (
              <a
                href={details.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-sky-400 outline-none transition hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-400/70"
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t.countryPanel.readOnWikipedia}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {(details?.officialWebsite || euCountryProfileUrl) && (
        <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs">
          {details?.officialWebsite && (
            <a
              href={details.officialWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sky-400 outline-none transition hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <Globe2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.countryPanel.officialWebsite}</span>
            </a>
          )}

          {euCountryProfileUrl && (
            <a
              href={euCountryProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sky-400 outline-none transition hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t.countryPanel.euCountryProfile}</span>
            </a>
          )}
        </div>
      )}
      </div>
    </aside>
  );
}
