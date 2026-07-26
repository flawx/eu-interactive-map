"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n/config";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
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
  effisSnapshotsByIncidentId: Record<string, EffisBurnedAreaSnapshot>;
  selectedWildfireId: string | null;
  locale: Locale;
  firmsSnapshotsByIncidentId: Record<string, FirmsIncidentSnapshot>;
  onFirmsRasterAvailabilityChange?: (available: boolean) => void;
  onEffisBurnedAreasAvailabilityChange?: (unavailable: boolean) => void;
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
  effisSnapshotsByIncidentId,
  selectedWildfireId,
  locale,
  firmsSnapshotsByIncidentId,
  onFirmsRasterAvailabilityChange,
  onEffisBurnedAreasAvailabilityChange,
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
      effisSnapshotsByIncidentId={effisSnapshotsByIncidentId}
      selectedWildfireId={selectedWildfireId}
      locale={locale}
      firmsSnapshotsByIncidentId={firmsSnapshotsByIncidentId}
      onFirmsRasterAvailabilityChange={onFirmsRasterAvailabilityChange}
      onEffisBurnedAreasAvailabilityChange={onEffisBurnedAreasAvailabilityChange}
    />
  );
}
