"use client";

import { useState } from "react";
import { Menu, Search } from "lucide-react";
import EuLogo from "@/components/branding/EuLogo";
import AppSideNav from "@/components/layout/AppSideNav";
import MapSearchBox from "@/components/layout/MapSearchBox";
import { supportedLocales, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/types";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { MapSearchResult } from "@/lib/search/mapSearch";

type AppHeaderProps = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  t: Messages;
  languageNames: Intl.DisplayNames;
  wildfires: readonly WildfireIncident[];
  onSelectSearchResult: (result: MapSearchResult) => void;
  onGoEurope: () => void;
  onOpenWildfires: () => void;
  onFocusLegend: () => void;
};

export default function AppHeader({
  locale,
  onLocaleChange,
  t,
  languageNames,
  wildfires,
  onSelectSearchResult,
  onGoEurope,
  onOpenWildfires,
  onFocusLegend,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-slate-950/85 shadow-lg backdrop-blur-md"
        style={{ height: "var(--app-header-height)" }}
      >
        <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
            aria-label={t.header.openMenu}
            aria-expanded={menuOpen}
            aria-controls="app-side-nav"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <EuLogo onClick={onGoEurope} showName className="min-w-0" />

          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <MapSearchBox
              locale={locale}
              t={t}
              wildfires={wildfires}
              onSelectResult={onSelectSearchResult}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70 md:hidden"
              aria-label={t.header.openSearch}
              aria-expanded={mobileSearchOpen}
              onClick={() => setMobileSearchOpen((value) => !value)}
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            <label className="sr-only" htmlFor="map-language">
              {t.header.language}
            </label>
            <select
              id="map-language"
              value={locale}
              onChange={(event) =>
                onLocaleChange(event.target.value as Locale)
              }
              className="h-10 max-w-[7.5rem] rounded-md border border-white/10 bg-slate-900/80 px-2 text-xs text-white outline-none backdrop-blur-md focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:max-w-[10rem]"
            >
              {supportedLocales.map((supportedLocale) => (
                <option
                  key={supportedLocale}
                  value={supportedLocale}
                  title={languageNames.of(supportedLocale) ?? supportedLocale}
                >
                  {supportedLocale.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="border-t border-white/10 bg-slate-950/95 px-3 py-2 md:hidden">
            <MapSearchBox
              locale={locale}
              t={t}
              wildfires={wildfires}
              compact
              autoFocus
              onSelectResult={onSelectSearchResult}
              onCloseCompact={() => setMobileSearchOpen(false)}
            />
          </div>
        ) : null}
      </header>

      <div id="app-side-nav">
        <AppSideNav
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          t={t}
          onGoEurope={onGoEurope}
          onOpenWildfires={onOpenWildfires}
          onFocusLegend={onFocusLegend}
        />
      </div>
    </>
  );
}
