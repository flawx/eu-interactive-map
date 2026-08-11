export type MapLayerPreferences = {
  euroArea: boolean;
  euOutsideEuroArea: boolean;
  schengenOutsideEu: boolean;
  euCandidates: boolean;
  euCapitals: boolean;
  euMainInstitutions: boolean;
  euBodiesAgencies: boolean;
  internationalOrganisations: boolean;
  europeanCapitalsOfCulture: boolean;
  euProjectsTransport: boolean;
  euProjectsSportCulture: boolean;
  euProjectsProtection: boolean;
  euProjectsPublicSocial: boolean;
  euProjectsResearch: boolean;
  euProjectsEnvironment: boolean;
  europeanEconomicArea: boolean;
  majorBusinessDistricts: boolean;
  majorFreightPorts: boolean;
  unescoWorldHeritage: boolean;
  unescoCultural: boolean;
  unescoNatural: boolean;
  unescoMixed: boolean;
  europeanHeritageLabel: boolean;
  majorTouristPlaces: boolean;
  touristLandmark: boolean;
  touristHistoricArea: boolean;
  touristMuseum: boolean;
  touristParkGarden: boolean;
  touristNaturalLandscape: boolean;
  touristCoastalDestination: boolean;
  touristMountainDestination: boolean;
  europeanMountainPlaces: boolean;
  mountainSkiResort: boolean;
  mountainDestination: boolean;
  mountainIconicPeak: boolean;
  mountainRange: boolean;
  majorCivilEngineeringWorks: boolean;
  civilEngineeringBridge: boolean;
  civilEngineeringViaduct: boolean;
  civilEngineeringTunnel: boolean;
  civilEngineeringDam: boolean;
  civilEngineeringCanalLock: boolean;
  majorEuropeanAirports: boolean;
  eurostarStations: boolean;
  eurostarRoutes: boolean;
  majorWildfires: boolean;
  satelliteActiveFires: boolean;
  recentSatelliteHistory: boolean;
  wildfireWind: boolean;
  officialWeatherWarnings: boolean;
  weatherHeavyRain: boolean;
  weatherFlood: boolean;
  weatherStrongWind: boolean;
  weatherThunderstorm: boolean;
  weatherHail: boolean;
  weatherSnowIce: boolean;
  weatherCoastal: boolean;
  weatherOther: boolean;
  majorFloodAlerts: boolean;
  observedFloodExtent: boolean;
  majorStorms: boolean;
  recentEarthquakes: boolean;
  earthquakeMinor: boolean;
  earthquakeModerate: boolean;
  earthquakeStrong: boolean;
  earthquakeMajor: boolean;
  majorVolcanicActivity: boolean;
  volcanoUnrest: boolean;
  volcanoEruption: boolean;
  volcanoAshEmission: boolean;
  landslideLikelihood: boolean;
  landslideLikelihoodModerate: boolean;
  landslideLikelihoodHigh: boolean;
  mappedLandslideEvents: boolean;
  majorIndustrialIncidents: boolean;
  industrialAccidents: boolean;
  chemicalAccidents: boolean;
  industrialExplosions: boolean;
  otherTechnicalAccidents: boolean;
  liveTrafficFlow: boolean;
  roadTrafficIncidents: boolean;
  trafficAccidents: boolean;
  trafficMajorJams: boolean;
  trafficBrokenVehicles: boolean;
  trafficHazards: boolean;
  trafficRoadWeather: boolean;
  trafficOtherIncidents: boolean;
  roadClosuresRestrictions: boolean;
  trafficRoadClosures: boolean;
  trafficLaneClosures: boolean;
  trafficRestrictions: boolean;
  roadworks: boolean;
  trafficActiveRoadworks: boolean;
  trafficPlannedRoadworks: boolean;
  schengenExternalBorderCrossings: boolean;
  schengenTemporaryInternalControls: boolean;
  borderCrossingRoad: boolean;
  borderCrossingRail: boolean;
  borderCrossingAir: boolean;
  borderCrossingSea: boolean;
  wifi4eu: boolean;
  touristInformationOffices: boolean;
  diplomaticMissions: boolean;
  visitorSafetyAssistance: boolean;
  natura2000: boolean;
  europeanBathingWaters: boolean;
  majorBeachesSeasideResorts: boolean;
  majorHikingRoutes: boolean;
  majorCyclingRoutes: boolean;
  majorRunningRoutes: boolean;
};

