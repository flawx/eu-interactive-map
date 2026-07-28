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
import type { MountainCategoryFilters } from "@/components/map/mountainMapLayers";
import type { CivilEngineeringCategoryFilters } from "@/components/map/civilEngineeringMapLayers";
import type { UserLocation } from "@/lib/map/userLocation";
import type { TemporaryInternalBorderControl } from "@/lib/security/schengenBorders";
import type { NormalizedAlert } from "@/lib/alerts/types";
import type { WildfireWind } from "@/lib/alerts/wind";
import type { CopernicusFloodLayerStatus } from "@/lib/alerts/copernicusFlood";
import type { LandslideNowcastLayerStatus } from "@/lib/alerts/landslideNowcast";
import type {
  EarthquakeMagnitudeFilters,
  VolcanoActivityFilters,
  IndustrialIncidentFilters,
  WeatherHazardFilters,
} from "@/components/map/alertMapLayers";

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
  showEuropeanHeritageLabel: boolean;
  selectedEhlSiteId: string | null;
  selectedEhlLocationId: string | null;
  onEhlSiteSelect?: (siteId: string | null, locationId: string | null) => void;
  showMajorTouristPlaces: boolean;
  showTouristLandmark: boolean;
  showTouristHistoricArea: boolean;
  showTouristMuseum: boolean;
  showTouristParkGarden: boolean;
  showTouristNaturalLandscape: boolean;
  showTouristCoastalDestination: boolean;
  showTouristMountainDestination: boolean;
  selectedTouristPlaceId: string | null;
  onTouristPlaceSelect?: (placeId: string | null) => void;
  showEuropeanMountainPlaces: boolean;
  mountainCategoryFilters: MountainCategoryFilters;
  selectedMountainPlaceId: string | null;
  onMountainPlaceSelect?: (placeId: string | null) => void;
  showMajorCivilEngineeringWorks: boolean;
  civilEngineeringCategoryFilters: CivilEngineeringCategoryFilters;
  selectedCivilEngineeringWorkId: string | null;
  onCivilEngineeringWorkSelect?: (workId: string | null) => void;
  showMajorEuropeanAirports: boolean;
  selectedAirportId: string | null;
  onAirportSelect?: (airportId: string | null) => void;
  showEurostarStations: boolean;
  showEurostarRoutes: boolean;
  selectedEurostarStationId: string | null;
  highlightedEurostarRouteIds?: readonly string[];
  onEurostarStationSelect?: (stationId: string | null) => void;
  showSchengenExternalBorderCrossings: boolean;
  showSchengenTemporaryInternalControls: boolean;
  showBorderCrossingRoad: boolean;
  showBorderCrossingRail: boolean;
  showBorderCrossingAir: boolean;
  showBorderCrossingSea: boolean;
  selectedBorderCrossingId: string | null;
  onBorderCrossingSelect?: (crossingId: string | null) => void;
  temporaryBorderControls: readonly TemporaryInternalBorderControl[];
  selectedTemporaryControlId: string | null;
  onTemporaryControlSelect?: (controlId: string | null) => void;
  wildfireIncidents: WildfireIncident[];
  showWildfires: boolean;
  onWildfireSelect: (incidentId: string | null) => void;
  showSatelliteActiveFires: boolean;
  showSatelliteBurnedAreas: boolean;
  onEffisBurnedAreaSelect: (burnedArea: EffisBurnedArea | null) => void;
  onEffisBurnedAreaLoadingChange: (loading: boolean) => void;
  effisSnapshotsByIncidentId: Record<string, EffisBurnedAreaSnapshot>;
  selectedWildfireId: string | null;
  normalizedAlerts: readonly NormalizedAlert[];
  showOfficialWeatherWarnings: boolean;
  weatherHazardFilters: WeatherHazardFilters;
  showMajorFloodAlerts: boolean;
  showMajorStorms: boolean;
  showRecentEarthquakes: boolean;
  earthquakeMagnitudeFilters: EarthquakeMagnitudeFilters;
  showMajorVolcanicActivity: boolean;
  volcanoActivityFilters: VolcanoActivityFilters;
  showLandslideLikelihood: boolean;
  landslideLikelihoodFilters: { moderate: boolean; high: boolean };
  landslideNowcastStatus: LandslideNowcastLayerStatus | null;
  showMappedLandslideEvents: boolean;
  showMajorIndustrialIncidents: boolean;
  industrialIncidentFilters: IndustrialIncidentFilters;
  selectedAlertId: string | null;
  onAlertSelect: (alertId: string | null) => void;
  onSatelliteObservationSelect: (alert: NormalizedAlert) => void;
  showObservedFloodExtent: boolean;
  copernicusFloodStatus: CopernicusFloodLayerStatus | null;
  showWildfireWind: boolean;
  wildfireWinds: readonly WildfireWind[];
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
  showEuropeanHeritageLabel,
  selectedEhlSiteId,
  selectedEhlLocationId,
  onEhlSiteSelect,
  showMajorTouristPlaces,
  showTouristLandmark,
  showTouristHistoricArea,
  showTouristMuseum,
  showTouristParkGarden,
  showTouristNaturalLandscape,
  showTouristCoastalDestination,
  showTouristMountainDestination,
  selectedTouristPlaceId,
  onTouristPlaceSelect,
  showEuropeanMountainPlaces,
  mountainCategoryFilters,
  selectedMountainPlaceId,
  onMountainPlaceSelect,
  showMajorCivilEngineeringWorks,
  civilEngineeringCategoryFilters,
  selectedCivilEngineeringWorkId,
  onCivilEngineeringWorkSelect,
  showMajorEuropeanAirports,
  selectedAirportId,
  onAirportSelect,
  showEurostarStations,
  showEurostarRoutes,
  selectedEurostarStationId,
  highlightedEurostarRouteIds,
  onEurostarStationSelect,
  showSchengenExternalBorderCrossings,
  showSchengenTemporaryInternalControls,
  showBorderCrossingRoad,
  showBorderCrossingRail,
  showBorderCrossingAir,
  showBorderCrossingSea,
  selectedBorderCrossingId,
  onBorderCrossingSelect,
  temporaryBorderControls,
  selectedTemporaryControlId,
  onTemporaryControlSelect,
  wildfireIncidents,
  showWildfires,
  onWildfireSelect,
  showSatelliteActiveFires,
  showSatelliteBurnedAreas,
  onEffisBurnedAreaSelect,
  onEffisBurnedAreaLoadingChange,
  effisSnapshotsByIncidentId,
  selectedWildfireId,
  normalizedAlerts,
  showOfficialWeatherWarnings,
  weatherHazardFilters,
  showMajorFloodAlerts,
  showMajorStorms,
  showRecentEarthquakes,
  earthquakeMagnitudeFilters,
  showMajorVolcanicActivity,
  volcanoActivityFilters,
  showLandslideLikelihood,
  landslideLikelihoodFilters,
  landslideNowcastStatus,
  showMappedLandslideEvents,
  showMajorIndustrialIncidents,
  industrialIncidentFilters,
  selectedAlertId,
  onAlertSelect,
  onSatelliteObservationSelect,
  showObservedFloodExtent,
  copernicusFloodStatus,
  showWildfireWind,
  wildfireWinds,
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
      showEuropeanHeritageLabel={showEuropeanHeritageLabel}
      selectedEhlSiteId={selectedEhlSiteId}
      selectedEhlLocationId={selectedEhlLocationId}
      onEhlSiteSelect={onEhlSiteSelect}
      showMajorTouristPlaces={showMajorTouristPlaces}
      showTouristLandmark={showTouristLandmark}
      showTouristHistoricArea={showTouristHistoricArea}
      showTouristMuseum={showTouristMuseum}
      showTouristParkGarden={showTouristParkGarden}
      showTouristNaturalLandscape={showTouristNaturalLandscape}
      showTouristCoastalDestination={showTouristCoastalDestination}
      showTouristMountainDestination={showTouristMountainDestination}
      selectedTouristPlaceId={selectedTouristPlaceId}
      onTouristPlaceSelect={onTouristPlaceSelect}
      showEuropeanMountainPlaces={showEuropeanMountainPlaces}
      mountainCategoryFilters={mountainCategoryFilters}
      selectedMountainPlaceId={selectedMountainPlaceId}
      onMountainPlaceSelect={onMountainPlaceSelect}
      showMajorCivilEngineeringWorks={showMajorCivilEngineeringWorks}
      civilEngineeringCategoryFilters={civilEngineeringCategoryFilters}
      selectedCivilEngineeringWorkId={selectedCivilEngineeringWorkId}
      onCivilEngineeringWorkSelect={onCivilEngineeringWorkSelect}
      showMajorEuropeanAirports={showMajorEuropeanAirports}
      selectedAirportId={selectedAirportId}
      onAirportSelect={onAirportSelect}
      showEurostarStations={showEurostarStations}
      showEurostarRoutes={showEurostarRoutes}
      selectedEurostarStationId={selectedEurostarStationId}
      highlightedEurostarRouteIds={highlightedEurostarRouteIds}
      onEurostarStationSelect={onEurostarStationSelect}
      showSchengenExternalBorderCrossings={showSchengenExternalBorderCrossings}
      showSchengenTemporaryInternalControls={
        showSchengenTemporaryInternalControls
      }
      showBorderCrossingRoad={showBorderCrossingRoad}
      showBorderCrossingRail={showBorderCrossingRail}
      showBorderCrossingAir={showBorderCrossingAir}
      showBorderCrossingSea={showBorderCrossingSea}
      selectedBorderCrossingId={selectedBorderCrossingId}
      onBorderCrossingSelect={onBorderCrossingSelect}
      temporaryBorderControls={temporaryBorderControls}
      selectedTemporaryControlId={selectedTemporaryControlId}
      onTemporaryControlSelect={onTemporaryControlSelect}
      wildfireIncidents={wildfireIncidents}
      showWildfires={showWildfires}
      onWildfireSelect={onWildfireSelect}
      showSatelliteActiveFires={showSatelliteActiveFires}
      showSatelliteBurnedAreas={showSatelliteBurnedAreas}
      onEffisBurnedAreaSelect={onEffisBurnedAreaSelect}
      onEffisBurnedAreaLoadingChange={onEffisBurnedAreaLoadingChange}
      effisSnapshotsByIncidentId={effisSnapshotsByIncidentId}
      selectedWildfireId={selectedWildfireId}
      normalizedAlerts={normalizedAlerts}
      showOfficialWeatherWarnings={showOfficialWeatherWarnings}
      weatherHazardFilters={weatherHazardFilters}
      showMajorFloodAlerts={showMajorFloodAlerts}
      showMajorStorms={showMajorStorms}
      showRecentEarthquakes={showRecentEarthquakes}
      earthquakeMagnitudeFilters={earthquakeMagnitudeFilters}
      showMajorVolcanicActivity={showMajorVolcanicActivity}
      volcanoActivityFilters={volcanoActivityFilters}
      showLandslideLikelihood={showLandslideLikelihood}
      landslideLikelihoodFilters={landslideLikelihoodFilters}
      landslideNowcastStatus={landslideNowcastStatus}
      showMappedLandslideEvents={showMappedLandslideEvents}
      showMajorIndustrialIncidents={showMajorIndustrialIncidents}
      industrialIncidentFilters={industrialIncidentFilters}
      selectedAlertId={selectedAlertId}
      onAlertSelect={onAlertSelect}
      onSatelliteObservationSelect={onSatelliteObservationSelect}
      showObservedFloodExtent={showObservedFloodExtent}
      copernicusFloodStatus={copernicusFloodStatus}
      showWildfireWind={showWildfireWind}
      wildfireWinds={wildfireWinds}
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
