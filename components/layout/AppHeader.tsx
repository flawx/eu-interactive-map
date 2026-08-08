"use client";

import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import EuLogo from "@/components/branding/EuLogo";
import LanguageSelector from "@/components/i18n/LanguageSelector";
import AppSideNav from "@/components/layout/AppSideNav";
import MapSearchBox from "@/components/layout/MapSearchBox";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/types";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { NormalizedAlert } from "@/lib/alerts/types";
import type { TemporaryInternalBorderControl } from "@/lib/security/schengenBorders";
import type { MapSearchResult } from "@/lib/search/mapSearch";

type AppHeaderProps = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  t: Messages;
  wildfires: readonly WildfireIncident[];
  alerts?: readonly NormalizedAlert[];
  temporaryBorderControls?: readonly TemporaryInternalBorderControl[];
  onSelectSearchResult: (result: MapSearchResult) => void;
  onGoEurope: () => void;
  onFocusLegend: () => void;
  onOpenRoutePlanner?: () => void;
  onDirectionsToResult?: (result: MapSearchResult) => void;
};

export default function AppHeader({
  locale,
  onLocaleChange,
  t,
  wildfires,
  alerts = [],
  temporaryBorderControls,
  onSelectSearchResult,
  onGoEurope,
  onFocusLegend,
  onOpenRoutePlanner,
  onDirectionsToResult,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 overflow-visible px-3 pt-3 sm:px-4"
        style={{ zIndex: 1000, height: "auto" }}
      >
        <div className="pointer-events-auto flex w-full max-w-[100vw] items-start gap-2 overflow-visible sm:gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="map-ui-control inline-flex h-12 w-12 shrink-0 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
            aria-label={t.header.openMenu}
            aria-expanded={menuOpen}
            aria-controls="app-side-nav"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="map-ui-control inline-flex h-12 shrink-0 items-center px-2.5">
            <EuLogo onClick={onGoEurope} showName className="min-w-0" />
          </div>

          <div className="hidden min-w-0 flex-1 justify-center overflow-visible md:flex">
            <MapSearchBox
              locale={locale}
              t={t}
              wildfires={wildfires}
              alerts={alerts}
              temporaryBorderControls={temporaryBorderControls}
              onSelectResult={onSelectSearchResult}
              onOpenRoutePlanner={onOpenRoutePlanner}
              onDirectionsToResult={onDirectionsToResult}
            />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 overflow-visible">
            <button
              type="button"
              className="map-ui-control inline-flex h-12 w-12 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 md:hidden"
              aria-label={
                mobileSearchOpen ? t.search.clearSearch : t.header.openSearch
              }
              aria-expanded={mobileSearchOpen}
              onClick={() => setMobileSearchOpen((value) => !value)}
            >
              {mobileSearchOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Search className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            <LanguageSelector
              locale={locale}
              onLocaleChange={onLocaleChange}
              t={t}
            />
          </div>
        </div>

        {mobileSearchOpen ? (
          <div className="pointer-events-auto mt-2 w-full overflow-visible animate-[fadeIn_160ms_ease-out] md:hidden">
            <MapSearchBox
              locale={locale}
              t={t}
              wildfires={wildfires}
              alerts={alerts}
              temporaryBorderControls={temporaryBorderControls}
              compact
              autoFocus
              onSelectResult={onSelectSearchResult}
              onOpenRoutePlanner={onOpenRoutePlanner}
              onDirectionsToResult={onDirectionsToResult}
              onCloseCompact={() => setMobileSearchOpen(false)}
            />
          </div>
        ) : null}
      </div>

      <div id="app-side-nav">
        <AppSideNav
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          t={t}
          onGoEurope={onGoEurope}
          onFocusLegend={onFocusLegend}
        />
      </div>
    </>
  );
}