/** Shared default layer state — first visit and Reset Layers must match. */
export function createDefaultLayerState(): MapLayerPreferences {
  return { ...DEFAULT_MAP_LAYER_PREFERENCES };
}

export const DEFAULT_MAP_LAYER_PREFERENCES: MapLayerPreferences = {
  euroArea: true,
  euOutsideEuroArea: true,
  schengenOutsideEu: false,
  euCandidates: false,
  euCapitals: true,
  euMainInstitutions: true,
  euBodiesAgencies: false,
  internationalOrganisations: false,
  europeanCapitalsOfCulture: false,
  euProjectsTransport: false,
  euProjectsSportCulture: false,
  euProjectsProtection: false,
  euProjectsPublicSocial: false,
  euProjectsResearch: false,
  euProjectsEnvironment: false,
  europeanEconomicArea: false,
  majorBusinessDistricts: false,
  majorFreightPorts: false,
  unescoWorldHeritage: false,
  unescoCultural: true,
  unescoNatural: true,
  unescoMixed: true,
  europeanHeritageLabel: true,
  majorTouristPlaces: true,
  touristLandmark: true,
  touristHistoricArea: true,
  touristMuseum: true,
  touristParkGarden: true,
  touristNaturalLandscape: true,
  touristCoastalDestination: true,
  touristMountainDestination: true,
  europeanMountainPlaces: false,
  mountainSkiResort: true,
  mountainDestination: true,
  mountainIconicPeak: true,
  mountainRange: true,
  majorCivilEngineeringWorks: false,
  civilEngineeringBridge: true,
  civilEngineeringViaduct: true,
  civilEngineeringTunnel: true,
  civilEngineeringDam: true,
  civilEngineeringCanalLock: true,
  majorEuropeanAirports: true,
  eurostarStations: false,
  eurostarRoutes: false,
  majorWildfires: false,
  satelliteActiveFires: false,
  recentSatelliteHistory: false,
  wildfireWind: false,
  officialWeatherWarnings: false,
  weatherHeavyRain: true,
  weatherFlood: true,
  weatherStrongWind: true,
  weatherThunderstorm: true,
  weatherHail: true,
  weatherSnowIce: true,
  weatherCoastal: true,
  weatherOther: true,
  majorFloodAlerts: false,
  observedFloodExtent: false,
  majorStorms: false,
  recentEarthquakes: false,
  earthquakeMinor: false,
  earthquakeModerate: true,
  earthquakeStrong: true,
  earthquakeMajor: true,
  majorVolcanicActivity: false,
  volcanoUnrest: true,
  volcanoEruption: true,
  volcanoAshEmission: true,
  landslideLikelihood: false,
  landslideLikelihoodModerate: true,
  landslideLikelihoodHigh: true,
  mappedLandslideEvents: false,
  majorIndustrialIncidents: false,
  industrialAccidents: true,
  chemicalAccidents: true,
  industrialExplosions: true,
  otherTechnicalAccidents: true,
  liveTrafficFlow: true,
  roadTrafficIncidents: true,
  trafficAccidents: true,
  trafficMajorJams: true,
  trafficBrokenVehicles: true,
  trafficHazards: true,
  trafficRoadWeather: true,
  trafficOtherIncidents: true,
  roadClosuresRestrictions: true,
  trafficRoadClosures: true,
  trafficLaneClosures: true,
  trafficRestrictions: true,
  roadworks: true,
  trafficActiveRoadworks: true,
  trafficPlannedRoadworks: true,
  schengenExternalBorderCrossings: false,
  schengenTemporaryInternalControls: false,
  borderCrossingRoad: true,
  borderCrossingRail: true,
  borderCrossingAir: true,
  borderCrossingSea: true,
  wifi4eu: false,
  touristInformationOffices: false,
  diplomaticMissions: false,
  visitorSafetyAssistance: false,
  natura2000: false,
  europeanBathingWaters: false,
  majorBeachesSeasideResorts: false,
  majorHikingRoutes: false,
  majorCyclingRoutes: false,
  majorRunningRoutes: false,
};

