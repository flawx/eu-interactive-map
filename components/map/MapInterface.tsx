"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EffisBurnedAreaPanel from "@/components/incidents/EffisBurnedAreaPanel";
import WildfireIncidentPanel from "@/components/incidents/WildfireIncidentPanel";
import AlertDetailsPanel from "@/components/alerts/AlertDetailsPanel";
import AlertStatusPanel from "@/components/alerts/AlertStatusPanel";
import CopernicusActivationPanel from "@/components/alerts/CopernicusActivationPanel";
import TrafficIncidentPanel from "@/components/alerts/TrafficIncidentPanel";
import AppHeader from "@/components/layout/AppHeader";
import TemporaryPlaceCard from "@/components/layout/TemporaryPlaceCard";
import CapitalCityPanel from "@/components/europe/CapitalCityPanel";
import EuInstitutionPanel from "@/components/europe/EuInstitutionPanel";
import CountryInfoPanel from "@/components/map/CountryInfoPanel";
import MapClient from "@/components/map/MapClient";
import MapControlDock from "@/components/map/MapControlDock";
import MapLegend from "@/components/map/MapLegend";
import UnescoSitePanel from "@/components/tourism/UnescoSitePanel";
import EuropeanHeritageLabelPanel from "@/components/tourism/EuropeanHeritageLabelPanel";
import TouristPlacePanel from "@/components/tourism/TouristPlacePanel";
import MountainPlacePanel from "@/components/tourism/MountainPlacePanel";
import CivilEngineeringWorkPanel from "@/components/tourism/CivilEngineeringWorkPanel";
import AirportPanel from "@/components/transport/AirportPanel";
import EurostarStationPanel from "@/components/transport/EurostarStationPanel";
import BorderCrossingPointPanel from "@/components/security/BorderCrossingPointPanel";
import TemporaryBorderControlPanel from "@/components/security/TemporaryBorderControlPanel";
import RoutePlannerPanel, {
  type RoutePlannerPickTarget,
} from "@/components/routing/RoutePlannerPanel";
import { getEuCapitalById } from "@/lib/europe/euCapitals";
import {
  getEuInstitutionById,
  getEuInstitutionSiteById,
  type EuInstitutionId,
} from "@/lib/europe/euInstitutions";
import { getUnescoSiteById } from "@/lib/tourism/unescoWorldHeritage";
import {
  getDisplayableEhlLocations,
  getEuropeanHeritageLabelLocationById,
  getEuropeanHeritageLabelSiteById,
} from "@/lib/tourism/europeanHeritageLabel";
import {
  getMajorTouristPlaceById,
  type TouristPlaceCategory,
} from "@/lib/tourism/majorTouristPlaces";
import {
  getEuropeanMountainPlaceById,
  type MountainPlaceCategory,
} from "@/lib/tourism/europeanMountainDestinations";
import {
  getMajorCivilEngineeringWorkById,
  type CivilEngineeringWorkCategory,
} from "@/lib/tourism/majorCivilEngineeringWorks";
import { getEuropeanAirportById } from "@/lib/transport/europeanAirports";
import {
  getActiveTemporaryControls,
  getSchengenBorderCrossingById,
  getTemporaryControlById,
  type BorderCrossingMode,
  type TemporaryInternalBorderControl,
} from "@/lib/security/schengenBorders";
import {
  EUROSTAR_ROUTES,
  getEurostarStationById,
} from "@/lib/transport/eurostarNetwork";
import {
  defaultLocale,
  type Locale,
} from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  validateEffisBurnedAreaSnapshot,
  type EffisBurnedAreaSnapshot,
} from "@/lib/incidents/effisSnapshot";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type {
  EffisBurnedArea,
  WildfireIncident,
} from "@/lib/incidents/types";
import type { MapCameraCommands } from "@/lib/map/mapCameraCommands";
import type {
  MapFocusPadding,
  MapFocusRequest,
} from "@/lib/map/focusRequest";
import type { NormalizedRoute, RoutePoint } from "@/lib/routing/types";
import type { TransitJourney } from "@/lib/routing/transit/types";
import type { RoutePlannerMapPoint } from "@/lib/routing/routeMapLayers";
import type { TransitMapPoint } from "@/lib/routing/transitMapLayers";
import {
  areRoutePlannerPointsEqual,
  EMPTY_ROUTE_PLANNER_POINTS,
  type RoutePlannerPointsState,
} from "@/lib/routing/routePlannerPoints";
import {
  readShareableRouteFromUrl,
} from "@/lib/routing/shareableRoute";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  defaultLegendCollapsedForViewport,
  loadLegendCollapsed,
  loadMapLayerPreferences,
  saveLegendCollapsed,
  saveMapLayerPreferences,
  type MapLayerPreferences,
} from "@/lib/map/mapLayerPreferences";
import {
  readMapViewPreferences,
  writeMapBaseMode,
  writeMapDimensionMode,
  type MapBaseMode,
  type MapDimensionMode,
} from "@/lib/map/mapViewPreferences";
import {
  hasSeenLocationPrompt,
  isGeolocationSecureContext,
  isGeolocationSupported,
  markLocationPromptSeen,
  queryGeolocationPermission,
  type UserLocation,
  type UserLocationStatus,
} from "@/lib/map/userLocation";
import type { MapSearchResult } from "@/lib/search/mapSearch";
import type {
  AlertActivityMode,
  AlertApiResponse,
  AlertConnectorStatus,
  EarthquakeTimeMode,
  NormalizedAlert,
  VolcanoTimeMode,
  CemsActivationTimeMode,
  TrafficIncidentTimeMode,
} from "@/lib/alerts/types";
import {
  countActiveAlerts,
  filterAlertsByActivityMode,
} from "@/lib/alerts/activityMode";
import {
  earthquakeMagnitudeBand,
  filterEarthquakesByTimeMode,
  filterVolcanoesByTimeMode,
} from "@/lib/alerts/geologicalActivity";
import type { CopernicusFloodLayerStatus } from "@/lib/alerts/copernicusFlood";
import type { LandslideNowcastLayerStatus } from "@/lib/alerts/landslideNowcast";
import type { WildfireWind } from "@/lib/alerts/wind";
import { filterTrafficAlerts } from "@/components/map/trafficMapLayers";
import {
  areTrafficAlertsEqual,
  dedupeTrafficAlertsById,
} from "@/lib/alerts/trafficAlertEquality";
import {
  angularDifference,
  normalizeBearing,
  type CameraSnapshot,
} from "@/lib/map/cameraSnapshot";

const FIRMS_UNAVAILABLE_TIMEOUT_MS = 20_000;
const FIRMS_HISTORY_UNAVAILABLE_TIMEOUT_MS = 25_000;
const EFFIS_UNAVAILABLE_MESSAGE_MIN_MS = 6_000;

