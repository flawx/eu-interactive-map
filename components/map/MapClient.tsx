"use client";

import dynamic from "next/dynamic";
import type { MutableRefObject } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { EffisBurnedAreaSnapshot } from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type {
  EffisBurnedArea,
  WildfireIncident,
} from "@/lib/incidents/types";
import type {
  MapFocusRequest,
  TemporaryMapMarker,
} from "@/lib/map/focusRequest";
import type { MapCameraCommands } from "@/lib/map/mapCameraCommands";
import type {
  MapBaseMode,
  MapDimensionMode,
} from "@/lib/map/mapViewPreferences";
import type { UserLocation } from "@/lib/map/userLocation";

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
  showEuCapitals: boolean;
  selectedCapitalId: string | null;
  onCapitalSelect: (capitalId: string | null) => void;
  showEuMainInstitutions: boolean;
  selectedInstitutionSiteId: string | null;
  onInstitutionSiteSelect?: (siteId: string | null) => void;
  showUnescoWorldHeritage: boolean;
  showUnescoCultural: boolean;
  showUnescoNatural: boolean;
  showUnescoMixed: boolean;
  selectedUnescoSiteId: string | null;
  onUnescoSiteSelect?: (siteId: string | null) => void;
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
  firmsHistorySnapshotsByIncidentId: Record<string, FirmsIncidentSnapshot>;
  onEffisBurnedAreasAvailabilityChange?: (unavailable: boolean) => void;
  focusRequest?: MapFocusRequest | null;
  temporaryMarker?: TemporaryMapMarker | null;
  focusGeometryRef?: MutableRefObject<
    ((geometry: GeoJSON.Geometry) => void) | null
  >;
  mapCommandsRef?: MutableRefObject<MapCameraCommands | null>;
  baseMode?: MapBaseMode;
  dimensionMode?: MapDimensionMode;
  onCameraChange?: (snapshot: {
    pitch: number;
    bearing: number;
    zoom: number;
  }) => void;
  onTerrainReadyChange?: (ready: boolean) => void;
  userLocation?: UserLocation | null;
  focusUserLocationRef?: MutableRefObject<
    ((mode?: "fit" | "soft") => void) | null
  >;
  onUserMapGesture?: () => void;
};

export default function MapClient({
  showEurozone,
  showNonEurozone,
  showCandidates,
  showSchengenNonEU,
  selectedCountryCode,
  onCountrySelect,
  showEuCapitals,
  selectedCapitalId,
  onCapitalSelect,
  showEuMainInstitutions,
  selectedInstitutionSiteId,
  onInstitutionSiteSelect,
  showUnescoWorldHeritage,
  showUnescoCultural,
  showUnescoNatural,
  showUnescoMixed,
  selectedUnescoSiteId,
  onUnescoSiteSelect,
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
  firmsHistorySnapshotsByIncidentId,
  onEffisBurnedAreasAvailabilityChange,
  focusRequest = null,
  temporaryMarker = null,
  focusGeometryRef,
  mapCommandsRef,
  baseMode = "map",
  dimensionMode = "2d",
  onCameraChange,
  onTerrainReadyChange,
  userLocation = null,
  focusUserLocationRef,
  onUserMapGesture,
}: MapClientProps) {
  return (
    <MapContainer
      showEurozone={showEurozone}
      showNonEurozone={showNonEurozone}
      showCandidates={showCandidates}
      showSchengenNonEU={showSchengenNonEU}
      selectedCountryCode={selectedCountryCode}
      onCountrySelect={onCountrySelect}
      showEuCapitals={showEuCapitals}
      selectedCapitalId={selectedCapitalId}
      onCapitalSelect={onCapitalSelect}
      showEuMainInstitutions={showEuMainInstitutions}
      selectedInstitutionSiteId={selectedInstitutionSiteId}
      onInstitutionSiteSelect={onInstitutionSiteSelect}
      showUnescoWorldHeritage={showUnescoWorldHeritage}
      showUnescoCultural={showUnescoCultural}
      showUnescoNatural={showUnescoNatural}
      showUnescoMixed={showUnescoMixed}
      selectedUnescoSiteId={selectedUnescoSiteId}
      onUnescoSiteSelect={onUnescoSiteSelect}
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
      firmsHistorySnapshotsByIncidentId={firmsHistorySnapshotsByIncidentId}
      onEffisBurnedAreasAvailabilityChange={onEffisBurnedAreasAvailabilityChange}
      focusRequest={focusRequest}
      temporaryMarker={temporaryMarker}
      focusGeometryRef={focusGeometryRef}
      mapCommandsRef={mapCommandsRef}
      baseMode={baseMode}
      dimensionMode={dimensionMode}
      onCameraChange={onCameraChange}
      onTerrainReadyChange={onTerrainReadyChange}
      userLocation={userLocation}
      focusUserLocationRef={focusUserLocationRef}
      onUserMapGesture={onUserMapGesture}
    />
  );
}