const LAYER_PREFS_KEY = "eu-map-layer-preferences-v8";
const LEGACY_LAYER_PREFS_KEY_V7 = "eu-map-layer-preferences-v7";
const LEGACY_LAYER_PREFS_KEY_V6 = "eu-map-layer-preferences-v6";
const LEGACY_LAYER_PREFS_KEY_V5 = "eu-map-layer-preferences-v5";
const LEGACY_LAYER_PREFS_KEY_V4 = "eu-map-layer-preferences-v4";
const LEGACY_LAYER_PREFS_KEY_V3 = "eu-map-layer-preferences-v3";
const LEGACY_LAYER_PREFS_KEY_V2 = "eu-map-layer-preferences-v2";
const LEGACY_LAYER_PREFS_KEY = "eu-map-layer-preferences-v1";
export const MAP_LAYER_PREFERENCES_SCHEMA_VERSION = 8;
const LEGEND_COLLAPSED_KEY = "eu-map-legend-collapsed-v1";

const LAYER_KEYS = [
  "euroArea",
  "euOutsideEuroArea",
  "schengenOutsideEu",
  "euCandidates",
  "euCapitals",
  "euMainInstitutions",
  "euBodiesAgencies",
  "internationalOrganisations",
  "europeanCapitalsOfCulture",
  "euProjectsTransport",
  "euProjectsSportCulture",
  "euProjectsProtection",
  "euProjectsPublicSocial",
  "euProjectsResearch",
  "euProjectsEnvironment",
  "europeanEconomicArea",
  "majorBusinessDistricts",
  "majorFreightPorts",
  "unescoWorldHeritage",
  "unescoCultural",
  "unescoNatural",
  "unescoMixed",
  "europeanHeritageLabel",
  "majorTouristPlaces",
  "touristLandmark",
  "touristHistoricArea",
  "touristMuseum",
  "touristParkGarden",
  "touristNaturalLandscape",
  "touristCoastalDestination",
  "touristMountainDestination",
  "europeanMountainPlaces",
  "mountainSkiResort",
  "mountainDestination",
  "mountainIconicPeak",
  "mountainRange",
  "majorCivilEngineeringWorks",
  "civilEngineeringBridge",
  "civilEngineeringViaduct",
  "civilEngineeringTunnel",
  "civilEngineeringDam",
  "civilEngineeringCanalLock",
  "majorEuropeanAirports",
  "eurostarStations",
  "eurostarRoutes",
  "majorWildfires",
  "satelliteActiveFires",
  "recentSatelliteHistory",
  "wildfireWind",
  "officialWeatherWarnings",
  "weatherHeavyRain",
  "weatherFlood",
  "weatherStrongWind",
  "weatherThunderstorm",
  "weatherHail",
  "weatherSnowIce",
  "weatherCoastal",
  "weatherOther",
  "majorFloodAlerts",
  "observedFloodExtent",
  "majorStorms",
  "recentEarthquakes",
  "earthquakeMinor",
  "earthquakeModerate",
  "earthquakeStrong",
  "earthquakeMajor",
  "majorVolcanicActivity",
  "volcanoUnrest",
  "volcanoEruption",
  "volcanoAshEmission",
  "landslideLikelihood",
  "landslideLikelihoodModerate",
  "landslideLikelihoodHigh",
  "mappedLandslideEvents",
  "majorIndustrialIncidents",
  "industrialAccidents",
  "chemicalAccidents",
  "industrialExplosions",
  "otherTechnicalAccidents",
  "liveTrafficFlow",
  "roadTrafficIncidents",
  "trafficAccidents",
  "trafficMajorJams",
  "trafficBrokenVehicles",
  "trafficHazards",
  "trafficRoadWeather",
  "trafficOtherIncidents",
  "roadClosuresRestrictions",
  "trafficRoadClosures",
  "trafficLaneClosures",
  "trafficRestrictions",
  "roadworks",
  "trafficActiveRoadworks",
  "trafficPlannedRoadworks",
  "schengenExternalBorderCrossings",
  "schengenTemporaryInternalControls",
  "borderCrossingRoad",
  "borderCrossingRail",
  "borderCrossingAir",
  "borderCrossingSea",
  "wifi4eu",
  "touristInformationOffices",
  "diplomaticMissions",
  "visitorSafetyAssistance",
  "natura2000",
  "europeanBathingWaters",
  "majorBeachesSeasideResorts",
  "majorHikingRoutes",
  "majorCyclingRoutes",
  "majorRunningRoutes",
] as const satisfies ReadonlyArray<keyof MapLayerPreferences>;

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function migrateMapLayerPreferences(
  value: unknown,
): MapLayerPreferences {
  const result = { ...DEFAULT_MAP_LAYER_PREFERENCES };
  if (!value || typeof value !== "object" || Array.isArray(value)) return result;
  const record = value as Record<string, unknown>;
  const source =
    record.preferences &&
    typeof record.preferences === "object" &&
    !Array.isArray(record.preferences)
      ? (record.preferences as Record<string, unknown>)
      : record;
  for (const key of LAYER_KEYS) {
    if (isBoolean(source[key])) result[key] = source[key];
  }
  return result;
}

