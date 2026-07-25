"use client";

import dynamic from "next/dynamic";
import type {
  EffisBurnedArea,
  WildfireIncident,
} from "@/lib/incidents/types";

const MapContainer = dynamic(() => import("@/components/map/MapContainer"), {
  ssr: false,
});

type MapClientProps = {
  showEurozone: boolean;
  showNonEurozone: boolean;
  showCandidates: boolean;
  showSchengenNonEU: boolean;
  selectedCountryCode: string | null;
  onCountrySelect: (countryCode: string | null) => void;
  wildfireIncidents: WildfireIncident[];
  showWildfires: boolean;
  onWildfireSelect: (incidentId: string | null) => void;
  showSatelliteActiveFires: boolean;
  showSatelliteBurnedAreas: boolean;
  onEffisBurnedAreaSelect: (burnedArea: EffisBurnedArea | null) => void;
  onEffisBurnedAreaLoadingChange: (loading: boolean) => void;
};

export default function MapClient({
  showEurozone,
  showNonEurozone,
  showCandidates,
  showSchengenNonEU,
  selectedCountryCode,
  onCountrySelect,
  wildfireIncidents,
  showWildfires,
  onWildfireSelect,
  showSatelliteActiveFires,
  showSatelliteBurnedAreas,
  onEffisBurnedAreaSelect,
  onEffisBurnedAreaLoadingChange,
}: MapClientProps) {
  return (
    <MapContainer
      showEurozone={showEurozone}
      showNonEurozone={showNonEurozone}
      showCandidates={showCandidates}
      showSchengenNonEU={showSchengenNonEU}
      selectedCountryCode={selectedCountryCode}
      onCountrySelect={onCountrySelect}
      wildfireIncidents={wildfireIncidents}
      showWildfires={showWildfires}
      onWildfireSelect={onWildfireSelect}
      showSatelliteActiveFires={showSatelliteActiveFires}
      showSatelliteBurnedAreas={showSatelliteBurnedAreas}
      onEffisBurnedAreaSelect={onEffisBurnedAreaSelect}
      onEffisBurnedAreaLoadingChange={onEffisBurnedAreaLoadingChange}
    />
  );
}
