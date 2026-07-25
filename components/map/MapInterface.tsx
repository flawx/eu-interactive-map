"use client";

import { useEffect, useMemo, useState } from "react";
import EffisBurnedAreaPanel from "@/components/incidents/EffisBurnedAreaPanel";
import WildfireIncidentPanel from "@/components/incidents/WildfireIncidentPanel";
import CountryInfoPanel from "@/components/map/CountryInfoPanel";
import MapClient from "@/components/map/MapClient";
import MapLegend from "@/components/map/MapLegend";
import {
  defaultLocale,
  supportedLocales,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type {
  EffisBurnedArea,
  WildfireIncident,
} from "@/lib/incidents/types";

export default function MapInterface() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [showEurozone, setShowEurozone] = useState(true);
  const [showNonEurozone, setShowNonEurozone] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);
  const [showSchengenNonEU, setShowSchengenNonEU] = useState(true);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null,
  );
  const [wildfireIncidents, setWildfireIncidents] = useState<
    WildfireIncident[]
  >([]);
  const [showWildfires, setShowWildfires] = useState(true);
  const [showSatelliteActiveFires, setShowSatelliteActiveFires] =
    useState(false);
  const [showSatelliteBurnedAreas, setShowSatelliteBurnedAreas] =
    useState(false);
  const [selectedWildfireId, setSelectedWildfireId] = useState<string | null>(
    null,
  );
  const [wildfiresLoading, setWildfiresLoading] = useState(true);
  const [selectedEffisBurnedArea, setSelectedEffisBurnedArea] =
    useState<EffisBurnedArea | null>(null);
  const [effisBurnedAreaLoading, setEffisBurnedAreaLoading] = useState(false);

  const t = getMessages(locale);

  const languageNames = useMemo(
    () => new Intl.DisplayNames(["en"], { type: "language" }),
    [],
  );

  const selectedWildfire = useMemo(
    () =>
      wildfireIncidents.find((incident) => incident.id === selectedWildfireId) ??
      null,
    [wildfireIncidents, selectedWildfireId],
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadWildfires = async () => {
      try {
        setWildfiresLoading(true);
        const response = await fetch("/api/incidents/wildfires", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load wildfires");
        }

        const data: unknown = await response.json();

        if (
          data &&
          typeof data === "object" &&
          "incidents" in data &&
          Array.isArray(data.incidents)
        ) {
          setWildfireIncidents(data.incidents as WildfireIncident[]);
        } else {
          setWildfireIncidents([]);
        }
      } catch (error: unknown) {
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

        setWildfireIncidents([]);
      } finally {
        if (!controller.signal.aborted) {
          setWildfiresLoading(false);
        }
      }
    };

    void loadWildfires();
    const intervalId = window.setInterval(() => {
      void loadWildfires();
    }, 6 * 60 * 1000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  void wildfiresLoading;

  const handleCountrySelect = (countryCode: string | null) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCountryCode(countryCode);
  };

  const handleWildfireSelect = (incidentId: string | null) => {
    setSelectedCountryCode(null);
    setSelectedEffisBurnedArea(null);
    setSelectedWildfireId(incidentId);
  };

  return (
    <>
      <MapClient
        showEurozone={showEurozone}
        showNonEurozone={showNonEurozone}
        showCandidates={showCandidates}
        showSchengenNonEU={showSchengenNonEU}
        selectedCountryCode={selectedCountryCode}
        onCountrySelect={handleCountrySelect}
        wildfireIncidents={wildfireIncidents}
        showWildfires={showWildfires}
        onWildfireSelect={handleWildfireSelect}
        showSatelliteActiveFires={showSatelliteActiveFires}
        showSatelliteBurnedAreas={showSatelliteBurnedAreas}
        onEffisBurnedAreaSelect={(burnedArea) => {
          setSelectedEffisBurnedArea(burnedArea);

          if (burnedArea) {
            setSelectedCountryCode(null);
            setSelectedWildfireId(null);
          }
        }}
        onEffisBurnedAreaLoadingChange={setEffisBurnedAreaLoading}
      />
      <MapLegend
        locale={locale}
        showEurozone={showEurozone}
        onToggleEurozone={setShowEurozone}
        showNonEurozone={showNonEurozone}
        onToggleNonEurozone={setShowNonEurozone}
        showCandidates={showCandidates}
        onToggleCandidates={setShowCandidates}
        showSchengenNonEU={showSchengenNonEU}
        onToggleSchengenNonEU={setShowSchengenNonEU}
        showWildfires={showWildfires}
        onToggleWildfires={setShowWildfires}
        showSatelliteActiveFires={showSatelliteActiveFires}
        onToggleSatelliteActiveFires={setShowSatelliteActiveFires}
        showSatelliteBurnedAreas={showSatelliteBurnedAreas}
        onToggleSatelliteBurnedAreas={setShowSatelliteBurnedAreas}
      />

      {effisBurnedAreaLoading && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/90 px-3 py-1.5 text-[11px] text-slate-200 shadow-xl backdrop-blur-md">
          {t.incidents.satelliteLookupLoading}
        </div>
      )}

      {selectedCountryCode && !selectedWildfire && !selectedEffisBurnedArea && (
        <CountryInfoPanel
          countryCode={selectedCountryCode}
          locale={locale}
          onClose={() => setSelectedCountryCode(null)}
        />
      )}

      {selectedWildfire && !selectedEffisBurnedArea && (
        <WildfireIncidentPanel
          incident={selectedWildfire}
          locale={locale}
          onClose={() => setSelectedWildfireId(null)}
        />
      )}

      {selectedEffisBurnedArea && (
        <EffisBurnedAreaPanel
          burnedArea={selectedEffisBurnedArea}
          locale={locale}
          onClose={() => setSelectedEffisBurnedArea(null)}
        />
      )}

      <label className="absolute left-4 top-4 z-10 block">
        <span className="sr-only">Language</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="rounded-xl border border-white/10 bg-slate-950/85 px-3 py-2 text-xs text-slate-200 shadow-xl backdrop-blur-md outline-none transition hover:border-white/20 focus:border-white/30"
        >
          {supportedLocales.map((code) => (
            <option key={code} value={code} className="bg-slate-950 text-slate-200">
              {languageNames.of(code) ?? code}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