export function loadMapLayerPreferences(): MapLayerPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_MAP_LAYER_PREFERENCES };
  }

  try {
    const raw =
      window.localStorage.getItem(LAYER_PREFS_KEY) ??
      window.localStorage.getItem(LEGACY_LAYER_PREFS_KEY_V7) ??
      window.localStorage.getItem(LEGACY_LAYER_PREFS_KEY_V6) ??
      window.localStorage.getItem(LEGACY_LAYER_PREFS_KEY_V5) ??
      window.localStorage.getItem(LEGACY_LAYER_PREFS_KEY_V4) ??
      window.localStorage.getItem(LEGACY_LAYER_PREFS_KEY_V3) ??
      window.localStorage.getItem(LEGACY_LAYER_PREFS_KEY_V2) ??
      window.localStorage.getItem(LEGACY_LAYER_PREFS_KEY);
    if (!raw) {
      return { ...DEFAULT_MAP_LAYER_PREFERENCES };
    }

    return migrateMapLayerPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_MAP_LAYER_PREFERENCES };
  }
}

export function saveMapLayerPreferences(
  preferences: MapLayerPreferences,
): void {
  if (typeof window === "undefined") return;

  try {
    const payload: MapLayerPreferences = {
      euroArea: Boolean(preferences.euroArea),
      euOutsideEuroArea: Boolean(preferences.euOutsideEuroArea),
      schengenOutsideEu: Boolean(preferences.schengenOutsideEu),
      euCandidates: Boolean(preferences.euCandidates),
      euCapitals: Boolean(preferences.euCapitals),
      euMainInstitutions: Boolean(preferences.euMainInstitutions),
      euBodiesAgencies: Boolean(preferences.euBodiesAgencies),
      internationalOrganisations: Boolean(preferences.internationalOrganisations),
      europeanCapitalsOfCulture: Boolean(preferences.europeanCapitalsOfCulture),
      euProjectsTransport: Boolean(preferences.euProjectsTransport),
      euProjectsSportCulture: Boolean(preferences.euProjectsSportCulture),
      euProjectsProtection: Boolean(preferences.euProjectsProtection),
      euProjectsPublicSocial: Boolean(preferences.euProjectsPublicSocial),
      euProjectsResearch: Boolean(preferences.euProjectsResearch),
      euProjectsEnvironment: Boolean(preferences.euProjectsEnvironment),
      europeanEconomicArea: Boolean(preferences.europeanEconomicArea),
      majorBusinessDistricts: Boolean(preferences.majorBusinessDistricts),
      majorFreightPorts: Boolean(preferences.majorFreightPorts),
      unescoWorldHeritage: Boolean(preferences.unescoWorldHeritage),
      unescoCultural: Boolean(preferences.unescoCultural),
      unescoNatural: Boolean(preferences.unescoNatural),
      unescoMixed: Boolean(preferences.unescoMixed),
      europeanHeritageLabel: Boolean(preferences.europeanHeritageLabel),
      majorTouristPlaces: Boolean(preferences.majorTouristPlaces),
      touristLandmark: Boolean(preferences.touristLandmark),
      touristHistoricArea: Boolean(preferences.touristHistoricArea),
      touristMuseum: Boolean(preferences.touristMuseum),
      touristParkGarden: Boolean(preferences.touristParkGarden),
      touristNaturalLandscape: Boolean(preferences.touristNaturalLandscape),
      touristCoastalDestination: Boolean(preferences.touristCoastalDestination),
      touristMountainDestination: Boolean(
        preferences.touristMountainDestination,
      ),
      europeanMountainPlaces: Boolean(preferences.europeanMountainPlaces),
      mountainSkiResort: Boolean(preferences.mountainSkiResort),
      mountainDestination: Boolean(preferences.mountainDestination),
      mountainIconicPeak: Boolean(preferences.mountainIconicPeak),
      mountainRange: Boolean(preferences.mountainRange),
      majorCivilEngineeringWorks: Boolean(preferences.majorCivilEngineeringWorks),
      civilEngineeringBridge: Boolean(preferences.civilEngineeringBridge),
      civilEngineeringViaduct: Boolean(preferences.civilEngineeringViaduct),
      civilEngineeringTunnel: Boolean(preferences.civilEngineeringTunnel),
      civilEngineeringDam: Boolean(preferences.civilEngineeringDam),
      civilEngineeringCanalLock: Boolean(
        preferences.civilEngineeringCanalLock,
      ),
      majorEuropeanAirports: Boolean(preferences.majorEuropeanAirports),
      eurostarStations: Boolean(preferences.eurostarStations),
      eurostarRoutes: Boolean(preferences.eurostarRoutes),
      majorWildfires: Boolean(preferences.majorWildfires),
      satelliteActiveFires: Boolean(preferences.satelliteActiveFires),
      recentSatelliteHistory: Boolean(preferences.recentSatelliteHistory),
      wildfireWind: Boolean(preferences.wildfireWind),
      officialWeatherWarnings: Boolean(preferences.officialWeatherWarnings),
      weatherHeavyRain: Boolean(preferences.weatherHeavyRain),
      weatherFlood: Boolean(preferences.weatherFlood),
      weatherStrongWind: Boolean(preferences.weatherStrongWind),
      weatherThunderstorm: Boolean(preferences.weatherThunderstorm),
      weatherHail: Boolean(preferences.weatherHail),
      weatherSnowIce: Boolean(preferences.weatherSnowIce),
      weatherCoastal: Boolean(preferences.weatherCoastal),
      weatherOther: Boolean(preferences.weatherOther),
      majorFloodAlerts: Boolean(preferences.majorFloodAlerts),
      observedFloodExtent: Boolean(preferences.observedFloodExtent),
      majorStorms: Boolean(preferences.majorStorms),
      recentEarthquakes: Boolean(preferences.recentEarthquakes),
      earthquakeMinor: Boolean(preferences.earthquakeMinor),
      earthquakeModerate: Boolean(preferences.earthquakeModerate),
      earthquakeStrong: Boolean(preferences.earthquakeStrong),
      earthquakeMajor: Boolean(preferences.earthquakeMajor),
      majorVolcanicActivity: Boolean(preferences.majorVolcanicActivity),
      volcanoUnrest: Boolean(preferences.volcanoUnrest),
      volcanoEruption: Boolean(preferences.volcanoEruption),
      volcanoAshEmission: Boolean(preferences.volcanoAshEmission),
      landslideLikelihood: Boolean(preferences.landslideLikelihood),
      landslideLikelihoodModerate: Boolean(preferences.landslideLikelihoodModerate),
      landslideLikelihoodHigh: Boolean(preferences.landslideLikelihoodHigh),
      mappedLandslideEvents: Boolean(preferences.mappedLandslideEvents),
      majorIndustrialIncidents: Boolean(preferences.majorIndustrialIncidents),
      industrialAccidents: Boolean(preferences.industrialAccidents),
      chemicalAccidents: Boolean(preferences.chemicalAccidents),
      industrialExplosions: Boolean(preferences.industrialExplosions),
      otherTechnicalAccidents: Boolean(preferences.otherTechnicalAccidents),
      liveTrafficFlow: Boolean(preferences.liveTrafficFlow),
      roadTrafficIncidents: Boolean(preferences.roadTrafficIncidents),
      trafficAccidents: Boolean(preferences.trafficAccidents),
      trafficMajorJams: Boolean(preferences.trafficMajorJams),
      trafficBrokenVehicles: Boolean(preferences.trafficBrokenVehicles),
      trafficHazards: Boolean(preferences.trafficHazards),
      trafficRoadWeather: Boolean(preferences.trafficRoadWeather),
      trafficOtherIncidents: Boolean(preferences.trafficOtherIncidents),
      roadClosuresRestrictions: Boolean(preferences.roadClosuresRestrictions),
      trafficRoadClosures: Boolean(preferences.trafficRoadClosures),
      trafficLaneClosures: Boolean(preferences.trafficLaneClosures),
      trafficRestrictions: Boolean(preferences.trafficRestrictions),
      roadworks: Boolean(preferences.roadworks),
      trafficActiveRoadworks: Boolean(preferences.trafficActiveRoadworks),
      trafficPlannedRoadworks: Boolean(preferences.trafficPlannedRoadworks),
      schengenExternalBorderCrossings: Boolean(
        preferences.schengenExternalBorderCrossings,
      ),
      schengenTemporaryInternalControls: Boolean(
        preferences.schengenTemporaryInternalControls,
      ),
      borderCrossingRoad: Boolean(preferences.borderCrossingRoad),
      borderCrossingRail: Boolean(preferences.borderCrossingRail),
      borderCrossingAir: Boolean(preferences.borderCrossingAir),
      borderCrossingSea: Boolean(preferences.borderCrossingSea),
      wifi4eu: Boolean(preferences.wifi4eu),
      touristInformationOffices: Boolean(preferences.touristInformationOffices),
      diplomaticMissions: Boolean(preferences.diplomaticMissions),
      visitorSafetyAssistance: Boolean(preferences.visitorSafetyAssistance),
      natura2000: Boolean(preferences.natura2000),
      europeanBathingWaters: Boolean(preferences.europeanBathingWaters),
      majorBeachesSeasideResorts: Boolean(preferences.majorBeachesSeasideResorts),
      majorHikingRoutes: Boolean(preferences.majorHikingRoutes),
      majorCyclingRoutes: Boolean(preferences.majorCyclingRoutes),
      majorRunningRoutes: Boolean(preferences.majorRunningRoutes),
    };
    window.localStorage.setItem(
      LAYER_PREFS_KEY,
      JSON.stringify({
        schemaVersion: MAP_LAYER_PREFERENCES_SCHEMA_VERSION,
        preferences: payload,
      }),
    );
  } catch {
    // private mode / quota — keep session values only
  }
}

import {
  getActiveMainLayerCount,
} from "@/lib/map/legendConfiguration";

export function countActiveMapLayers(
  preferences: MapLayerPreferences,
): number {
  return getActiveMainLayerCount(preferences);
}

/** `null` = no stored preference yet. */
export function loadLegendCollapsed(): boolean | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LEGEND_COLLAPSED_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function saveLegendCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LEGEND_COLLAPSED_KEY,
      collapsed ? "true" : "false",
    );
  } catch {
    // ignore
  }
}

export function defaultLegendCollapsedForViewport(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(max-width: 767px)").matches;
}