function isEffisServiceFailureStatus(status: number): boolean {
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 408
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

const TEMPORARY_CONTROL_CENTROIDS: Record<string, { longitude: number; latitude: number }> = {
  AT: { longitude: 14.55, latitude: 47.52 },
  BE: { longitude: 4.47, latitude: 50.5 },
  DE: { longitude: 10.45, latitude: 51.16 },
  DK: { longitude: 10.0, latitude: 56.0 },
  ES: { longitude: -3.7, latitude: 40.4 },
  FR: { longitude: 2.35, latitude: 46.6 },
  HU: { longitude: 19.5, latitude: 47.16 },
  IT: { longitude: 12.5, latitude: 42.5 },
  LT: { longitude: 23.9, latitude: 55.17 },
  LU: { longitude: 6.13, latitude: 49.75 },
  NL: { longitude: 5.29, latitude: 52.13 },
  NO: { longitude: 8.5, latitude: 60.5 },
  PL: { longitude: 19.15, latitude: 52.1 },
  SE: { longitude: 15.0, latitude: 62.0 },
  SI: { longitude: 14.8, latitude: 46.15 },
  SK: { longitude: 19.5, latitude: 48.7 },
  CH: { longitude: 8.23, latitude: 46.82 },
  CZ: { longitude: 15.47, latitude: 49.82 },
};

function centroidForTemporaryControl(
  control: TemporaryInternalBorderControl,
): { longitude: number; latitude: number } {
  return (
    TEMPORARY_CONTROL_CENTROIDS[control.implementingCountryCode] ?? {
      longitude: 10,
      latitude: 50,
    }
  );
}

export default function MapInterface() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [showEurozone, setShowEurozone] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euroArea,
  );
  const [showNonEurozone, setShowNonEurozone] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euOutsideEuroArea,
  );
  const [showCandidates, setShowCandidates] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euCandidates,
  );
  const [showSchengenNonEU, setShowSchengenNonEU] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.schengenOutsideEu,
  );
  const [showEuCapitals, setShowEuCapitals] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euCapitals,
  );
  const [selectedCapitalId, setSelectedCapitalId] = useState<string | null>(
    null,
  );
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [routePlannerRoutes, setRoutePlannerRoutes] = useState<NormalizedRoute[]>(
    [],
  );
  const [routePlannerSelectedId, setRoutePlannerSelectedId] = useState<
    string | null
  >(null);
  const [transitJourneys, setTransitJourneys] = useState<TransitJourney[]>([]);
  const [transitSelectedId, setTransitSelectedId] = useState<string | null>(
    null,
  );
  const [routePlannerPointsState, setRoutePlannerPointsState] =
    useState<RoutePlannerPointsState>(EMPTY_ROUTE_PLANNER_POINTS);
  const [routePlannerPickTarget, setRoutePlannerPickTarget] =
    useState<RoutePlannerPickTarget | null>(null);
  const [routePlannerMapPick, setRoutePlannerMapPick] =
    useState<RoutePoint | null>(null);
  const [routePlannerFocusOrigin, setRoutePlannerFocusOrigin] = useState(false);
  const [routeContextMenu, setRouteContextMenu] = useState<{
    longitude: number;
    latitude: number;
    x: number;
    y: number;
  } | null>(null);
  const [showEuMainInstitutions, setShowEuMainInstitutions] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.euMainInstitutions,
  );
  const [selectedInstitutionId, setSelectedInstitutionId] =
    useState<EuInstitutionId | null>(null);
  const [selectedInstitutionSiteId, setSelectedInstitutionSiteId] = useState<
    string | null
  >(null);
  const [showUnescoWorldHeritage, setShowUnescoWorldHeritage] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.unescoWorldHeritage,
  );
  const [showUnescoCultural, setShowUnescoCultural] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.unescoCultural,
  );
  const [showUnescoNatural, setShowUnescoNatural] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.unescoNatural,
  );
  const [showUnescoMixed, setShowUnescoMixed] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.unescoMixed,
  );
  const [selectedUnescoSiteId, setSelectedUnescoSiteId] = useState<
    string | null
  >(null);
  const [showEuropeanHeritageLabel, setShowEuropeanHeritageLabel] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.europeanHeritageLabel,
  );
  const [selectedEhlSiteId, setSelectedEhlSiteId] = useState<string | null>(
    null,
  );
  const [selectedEhlLocationId, setSelectedEhlLocationId] = useState<
    string | null
  >(null);
  const [showMajorTouristPlaces, setShowMajorTouristPlaces] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.majorTouristPlaces,
  );
  const [showTouristLandmark, setShowTouristLandmark] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.touristLandmark,
  );
  const [showTouristHistoricArea, setShowTouristHistoricArea] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.touristHistoricArea,
  );
  const [showTouristMuseum, setShowTouristMuseum] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.touristMuseum,
  );
  const [showTouristParkGarden, setShowTouristParkGarden] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.touristParkGarden,
  );
  const [showTouristNaturalLandscape, setShowTouristNaturalLandscape] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.touristNaturalLandscape);
  const [showTouristCoastalDestination, setShowTouristCoastalDestination] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.touristCoastalDestination);
  const [showTouristMountainDestination, setShowTouristMountainDestination] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.touristMountainDestination);
  const [selectedTouristPlaceId, setSelectedTouristPlaceId] = useState<
    string | null
  >(null);
  const [showEuropeanMountainPlaces, setShowEuropeanMountainPlaces] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.europeanMountainPlaces,
  );
  const [showMountainSkiResorts, setShowMountainSkiResorts] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.mountainSkiResort,
  );
  const [showMountainDestinations, setShowMountainDestinations] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.mountainDestination,
  );
  const [showMountainIconicPeaks, setShowMountainIconicPeaks] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.mountainIconicPeak,
  );
  const [showMountainRanges, setShowMountainRanges] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.mountainRange,
  );
  const [selectedMountainPlaceId, setSelectedMountainPlaceId] = useState<
    string | null
  >(null);
  const [showMajorCivilEngineeringWorks, setShowMajorCivilEngineeringWorks] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.majorCivilEngineeringWorks);
  const [showCivilEngineeringBridge, setShowCivilEngineeringBridge] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.civilEngineeringBridge,
  );
  const [showCivilEngineeringViaduct, setShowCivilEngineeringViaduct] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.civilEngineeringViaduct);
  const [showCivilEngineeringTunnel, setShowCivilEngineeringTunnel] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.civilEngineeringTunnel,
  );
  const [showCivilEngineeringDam, setShowCivilEngineeringDam] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.civilEngineeringDam,
  );
  const [showCivilEngineeringCanalLock, setShowCivilEngineeringCanalLock] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.civilEngineeringCanalLock);
  const [selectedCivilEngineeringWorkId, setSelectedCivilEngineeringWorkId] =
    useState<string | null>(null);
  const [showMajorEuropeanAirports, setShowMajorEuropeanAirports] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.majorEuropeanAirports,
  );
  const [showEurostarStations, setShowEurostarStations] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.eurostarStations,
  );
  const [showEurostarRoutes, setShowEurostarRoutes] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.eurostarRoutes,
  );
  const [selectedAirportId, setSelectedAirportId] = useState<string | null>(
    null,
  );
  const [showSchengenExternalBorderCrossings, setShowSchengenExternalBorderCrossings] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.schengenExternalBorderCrossings);
  const [showSchengenTemporaryInternalControls, setShowSchengenTemporaryInternalControls] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.schengenTemporaryInternalControls);
  const [showBorderCrossingRoad, setShowBorderCrossingRoad] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.borderCrossingRoad,
  );
  const [showBorderCrossingRail, setShowBorderCrossingRail] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.borderCrossingRail,
  );
  const [showBorderCrossingAir, setShowBorderCrossingAir] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.borderCrossingAir,
  );
  const [showBorderCrossingSea, setShowBorderCrossingSea] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.borderCrossingSea,
  );
  const [selectedBorderCrossingId, setSelectedBorderCrossingId] = useState<
    string | null
  >(null);
  const [selectedTemporaryControlId, setSelectedTemporaryControlId] = useState<
    string | null
  >(null);
  const [temporaryBorderControls, setTemporaryBorderControls] = useState<
    TemporaryInternalBorderControl[]
  >(() => getActiveTemporaryControls());
  const [temporaryControlsCached, setTemporaryControlsCached] = useState(false);
  const [temporaryControlsStaleOver24h, setTemporaryControlsStaleOver24h] =
    useState(false);
  const [selectedEurostarStationId, setSelectedEurostarStationId] = useState<
    string | null
  >(null);
  const [highlightedEurostarRouteIds, setHighlightedEurostarRouteIds] =
    useState<string[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(
    null,
  );
  const [wildfireIncidents, setWildfireIncidents] = useState<
    WildfireIncident[]
  >([]);
  const [showWildfires, setShowWildfires] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.majorWildfires,
  );
  const [showSatelliteActiveFires, setShowSatelliteActiveFires] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.satelliteActiveFires,
  );
  const [showSatelliteBurnedAreas, setShowSatelliteBurnedAreas] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.recentSatelliteHistory,
  );
  const [showWildfireWind, setShowWildfireWind] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.wildfireWind,
  );
  const [showOfficialWeatherWarnings, setShowOfficialWeatherWarnings] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.officialWeatherWarnings,
  );
  const [showWeatherHeavyRain, setShowWeatherHeavyRain] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherHeavyRain,
  );
  const [showWeatherFlood, setShowWeatherFlood] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherFlood,
  );
  const [showWeatherStrongWind, setShowWeatherStrongWind] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherStrongWind,
  );
  const [showWeatherThunderstorm, setShowWeatherThunderstorm] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherThunderstorm,
  );
  const [showWeatherHail, setShowWeatherHail] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherHail,
  );
  const [showWeatherSnowIce, setShowWeatherSnowIce] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherSnowIce,
  );
  const [showWeatherCoastal, setShowWeatherCoastal] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherCoastal,
  );
  const [showWeatherOther, setShowWeatherOther] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.weatherOther,
  );
  const [showMajorFloodAlerts, setShowMajorFloodAlerts] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.majorFloodAlerts,
  );
  const [showObservedFloodExtent, setShowObservedFloodExtent] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.observedFloodExtent,
  );
  const [showMajorStorms, setShowMajorStorms] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.majorStorms,
  );
  const [showRecentEarthquakes, setShowRecentEarthquakes] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.recentEarthquakes,
  );
  const [showEarthquakeMinor, setShowEarthquakeMinor] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.earthquakeMinor,
  );
  const [showEarthquakeModerate, setShowEarthquakeModerate] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.earthquakeModerate,
  );
  const [showEarthquakeStrong, setShowEarthquakeStrong] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.earthquakeStrong,
  );
  const [showEarthquakeMajor, setShowEarthquakeMajor] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.earthquakeMajor,
  );
  const [showMajorVolcanicActivity, setShowMajorVolcanicActivity] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.majorVolcanicActivity,
  );
  const [showVolcanoUnrest, setShowVolcanoUnrest] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.volcanoUnrest,
  );
  const [showVolcanoEruption, setShowVolcanoEruption] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.volcanoEruption,
  );
  const [showVolcanoAshEmission, setShowVolcanoAshEmission] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.volcanoAshEmission,
  );
  const [showLandslideLikelihood, setShowLandslideLikelihood] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.landslideLikelihood,
  );
  const [showLandslideLikelihoodModerate, setShowLandslideLikelihoodModerate] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.landslideLikelihoodModerate);
  const [showLandslideLikelihoodHigh, setShowLandslideLikelihoodHigh] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.landslideLikelihoodHigh,
  );
  const [showMappedLandslideEvents, setShowMappedLandslideEvents] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.mappedLandslideEvents,
  );
  const [showMajorIndustrialIncidents, setShowMajorIndustrialIncidents] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.majorIndustrialIncidents);
  const [showIndustrialAccidents, setShowIndustrialAccidents] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.industrialAccidents,
  );
  const [showChemicalAccidents, setShowChemicalAccidents] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.chemicalAccidents,
  );
  const [showIndustrialExplosions, setShowIndustrialExplosions] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.industrialExplosions,
  );
  const [showOtherTechnicalAccidents, setShowOtherTechnicalAccidents] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.otherTechnicalAccidents,
  );
  const [showLiveTrafficFlow, setShowLiveTrafficFlow] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.liveTrafficFlow,
  );
  const [showRoadTrafficIncidents, setShowRoadTrafficIncidents] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.roadTrafficIncidents,
  );
  const [showTrafficAccidents, setShowTrafficAccidents] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficAccidents,
  );
  const [showTrafficMajorJams, setShowTrafficMajorJams] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficMajorJams,
  );
  const [showTrafficBrokenVehicles, setShowTrafficBrokenVehicles] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficBrokenVehicles,
  );
  const [showTrafficHazards, setShowTrafficHazards] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficHazards,
  );
  const [showTrafficRoadWeather, setShowTrafficRoadWeather] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficRoadWeather,
  );
  const [showTrafficOtherIncidents, setShowTrafficOtherIncidents] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficOtherIncidents,
  );
  const [showRoadClosuresRestrictions, setShowRoadClosuresRestrictions] =
    useState(DEFAULT_MAP_LAYER_PREFERENCES.roadClosuresRestrictions);
  const [showTrafficRoadClosures, setShowTrafficRoadClosures] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficRoadClosures,
  );
  const [showTrafficLaneClosures, setShowTrafficLaneClosures] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficLaneClosures,
  );
  const [showTrafficRestrictions, setShowTrafficRestrictions] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficRestrictions,
  );
  const [showRoadworks, setShowRoadworks] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.roadworks,
  );
  const [showTrafficActiveRoadworks, setShowTrafficActiveRoadworks] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficActiveRoadworks,
  );
  const [showTrafficPlannedRoadworks, setShowTrafficPlannedRoadworks] = useState(
    DEFAULT_MAP_LAYER_PREFERENCES.trafficPlannedRoadworks,
  );
  const [normalizedAlerts, setNormalizedAlerts] = useState<NormalizedAlert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [alertActivityMode, setAlertActivityMode] =
    useState<AlertActivityMode>("active");
  const [earthquakeTimeMode, setEarthquakeTimeMode] =
    useState<EarthquakeTimeMode>("24h");
  const [volcanoTimeMode, setVolcanoTimeMode] =
    useState<VolcanoTimeMode>("ongoing");
  const [cemsTimeMode, setCemsTimeMode] =
    useState<CemsActivationTimeMode>("ongoing");
  const [trafficTimeMode, setTrafficTimeMode] =
    useState<TrafficIncidentTimeMode>("current");
  const [trafficStatus, setTrafficStatus] = useState<{
    connectorStatus: AlertConnectorStatus;
    configured: boolean;
    demoMode: boolean;
    flowTileTemplate: string;
    incidentTileTemplate: string;
    bounds: [number, number, number, number];
    maxZoom: number;
  } | null>(null);
  const [alertsDemoMode, setAlertsDemoMode] = useState(false);
  const [alertConnectorStatus, setAlertConnectorStatus] = useState<
    Record<string, AlertConnectorStatus>
  >({});
  const [copernicusFloodStatus, setCopernicusFloodStatus] =
    useState<CopernicusFloodLayerStatus | null>(null);
  const [landslideNowcastStatus, setLandslideNowcastStatus] =
    useState<LandslideNowcastLayerStatus | null>(null);
  const [wildfireWinds, setWildfireWinds] = useState<WildfireWind[]>([]);
  const [selectedWildfireId, setSelectedWildfireId] = useState<string | null>(
    null,
  );
  const [wildfiresLoading, setWildfiresLoading] = useState(true);
  const [selectedEffisBurnedArea, setSelectedEffisBurnedArea] =
    useState<EffisBurnedArea | null>(null);
  const [effisBurnedAreaLoading, setEffisBurnedAreaLoading] = useState(false);
  const [effisSnapshotsByIncidentId, setEffisSnapshotsByIncidentId] = useState<
    Record<string, EffisBurnedAreaSnapshot>
  >({});
  const refreshedSnapshotIdsRef = useRef<Set<string>>(new Set());
  const [firmsSnapshotsByIncidentId, setFirmsSnapshotsByIncidentId] =
    useState<Record<string, FirmsIncidentSnapshot>>({});
  const [firmsSnapshotStatus, setFirmsSnapshotStatus] = useState<
    "live" | "cached" | null
  >(null);
  const [firmsLoadingOverlay, setFirmsLoadingOverlay] = useState(false);
  const [firmsUnavailableMessage, setFirmsUnavailableMessage] =
    useState(false);
  const [firmsHistorySnapshotsByIncidentId, setFirmsHistorySnapshotsByIncidentId] =
    useState<Record<string, FirmsIncidentSnapshot>>({});
  const [firmsHistoryLoadingOverlay, setFirmsHistoryLoadingOverlay] =
    useState(false);
  const [firmsHistoryUnavailableMessage, setFirmsHistoryUnavailableMessage] =
    useState(false);
  const [effisUnavailable, setEffisUnavailable] = useState(false);
  const [showEffisUnavailableBanner, setShowEffisUnavailableBanner] =
    useState(false);
  const [showEffisUnavailableNasaShown, setShowEffisUnavailableNasaShown] =
    useState(false);
  const [focusRequest, setFocusRequest] = useState<MapFocusRequest | null>(
    null,
  );
  const [temporaryPlace, setTemporaryPlace] = useState<MapSearchResult | null>(
    null,
  );
  const [legendHighlight, setLegendHighlight] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [layerPrefsHydrated, setLayerPrefsHydrated] = useState(false);
  const [legendCollapsedHydrated, setLegendCollapsedHydrated] = useState(false);
  const [baseMode, setBaseMode] = useState<MapBaseMode>("map");
  const [dimensionMode, setDimensionMode] = useState<MapDimensionMode>("2d");
  const [mapPitch, setMapPitch] = useState(0);
  const [mapBearing, setMapBearing] = useState(0);
  const [terrainReady, setTerrainReady] = useState(false);
  const [locationStatus, setLocationStatus] =
    useState<UserLocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [locationInfoOpen, setLocationInfoOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapCommandsRef = useRef<MapCameraCommands | null>(null);
  const focusNonceRef = useRef(0);
  const locationWatchIdRef = useRef<number | null>(null);
  const locationStatusRef = useRef<UserLocationStatus>("idle");
  locationStatusRef.current = locationStatus;
  const locationFocusedOnceRef = useRef(false);
  const focusUserLocationRef = useRef<((mode?: "fit" | "soft") => void) | null>(
    null,
  );
  const firmsRefreshStartedRef = useRef(false);
  const firmsHistoryRefreshStartedRef = useRef(false);
  const effisServiceFailedRef = useRef(false);
  const effisProbeStartedRef = useRef(false);
  const effisBannerHideTimeoutRef = useRef<number | null>(null);
  const effisBannerShownAtRef = useRef<number | null>(null);
  const focusGeometryRef = useRef<((geometry: GeoJSON.Geometry) => void) | null>(
    null,
  );

  const t = getMessages(locale);

  const selectedWildfire = useMemo(
    () =>
      wildfireIncidents.find((incident) => incident.id === selectedWildfireId) ??
      null,
    [wildfireIncidents, selectedWildfireId],
  );
  const selectedAlert = useMemo(
    () => normalizedAlerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [normalizedAlerts, selectedAlertId],
  );
  const activityFilteredAlerts = useMemo(() => {
    const ordinary = filterAlertsByActivityMode(
      normalizedAlerts.filter(
        (alert) =>
          alert.category !== "earthquake" &&
          alert.category !== "volcano" &&
          alert.category !== "landslide" &&
          alert.category !== "industrial_incident" &&
          alert.category !== "road_traffic",
      ),
      alertActivityMode,
    );
    return [
      ...ordinary,
      ...filterEarthquakesByTimeMode(normalizedAlerts, earthquakeTimeMode),
      ...filterVolcanoesByTimeMode(normalizedAlerts, volcanoTimeMode),
      ...normalizedAlerts.filter((alert) => {
        if (
          alert.category !== "landslide" &&
          alert.category !== "industrial_incident"
        ) {
          return false;
        }
        if (cemsTimeMode === "ongoing") return alert.status === "active";
        if (alert.status === "active") return true;
        const cutoff =
          Date.now() -
          (cemsTimeMode === "72h" ? 72 : 30 * 24) * 60 * 60 * 1000;
        return [alert.updatedAt, alert.expiresAt, alert.onsetAt]
          .filter((value): value is string => Boolean(value))
          .some((value) => Date.parse(value) >= cutoff);
      }),
      ...normalizedAlerts.filter((alert) => alert.category === "road_traffic"),
    ];
  }, [
    alertActivityMode,
    cemsTimeMode,
    earthquakeTimeMode,
    normalizedAlerts,
    volcanoTimeMode,
  ]);
  const activeGdacsFloodCount = useMemo(
    () =>
      countActiveAlerts(
        normalizedAlerts.filter(
          (alert) =>
            alert.source === "gdacs" && alert.category === "flood",
        ),
      ),
    [normalizedAlerts],
  );
  const activeMeteoalarmCount = useMemo(
    () =>
      countActiveAlerts(
        normalizedAlerts.filter((alert) => alert.source === "meteoalarm"),
      ),
    [normalizedAlerts],
  );
  const trafficCounts = useMemo(() => {
    const traffic = filterTrafficAlerts(
      activityFilteredAlerts,
      {
        incidents: showRoadTrafficIncidents,
        closures: showRoadClosuresRestrictions,
        roadworks: showRoadworks,
      },
      {
        accidents: showTrafficAccidents,
        majorJams: showTrafficMajorJams,
        brokenVehicles: showTrafficBrokenVehicles,
        hazards: showTrafficHazards,
        roadWeather: showTrafficRoadWeather,
        otherIncidents: showTrafficOtherIncidents,
        roadClosures: showTrafficRoadClosures,
        laneClosures: showTrafficLaneClosures,
        restrictions: showTrafficRestrictions,
        activeRoadworks: showTrafficActiveRoadworks,
        plannedRoadworks: showTrafficPlannedRoadworks,
      },
    );
    return {
      visible: traffic.length,
      active: traffic.filter((alert) => alert.status === "active").length,
      accidents: traffic.filter((alert) => alert.hazard === "road_accident")
        .length,
      jams: traffic.filter((alert) => alert.hazard === "traffic_jam").length,
      closures: traffic.filter(
        (alert) =>
          alert.hazard === "road_closure" ||
          alert.hazard === "lane_closure" ||
          alert.hazard === "traffic_restriction",
      ).length,
      roadworks: traffic.filter((alert) => alert.hazard === "roadworks").length,
    };
  }, [
    activityFilteredAlerts,
    showRoadClosuresRestrictions,
    showRoadTrafficIncidents,
    showRoadworks,
    showTrafficAccidents,
    showTrafficActiveRoadworks,
    showTrafficBrokenVehicles,
    showTrafficHazards,
    showTrafficLaneClosures,
    showTrafficMajorJams,
    showTrafficOtherIncidents,
    showTrafficPlannedRoadworks,
    showTrafficRestrictions,
    showTrafficRoadClosures,
    showTrafficRoadWeather,
  ]);

  const selectedTemporaryControl = useMemo(
    () =>
      selectedTemporaryControlId
        ? getTemporaryControlById(
            selectedTemporaryControlId,
            temporaryBorderControls,
          ) ?? null
        : null,
    [selectedTemporaryControlId, temporaryBorderControls],
  );

  useEffect(() => {
    const prefs = readMapViewPreferences();
    setBaseMode(prefs.baseMode);
    setDimensionMode(prefs.dimensionMode);
  }, []);

  useEffect(() => {
    const prefs = loadMapLayerPreferences();
    setShowEurozone(prefs.euroArea);
    setShowNonEurozone(prefs.euOutsideEuroArea);
    setShowSchengenNonEU(prefs.schengenOutsideEu);
    setShowCandidates(prefs.euCandidates);
    setShowEuCapitals(prefs.euCapitals);
    setShowEuMainInstitutions(prefs.euMainInstitutions);
    setShowUnescoWorldHeritage(prefs.unescoWorldHeritage);
    setShowUnescoCultural(prefs.unescoCultural);
    setShowUnescoNatural(prefs.unescoNatural);
    setShowUnescoMixed(prefs.unescoMixed);
    setShowEuropeanHeritageLabel(prefs.europeanHeritageLabel);
    setShowMajorTouristPlaces(prefs.majorTouristPlaces);
    setShowTouristLandmark(prefs.touristLandmark);
    setShowTouristHistoricArea(prefs.touristHistoricArea);
    setShowTouristMuseum(prefs.touristMuseum);
    setShowTouristParkGarden(prefs.touristParkGarden);
    setShowTouristNaturalLandscape(prefs.touristNaturalLandscape);
    setShowTouristCoastalDestination(prefs.touristCoastalDestination);
    setShowTouristMountainDestination(prefs.touristMountainDestination);
    setShowEuropeanMountainPlaces(prefs.europeanMountainPlaces);
    setShowMountainSkiResorts(prefs.mountainSkiResort);
    setShowMountainDestinations(prefs.mountainDestination);
    setShowMountainIconicPeaks(prefs.mountainIconicPeak);
    setShowMountainRanges(prefs.mountainRange);
    setShowMajorCivilEngineeringWorks(prefs.majorCivilEngineeringWorks);
    setShowCivilEngineeringBridge(prefs.civilEngineeringBridge);
    setShowCivilEngineeringViaduct(prefs.civilEngineeringViaduct);
    setShowCivilEngineeringTunnel(prefs.civilEngineeringTunnel);
    setShowCivilEngineeringDam(prefs.civilEngineeringDam);
    setShowCivilEngineeringCanalLock(prefs.civilEngineeringCanalLock);
    setShowMajorEuropeanAirports(prefs.majorEuropeanAirports);
    setShowEurostarStations(prefs.eurostarStations);
    setShowEurostarRoutes(prefs.eurostarRoutes);
    setShowSchengenExternalBorderCrossings(prefs.schengenExternalBorderCrossings);
    setShowSchengenTemporaryInternalControls(
      prefs.schengenTemporaryInternalControls,
    );
    setShowBorderCrossingRoad(prefs.borderCrossingRoad);
    setShowBorderCrossingRail(prefs.borderCrossingRail);
    setShowBorderCrossingAir(prefs.borderCrossingAir);
    setShowBorderCrossingSea(prefs.borderCrossingSea);
    setShowWildfires(prefs.majorWildfires);
    setShowSatelliteActiveFires(prefs.satelliteActiveFires);
    setShowSatelliteBurnedAreas(prefs.recentSatelliteHistory);
    setShowWildfireWind(prefs.wildfireWind);
    setShowOfficialWeatherWarnings(prefs.officialWeatherWarnings);
    setShowWeatherHeavyRain(prefs.weatherHeavyRain);
    setShowWeatherFlood(prefs.weatherFlood);
    setShowWeatherStrongWind(prefs.weatherStrongWind);
    setShowWeatherThunderstorm(prefs.weatherThunderstorm);
    setShowWeatherHail(prefs.weatherHail);
    setShowWeatherSnowIce(prefs.weatherSnowIce);
    setShowWeatherCoastal(prefs.weatherCoastal);
    setShowWeatherOther(prefs.weatherOther);
    setShowMajorFloodAlerts(prefs.majorFloodAlerts);
    setShowObservedFloodExtent(prefs.observedFloodExtent);
    setShowMajorStorms(prefs.majorStorms);
    setShowRecentEarthquakes(prefs.recentEarthquakes);
    setShowEarthquakeMinor(prefs.earthquakeMinor);
    setShowEarthquakeModerate(prefs.earthquakeModerate);
    setShowEarthquakeStrong(prefs.earthquakeStrong);
    setShowEarthquakeMajor(prefs.earthquakeMajor);
    setShowMajorVolcanicActivity(prefs.majorVolcanicActivity);
    setShowVolcanoUnrest(prefs.volcanoUnrest);
    setShowVolcanoEruption(prefs.volcanoEruption);
    setShowVolcanoAshEmission(prefs.volcanoAshEmission);
    setShowLandslideLikelihood(prefs.landslideLikelihood);
    setShowLandslideLikelihoodModerate(prefs.landslideLikelihoodModerate);
    setShowLandslideLikelihoodHigh(prefs.landslideLikelihoodHigh);
    setShowMappedLandslideEvents(prefs.mappedLandslideEvents);
    setShowMajorIndustrialIncidents(prefs.majorIndustrialIncidents);
    setShowIndustrialAccidents(prefs.industrialAccidents);
    setShowChemicalAccidents(prefs.chemicalAccidents);
    setShowIndustrialExplosions(prefs.industrialExplosions);
    setShowOtherTechnicalAccidents(prefs.otherTechnicalAccidents);
    setShowLiveTrafficFlow(prefs.liveTrafficFlow);
    setShowRoadTrafficIncidents(prefs.roadTrafficIncidents);
    setShowTrafficAccidents(prefs.trafficAccidents);
    setShowTrafficMajorJams(prefs.trafficMajorJams);
    setShowTrafficBrokenVehicles(prefs.trafficBrokenVehicles);
    setShowTrafficHazards(prefs.trafficHazards);
    setShowTrafficRoadWeather(prefs.trafficRoadWeather);
    setShowTrafficOtherIncidents(prefs.trafficOtherIncidents);
    setShowRoadClosuresRestrictions(prefs.roadClosuresRestrictions);
    setShowTrafficRoadClosures(prefs.trafficRoadClosures);
    setShowTrafficLaneClosures(prefs.trafficLaneClosures);
    setShowTrafficRestrictions(prefs.trafficRestrictions);
    setShowRoadworks(prefs.roadworks);
    setShowTrafficActiveRoadworks(prefs.trafficActiveRoadworks);
    setShowTrafficPlannedRoadworks(prefs.trafficPlannedRoadworks);
    setLayerPrefsHydrated(true);
  }, []);

  useEffect(() => {
    const stored = loadLegendCollapsed();
    setLegendCollapsed(
      stored === null ? defaultLegendCollapsedForViewport() : stored,
    );
    setLegendCollapsedHydrated(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTemporaryControls() {
      try {
        const response = await fetch("/api/security/schengen-border-controls");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as {
          controls?: TemporaryInternalBorderControl[];
          cached?: boolean;
          staleOver24h?: boolean;
        };
        if (cancelled) return;
        setTemporaryBorderControls(
          data.controls ?? getActiveTemporaryControls(),
        );
        setTemporaryControlsCached(Boolean(data.cached));
        setTemporaryControlsStaleOver24h(Boolean(data.staleOver24h));
      } catch {
        if (!cancelled) {
          setTemporaryBorderControls(getActiveTemporaryControls());
        }
      }
    }

    void loadTemporaryControls();
    return () => {
      cancelled = true;
    };
  }, [showSchengenTemporaryInternalControls]);

  useEffect(() => {
    if (!layerPrefsHydrated) return;
    saveMapLayerPreferences({
      euroArea: showEurozone,
      euOutsideEuroArea: showNonEurozone,
      schengenOutsideEu: showSchengenNonEU,
      euCandidates: showCandidates,
      euCapitals: showEuCapitals,
      euMainInstitutions: showEuMainInstitutions,
      unescoWorldHeritage: showUnescoWorldHeritage,
      unescoCultural: showUnescoCultural,
      unescoNatural: showUnescoNatural,
      unescoMixed: showUnescoMixed,
      europeanHeritageLabel: showEuropeanHeritageLabel,
      majorTouristPlaces: showMajorTouristPlaces,
      touristLandmark: showTouristLandmark,
      touristHistoricArea: showTouristHistoricArea,
      touristMuseum: showTouristMuseum,
      touristParkGarden: showTouristParkGarden,
      touristNaturalLandscape: showTouristNaturalLandscape,
      touristCoastalDestination: showTouristCoastalDestination,
      touristMountainDestination: showTouristMountainDestination,
      europeanMountainPlaces: showEuropeanMountainPlaces,
      mountainSkiResort: showMountainSkiResorts,
      mountainDestination: showMountainDestinations,
      mountainIconicPeak: showMountainIconicPeaks,
      mountainRange: showMountainRanges,
      majorCivilEngineeringWorks: showMajorCivilEngineeringWorks,
      civilEngineeringBridge: showCivilEngineeringBridge,
      civilEngineeringViaduct: showCivilEngineeringViaduct,
      civilEngineeringTunnel: showCivilEngineeringTunnel,
      civilEngineeringDam: showCivilEngineeringDam,
      civilEngineeringCanalLock: showCivilEngineeringCanalLock,
      majorEuropeanAirports: showMajorEuropeanAirports,
      eurostarStations: showEurostarStations,
      eurostarRoutes: showEurostarRoutes,
      schengenExternalBorderCrossings: showSchengenExternalBorderCrossings,
      schengenTemporaryInternalControls: showSchengenTemporaryInternalControls,
      borderCrossingRoad: showBorderCrossingRoad,
      borderCrossingRail: showBorderCrossingRail,
      borderCrossingAir: showBorderCrossingAir,
      borderCrossingSea: showBorderCrossingSea,
      majorWildfires: showWildfires,
      satelliteActiveFires: showSatelliteActiveFires,
      recentSatelliteHistory: showSatelliteBurnedAreas,
      wildfireWind: showWildfireWind,
      officialWeatherWarnings: showOfficialWeatherWarnings,
      weatherHeavyRain: showWeatherHeavyRain,
      weatherFlood: showWeatherFlood,
      weatherStrongWind: showWeatherStrongWind,
      weatherThunderstorm: showWeatherThunderstorm,
      weatherHail: showWeatherHail,
      weatherSnowIce: showWeatherSnowIce,
      weatherCoastal: showWeatherCoastal,
      weatherOther: showWeatherOther,
      majorFloodAlerts: showMajorFloodAlerts,
      observedFloodExtent: showObservedFloodExtent,
      majorStorms: showMajorStorms,
      recentEarthquakes: showRecentEarthquakes,
      earthquakeMinor: showEarthquakeMinor,
      earthquakeModerate: showEarthquakeModerate,
      earthquakeStrong: showEarthquakeStrong,
      earthquakeMajor: showEarthquakeMajor,
      majorVolcanicActivity: showMajorVolcanicActivity,
      volcanoUnrest: showVolcanoUnrest,
      volcanoEruption: showVolcanoEruption,
      volcanoAshEmission: showVolcanoAshEmission,
      landslideLikelihood: showLandslideLikelihood,
      landslideLikelihoodModerate: showLandslideLikelihoodModerate,
      landslideLikelihoodHigh: showLandslideLikelihoodHigh,
      mappedLandslideEvents: showMappedLandslideEvents,
      majorIndustrialIncidents: showMajorIndustrialIncidents,
      industrialAccidents: showIndustrialAccidents,
      chemicalAccidents: showChemicalAccidents,
      industrialExplosions: showIndustrialExplosions,
      otherTechnicalAccidents: showOtherTechnicalAccidents,
      liveTrafficFlow: showLiveTrafficFlow,
      roadTrafficIncidents: showRoadTrafficIncidents,
      trafficAccidents: showTrafficAccidents,
      trafficMajorJams: showTrafficMajorJams,
      trafficBrokenVehicles: showTrafficBrokenVehicles,
      trafficHazards: showTrafficHazards,
      trafficRoadWeather: showTrafficRoadWeather,
      trafficOtherIncidents: showTrafficOtherIncidents,
      roadClosuresRestrictions: showRoadClosuresRestrictions,
      trafficRoadClosures: showTrafficRoadClosures,
      trafficLaneClosures: showTrafficLaneClosures,
      trafficRestrictions: showTrafficRestrictions,
      roadworks: showRoadworks,
      trafficActiveRoadworks: showTrafficActiveRoadworks,
      trafficPlannedRoadworks: showTrafficPlannedRoadworks,
    });
  }, [
    layerPrefsHydrated,
    showEurozone,
    showNonEurozone,
    showSchengenNonEU,
    showCandidates,
    showEuCapitals,
    showEuMainInstitutions,
    showUnescoWorldHeritage,
    showUnescoCultural,
    showUnescoNatural,
    showUnescoMixed,
    showEuropeanHeritageLabel,
    showMajorTouristPlaces,
    showTouristLandmark,
    showTouristHistoricArea,
    showTouristMuseum,
    showTouristParkGarden,
    showTouristNaturalLandscape,
    showTouristCoastalDestination,
    showTouristMountainDestination,
    showEuropeanMountainPlaces,
    showMountainSkiResorts,
    showMountainDestinations,
    showMountainIconicPeaks,
    showMountainRanges,
    showMajorCivilEngineeringWorks,
    showCivilEngineeringBridge,
    showCivilEngineeringViaduct,
    showCivilEngineeringTunnel,
    showCivilEngineeringDam,
    showCivilEngineeringCanalLock,
    showMajorEuropeanAirports,
    showEurostarStations,
    showEurostarRoutes,
    showSchengenExternalBorderCrossings,
    showSchengenTemporaryInternalControls,
    showBorderCrossingRoad,
    showBorderCrossingRail,
    showBorderCrossingAir,
    showBorderCrossingSea,
    showWildfires,
    showSatelliteActiveFires,
    showSatelliteBurnedAreas,
    showWildfireWind,
    showOfficialWeatherWarnings,
    showWeatherHeavyRain,
    showWeatherFlood,
    showWeatherStrongWind,
    showWeatherThunderstorm,
    showWeatherHail,
    showWeatherSnowIce,
    showWeatherCoastal,
    showWeatherOther,
    showMajorFloodAlerts,
    showObservedFloodExtent,
    showMajorStorms,
    showRecentEarthquakes,
    showEarthquakeMinor,
    showEarthquakeModerate,
    showEarthquakeStrong,
    showEarthquakeMajor,
    showMajorVolcanicActivity,
    showVolcanoUnrest,
    showVolcanoEruption,
    showVolcanoAshEmission,
    showLandslideLikelihood,
    showLandslideLikelihoodModerate,
    showLandslideLikelihoodHigh,
    showMappedLandslideEvents,
    showMajorIndustrialIncidents,
    showIndustrialAccidents,
    showChemicalAccidents,
    showIndustrialExplosions,
    showOtherTechnicalAccidents,
    showLiveTrafficFlow,
    showRoadTrafficIncidents,
    showTrafficAccidents,
    showTrafficMajorJams,
    showTrafficBrokenVehicles,
    showTrafficHazards,
    showTrafficRoadWeather,
    showTrafficOtherIncidents,
    showRoadClosuresRestrictions,
    showTrafficRoadClosures,
    showTrafficLaneClosures,
    showTrafficRestrictions,
    showRoadworks,
    showTrafficActiveRoadworks,
    showTrafficPlannedRoadworks,
  ]);

  const legendPreferences = useMemo<MapLayerPreferences>(
    () => ({
      euroArea: showEurozone,
      euOutsideEuroArea: showNonEurozone,
      schengenOutsideEu: showSchengenNonEU,
      euCandidates: showCandidates,
      euCapitals: showEuCapitals,
      euMainInstitutions: showEuMainInstitutions,
      unescoWorldHeritage: showUnescoWorldHeritage,
      unescoCultural: showUnescoCultural,
      unescoNatural: showUnescoNatural,
      unescoMixed: showUnescoMixed,
      europeanHeritageLabel: showEuropeanHeritageLabel,
      majorTouristPlaces: showMajorTouristPlaces,
      touristLandmark: showTouristLandmark,
      touristHistoricArea: showTouristHistoricArea,
      touristMuseum: showTouristMuseum,
      touristParkGarden: showTouristParkGarden,
      touristNaturalLandscape: showTouristNaturalLandscape,
      touristCoastalDestination: showTouristCoastalDestination,
      touristMountainDestination: showTouristMountainDestination,
      europeanMountainPlaces: showEuropeanMountainPlaces,
      mountainSkiResort: showMountainSkiResorts,
      mountainDestination: showMountainDestinations,
      mountainIconicPeak: showMountainIconicPeaks,
      mountainRange: showMountainRanges,
      majorCivilEngineeringWorks: showMajorCivilEngineeringWorks,
      civilEngineeringBridge: showCivilEngineeringBridge,
      civilEngineeringViaduct: showCivilEngineeringViaduct,
      civilEngineeringTunnel: showCivilEngineeringTunnel,
      civilEngineeringDam: showCivilEngineeringDam,
      civilEngineeringCanalLock: showCivilEngineeringCanalLock,
      majorEuropeanAirports: showMajorEuropeanAirports,
      eurostarStations: showEurostarStations,
      eurostarRoutes: showEurostarRoutes,
      schengenExternalBorderCrossings: showSchengenExternalBorderCrossings,
      schengenTemporaryInternalControls: showSchengenTemporaryInternalControls,
      borderCrossingRoad: showBorderCrossingRoad,
      borderCrossingRail: showBorderCrossingRail,
      borderCrossingAir: showBorderCrossingAir,
      borderCrossingSea: showBorderCrossingSea,
      majorWildfires: showWildfires,
      satelliteActiveFires: showSatelliteActiveFires,
      recentSatelliteHistory: showSatelliteBurnedAreas,
      wildfireWind: showWildfireWind,
      officialWeatherWarnings: showOfficialWeatherWarnings,
      weatherHeavyRain: showWeatherHeavyRain,
      weatherFlood: showWeatherFlood,
      weatherStrongWind: showWeatherStrongWind,
      weatherThunderstorm: showWeatherThunderstorm,
      weatherHail: showWeatherHail,
      weatherSnowIce: showWeatherSnowIce,
      weatherCoastal: showWeatherCoastal,
      weatherOther: showWeatherOther,
      majorFloodAlerts: showMajorFloodAlerts,
      observedFloodExtent: showObservedFloodExtent,
      majorStorms: showMajorStorms,
      recentEarthquakes: showRecentEarthquakes,
      earthquakeMinor: showEarthquakeMinor,
      earthquakeModerate: showEarthquakeModerate,
      earthquakeStrong: showEarthquakeStrong,
      earthquakeMajor: showEarthquakeMajor,
      majorVolcanicActivity: showMajorVolcanicActivity,
      volcanoUnrest: showVolcanoUnrest,
      volcanoEruption: showVolcanoEruption,
      volcanoAshEmission: showVolcanoAshEmission,
      landslideLikelihood: showLandslideLikelihood,
      landslideLikelihoodModerate: showLandslideLikelihoodModerate,
      landslideLikelihoodHigh: showLandslideLikelihoodHigh,
      mappedLandslideEvents: showMappedLandslideEvents,
      majorIndustrialIncidents: showMajorIndustrialIncidents,
      industrialAccidents: showIndustrialAccidents,
      chemicalAccidents: showChemicalAccidents,
      industrialExplosions: showIndustrialExplosions,
      otherTechnicalAccidents: showOtherTechnicalAccidents,
      liveTrafficFlow: showLiveTrafficFlow,
      roadTrafficIncidents: showRoadTrafficIncidents,
      trafficAccidents: showTrafficAccidents,
      trafficMajorJams: showTrafficMajorJams,
      trafficBrokenVehicles: showTrafficBrokenVehicles,
      trafficHazards: showTrafficHazards,
      trafficRoadWeather: showTrafficRoadWeather,
      trafficOtherIncidents: showTrafficOtherIncidents,
      roadClosuresRestrictions: showRoadClosuresRestrictions,
      trafficRoadClosures: showTrafficRoadClosures,
      trafficLaneClosures: showTrafficLaneClosures,
      trafficRestrictions: showTrafficRestrictions,
      roadworks: showRoadworks,
      trafficActiveRoadworks: showTrafficActiveRoadworks,
      trafficPlannedRoadworks: showTrafficPlannedRoadworks,
    }),
    [
      showEurozone,
      showNonEurozone,
      showSchengenNonEU,
      showCandidates,
      showEuCapitals,
      showEuMainInstitutions,
      showUnescoWorldHeritage,
      showUnescoCultural,
      showUnescoNatural,
      showUnescoMixed,
      showEuropeanHeritageLabel,
      showMajorTouristPlaces,
      showTouristLandmark,
      showTouristHistoricArea,
      showTouristMuseum,
      showTouristParkGarden,
      showTouristNaturalLandscape,
      showTouristCoastalDestination,
      showTouristMountainDestination,
      showEuropeanMountainPlaces,
      showMountainSkiResorts,
      showMountainDestinations,
      showMountainIconicPeaks,
      showMountainRanges,
      showMajorCivilEngineeringWorks,
      showCivilEngineeringBridge,
      showCivilEngineeringViaduct,
      showCivilEngineeringTunnel,
      showCivilEngineeringDam,
      showCivilEngineeringCanalLock,
      showMajorEuropeanAirports,
      showEurostarStations,
      showEurostarRoutes,
      showSchengenExternalBorderCrossings,
      showSchengenTemporaryInternalControls,
      showBorderCrossingRoad,
      showBorderCrossingRail,
      showBorderCrossingAir,
      showBorderCrossingSea,
      showWildfires,
      showSatelliteActiveFires,
      showSatelliteBurnedAreas,
      showWildfireWind,
      showOfficialWeatherWarnings,
      showWeatherHeavyRain,
      showWeatherFlood,
      showWeatherStrongWind,
      showWeatherThunderstorm,
      showWeatherHail,
      showWeatherSnowIce,
      showWeatherCoastal,
      showWeatherOther,
      showMajorFloodAlerts,
      showObservedFloodExtent,
      showMajorStorms,
      showRecentEarthquakes,
      showEarthquakeMinor,
      showEarthquakeModerate,
      showEarthquakeStrong,
      showEarthquakeMajor,
      showMajorVolcanicActivity,
      showVolcanoUnrest,
      showVolcanoEruption,
      showVolcanoAshEmission,
      showLandslideLikelihood,
      showLandslideLikelihoodModerate,
      showLandslideLikelihoodHigh,
      showMappedLandslideEvents,
      showMajorIndustrialIncidents,
      showIndustrialAccidents,
      showChemicalAccidents,
      showIndustrialExplosions,
      showOtherTechnicalAccidents,
      showLiveTrafficFlow,
      showRoadTrafficIncidents,
      showTrafficAccidents,
      showTrafficMajorJams,
      showTrafficBrokenVehicles,
      showTrafficHazards,
      showTrafficRoadWeather,
      showTrafficOtherIncidents,
      showRoadClosuresRestrictions,
      showTrafficRoadClosures,
      showTrafficLaneClosures,
      showTrafficRestrictions,
      showRoadworks,
      showTrafficActiveRoadworks,
      showTrafficPlannedRoadworks,
    ],
  );

  const handleLegendPreferenceToggle = (
    key: keyof MapLayerPreferences,
    value: boolean,
  ) => {
    if (
      key === "officialWeatherWarnings" &&
      value &&
      alertConnectorStatus.meteoalarm === "misconfigured"
    ) {
      return;
    }
    if (
      value &&
      trafficStatus?.connectorStatus === "misconfigured" &&
      [
        "liveTrafficFlow",
        "roadTrafficIncidents",
        "roadClosuresRestrictions",
        "roadworks",
      ].includes(key)
    ) {
      return;
    }
    const setters: Record<
      keyof MapLayerPreferences,
      (next: boolean) => void
    > = {
      euroArea: setShowEurozone,
      euOutsideEuroArea: setShowNonEurozone,
      schengenOutsideEu: setShowSchengenNonEU,
      euCandidates: setShowCandidates,
      euCapitals: setShowEuCapitals,
      euMainInstitutions: setShowEuMainInstitutions,
      unescoWorldHeritage: setShowUnescoWorldHeritage,
      unescoCultural: setShowUnescoCultural,
      unescoNatural: setShowUnescoNatural,
      unescoMixed: setShowUnescoMixed,
      europeanHeritageLabel: setShowEuropeanHeritageLabel,
      majorTouristPlaces: setShowMajorTouristPlaces,
      touristLandmark: setShowTouristLandmark,
      touristHistoricArea: setShowTouristHistoricArea,
      touristMuseum: setShowTouristMuseum,
      touristParkGarden: setShowTouristParkGarden,
      touristNaturalLandscape: setShowTouristNaturalLandscape,
      touristCoastalDestination: setShowTouristCoastalDestination,
      touristMountainDestination: setShowTouristMountainDestination,
      europeanMountainPlaces: setShowEuropeanMountainPlaces,
      mountainSkiResort: setShowMountainSkiResorts,
      mountainDestination: setShowMountainDestinations,
      mountainIconicPeak: setShowMountainIconicPeaks,
      mountainRange: setShowMountainRanges,
      majorCivilEngineeringWorks: setShowMajorCivilEngineeringWorks,
      civilEngineeringBridge: setShowCivilEngineeringBridge,
      civilEngineeringViaduct: setShowCivilEngineeringViaduct,
      civilEngineeringTunnel: setShowCivilEngineeringTunnel,
      civilEngineeringDam: setShowCivilEngineeringDam,
      civilEngineeringCanalLock: setShowCivilEngineeringCanalLock,
      majorEuropeanAirports: setShowMajorEuropeanAirports,
      eurostarStations: setShowEurostarStations,
      eurostarRoutes: setShowEurostarRoutes,
      majorWildfires: setShowWildfires,
      satelliteActiveFires: setShowSatelliteActiveFires,
      recentSatelliteHistory: setShowSatelliteBurnedAreas,
      wildfireWind: setShowWildfireWind,
      officialWeatherWarnings: setShowOfficialWeatherWarnings,
      weatherHeavyRain: setShowWeatherHeavyRain,
      weatherFlood: setShowWeatherFlood,
      weatherStrongWind: setShowWeatherStrongWind,
      weatherThunderstorm: setShowWeatherThunderstorm,
      weatherHail: setShowWeatherHail,
      weatherSnowIce: setShowWeatherSnowIce,
      weatherCoastal: setShowWeatherCoastal,
      weatherOther: setShowWeatherOther,
      majorFloodAlerts: setShowMajorFloodAlerts,
      observedFloodExtent: setShowObservedFloodExtent,
      majorStorms: setShowMajorStorms,
      recentEarthquakes: setShowRecentEarthquakes,
      earthquakeMinor: setShowEarthquakeMinor,
      earthquakeModerate: setShowEarthquakeModerate,
      earthquakeStrong: setShowEarthquakeStrong,
      earthquakeMajor: setShowEarthquakeMajor,
      majorVolcanicActivity: setShowMajorVolcanicActivity,
      volcanoUnrest: setShowVolcanoUnrest,
      volcanoEruption: setShowVolcanoEruption,
      volcanoAshEmission: setShowVolcanoAshEmission,
      landslideLikelihood: setShowLandslideLikelihood,
      landslideLikelihoodModerate: setShowLandslideLikelihoodModerate,
      landslideLikelihoodHigh: setShowLandslideLikelihoodHigh,
      mappedLandslideEvents: setShowMappedLandslideEvents,
      majorIndustrialIncidents: setShowMajorIndustrialIncidents,
      industrialAccidents: setShowIndustrialAccidents,
      chemicalAccidents: setShowChemicalAccidents,
      industrialExplosions: setShowIndustrialExplosions,
      otherTechnicalAccidents: setShowOtherTechnicalAccidents,
      liveTrafficFlow: setShowLiveTrafficFlow,
      roadTrafficIncidents: setShowRoadTrafficIncidents,
      trafficAccidents: setShowTrafficAccidents,
      trafficMajorJams: setShowTrafficMajorJams,
      trafficBrokenVehicles: setShowTrafficBrokenVehicles,
      trafficHazards: setShowTrafficHazards,
      trafficRoadWeather: setShowTrafficRoadWeather,
      trafficOtherIncidents: setShowTrafficOtherIncidents,
      roadClosuresRestrictions: setShowRoadClosuresRestrictions,
      trafficRoadClosures: setShowTrafficRoadClosures,
      trafficLaneClosures: setShowTrafficLaneClosures,
      trafficRestrictions: setShowTrafficRestrictions,
      roadworks: setShowRoadworks,
      trafficActiveRoadworks: setShowTrafficActiveRoadworks,
      trafficPlannedRoadworks: setShowTrafficPlannedRoadworks,
      schengenExternalBorderCrossings: setShowSchengenExternalBorderCrossings,
      schengenTemporaryInternalControls:
        setShowSchengenTemporaryInternalControls,
      borderCrossingRoad: setShowBorderCrossingRoad,
      borderCrossingRail: setShowBorderCrossingRail,
      borderCrossingAir: setShowBorderCrossingAir,
      borderCrossingSea: setShowBorderCrossingSea,
    };
    setters[key](value);
  };

  const handleLegendLayersReset = () => {
    const defaults = DEFAULT_MAP_LAYER_PREFERENCES;
    setShowEurozone(defaults.euroArea);
    setShowNonEurozone(defaults.euOutsideEuroArea);
    setShowSchengenNonEU(defaults.schengenOutsideEu);
    setShowCandidates(defaults.euCandidates);
    setShowEuCapitals(defaults.euCapitals);
    setShowEuMainInstitutions(defaults.euMainInstitutions);
    setShowUnescoWorldHeritage(defaults.unescoWorldHeritage);
    setShowUnescoCultural(defaults.unescoCultural);
    setShowUnescoNatural(defaults.unescoNatural);
    setShowUnescoMixed(defaults.unescoMixed);
    setShowEuropeanHeritageLabel(defaults.europeanHeritageLabel);
    setShowMajorTouristPlaces(defaults.majorTouristPlaces);
    setShowTouristLandmark(defaults.touristLandmark);
    setShowTouristHistoricArea(defaults.touristHistoricArea);
    setShowTouristMuseum(defaults.touristMuseum);
    setShowTouristParkGarden(defaults.touristParkGarden);
    setShowTouristNaturalLandscape(defaults.touristNaturalLandscape);
    setShowTouristCoastalDestination(defaults.touristCoastalDestination);
    setShowTouristMountainDestination(defaults.touristMountainDestination);
    setShowEuropeanMountainPlaces(defaults.europeanMountainPlaces);
    setShowMountainSkiResorts(defaults.mountainSkiResort);
    setShowMountainDestinations(defaults.mountainDestination);
    setShowMountainIconicPeaks(defaults.mountainIconicPeak);
    setShowMountainRanges(defaults.mountainRange);
    setShowMajorCivilEngineeringWorks(defaults.majorCivilEngineeringWorks);
    setShowCivilEngineeringBridge(defaults.civilEngineeringBridge);
    setShowCivilEngineeringViaduct(defaults.civilEngineeringViaduct);
    setShowCivilEngineeringTunnel(defaults.civilEngineeringTunnel);
    setShowCivilEngineeringDam(defaults.civilEngineeringDam);
    setShowCivilEngineeringCanalLock(defaults.civilEngineeringCanalLock);
    setShowMajorEuropeanAirports(defaults.majorEuropeanAirports);
    setShowEurostarStations(defaults.eurostarStations);
    setShowEurostarRoutes(defaults.eurostarRoutes);
    setShowWildfires(defaults.majorWildfires);
    setShowSatelliteActiveFires(defaults.satelliteActiveFires);
    setShowSatelliteBurnedAreas(defaults.recentSatelliteHistory);
    setShowWildfireWind(defaults.wildfireWind);
    setShowOfficialWeatherWarnings(defaults.officialWeatherWarnings);
    setShowWeatherHeavyRain(defaults.weatherHeavyRain);
    setShowWeatherFlood(defaults.weatherFlood);
    setShowWeatherStrongWind(defaults.weatherStrongWind);
    setShowWeatherThunderstorm(defaults.weatherThunderstorm);
    setShowWeatherHail(defaults.weatherHail);
    setShowWeatherSnowIce(defaults.weatherSnowIce);
    setShowWeatherCoastal(defaults.weatherCoastal);
    setShowWeatherOther(defaults.weatherOther);
    setShowMajorFloodAlerts(defaults.majorFloodAlerts);
    setShowObservedFloodExtent(defaults.observedFloodExtent);
    setShowMajorStorms(defaults.majorStorms);
    setShowRecentEarthquakes(defaults.recentEarthquakes);
    setShowEarthquakeMinor(defaults.earthquakeMinor);
    setShowEarthquakeModerate(defaults.earthquakeModerate);
    setShowEarthquakeStrong(defaults.earthquakeStrong);
    setShowEarthquakeMajor(defaults.earthquakeMajor);
    setShowMajorVolcanicActivity(defaults.majorVolcanicActivity);
    setShowVolcanoUnrest(defaults.volcanoUnrest);
    setShowVolcanoEruption(defaults.volcanoEruption);
    setShowVolcanoAshEmission(defaults.volcanoAshEmission);
    setShowLandslideLikelihood(defaults.landslideLikelihood);
    setShowLandslideLikelihoodModerate(defaults.landslideLikelihoodModerate);
    setShowLandslideLikelihoodHigh(defaults.landslideLikelihoodHigh);
    setShowMappedLandslideEvents(defaults.mappedLandslideEvents);
    setShowMajorIndustrialIncidents(defaults.majorIndustrialIncidents);
    setShowIndustrialAccidents(defaults.industrialAccidents);
    setShowChemicalAccidents(defaults.chemicalAccidents);
    setShowIndustrialExplosions(defaults.industrialExplosions);
    setShowOtherTechnicalAccidents(defaults.otherTechnicalAccidents);
    setShowSchengenExternalBorderCrossings(
      defaults.schengenExternalBorderCrossings,
    );
    setShowSchengenTemporaryInternalControls(
      defaults.schengenTemporaryInternalControls,
    );
    setShowBorderCrossingRoad(defaults.borderCrossingRoad);
    setShowBorderCrossingRail(defaults.borderCrossingRail);
    setShowBorderCrossingAir(defaults.borderCrossingAir);
    setShowBorderCrossingSea(defaults.borderCrossingSea);
  };

  useEffect(() => {
    if (!legendCollapsedHydrated) return;
    saveLegendCollapsed(legendCollapsed);
  }, [legendCollapsed, legendCollapsedHydrated]);

  useEffect(() => {
    if (!isGeolocationSupported()) {
      setLocationStatus("unavailable");
      return;
    }

    if (!isGeolocationSecureContext()) {
      setLocationStatus("unavailable");
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled || hasSeenLocationPrompt()) return;

        const permission = await queryGeolocationPermission();
        if (cancelled) return;
        if (permission === "denied") return;

        markLocationPromptSeen();
        setLocationConsentOpen(true);
      })();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  const stopUserLocation = () => {
    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    locationFocusedOnceRef.current = false;
    setUserLocation(null);
    setLocationStatus("idle");
    setLocationInfoOpen(false);
    setLocationError(null);
  };

  const startUserLocationWatch = () => {
    if (!isGeolocationSupported()) {
      setLocationStatus("unavailable");
      setLocationError(t.location.unsupported);
      return;
    }

    if (!isGeolocationSecureContext()) {
      setLocationStatus("unavailable");
      setLocationError(t.location.insecure);
      return;
    }

    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    setLocationConsentOpen(false);
    setLocationError(null);
    setLocationStatus("requesting");
    markLocationPromptSeen();

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next: UserLocation = {
          longitude: position.coords.longitude,
          latitude: position.coords.latitude,
          accuracyMeters: position.coords.accuracy,
          heading: Number.isFinite(position.coords.heading)
            ? position.coords.heading
            : null,
          speedMetersPerSecond: Number.isFinite(position.coords.speed)
            ? position.coords.speed
            : null,
          timestamp: position.timestamp,
        };

        setUserLocation(next);
        setLocationError(null);

        const currentStatus = locationStatusRef.current;
        const isFirstFix = !locationFocusedOnceRef.current;

        if (isFirstFix || currentStatus === "requesting") {
          locationFocusedOnceRef.current = true;
          setLocationStatus("following");
          setLocationInfoOpen(true);
          window.requestAnimationFrame(() => {
            focusUserLocationRef.current?.("fit");
          });
          return;
        }

        if (currentStatus === "following") {
          focusUserLocationRef.current?.("soft");
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          stopUserLocation();
          setLocationStatus("denied");
          setLocationError(t.location.denied);
          return;
        }

        if (error.code === error.TIMEOUT) {
          setLocationStatus((status) =>
            status === "following" || status === "passive" ? status : "error",
          );
          setLocationError(t.location.timeout);
          return;
        }

        setLocationStatus((status) =>
          status === "following" || status === "passive" ? status : "error",
        );
        setLocationError(t.location.unavailable);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 15_000,
      },
    );
  };

  const handleLocationButtonClick = async () => {
    setLocationError(null);

    if (locationStatus === "unavailable") {
      setLocationError(
        isGeolocationSecureContext()
          ? t.location.unsupported
          : t.location.insecure,
      );
      return;
    }

    if (locationStatus === "denied") {
      setLocationError(t.location.denied);
      return;
    }

    if (locationStatus === "following" || locationStatus === "passive") {
      setLocationStatus("following");
      setLocationInfoOpen(true);
      focusUserLocationRef.current?.("fit");
      return;
    }

    if (locationStatus === "requesting") return;

    const permission = await queryGeolocationPermission();
    if (permission === "denied") {
      setLocationStatus("denied");
      setLocationError(t.location.denied);
      return;
    }

    if (permission === "granted") {
      startUserLocationWatch();
      return;
    }

    setLocationConsentOpen(true);
    markLocationPromptSeen();
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/alerts/weather?locale=${encodeURIComponent(locale)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("weather_status_http");
        const data = (await response.json()) as AlertApiResponse;
        setAlertConnectorStatus((current) => ({
          ...current,
          meteoalarm: data.connectorStatus,
        }));
        if (data.demoMode) setAlertsDemoMode(true);
        if (data.connectorStatus === "misconfigured") {
          setShowOfficialWeatherWarnings(false);
        }
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setAlertConnectorStatus((current) => ({
            ...current,
            meteoalarm: "unavailable",
          }));
        }
      });
    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/alerts/traffic/status", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`traffic_status_http_${response.status}`);
        return (await response.json()) as {
          connectorStatus: AlertConnectorStatus;
          configured: boolean;
          demoMode: boolean;
          flowTileTemplate: string;
          incidentTileTemplate: string;
          bounds: [number, number, number, number];
          maxZoom: number;
        };
      })
      .then((value) => {
        setTrafficStatus(value);
        setAlertConnectorStatus((current) => ({
          ...current,
          "tomtom-traffic": value.connectorStatus,
        }));
        if (value.demoMode) setAlertsDemoMode(true);
        if (value.connectorStatus === "misconfigured") {
          setShowLiveTrafficFlow(false);
          setShowRoadTrafficIncidents(false);
          setShowRoadClosuresRestrictions(false);
          setShowRoadworks(false);
        }
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setTrafficStatus((current) =>
          current
            ? { ...current, connectorStatus: "unavailable" }
            : null,
        );
        setAlertConnectorStatus((current) => ({
          ...current,
          "tomtom-traffic": "unavailable",
        }));
      });
    return () => controller.abort();
  }, []);

  const handleTrafficAlertsChange = useCallback(
    (nextTrafficAlerts: NormalizedAlert[]) => {
      const deduped = dedupeTrafficAlertsById(nextTrafficAlerts);
      setNormalizedAlerts((current) => {
        const currentTraffic = current.filter(
          (alert) => alert.category === "road_traffic",
        );
        if (areTrafficAlertsEqual(currentTraffic, deduped)) {
          return current;
        }
        return [
          ...current.filter((alert) => alert.category !== "road_traffic"),
          ...deduped,
        ];
      });
    },
    [],
  );

  const handleCameraChange = useCallback((snapshot: CameraSnapshot) => {
    setMapPitch((current) =>
      Math.abs(current - snapshot.pitch) < 0.01 ? current : snapshot.pitch,
    );
    setMapBearing((current) => {
      const normalized = normalizeBearing(snapshot.bearing);
      return angularDifference(current, normalized) < 0.01
        ? current
        : normalized;
    });
  }, []);

  const trafficParentLayers = useMemo(
    () => ({
      incidents: showRoadTrafficIncidents,
      closures: showRoadClosuresRestrictions,
      roadworks: showRoadworks,
    }),
    [
      showRoadTrafficIncidents,
      showRoadClosuresRestrictions,
      showRoadworks,
    ],
  );

  const trafficFilters = useMemo(
    () => ({
      accidents: showTrafficAccidents,
      majorJams: showTrafficMajorJams,
      brokenVehicles: showTrafficBrokenVehicles,
      hazards: showTrafficHazards,
      roadWeather: showTrafficRoadWeather,
      otherIncidents: showTrafficOtherIncidents,
      roadClosures: showTrafficRoadClosures,
      laneClosures: showTrafficLaneClosures,
      restrictions: showTrafficRestrictions,
      activeRoadworks: showTrafficActiveRoadworks,
      plannedRoadworks: showTrafficPlannedRoadworks,
    }),
    [
      showTrafficAccidents,
      showTrafficMajorJams,
      showTrafficBrokenVehicles,
      showTrafficHazards,
      showTrafficRoadWeather,
      showTrafficOtherIncidents,
      showTrafficRoadClosures,
      showTrafficLaneClosures,
      showTrafficRestrictions,
      showTrafficActiveRoadworks,
      showTrafficPlannedRoadworks,
    ],
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

  useEffect(() => {
    const controller = new AbortController();
    const enabled =
      showOfficialWeatherWarnings ||
      showMajorFloodAlerts ||
      showMajorStorms ||
      showRecentEarthquakes ||
      showMajorVolcanicActivity ||
      showMappedLandslideEvents ||
      showMajorIndustrialIncidents;
    if (!enabled) return () => controller.abort();

    const replaceSourceAlerts = (
      sourceId: string,
      response: AlertApiResponse,
    ) => {
      setAlertConnectorStatus((current) => ({
        ...current,
        [sourceId]: response.connectorStatus,
        ...(response.providerStatuses ?? {}),
      }));
      if (response.demoMode) setAlertsDemoMode(true);
      if (response.connectorStatus !== "operational") return;
      setNormalizedAlerts((current) => [
        ...current.filter((alert) =>
          sourceId === "geological-earthquakes"
            ? alert.category !== "earthquake"
            : sourceId === "geological-volcanoes"
              ? alert.category !== "volcano"
              : sourceId === "copernicus-emergency-mapping"
                ? alert.category !== "landslide" &&
                  alert.category !== "industrial_incident"
              : sourceId === "gdacs"
            ? alert.source !== "gdacs" ||
              !response.alerts.some((incoming) => incoming.category === alert.category)
            : alert.source !== sourceId,
        ),
        ...response.alerts,
      ]);
    };

    const load = async () => {
      const requests: Array<Promise<void>> = [];
      if (showOfficialWeatherWarnings) {
        requests.push(
          fetch(`/api/alerts/weather?locale=${encodeURIComponent(locale)}`, {
            signal: controller.signal,
          })
            .then(async (response) => {
              if (!response.ok) throw new Error("weather_alerts_http");
              replaceSourceAlerts("meteoalarm", (await response.json()) as AlertApiResponse);
            })
            .catch((error: unknown) => {
              if (!isAbortError(error)) {
                setAlertConnectorStatus((current) => ({
                  ...current,
                  meteoalarm: "unavailable",
                }));
              }
            }),
        );
      }
      if (showMajorFloodAlerts) {
        requests.push(
          fetch("/api/alerts/floods", { signal: controller.signal })
            .then(async (response) => {
              if (!response.ok) throw new Error("flood_alerts_http");
              replaceSourceAlerts("gdacs", (await response.json()) as AlertApiResponse);
            })
            .catch((error: unknown) => {
              if (!isAbortError(error)) {
                setAlertConnectorStatus((current) => ({ ...current, gdacs: "unavailable" }));
              }
            }),
        );
      }
      if (showMajorStorms) {
        requests.push(
          fetch("/api/alerts/storms", { signal: controller.signal })
            .then(async (response) => {
              if (!response.ok) throw new Error("storm_alerts_http");
              replaceSourceAlerts("gdacs", (await response.json()) as AlertApiResponse);
            })
            .catch((error: unknown) => {
              if (!isAbortError(error)) {
                setAlertConnectorStatus((current) => ({ ...current, gdacs: "unavailable" }));
              }
            }),
        );
      }
      if (showRecentEarthquakes) {
        requests.push(
          fetch("/api/alerts/earthquakes", { signal: controller.signal })
            .then(async (response) => {
              if (!response.ok) throw new Error("earthquake_alerts_http");
              replaceSourceAlerts(
                "geological-earthquakes",
                (await response.json()) as AlertApiResponse,
              );
            })
            .catch((error: unknown) => {
              if (!isAbortError(error)) {
                setAlertConnectorStatus((current) => ({
                  ...current,
                  usgs: "unavailable",
                  emsc: "unavailable",
                }));
              }
            }),
        );
      }
      if (showMajorVolcanicActivity) {
        requests.push(
          fetch("/api/alerts/volcanoes", { signal: controller.signal })
            .then(async (response) => {
              if (!response.ok) throw new Error("volcano_alerts_http");
              replaceSourceAlerts(
                "geological-volcanoes",
                (await response.json()) as AlertApiResponse,
              );
            })
            .catch((error: unknown) => {
              if (!isAbortError(error)) {
                setAlertConnectorStatus((current) => ({
                  ...current,
                  "gdacs-geological": "unavailable",
                }));
              }
            }),
        );
      }
      if (showMappedLandslideEvents || showMajorIndustrialIncidents) {
        requests.push(
          fetch(
            `/api/alerts/emergency-mapping?category=all&period=${encodeURIComponent(cemsTimeMode)}`,
            { signal: controller.signal },
          )
            .then(async (response) => {
              if (!response.ok) throw new Error("cems_alerts_http");
              replaceSourceAlerts(
                "copernicus-emergency-mapping",
                (await response.json()) as AlertApiResponse,
              );
            })
            .catch((error: unknown) => {
              if (!isAbortError(error)) {
                setAlertConnectorStatus((current) => ({
                  ...current,
                  "copernicus-emergency-mapping": "unavailable",
                }));
              }
            }),
        );
      }
      await Promise.allSettled(requests);
    };

    void load();
    const interval = window.setInterval(() => void load(), 5 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [
    locale,
    showMajorFloodAlerts,
    showMajorStorms,
    showOfficialWeatherWarnings,
    showRecentEarthquakes,
    showMajorVolcanicActivity,
    showMappedLandslideEvents,
    showMajorIndustrialIncidents,
    cemsTimeMode,
  ]);

  useEffect(() => {
    if (!showLandslideLikelihood) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/alerts/landslides/nowcast", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("nasa_lhasa_status_http");
        const status = (await response.json()) as LandslideNowcastLayerStatus;
        setLandslideNowcastStatus(status);
        setAlertConnectorStatus((current) => ({
          ...current,
          "nasa-lhasa": status.connectorStatus,
        }));
        if (status.demoMode) setAlertsDemoMode(true);
      } catch (error) {
        if (!isAbortError(error)) {
          setAlertConnectorStatus((current) => ({
            ...current,
            "nasa-lhasa": "unavailable",
          }));
        }
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 30 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [showLandslideLikelihood]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/alerts/flood-extent", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("copernicus_status_http");
        const status = (await response.json()) as CopernicusFloodLayerStatus;
        setCopernicusFloodStatus(status);
        setAlertConnectorStatus((current) => ({
          ...current,
          "copernicus-gfm": status.connectorStatus,
        }));
      } catch (error) {
        if (!isAbortError(error)) {
          setCopernicusFloodStatus((current) =>
            current ? { ...current, available: false, connectorStatus: "unavailable" } : null,
          );
          setAlertConnectorStatus((current) => ({
            ...current,
            "copernicus-gfm": "unavailable",
          }));
        }
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 15 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!showWildfireWind || !showWildfires || wildfireIncidents.length === 0) {
      setWildfireWinds([]);
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/alerts/wind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coordinates: wildfireIncidents.slice(0, 20).map((incident) => ({
              latitude: incident.latitude,
              longitude: incident.longitude,
            })),
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("wind_http");
        const data = (await response.json()) as {
          winds?: WildfireWind[];
          connectorStatus?: AlertConnectorStatus;
        };
        if (Array.isArray(data.winds)) setWildfireWinds(data.winds);
        setAlertConnectorStatus((current) => ({
          ...current,
          "open-meteo-ecmwf": data.connectorStatus ?? "operational",
        }));
      } catch (error) {
        if (!isAbortError(error)) {
          setAlertConnectorStatus((current) => ({
            ...current,
            "open-meteo-ecmwf": "unavailable",
          }));
        }
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 15 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [showWildfireWind, showWildfires, wildfireIncidents]);

  useEffect(() => {
    if (wildfireIncidents.length === 0) return;

    const controller = new AbortController();

    const loadCachedSnapshots = async () => {
      for (let index = 0; index < wildfireIncidents.length; index += 2) {
        if (controller.signal.aborted) return;

        const batch = wildfireIncidents.slice(index, index + 2);
        const results = await Promise.allSettled(
          batch.map(async (incident) => {
            const response = await fetch(
              `/api/incidents/effis/snapshots/${encodeURIComponent(incident.id)}`,
              { signal: controller.signal },
            );

            if (!response.ok) {
              return null;
            }

            const data: unknown = await response.json();
            if (
              !data ||
              typeof data !== "object" ||
              !("snapshot" in data) ||
              !data.snapshot
            ) {
              return null;
            }

            const snapshot = validateEffisBurnedAreaSnapshot(data.snapshot);
            if (!snapshot) return null;

            return { incidentId: incident.id, snapshot };
          }),
        );

        for (const result of results) {
          if (result.status !== "fulfilled" || !result.value) continue;

          const { incidentId, snapshot } = result.value;
          setEffisSnapshotsByIncidentId((currentSnapshots) => ({
            ...currentSnapshots,
            [incidentId]: snapshot,
          }));
        }
      }

      if (controller.signal.aborted) return;

      for (const incident of wildfireIncidents) {
        if (controller.signal.aborted) return;
        if (refreshedSnapshotIdsRef.current.has(incident.id)) continue;

        refreshedSnapshotIdsRef.current.add(incident.id);

        try {
          const response = await fetch(
            `/api/incidents/effis/snapshots/${encodeURIComponent(incident.id)}/refresh`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                longitude: incident.longitude,
                latitude: incident.latitude,
                countryCode: incident.countryCode,
              }),
              signal: controller.signal,
            },
          );

          if (isEffisServiceFailureStatus(response.status)) {
            effisServiceFailedRef.current = true;
            setEffisUnavailable(true);
          } else if (response.ok) {
            const data: unknown = await response.json();
            const preservedPrevious =
              data &&
              typeof data === "object" &&
              "preservedPrevious" in data &&
              data.preservedPrevious === true;
            const rawSnapshot =
              data &&
              typeof data === "object" &&
              "snapshot" in data &&
              data.snapshot
                ? data.snapshot
                : null;
            const snapshot = rawSnapshot
              ? validateEffisBurnedAreaSnapshot(rawSnapshot)
              : null;

            if (snapshot) {
              setEffisSnapshotsByIncidentId((currentSnapshots) => ({
                ...currentSnapshots,
                [incident.id]: snapshot,
              }));
              setEffisUnavailable(false);
            } else if (preservedPrevious) {
              effisServiceFailedRef.current = true;
              setEffisUnavailable(true);
            }
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

          // Network / timeout failures from the EFFIS refresh route.
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
        }

        await sleep(1500);
      }
    };

    void loadCachedSnapshots();

    return () => {
      controller.abort();
    };
  }, [wildfireIncidents]);

  useEffect(() => {
    const controller = new AbortController();

    const applyFirmsSnapshots = (snapshots: FirmsIncidentSnapshot[]) => {
      if (snapshots.length === 0) return;

      setFirmsSnapshotsByIncidentId((previous) => {
        const next = { ...previous };
        for (const snapshot of snapshots) {
          const existing = next[snapshot.incidentId];
          if (
            !existing ||
            Date.parse(snapshot.fetchedAt) >= Date.parse(existing.fetchedAt)
          ) {
            next[snapshot.incidentId] = snapshot;
          }
        }
        return next;
      });
    };

    const loadFirmsSnapshots = async () => {
      try {
        const response = await fetch("/api/incidents/firms/snapshots", {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          const snapshots = data.snapshots as FirmsIncidentSnapshot[];
          applyFirmsSnapshots(snapshots);
          if (snapshots.length > 0) {
            setFirmsSnapshotStatus("cached");
          }
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
      }
    };

    const refreshFirmsSnapshots = async () => {
      if (firmsRefreshStartedRef.current) return;
      firmsRefreshStartedRef.current = true;

      try {
        const response = await fetch(
          "/api/incidents/firms/snapshots/refresh",
          {
            method: "POST",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          firmsRefreshStartedRef.current = false;
          return;
        }

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          const snapshots = data.snapshots as FirmsIncidentSnapshot[];
          applyFirmsSnapshots(snapshots);

          const updated =
            "updated" in data && data.updated === true;
          const preservedPrevious =
            "preservedPrevious" in data && data.preservedPrevious === true;

          if (updated) {
            setFirmsSnapshotStatus("live");
          } else if (preservedPrevious || snapshots.length > 0) {
            setFirmsSnapshotStatus("cached");
          }
        }
      } catch (error: unknown) {
        firmsRefreshStartedRef.current = false;
        if (isAbortError(error)) return;
      }
    };

    void (async () => {
      await loadFirmsSnapshots();
      if (controller.signal.aborted) return;
      await refreshFirmsSnapshots();
    })();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const applyFirmsHistorySnapshots = (snapshots: FirmsIncidentSnapshot[]) => {
      const hasHistory = snapshots.length > 0;
      if (!hasHistory) return;

      setFirmsHistorySnapshotsByIncidentId((previous) => {
        const next = { ...previous };
        for (const snapshot of snapshots) {
          const existing = next[snapshot.incidentId];
          if (
            !existing ||
            Date.parse(snapshot.fetchedAt) >= Date.parse(existing.fetchedAt)
          ) {
            next[snapshot.incidentId] = snapshot;
          }
        }
        return next;
      });

      // Cache hits (updated=false / preservedPrevious=true) still count as data.
      setFirmsHistoryLoadingOverlay(false);
      setFirmsHistoryUnavailableMessage(false);
    };

    const loadFirmsHistorySnapshots = async () => {
      try {
        const response = await fetch("/api/incidents/firms/history", {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          applyFirmsHistorySnapshots(data.snapshots as FirmsIncidentSnapshot[]);
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
      }
    };

    const refreshFirmsHistorySnapshots = async () => {
      if (firmsHistoryRefreshStartedRef.current) return;
      firmsHistoryRefreshStartedRef.current = true;

      try {
        const response = await fetch(
          "/api/incidents/firms/history/refresh",
          {
            method: "POST",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          firmsHistoryRefreshStartedRef.current = false;
          return;
        }

        const data: unknown = await response.json();
        if (
          data &&
          typeof data === "object" &&
          "snapshots" in data &&
          Array.isArray(data.snapshots)
        ) {
          // Apply returned snapshots even when updated=false / preservedPrevious=true.
          applyFirmsHistorySnapshots(data.snapshots as FirmsIncidentSnapshot[]);
        }
      } catch (error: unknown) {
        firmsHistoryRefreshStartedRef.current = false;
        if (isAbortError(error)) return;
      }
    };

    void (async () => {
      await loadFirmsHistorySnapshots();
      if (controller.signal.aborted) return;
      await refreshFirmsHistorySnapshots();
    })();

    return () => {
      controller.abort();
    };
  }, []);

  const hasFirmsSnapshots = Object.keys(firmsSnapshotsByIncidentId).length > 0;
  const hasEffisSnapshots =
    Object.keys(effisSnapshotsByIncidentId).length > 0;
  const hasFirmsHistorySnapshots =
    Object.keys(firmsHistorySnapshotsByIncidentId).length > 0;
  const firmsDataAvailable = hasFirmsSnapshots;

  useEffect(() => {
    if (!showSatelliteActiveFires) {
      setFirmsLoadingOverlay(false);
      setFirmsUnavailableMessage(false);
      return;
    }

    setFirmsUnavailableMessage(false);

    if (firmsDataAvailable) {
      setFirmsLoadingOverlay(false);
      return;
    }

    setFirmsLoadingOverlay(true);
  }, [showSatelliteActiveFires, firmsDataAvailable]);

  useEffect(() => {
    if (!showSatelliteActiveFires || firmsDataAvailable) return;

    const timeoutId = window.setTimeout(() => {
      setFirmsLoadingOverlay(false);
      setFirmsUnavailableMessage(true);
    }, FIRMS_UNAVAILABLE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSatelliteActiveFires, firmsDataAvailable]);

  useEffect(() => {
    if (!showSatelliteBurnedAreas) {
      setFirmsHistoryLoadingOverlay(false);
      setFirmsHistoryUnavailableMessage(false);
      return;
    }

    setFirmsHistoryUnavailableMessage(false);

    if (hasFirmsHistorySnapshots || hasEffisSnapshots) {
      setFirmsHistoryLoadingOverlay(false);
      return;
    }

    setFirmsHistoryLoadingOverlay(true);
  }, [showSatelliteBurnedAreas, hasFirmsHistorySnapshots, hasEffisSnapshots]);

  useEffect(() => {
    if (
      !showSatelliteBurnedAreas ||
      hasFirmsHistorySnapshots ||
      hasEffisSnapshots
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFirmsHistoryLoadingOverlay(false);
      setFirmsHistoryUnavailableMessage(true);
    }, FIRMS_HISTORY_UNAVAILABLE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSatelliteBurnedAreas, hasFirmsHistorySnapshots, hasEffisSnapshots]);

  // EFFIS unavailable banner: driven by refresh HTTP status / body, not MapLibre.
  // Stays visible at least 6 seconds once shown.
  useEffect(() => {
    if (effisBannerHideTimeoutRef.current !== null) {
      window.clearTimeout(effisBannerHideTimeoutRef.current);
      effisBannerHideTimeoutRef.current = null;
    }

    const effisFailed = effisUnavailable || effisServiceFailedRef.current;

    const shouldShow =
      showSatelliteBurnedAreas &&
      !hasEffisSnapshots &&
      !hasFirmsHistorySnapshots &&
      effisFailed;

    setShowEffisUnavailableNasaShown(
      showSatelliteBurnedAreas &&
        !hasEffisSnapshots &&
        hasFirmsHistorySnapshots &&
        effisFailed,
    );

    if (shouldShow) {
      setShowEffisUnavailableBanner(true);
      if (effisBannerShownAtRef.current === null) {
        effisBannerShownAtRef.current = Date.now();
      }
      return;
    }

    if (hasEffisSnapshots) {
      setEffisUnavailable(false);
    }

    const shownAt = effisBannerShownAtRef.current;
    if (shownAt === null || !showEffisUnavailableBanner) {
      setShowEffisUnavailableBanner(false);
      effisBannerShownAtRef.current = null;
      return;
    }

    const remaining = Math.max(
      0,
      EFFIS_UNAVAILABLE_MESSAGE_MIN_MS - (Date.now() - shownAt),
    );

    if (remaining === 0) {
      setShowEffisUnavailableBanner(false);
      effisBannerShownAtRef.current = null;
      return;
    }

    effisBannerHideTimeoutRef.current = window.setTimeout(() => {
      setShowEffisUnavailableBanner(false);
      effisBannerShownAtRef.current = null;
      effisBannerHideTimeoutRef.current = null;
    }, remaining);

    return () => {
      if (effisBannerHideTimeoutRef.current !== null) {
        window.clearTimeout(effisBannerHideTimeoutRef.current);
        effisBannerHideTimeoutRef.current = null;
      }
    };
  }, [
    showSatelliteBurnedAreas,
    hasEffisSnapshots,
    hasFirmsHistorySnapshots,
    effisUnavailable,
    showEffisUnavailableBanner,
  ]);

  // When the brown checkbox is turned on with no cache, probe one refresh.
  useEffect(() => {
    if (!showSatelliteBurnedAreas) {
      effisProbeStartedRef.current = false;
      return;
    }
    if (hasEffisSnapshots) return;
    if (effisProbeStartedRef.current) return;
    if (wildfireIncidents.length === 0) return;

    effisProbeStartedRef.current = true;
    const controller = new AbortController();

    const probeEffisAvailability = async () => {
      const incident = wildfireIncidents[0];
      if (!incident) return;

      try {
        const response = await fetch(
          `/api/incidents/effis/snapshots/${encodeURIComponent(incident.id)}/refresh`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              longitude: incident.longitude,
              latitude: incident.latitude,
              countryCode: incident.countryCode,
            }),
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        if (isEffisServiceFailureStatus(response.status)) {
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
          return;
        }

        if (!response.ok) {
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
          return;
        }

        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        const preservedPrevious =
          data &&
          typeof data === "object" &&
          "preservedPrevious" in data &&
          data.preservedPrevious === true;
        const rawSnapshot =
          data &&
          typeof data === "object" &&
          "snapshot" in data &&
          data.snapshot
            ? data.snapshot
            : null;
        const snapshot = rawSnapshot
          ? validateEffisBurnedAreaSnapshot(rawSnapshot)
          : null;

        if (snapshot) {
          setEffisSnapshotsByIncidentId((currentSnapshots) => ({
            ...currentSnapshots,
            [incident.id]: snapshot,
          }));
          setEffisUnavailable(false);
          return;
        }

        if (preservedPrevious || !snapshot) {
          effisServiceFailedRef.current = true;
          setEffisUnavailable(true);
        }
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        effisServiceFailedRef.current = true;
        setEffisUnavailable(true);
      }
    };

    void probeEffisAvailability();

    return () => {
      controller.abort();
    };
  }, [showSatelliteBurnedAreas, hasEffisSnapshots, wildfireIncidents]);

  void wildfiresLoading;

  const clearInstitutionSelection = () => {
    setSelectedInstitutionId(null);
    setSelectedInstitutionSiteId(null);
  };

  const clearUnescoSelection = () => {
    setSelectedUnescoSiteId(null);
  };

  const clearEhlSelection = () => {
    setSelectedEhlSiteId(null);
    setSelectedEhlLocationId(null);
  };

  const clearMountainPlaceSelection = () => {
    setSelectedMountainPlaceId(null);
  };

  const clearCivilEngineeringWorkSelection = () => {
    setSelectedCivilEngineeringWorkId(null);
  };

  const clearTouristPlaceSelection = () => {
    setSelectedTouristPlaceId(null);
    clearMountainPlaceSelection();
    clearCivilEngineeringWorkSelection();
    setSelectedAlertId(null);
  };

  const clearAirportSelection = () => {
    setSelectedAirportId(null);
  };

  const clearEurostarSelection = () => {
    setSelectedEurostarStationId(null);
    setHighlightedEurostarRouteIds([]);
  };

  const clearBorderCrossingSelection = () => {
    setSelectedBorderCrossingId(null);
  };

  const clearTemporaryControlSelection = () => {
    setSelectedTemporaryControlId(null);
  };

  const clearBorderSelections = () => {
    clearBorderCrossingSelection();
    clearTemporaryControlSelection();
  };

  const handleCountrySelect = (countryCode: string | null) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    setSelectedCountryCode(countryCode);
  };

  const handleCapitalSelect = (capitalId: string | null) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();
    setSelectedCapitalId(capitalId);

    if (capitalId) {
      setShowEuCapitals(true);
      const capital = getEuCapitalById(capitalId);
      if (capital) {
        requestFocus({
          kind: "point",
          longitude: capital.longitude,
          latitude: capital.latitude,
          zoom: 10,
        });
      }
    }
  };

  const handleRoutePlannerPointsChange = useCallback(
    (next: RoutePlannerPointsState) => {
      setRoutePlannerPointsState((current) =>
        areRoutePlannerPointsEqual(current, next) ? current : next,
      );
    },
    [],
  );

  const handleRoutePlannerRoutesChange = useCallback(
    (routes: NormalizedRoute[], selectedId: string | null) => {
      setRoutePlannerRoutes(routes);
      setRoutePlannerSelectedId(selectedId);
      if (routes.length > 0) {
        setTransitJourneys([]);
        setTransitSelectedId(null);
      }
    },
    [],
  );

  const handleTransitChange = useCallback(
    (journeys: TransitJourney[], selectedId: string | null) => {
      setTransitJourneys(journeys);
      setTransitSelectedId(selectedId);
      if (journeys.length > 0) {
        setRoutePlannerRoutes([]);
        setRoutePlannerSelectedId(null);
      }
    },
    [],
  );

  const routePlannerMapPoints: RoutePlannerMapPoint[] = useMemo(() => {
    const points: RoutePlannerMapPoint[] = [];
    const { origin, destination, waypoints } = routePlannerPointsState;
    if (origin) {
      points.push({
        id: "origin",
        role: "origin",
        longitude: origin.longitude,
        latitude: origin.latitude,
        label: "A",
        color: "#16a34a",
      });
    }
    waypoints.forEach((waypoint, index) => {
      points.push({
        id: `wp-${index}`,
        role: "waypoint",
        longitude: waypoint.longitude,
        latitude: waypoint.latitude,
        label: String(index + 1),
        color: "#2563eb",
      });
    });
    if (destination) {
      points.push({
        id: "destination",
        role: "destination",
        longitude: destination.longitude,
        latitude: destination.latitude,
        label: "B",
        color: "#dc2626",
      });
    }
    return points;
  }, [routePlannerPointsState]);

  const selectedTransitJourney =
    transitJourneys.find((journey) => journey.id === transitSelectedId) ??
    transitJourneys[0] ??
    null;

  const transitMapPoints: TransitMapPoint[] = useMemo(() => {
    const points: TransitMapPoint[] = [];
    const { origin, destination } = routePlannerPointsState;
    if (origin) {
      points.push({
        id: "transit-origin",
        role: "origin",
        longitude: origin.longitude,
        latitude: origin.latitude,
        label: "A",
        color: "#16a34a",
      });
    }
    if (selectedTransitJourney) {
      selectedTransitJourney.legs.forEach((leg, index) => {
        if (leg.mode === "walk") return;
        if (
          leg.from.longitude == null ||
          leg.from.latitude == null ||
          !Number.isFinite(leg.from.longitude) ||
          !Number.isFinite(leg.from.latitude)
        ) {
          return;
        }
        if (index === 0) return;
        points.push({
          id: `transfer-${index}`,
          role: "transfer",
          longitude: leg.from.longitude,
          latitude: leg.from.latitude,
          label: String(points.filter((p) => p.role === "transfer").length + 1),
          color: "#2563eb",
        });
      });
    }
    if (destination) {
      points.push({
        id: "transit-destination",
        role: "destination",
        longitude: destination.longitude,
        latitude: destination.latitude,
        label: "B",
        color: "#dc2626",
      });
    }
    return points;
  }, [routePlannerPointsState, selectedTransitJourney]);

  const openRoutePlanner = (options?: {
    origin?: RoutePoint | null;
    destination?: RoutePoint | null;
    focusOrigin?: boolean;
  }) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCountryCode(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearMountainPlaceSelection();
    clearCivilEngineeringWorkSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();
    setSelectedAlertId(null);
    setRouteContextMenu(null);
    setRoutePlannerFocusOrigin(Boolean(options?.focusOrigin));
    // Search-bar Route icon (no options) keeps previous points.
    // Context menu may set only origin or only destination.
    if (options && ("origin" in options || "destination" in options)) {
      setRoutePlannerPointsState((current) => ({
        origin: "origin" in options ? (options.origin ?? null) : current.origin,
        destination:
          "destination" in options
            ? (options.destination ?? null)
            : current.destination,
        waypoints: [],
      }));
    }
    setRoutePlannerOpen(true);
  };

  useEffect(() => {
    const shared = readShareableRouteFromUrl();
    if (!shared) return;
    openRoutePlanner({
      origin: shared.origin,
      destination: shared.destination,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from URL
  }, []);

  const openDirectionsTo = useCallback(
    (destination: RoutePoint) => {
      const apply = (origin: RoutePoint | null, focusOrigin: boolean) => {
        openRoutePlanner({
          origin,
          destination,
          focusOrigin,
        });
      };

      if (userLocation) {
        apply(
          {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            name: null,
            countryCode: null,
          },
          false,
        );
        return;
      }

      if (!navigator.geolocation) {
        apply(null, true);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          apply(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              name: null,
              countryCode: null,
            },
            false,
          );
        },
        () => apply(null, true),
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    },
    // openRoutePlanner closes over latest clear* helpers
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLocation],
  );

  const handleRouteToPlace = (point: RoutePoint) => {
    openDirectionsTo(point);
  };

  const handleWildfireSelect = (incidentId: string | null) => {
    setSelectedCountryCode(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    setSelectedWildfireId(incidentId);
  };

  const requestFocus = (
    request:
      | { kind: "europe" }
      | { kind: "country"; countryCode: string }
      | {
          kind: "point";
          longitude: number;
          latitude: number;
          zoom: number;
        }
      | {
          kind: "bounds";
          west: number;
          south: number;
          east: number;
          north: number;
          padding?: MapFocusPadding;
          maxZoom?: number;
        },
  ) => {
    focusNonceRef.current += 1;
    setFocusRequest({ ...request, nonce: focusNonceRef.current });
  };

  const clearTemporaryPlace = () => {
    setTemporaryPlace(null);
  };

  const handleGoEurope = () => {
    setSelectedCountryCode(null);
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();
    requestFocus({ kind: "europe" });
  };

  const handleFocusLegend = () => {
    setLegendCollapsed(false);
    setLegendHighlight(true);
    window.setTimeout(() => setLegendHighlight(false), 1600);
  };

  const handleInstitutionSelect = (
    institutionId: EuInstitutionId | null,
    siteId?: string,
  ) => {
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();
    setSelectedInstitutionId(institutionId);
    setSelectedInstitutionSiteId(siteId ?? null);

    if (!institutionId) return;

    setShowEuMainInstitutions(true);

    const institution = getEuInstitutionById(institutionId);
    if (!institution) return;

    if (siteId) {
      const site = getEuInstitutionSiteById(siteId);
      if (site) {
        requestFocus({
          kind: "point",
          longitude: site.longitude,
          latitude: site.latitude,
          zoom: 12,
        });
        return;
      }
    }

    const sites = institution.sites;
    if (sites.length === 1) {
      setSelectedInstitutionSiteId(sites[0].id);
      requestFocus({
        kind: "point",
        longitude: sites[0].longitude,
        latitude: sites[0].latitude,
        zoom: 12,
      });
      return;
    }

    if (sites.length > 1) {
      let west = Infinity;
      let south = Infinity;
      let east = -Infinity;
      let north = -Infinity;
      for (const site of sites) {
        west = Math.min(west, site.longitude);
        east = Math.max(east, site.longitude);
        south = Math.min(south, site.latitude);
        north = Math.max(north, site.latitude);
      }
      requestFocus({
        kind: "bounds",
        west,
        south,
        east,
        north,
        padding: 90,
        maxZoom: 8,
      });
    }
  };

  const handleInstitutionSiteSelect = (siteId: string | null) => {
    if (!siteId) {
      setSelectedInstitutionSiteId(null);
      return;
    }

    const site = getEuInstitutionSiteById(siteId);
    if (!site) return;

    const keepCurrentInstitution =
      selectedInstitutionId !== null &&
      site.institutionIds.includes(selectedInstitutionId);

    const institutionId = keepCurrentInstitution
      ? selectedInstitutionId!
      : site.institutionIds[0];

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearBorderSelections();
    clearTemporaryPlace();
    setShowEuMainInstitutions(true);
    setSelectedInstitutionId(institutionId);
    setSelectedInstitutionSiteId(siteId);

    requestFocus({
      kind: "point",
      longitude: site.longitude,
      latitude: site.latitude,
      zoom: 12,
    });
  };

  const handleUnescoSiteSelect = (siteId: string | null) => {
    if (!siteId) {
      setSelectedUnescoSiteId(null);
      return;
    }

    const site = getUnescoSiteById(siteId);
    if (!site) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearTemporaryPlace();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();

    setShowUnescoWorldHeritage(true);
    if (site.category === "cultural") setShowUnescoCultural(true);
    if (site.category === "natural") setShowUnescoNatural(true);
    if (site.category === "mixed") setShowUnescoMixed(true);

    setSelectedUnescoSiteId(siteId);

    requestFocus({
      kind: "point",
      longitude: site.longitude,
      latitude: site.latitude,
      zoom: 10,
    });
  };

  const handleEhlSiteSelect = (
    siteId: string | null,
    locationId: string | null = null,
  ) => {
    if (!siteId) {
      clearEhlSelection();
      return;
    }

    const site = getEuropeanHeritageLabelSiteById(siteId);
    if (!site) return;

    const location = locationId
      ? getEuropeanHeritageLabelLocationById(locationId)
      : null;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearTemporaryPlace();
    clearUnescoSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();

    setShowEuropeanHeritageLabel(true);
    setSelectedEhlSiteId(siteId);
    setSelectedEhlLocationId(location ? location.id : null);

    if (location) {
      requestFocus({
        kind: "point",
        longitude: location.longitude,
        latitude: location.latitude,
        zoom: 11,
      });
      return;
    }

    const locations = getDisplayableEhlLocations([site]);
    if (locations.length === 1) {
      requestFocus({
        kind: "point",
        longitude: locations[0].longitude,
        latitude: locations[0].latitude,
        zoom: 11,
      });
      return;
    }

    if (locations.length > 1) {
      let west = Infinity;
      let south = Infinity;
      let east = -Infinity;
      let north = -Infinity;
      for (const loc of locations) {
        west = Math.min(west, loc.longitude);
        east = Math.max(east, loc.longitude);
        south = Math.min(south, loc.latitude);
        north = Math.max(north, loc.latitude);
      }
      requestFocus({
        kind: "bounds",
        west,
        south,
        east,
        north,
        padding: 90,
        maxZoom: 9,
      });
    }
  };

  const enableTouristCategory = (category: TouristPlaceCategory) => {
    switch (category) {
      case "landmark":
        setShowTouristLandmark(true);
        break;
      case "historic_area":
        setShowTouristHistoricArea(true);
        break;
      case "museum":
        setShowTouristMuseum(true);
        break;
      case "park_garden":
        setShowTouristParkGarden(true);
        break;
      case "natural_landscape":
        setShowTouristNaturalLandscape(true);
        break;
      case "coastal_destination":
        setShowTouristCoastalDestination(true);
        break;
      case "mountain_destination":
        setShowTouristMountainDestination(true);
        break;
    }
  };

  const handleTouristPlaceSelect = (placeId: string | null) => {
    if (!placeId) {
      clearTouristPlaceSelection();
      return;
    }

    const place = getMajorTouristPlaceById(placeId);
    if (!place) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();

    setShowMajorTouristPlaces(true);
    enableTouristCategory(place.category);
    setSelectedTouristPlaceId(placeId);

    requestFocus({
      kind: "point",
      longitude: place.longitude,
      latitude: place.latitude,
      zoom: 10,
    });
  };

  const handleAlertSelect = (alertId: string | null) => {
    if (!alertId) {
      setSelectedAlertId(null);
      return;
    }
    const alert = normalizedAlerts.find((item) => item.id === alertId);
    if (!alert) return;
    setSelectedCountryCode(null);
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();
    if (alert.source === "meteoalarm") {
      setShowOfficialWeatherWarnings(true);
      if (alert.hazard === "heavy_rain") setShowWeatherHeavyRain(true);
      else if (["river_flood", "flash_flood"].includes(alert.hazard)) setShowWeatherFlood(true);
      else if (["strong_wind", "extreme_wind"].includes(alert.hazard)) setShowWeatherStrongWind(true);
      else if (["thunderstorm", "tornado"].includes(alert.hazard)) setShowWeatherThunderstorm(true);
      else if (alert.hazard === "hail") setShowWeatherHail(true);
      else if (["snow", "ice"].includes(alert.hazard)) setShowWeatherSnowIce(true);
      else if (["coastal_flood", "storm_surge"].includes(alert.hazard)) setShowWeatherCoastal(true);
      else setShowWeatherOther(true);
    } else if (alert.category === "flood") {
      setShowMajorFloodAlerts(true);
    } else if (alert.category === "tropical_cyclone") {
      setShowMajorStorms(true);
    } else if (alert.category === "earthquake") {
      setShowRecentEarthquakes(true);
      const magnitude =
        typeof alert.metadata.magnitude === "number"
          ? alert.metadata.magnitude
          : null;
      const band = earthquakeMagnitudeBand(magnitude);
      if (band === "minor") setShowEarthquakeMinor(true);
      if (band === "moderate") setShowEarthquakeModerate(true);
      if (band === "strong") setShowEarthquakeStrong(true);
      if (band === "major") setShowEarthquakeMajor(true);
    } else if (alert.category === "volcano") {
      setShowMajorVolcanicActivity(true);
      const activity = String(alert.metadata.activityType ?? "unknown");
      if (activity === "ash_emission") setShowVolcanoAshEmission(true);
      else if (activity === "eruption") setShowVolcanoEruption(true);
      else setShowVolcanoUnrest(true);
    } else if (alert.category === "landslide") {
      setShowMappedLandslideEvents(true);
    } else if (alert.category === "industrial_incident") {
      setShowMajorIndustrialIncidents(true);
      if (alert.hazard === "chemical_accident") setShowChemicalAccidents(true);
      else if (alert.hazard === "explosion") setShowIndustrialExplosions(true);
      else if (
        alert.hazard === "technical_accident" ||
        alert.hazard === "unknown_industrial_incident"
      ) {
        setShowOtherTechnicalAccidents(true);
      } else {
        setShowIndustrialAccidents(true);
      }
    }
    setSelectedAlertId(alertId);
    if (alert.geometry && focusGeometryRef.current) {
      focusGeometryRef.current(alert.geometry);
    } else if (alert.centroid) {
      requestFocus({
        kind: "point",
        longitude: alert.centroid.longitude,
        latitude: alert.centroid.latitude,
        zoom: 7,
      });
    }
  };

  const handleSatelliteObservationSelect = (alert: NormalizedAlert) => {
    setNormalizedAlerts((current) => [
      ...current.filter((item) => item.id !== alert.id),
      alert,
    ]);
    setSelectedCountryCode(null);
    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();
    setShowObservedFloodExtent(true);
    setSelectedAlertId(alert.id);
    if (alert.centroid) {
      requestFocus({
        kind: "point",
        longitude: alert.centroid.longitude,
        latitude: alert.centroid.latitude,
        zoom: 11,
      });
    }
  };

  const enableMountainCategory = (category: MountainPlaceCategory) => {
    if (category === "ski_resort") setShowMountainSkiResorts(true);
    if (category === "mountain_destination") setShowMountainDestinations(true);
    if (category === "iconic_peak") setShowMountainIconicPeaks(true);
    if (category === "mountain_range") setShowMountainRanges(true);
  };

  const handleMountainPlaceSelect = (placeId: string | null) => {
    if (!placeId) {
      clearMountainPlaceSelection();
      return;
    }
    const place = getEuropeanMountainPlaceById(placeId);
    if (!place) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();

    setShowEuropeanMountainPlaces(true);
    enableMountainCategory(place.category);
    setSelectedMountainPlaceId(placeId);
    requestFocus({
      kind: "point",
      longitude: place.longitude,
      latitude: place.latitude,
      zoom: place.category === "mountain_range" ? 9 : 11,
    });
  };

  const enableCivilEngineeringCategory = (
    category: CivilEngineeringWorkCategory,
  ) => {
    if (category === "bridge") setShowCivilEngineeringBridge(true);
    if (category === "viaduct") setShowCivilEngineeringViaduct(true);
    if (category === "tunnel") setShowCivilEngineeringTunnel(true);
    if (category === "dam") setShowCivilEngineeringDam(true);
    if (category === "canal_lock") setShowCivilEngineeringCanalLock(true);
  };

  const handleCivilEngineeringWorkSelect = (workId: string | null) => {
    if (!workId) {
      clearCivilEngineeringWorkSelection();
      return;
    }
    const item = getMajorCivilEngineeringWorkById(workId);
    if (!item) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();

    setShowMajorCivilEngineeringWorks(true);
    enableCivilEngineeringCategory(item.category);
    setSelectedCivilEngineeringWorkId(workId);
    requestFocus({
      kind: "point",
      longitude: item.longitude,
      latitude: item.latitude,
      zoom: 10,
    });
  };

  const handleAirportSelect = (airportId: string | null) => {
    if (!airportId) {
      clearAirportSelection();
      return;
    }
    const airport = getEuropeanAirportById(airportId);
    if (!airport) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearEurostarSelection();
    clearBorderSelections();
    clearTemporaryPlace();

    setShowMajorEuropeanAirports(true);
    setSelectedAirportId(airportId);
    requestFocus({
      kind: "point",
      longitude: airport.longitude,
      latitude: airport.latitude,
      zoom: 10,
    });
  };

  const handleEurostarStationSelect = (stationId: string | null) => {
    if (!stationId) {
      clearEurostarSelection();
      return;
    }
    const station = getEurostarStationById(stationId);
    if (!station) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearBorderSelections();
    clearTemporaryPlace();

    setShowEurostarStations(true);
    setShowEurostarRoutes(true);
    setSelectedEurostarStationId(stationId);
    setHighlightedEurostarRouteIds(
      EUROSTAR_ROUTES.filter(
        (route) =>
          route.fromStationId === stationId || route.toStationId === stationId,
      ).map((route) => route.id),
    );
    requestFocus({
      kind: "point",
      longitude: station.longitude,
      latitude: station.latitude,
      zoom: 10,
    });
  };

  const enableBorderMode = (mode: BorderCrossingMode) => {
    if (mode === "rail") {
      setShowBorderCrossingRail(true);
      return;
    }
    if (mode === "air") {
      setShowBorderCrossingAir(true);
      return;
    }
    if (mode === "sea" || mode === "river") {
      setShowBorderCrossingSea(true);
      return;
    }
    setShowBorderCrossingRoad(true);
  };

  const borderCrossingFocusZoom = (mode: BorderCrossingMode): number => {
    if (mode === "air") return 11;
    if (mode === "sea" || mode === "river") return 10;
    return 12;
  };

  const handleBorderCrossingSelect = (crossingId: string | null) => {
    if (!crossingId) {
      clearBorderCrossingSelection();
      return;
    }

    const point = getSchengenBorderCrossingById(crossingId);
    if (!point) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearTemporaryPlace();
    clearTemporaryControlSelection();

    setShowSchengenExternalBorderCrossings(true);
    enableBorderMode(point.mode);
    setSelectedBorderCrossingId(crossingId);

    requestFocus({
      kind: "point",
      longitude: point.longitude,
      latitude: point.latitude,
      zoom: borderCrossingFocusZoom(point.mode),
    });
  };

  const handleTemporaryControlSelect = (controlId: string | null) => {
    if (!controlId) {
      clearTemporaryControlSelection();
      return;
    }

    const control = getTemporaryControlById(controlId, temporaryBorderControls);
    if (!control) return;

    setSelectedWildfireId(null);
    setSelectedEffisBurnedArea(null);
    setSelectedCapitalId(null);
    setSelectedCountryCode(null);
    clearInstitutionSelection();
    clearUnescoSelection();
    clearEhlSelection();
    clearTouristPlaceSelection();
    clearAirportSelection();
    clearEurostarSelection();
    clearTemporaryPlace();
    clearBorderCrossingSelection();

    setShowSchengenTemporaryInternalControls(true);
    setSelectedTemporaryControlId(controlId);

    requestFocus({
      kind: "point",
      longitude: centroidForTemporaryControl(control).longitude,
      latitude: centroidForTemporaryControl(control).latitude,
      zoom: 6,
    });
  };

  const handleSelectSearchResult = (result: MapSearchResult) => {
    if (result.type === "external_place") {
      setSelectedCountryCode(null);
      setSelectedWildfireId(null);
      setSelectedEffisBurnedArea(null);
      setSelectedCapitalId(null);
      clearInstitutionSelection();
      clearUnescoSelection();
      clearEhlSelection();
      clearTouristPlaceSelection();
      setTemporaryPlace(result);
      requestFocus({
        kind: "point",
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 10,
      });
      return;
    }

    clearTemporaryPlace();

    if (result.type === "country") {
      if (result.countryCode) {
        handleCountrySelect(result.countryCode);
        requestFocus({
          kind: "country",
          countryCode: result.countryCode,
        });
      }
      return;
    }

    if (result.type === "capital" && result.capitalId) {
      handleCapitalSelect(result.capitalId);
      return;
    }

    if (result.type === "eu_institution") {
      if (result.institutionId) {
        handleInstitutionSelect(result.institutionId, result.siteId);
      } else {
        setSelectedWildfireId(null);
        setSelectedEffisBurnedArea(null);
        setSelectedCountryCode(null);
        setSelectedCapitalId(null);
        clearInstitutionSelection();
        clearUnescoSelection();
        clearEhlSelection();
        clearTouristPlaceSelection();
        requestFocus({
          kind: "point",
          longitude: result.longitude,
          latitude: result.latitude,
          zoom: 12,
        });
      }
      return;
    }

    if (result.type === "unesco_site" && result.unescoSiteId) {
      handleUnescoSiteSelect(result.unescoSiteId);
      return;
    }

    if (result.type === "european_heritage_label" && result.ehlSiteId) {
      handleEhlSiteSelect(result.ehlSiteId, result.ehlLocationId ?? null);
      return;
    }

    if (result.type === "tourist_place" && result.touristPlaceId) {
      handleTouristPlaceSelect(result.touristPlaceId);
      return;
    }

    if (result.type === "mountain_place" && result.mountainPlaceId) {
      handleMountainPlaceSelect(result.mountainPlaceId);
      return;
    }

    if (
      result.type === "civil_engineering_work" &&
      result.civilEngineeringWorkId
    ) {
      handleCivilEngineeringWorkSelect(result.civilEngineeringWorkId);
      return;
    }

    if (result.type === "airport" && result.airportId) {
      handleAirportSelect(result.airportId);
      return;
    }

    if (result.type === "eurostar_station" && result.eurostarStationId) {
      handleEurostarStationSelect(result.eurostarStationId);
      return;
    }

    if (result.type === "border_crossing" && result.borderCrossingId) {
      handleBorderCrossingSelect(result.borderCrossingId);
      return;
    }

    if (result.type === "temporary_border_control" && result.temporaryControlId) {
      handleTemporaryControlSelect(result.temporaryControlId);
      return;
    }

    if (result.type === "capital") {
      if (result.countryCode) {
        handleCountrySelect(result.countryCode);
      } else {
        setSelectedWildfireId(null);
        setSelectedEffisBurnedArea(null);
        setSelectedCountryCode(null);
        setSelectedCapitalId(null);
        clearInstitutionSelection();
        clearUnescoSelection();
        clearEhlSelection();
        clearTouristPlaceSelection();
      }
      requestFocus({
        kind: "point",
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 8,
      });
      return;
    }

    if (result.type === "wildfire" && result.incidentId) {
      handleWildfireSelect(result.incidentId);
      requestFocus({
        kind: "point",
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 7,
      });
      return;
    }

    if (
      (result.type === "weather_alert" ||
        result.type === "flood_alert" ||
        result.type === "storm_alert" ||
        result.type === "earthquake_alert" ||
        result.type === "volcano_alert" ||
        result.type === "landslide_activation" ||
        result.type === "industrial_incident_activation" ||
        result.type === "traffic_incident" ||
        result.type === "road_closure" ||
        result.type === "roadworks") &&
      result.alertId
    ) {
      if (
        result.type === "traffic_incident" ||
        result.type === "road_closure" ||
        result.type === "roadworks"
      ) {
        if (result.type === "road_closure") {
          setShowRoadClosuresRestrictions(true);
          setShowTrafficRoadClosures(true);
          setShowTrafficLaneClosures(true);
          setShowTrafficRestrictions(true);
        } else if (result.type === "roadworks") {
          setShowRoadworks(true);
          setShowTrafficActiveRoadworks(true);
          setShowTrafficPlannedRoadworks(true);
        } else {
          setShowRoadTrafficIncidents(true);
        }
      }
      handleAlertSelect(result.alertId);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AppHeader
        locale={locale}
        onLocaleChange={setLocale}
        t={t}
        wildfires={wildfireIncidents}
        alerts={activityFilteredAlerts}
        temporaryBorderControls={temporaryBorderControls}
        onSelectSearchResult={handleSelectSearchResult}
        onGoEurope={handleGoEurope}
        onFocusLegend={handleFocusLegend}
        onOpenRoutePlanner={() => openRoutePlanner()}
        onDirectionsToResult={(result) => {
          openDirectionsTo({
            latitude: result.latitude,
            longitude: result.longitude,
            name: result.title,
            countryCode: result.countryCode ?? null,
          });
        }}
      />

      <div className="absolute inset-0">
        <MapClient
          showEurozone={showEurozone}
          showNonEurozone={showNonEurozone}
          showCandidates={showCandidates}
          showSchengenNonEU={showSchengenNonEU}
          selectedCountryCode={selectedCountryCode}
          onCountrySelect={handleCountrySelect}
          showEuCapitals={showEuCapitals}
          selectedCapitalId={selectedCapitalId}
          onCapitalSelect={handleCapitalSelect}
          showEuMainInstitutions={showEuMainInstitutions}
          selectedInstitutionSiteId={selectedInstitutionSiteId}
          onInstitutionSiteSelect={handleInstitutionSiteSelect}
          showUnescoWorldHeritage={showUnescoWorldHeritage}
          showUnescoCultural={showUnescoCultural}
          showUnescoNatural={showUnescoNatural}
          showUnescoMixed={showUnescoMixed}
          selectedUnescoSiteId={selectedUnescoSiteId}
          onUnescoSiteSelect={handleUnescoSiteSelect}
          showEuropeanHeritageLabel={showEuropeanHeritageLabel}
          selectedEhlSiteId={selectedEhlSiteId}
          selectedEhlLocationId={selectedEhlLocationId}
          onEhlSiteSelect={handleEhlSiteSelect}
          showMajorTouristPlaces={showMajorTouristPlaces}
          showTouristLandmark={showTouristLandmark}
          showTouristHistoricArea={showTouristHistoricArea}
          showTouristMuseum={showTouristMuseum}
          showTouristParkGarden={showTouristParkGarden}
          showTouristNaturalLandscape={showTouristNaturalLandscape}
          showTouristCoastalDestination={showTouristCoastalDestination}
          showTouristMountainDestination={showTouristMountainDestination}
          selectedTouristPlaceId={selectedTouristPlaceId}
          onTouristPlaceSelect={handleTouristPlaceSelect}
          showEuropeanMountainPlaces={showEuropeanMountainPlaces}
          mountainCategoryFilters={{
            ski_resort: showMountainSkiResorts,
            mountain_destination: showMountainDestinations,
            iconic_peak: showMountainIconicPeaks,
            mountain_range: showMountainRanges,
          }}
          selectedMountainPlaceId={selectedMountainPlaceId}
          onMountainPlaceSelect={handleMountainPlaceSelect}
          showMajorCivilEngineeringWorks={showMajorCivilEngineeringWorks}
          civilEngineeringCategoryFilters={{
            bridge: showCivilEngineeringBridge,
            viaduct: showCivilEngineeringViaduct,
            tunnel: showCivilEngineeringTunnel,
            dam: showCivilEngineeringDam,
            canal_lock: showCivilEngineeringCanalLock,
          }}
          selectedCivilEngineeringWorkId={selectedCivilEngineeringWorkId}
          onCivilEngineeringWorkSelect={handleCivilEngineeringWorkSelect}
          showMajorEuropeanAirports={showMajorEuropeanAirports}
          selectedAirportId={selectedAirportId}
          onAirportSelect={handleAirportSelect}
          showEurostarStations={showEurostarStations}
          showEurostarRoutes={showEurostarRoutes}
          selectedEurostarStationId={selectedEurostarStationId}
          highlightedEurostarRouteIds={highlightedEurostarRouteIds}
          onEurostarStationSelect={handleEurostarStationSelect}
          showSchengenExternalBorderCrossings={showSchengenExternalBorderCrossings}
          showSchengenTemporaryInternalControls={
            showSchengenTemporaryInternalControls
          }
          showBorderCrossingRoad={showBorderCrossingRoad}
          showBorderCrossingRail={showBorderCrossingRail}
          showBorderCrossingAir={showBorderCrossingAir}
          showBorderCrossingSea={showBorderCrossingSea}
          selectedBorderCrossingId={selectedBorderCrossingId}
          onBorderCrossingSelect={handleBorderCrossingSelect}
          temporaryBorderControls={temporaryBorderControls}
          selectedTemporaryControlId={selectedTemporaryControlId}
          onTemporaryControlSelect={handleTemporaryControlSelect}
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
              clearInstitutionSelection();
              clearUnescoSelection();
              clearEhlSelection();
              clearTouristPlaceSelection();
              clearAirportSelection();
              clearEurostarSelection();
              clearBorderSelections();
              clearTemporaryPlace();
            }
          }}
          onEffisBurnedAreaLoadingChange={setEffisBurnedAreaLoading}
          effisSnapshotsByIncidentId={effisSnapshotsByIncidentId}
          selectedWildfireId={selectedWildfireId}
          normalizedAlerts={activityFilteredAlerts}
          showOfficialWeatherWarnings={showOfficialWeatherWarnings}
          weatherHazardFilters={{
            heavyRain: showWeatherHeavyRain,
            flood: showWeatherFlood,
            strongWind: showWeatherStrongWind,
            thunderstorm: showWeatherThunderstorm,
            hail: showWeatherHail,
            snowIce: showWeatherSnowIce,
            coastal: showWeatherCoastal,
            other: showWeatherOther,
          }}
          showMajorFloodAlerts={showMajorFloodAlerts}
          showMajorStorms={showMajorStorms}
          showRecentEarthquakes={showRecentEarthquakes}
          earthquakeMagnitudeFilters={{
            minor: showEarthquakeMinor,
            moderate: showEarthquakeModerate,
            strong: showEarthquakeStrong,
            major: showEarthquakeMajor,
          }}
          showMajorVolcanicActivity={showMajorVolcanicActivity}
          volcanoActivityFilters={{
            unrest: showVolcanoUnrest,
            eruption: showVolcanoEruption,
            ashEmission: showVolcanoAshEmission,
          }}
          showLandslideLikelihood={showLandslideLikelihood}
          landslideLikelihoodFilters={{
            moderate: showLandslideLikelihoodModerate,
            high: showLandslideLikelihoodHigh,
          }}
          landslideNowcastStatus={landslideNowcastStatus}
          showMappedLandslideEvents={showMappedLandslideEvents}
          showMajorIndustrialIncidents={showMajorIndustrialIncidents}
          industrialIncidentFilters={{
            industrial: showIndustrialAccidents,
            chemical: showChemicalAccidents,
            explosion: showIndustrialExplosions,
            technical: showOtherTechnicalAccidents,
          }}
          showLiveTrafficFlow={showLiveTrafficFlow}
          trafficParentLayers={trafficParentLayers}
          trafficFilters={trafficFilters}
          trafficTimeMode={trafficTimeMode}
          trafficStatus={trafficStatus}
          onTrafficAlertsChange={handleTrafficAlertsChange}
          selectedAlertId={selectedAlertId}
          onAlertSelect={handleAlertSelect}
          onSatelliteObservationSelect={handleSatelliteObservationSelect}
          showObservedFloodExtent={showObservedFloodExtent}
          copernicusFloodStatus={copernicusFloodStatus}
          showWildfireWind={showWildfireWind && showWildfires}
          wildfireWinds={wildfireWinds}
          locale={locale}
          firmsSnapshotsByIncidentId={firmsSnapshotsByIncidentId}
          firmsHistorySnapshotsByIncidentId={firmsHistorySnapshotsByIncidentId}
          onEffisBurnedAreasAvailabilityChange={(unavailable) => {
            if (unavailable) {
              effisServiceFailedRef.current = true;
              setEffisUnavailable(true);
            }
          }}
          focusRequest={focusRequest}
          temporaryMarker={
            temporaryPlace
              ? {
                  longitude: temporaryPlace.longitude,
                  latitude: temporaryPlace.latitude,
                }
              : null
          }
          focusGeometryRef={focusGeometryRef}
          mapCommandsRef={mapCommandsRef}
          baseMode={baseMode}
          dimensionMode={dimensionMode}
          onCameraChange={handleCameraChange}
          onTerrainReadyChange={setTerrainReady}
          userLocation={userLocation}
          focusUserLocationRef={focusUserLocationRef}
          onUserMapGesture={() => {
            if (
              locationStatusRef.current === "following" ||
              locationStatusRef.current === "requesting"
            ) {
              setLocationStatus("passive");
            }
          }}
          routePlannerActive={routePlannerOpen}
          routePlannerRoutes={routePlannerRoutes}
          routePlannerSelectedId={routePlannerSelectedId}
          routePlannerPoints={routePlannerMapPoints}
          transitJourney={selectedTransitJourney}
          transitPoints={transitMapPoints}
          routePlannerPickMode={routePlannerPickTarget != null}
          onRoutePlannerMapPick={async (longitude, latitude) => {
            let name: string | null = null;
            let countryCode: string | null = null;
            try {
              const response = await fetch(
                `/api/search/reverse?lat=${latitude}&lon=${longitude}&lang=${locale}`,
              );
              if (response.ok) {
                const payload = (await response.json()) as {
                  result?: {
                    title?: string;
                    countryCode?: string;
                  } | null;
                };
                name = payload.result?.title ?? null;
                countryCode = payload.result?.countryCode ?? null;
              }
            } catch {
              // ignore reverse failures
            }
            setRoutePlannerMapPick({
              latitude,
              longitude,
              name,
              countryCode,
            });
          }}
          onRoutePlannerContextMenu={(longitude, latitude) => {
            setRouteContextMenu({
              longitude,
              latitude,
              x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
              y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
            });
          }}
          onRoutePlannerAlternativeClick={(routeId) => {
            setRoutePlannerSelectedId(routeId);
          }}
        />
        <MapControlDock
          t={t}
          commandsRef={mapCommandsRef}
          baseMode={baseMode}
          dimensionMode={dimensionMode}
          pitch={mapPitch}
          bearing={mapBearing}
          terrainReady={terrainReady}
          onBaseModeChange={(mode) => {
            setBaseMode(mode);
            writeMapBaseMode(mode);
          }}
          onDimensionModeChange={(mode) => {
            setDimensionMode(mode);
            writeMapDimensionMode(mode);
          }}
          locationStatus={locationStatus}
          locationAccuracyMeters={userLocation?.accuracyMeters ?? null}
          consentOpen={locationConsentOpen}
          infoOpen={locationInfoOpen}
          locationError={locationError}
          onLocationButtonClick={() => {
            void handleLocationButtonClick();
          }}
          onAllowLocation={startUserLocationWatch}
          onDismissConsent={() => {
            markLocationPromptSeen();
            setLocationConsentOpen(false);
          }}
          onStopLocation={stopUserLocation}
          onDismissError={() => setLocationError(null)}
          onCloseInfo={() => setLocationInfoOpen(false)}
        />
        <MapLegend
          locale={locale}
          highlight={legendHighlight}
          collapsed={legendCollapsed}
          onCollapsedChange={setLegendCollapsed}
          preferences={legendPreferences}
          onTogglePreference={handleLegendPreferenceToggle}
          onResetLayers={handleLegendLayersReset}
          disabledPreferences={{
            officialWeatherWarnings:
              alertConnectorStatus.meteoalarm === "misconfigured",
          }}
          preferenceStatusLabels={{
            officialWeatherWarnings:
              alertConnectorStatus.meteoalarm === "misconfigured"
                ? t.alertPanel.configurationRequired
                : alertConnectorStatus.meteoalarm === "unavailable"
                  ? t.alertPanel.connectorUnavailable
                  : alertConnectorStatus.meteoalarm === "operational"
                    ? activeMeteoalarmCount
                      ? t.alertPanel.connectorOperational
                      : t.alertPanel.noActiveEventsEurope
                    : t.alertPanel.noRecentData,
            majorFloodAlerts:
              alertConnectorStatus.gdacs === "unavailable"
                ? t.alertPanel.connectorUnavailable
                : alertConnectorStatus.gdacs === "operational"
                  ? activeGdacsFloodCount
                    ? t.alertPanel.connectorOperational
                    : t.alertPanel.noActiveEventsEurope
                  : t.alertPanel.noRecentData,
            observedFloodExtent:
              copernicusFloodStatus?.connectorStatus === "unavailable"
                ? t.alertPanel.connectorUnavailable
                : copernicusFloodStatus?.connectorStatus === "delayed"
                  ? t.alertPanel.connectorDelayed
                  : copernicusFloodStatus?.available
                    ? t.alertPanel.connectorOperational
                    : t.alertPanel.noRecentData,
            recentEarthquakes:
              alertConnectorStatus.usgs === "unavailable" &&
              alertConnectorStatus.emsc === "unavailable"
                ? t.alertPanel.connectorUnavailable
                : activityFilteredAlerts.some(
                      (alert) => alert.category === "earthquake",
                    )
                  ? t.alertPanel.connectorOperational
                  : t.alertPanel.providerNoEvents,
            majorVolcanicActivity:
              alertConnectorStatus["gdacs-geological"] === "unavailable"
                ? t.alertPanel.connectorUnavailable
                : activityFilteredAlerts.some(
                      (alert) => alert.category === "volcano",
                    )
                  ? t.alertPanel.connectorOperational
                  : t.alertPanel.providerNoEvents,
            landslideLikelihood:
              alertConnectorStatus["nasa-lhasa"] === "unavailable"
                ? t.alertPanel.connectorUnavailable
                : alertConnectorStatus["nasa-lhasa"] === "delayed"
                  ? t.alertPanel.connectorDelayed
                  : alertConnectorStatus["nasa-lhasa"] === "operational"
                    ? t.alertPanel.connectorOperational
                    : t.alertPanel.noRecentData,
            mappedLandslideEvents:
              alertConnectorStatus["copernicus-emergency-mapping"] === "unavailable"
                ? t.alertPanel.connectorUnavailable
                : activityFilteredAlerts.some(
                      (alert) => alert.category === "landslide",
                    )
                  ? t.alertPanel.connectorOperational
                  : t.alertPanel.providerNoEvents,
            majorIndustrialIncidents:
              alertConnectorStatus["copernicus-emergency-mapping"] === "unavailable"
                ? t.alertPanel.connectorUnavailable
                : activityFilteredAlerts.some(
                      (alert) => alert.category === "industrial_incident",
                    )
                  ? t.alertPanel.connectorOperational
                  : t.alertPanel.providerNoEvents,
            liveTrafficFlow:
              trafficStatus?.connectorStatus === "misconfigured"
                ? t.alertPanel.configurationRequired
                : trafficStatus?.connectorStatus === "unavailable"
                  ? t.alertPanel.connectorUnavailable
                  : t.alertPanel.connectorOperational,
            roadTrafficIncidents:
              trafficStatus?.connectorStatus === "misconfigured"
                ? t.alertPanel.configurationRequired
                : trafficStatus?.connectorStatus === "unavailable"
                  ? t.alertPanel.connectorUnavailable
                  : activityFilteredAlerts.some(
                        (alert) => alert.category === "road_traffic",
                      )
                    ? t.alertPanel.connectorOperational
                    : t.alertPanel.providerNoEvents,
            roadClosuresRestrictions:
              trafficStatus?.connectorStatus === "misconfigured"
                ? t.alertPanel.configurationRequired
                : trafficStatus?.connectorStatus === "unavailable"
                  ? t.alertPanel.connectorUnavailable
                  : t.alertPanel.connectorOperational,
            roadworks:
              trafficStatus?.connectorStatus === "misconfigured"
                ? t.alertPanel.configurationRequired
                : trafficStatus?.connectorStatus === "unavailable"
                  ? t.alertPanel.connectorUnavailable
                  : t.alertPanel.connectorOperational,
          }}
        />

        {(showOfficialWeatherWarnings ||
          showMajorFloodAlerts ||
          showMajorStorms ||
          showObservedFloodExtent ||
          showRecentEarthquakes ||
          showMajorVolcanicActivity ||
          showLandslideLikelihood ||
          showMappedLandslideEvents ||
          showMajorIndustrialIncidents ||
          showLiveTrafficFlow ||
          showRoadTrafficIncidents ||
          showRoadClosuresRestrictions ||
          showRoadworks) && (
          <AlertStatusPanel
            locale={locale}
            mode={alertActivityMode}
            onModeChange={setAlertActivityMode}
            statuses={alertConnectorStatus}
            gdacsActiveCount={activeGdacsFloodCount}
            meteoalarmActiveCount={activeMeteoalarmCount}
            copernicus={
              showOfficialWeatherWarnings ||
              showMajorFloodAlerts ||
              showMajorStorms ||
              showObservedFloodExtent
                ? copernicusFloodStatus
                : null
            }
            demoMode={alertsDemoMode}
            showGeneralModes={
              showOfficialWeatherWarnings ||
              showMajorFloodAlerts ||
              showMajorStorms ||
              showObservedFloodExtent
            }
            earthquakeEnabled={showRecentEarthquakes}
            earthquakeMode={earthquakeTimeMode}
            onEarthquakeModeChange={setEarthquakeTimeMode}
            volcanoEnabled={showMajorVolcanicActivity}
            volcanoMode={volcanoTimeMode}
            onVolcanoModeChange={setVolcanoTimeMode}
            cemsMode={cemsTimeMode}
            onCemsModeChange={setCemsTimeMode}
            showCems={
              showMappedLandslideEvents || showMajorIndustrialIncidents
            }
            showLhasa={showLandslideLikelihood}
            lhasaValidAt={landslideNowcastStatus?.validAt ?? null}
            trafficEnabled={
              showLiveTrafficFlow ||
              showRoadTrafficIncidents ||
              showRoadClosuresRestrictions ||
              showRoadworks
            }
            trafficMode={trafficTimeMode}
            onTrafficModeChange={setTrafficTimeMode}
            trafficCounts={trafficCounts}
          />
        )}

        {effisBurnedAreaLoading && (
          <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/90 px-3 py-1.5 text-[11px] text-slate-200 shadow-xl backdrop-blur-md">
            {t.incidents.satelliteLookupLoading}
          </div>
        )}

        {(firmsLoadingOverlay || firmsUnavailableMessage) && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-slate-950/90 px-4 py-2.5 text-center text-xs text-slate-200 shadow-xl backdrop-blur-md">
            {firmsLoadingOverlay
              ? t.incidents.firmsLoading
              : t.incidents.firmsTemporarilyUnavailable}
          </div>
        )}

        {(firmsHistoryLoadingOverlay || firmsHistoryUnavailableMessage) && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/10 bg-slate-950/90 px-4 py-2.5 text-center text-xs text-slate-200 shadow-xl backdrop-blur-md">
            {firmsHistoryLoadingOverlay
              ? t.incidents.firmsHistoryLoading
              : t.incidents.firmsHistoryUnavailable}
          </div>
        )}

        {showEffisUnavailableBanner && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md border border-white/10 bg-slate-950/90 px-4 py-2 text-center text-xs text-slate-200 shadow-xl backdrop-blur-md">
            {t.incidents.effisTemporarilyUnavailable}
          </div>
        )}

        {showEffisUnavailableNasaShown && !showEffisUnavailableBanner && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md border border-white/10 bg-slate-950/70 px-3 py-1.5 text-center text-[10px] text-slate-300 shadow-lg backdrop-blur-md">
            {t.incidents.effisUnavailableNasaShown}
          </div>
        )}

        {showObservedFloodExtent && copernicusFloodStatus && (
          <div className="hidden">
            <p className="font-medium text-cyan-100">
              {t.alertPanel.observationNotForecast}
            </p>
            <p className="mt-1 text-slate-400">
              {t.alertPanel.acquisitionTime}:{" "}
              {copernicusFloodStatus.acquisitionTime
                ? new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(copernicusFloodStatus.acquisitionTime))
                : t.alertPanel.unavailable}
              {" · "}
              {copernicusFloodStatus.connectorStatus === "operational"
                ? t.alertPanel.connectorOperational
                : copernicusFloodStatus.connectorStatus === "delayed"
                  ? t.alertPanel.connectorDelayed
                  : t.alertPanel.connectorUnavailable}
            </p>
          </div>
        )}

        {routePlannerOpen ? (
          <RoutePlannerPanel
            locale={locale}
            open={routePlannerOpen}
            onClose={() => {
              setRoutePlannerOpen(false);
              setRoutePlannerRoutes([]);
              setRoutePlannerSelectedId(null);
              setTransitJourneys([]);
              setTransitSelectedId(null);
              setRoutePlannerPointsState(EMPTY_ROUTE_PLANNER_POINTS);
              setRoutePlannerPickTarget(null);
              setRoutePlannerMapPick(null);
              setRoutePlannerFocusOrigin(false);
            }}
            points={routePlannerPointsState}
            onPointsChange={handleRoutePlannerPointsChange}
            pickTarget={routePlannerPickTarget}
            onPickTargetChange={setRoutePlannerPickTarget}
            mapPickPoint={routePlannerMapPick}
            onClearMapPick={() => setRoutePlannerMapPick(null)}
            onRoutesChange={handleRoutePlannerRoutesChange}
            onTransitChange={handleTransitChange}
            onSelectIncident={(alertId) => {
              handleAlertSelect(alertId);
            }}
            onFocusPoint={(longitude, latitude, zoom = 13) => {
              requestFocus({ kind: "point", longitude, latitude, zoom });
            }}
            onFocusRoute={(coordinates) => {
              if (coordinates.length < 2) return;
              let west = Infinity;
              let south = Infinity;
              let east = -Infinity;
              let north = -Infinity;
              for (const [lon, lat] of coordinates) {
                west = Math.min(west, lon);
                south = Math.min(south, lat);
                east = Math.max(east, lon);
                north = Math.max(north, lat);
              }
              const isMobile =
                typeof window !== "undefined" && window.innerWidth < 768;
              requestFocus({
                kind: "bounds",
                west,
                south,
                east,
                north,
                padding: isMobile
                  ? { top: 72, right: 48, bottom: 320, left: 48 }
                  : { top: 80, right: 80, bottom: 80, left: 420 },
                maxZoom: 14,
              });
            }}
            userLocation={
              userLocation
                ? {
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                  }
                : null
            }
            focusOriginOnOpen={routePlannerFocusOrigin}
          />
        ) : null}

        {routeContextMenu ? (
          <div
            className="pointer-events-auto absolute z-[50] w-56 rounded-xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl"
            style={{ left: 16, bottom: 96 }}
            role="menu"
          >
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-slate-100 hover:bg-white/10"
              onClick={() => {
                openRoutePlanner({
                  origin: {
                    latitude: routeContextMenu.latitude,
                    longitude: routeContextMenu.longitude,
                    name: null,
                    countryCode: null,
                  },
                });
                setRouteContextMenu(null);
              }}
            >
              {t.routePlanner.routeFromHere}
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-slate-100 hover:bg-white/10"
              onClick={() => {
                openRoutePlanner({
                  destination: {
                    latitude: routeContextMenu.latitude,
                    longitude: routeContextMenu.longitude,
                    name: null,
                    countryCode: null,
                  },
                });
                setRouteContextMenu(null);
              }}
            >
              {t.routePlanner.routeToHere}
            </button>
            <button
              type="button"
              className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-slate-400 hover:bg-white/10"
              onClick={() => setRouteContextMenu(null)}
            >
              {t.routePlanner.close}
            </button>
          </div>
        ) : null}

        {selectedCapitalId &&
          !routePlannerOpen &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedTouristPlaceId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <CapitalCityPanel
              capitalId={selectedCapitalId}
              locale={locale}
              onClose={() => setSelectedCapitalId(null)}
              onOpenCountry={(countryCode) => {
                setSelectedCapitalId(null);
                handleCountrySelect(countryCode);
              }}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedInstitutionId &&
          !selectedCapitalId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedTouristPlaceId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <EuInstitutionPanel
              institutionId={selectedInstitutionId}
              locale={locale}
              activeSiteId={selectedInstitutionSiteId}
              onClose={clearInstitutionSelection}
              onFocusSite={(siteId) => handleInstitutionSiteSelect(siteId)}
              onOpenInstitution={(institutionId, siteId) =>
                handleInstitutionSelect(institutionId, siteId)
              }
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedUnescoSiteId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedEhlSiteId &&
          !selectedTouristPlaceId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <UnescoSitePanel
              siteId={selectedUnescoSiteId}
              locale={locale}
              onClose={clearUnescoSelection}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedEhlSiteId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedTouristPlaceId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <EuropeanHeritageLabelPanel
              siteId={selectedEhlSiteId}
              locationId={selectedEhlLocationId}
              locale={locale}
              onClose={clearEhlSelection}
              onFocusLocation={(locationId) => {
                handleEhlSiteSelect(selectedEhlSiteId, locationId);
              }}
              onOpenCountry={(countryCode) => {
                clearEhlSelection();
                handleCountrySelect(countryCode);
              }}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedTouristPlaceId &&
          !selectedMountainPlaceId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <TouristPlacePanel
              placeId={selectedTouristPlaceId}
              locale={locale}
              onClose={clearTouristPlaceSelection}
              onOpenUnescoSite={(unescoSiteId) => {
                clearTouristPlaceSelection();
                handleUnescoSiteSelect(unescoSiteId);
              }}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedMountainPlaceId &&
          !selectedTouristPlaceId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <MountainPlacePanel
              placeId={selectedMountainPlaceId}
              locale={locale}
              onClose={clearMountainPlaceSelection}
              onOpenTouristPlace={handleTouristPlaceSelect}
              onOpenUnescoSite={handleUnescoSiteSelect}
              onOpenCountry={handleCountrySelect}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedCivilEngineeringWorkId &&
          !selectedTouristPlaceId &&
          !selectedMountainPlaceId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <CivilEngineeringWorkPanel
              workId={selectedCivilEngineeringWorkId}
              locale={locale}
              onClose={clearCivilEngineeringWorkSelection}
              onOpenCountry={(countryCode) => {
                clearCivilEngineeringWorkSelection();
                handleCountrySelect(countryCode);
              }}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedAirportId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedTouristPlaceId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <AirportPanel
              airportId={selectedAirportId}
              locale={locale}
              onClose={clearAirportSelection}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedEurostarStationId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedTouristPlaceId &&
          !selectedAirportId &&
          !selectedBorderCrossingId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <EurostarStationPanel
              stationId={selectedEurostarStationId}
              locale={locale}
              onClose={clearEurostarSelection}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedBorderCrossingId &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedTouristPlaceId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedTemporaryControlId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <BorderCrossingPointPanel
              crossingId={selectedBorderCrossingId}
              locale={locale}
              onClose={clearBorderCrossingSelection}
              onRouteToPlace={handleRouteToPlace}
            />
          )}

        {selectedTemporaryControl &&
          !selectedCapitalId &&
          !selectedInstitutionId &&
          !selectedUnescoSiteId &&
          !selectedEhlSiteId &&
          !selectedTouristPlaceId &&
          !selectedAirportId &&
          !selectedEurostarStationId &&
          !selectedBorderCrossingId &&
          !selectedWildfire &&
          !selectedEffisBurnedArea &&
          !selectedCountryCode && (
            <TemporaryBorderControlPanel
              control={selectedTemporaryControl}
              locale={locale}
              cached={temporaryControlsCached}
              staleOver24h={temporaryControlsStaleOver24h}
              onClose={clearTemporaryControlSelection}
            />
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
            snapshot={
              selectedWildfireId
                ? effisSnapshotsByIncidentId[selectedWildfireId] ?? null
                : null
            }
            firmsSnapshot={
              selectedWildfireId
                ? firmsSnapshotsByIncidentId[selectedWildfireId] ?? null
                : null
            }
            firmsSnapshotStatus={firmsSnapshotStatus}
            firmsHistorySnapshot={
              selectedWildfireId
                ? firmsHistorySnapshotsByIncidentId[selectedWildfireId] ?? null
                : null
            }
            wind={
              selectedWildfire
                ? wildfireWinds.find(
                    (wind) =>
                      Math.abs(wind.latitude - selectedWildfire.latitude) < 0.05 &&
                      Math.abs(wind.longitude - selectedWildfire.longitude) < 0.05,
                  ) ?? null
                : null
            }
            onClose={() => setSelectedWildfireId(null)}
            onFocusGeometry={(geometry) => {
              focusGeometryRef.current?.(geometry);
            }}
          />
        )}

        {selectedAlert &&
        (selectedAlert.category === "landslide" ||
          selectedAlert.category === "industrial_incident") ? (
          <CopernicusActivationPanel
            alert={selectedAlert}
            locale={locale}
            onClose={() => setSelectedAlertId(null)}
          />
        ) : selectedAlert?.category === "road_traffic" ? (
          <TrafficIncidentPanel
            alert={selectedAlert}
            locale={locale}
            onClose={() => setSelectedAlertId(null)}
          />
        ) : selectedAlert ? (
          <AlertDetailsPanel
            alert={selectedAlert}
            locale={locale}
            connectorStatus={alertConnectorStatus[selectedAlert.source]}
            onClose={() => setSelectedAlertId(null)}
          />
        ) : null}

        {selectedEffisBurnedArea && (
          <EffisBurnedAreaPanel
            burnedArea={selectedEffisBurnedArea}
            locale={locale}
            onClose={() => setSelectedEffisBurnedArea(null)}
          />
        )}

        {temporaryPlace ? (
          <TemporaryPlaceCard
            place={temporaryPlace}
            t={t}
            onClose={clearTemporaryPlace}
          />
        ) : null}
      </div>
    </div>
  );
}
