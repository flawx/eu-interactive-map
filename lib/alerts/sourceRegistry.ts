import type { AlertSourceDefinition } from "@/lib/alerts/types";

export const ALERT_SOURCES = {
  meteoalarm: {
    id: "meteoalarm",
    name: "Meteoalarm / EUMETNET members",
    categories: ["weather", "flood"],
    updateIntervalMs: 5 * 60 * 1000,
    attribution: "Meteoalarm · data provided by EUMETNET members · CC BY 4.0",
    officialUrl: "https://www.meteoalarm.org/",
    dataNature: "official-warning",
    potentialDelay: "Warnings may be delayed between the national service and aggregation.",
  },
  gdacs: {
    id: "gdacs",
    name: "Global Disaster Alert and Coordination System (GDACS)",
    categories: ["flood", "tropical_cyclone", "wildfire", "earthquake", "volcano"],
    updateIntervalMs: 10 * 60 * 1000,
    attribution: "GDACS · European Commission Joint Research Centre and United Nations",
    officialUrl: "https://www.gdacs.org/",
    dataNature: "impact-estimation",
    potentialDelay: "Impact estimates and event geometry may change between episodes.",
  },
  usgs: {
    id: "usgs",
    name: "United States Geological Survey Earthquake Hazards Program",
    categories: ["earthquake"],
    updateIntervalMs: 2 * 60 * 1000,
    attribution: "USGS Earthquake Hazards Program",
    officialUrl: "https://earthquake.usgs.gov/earthquakes/",
    dataNature: "instrumental-observation",
    potentialDelay: "Preliminary automatic solutions can be revised.",
  },
  emsc: {
    id: "emsc",
    name: "EMSC / SeismicPortal",
    categories: ["earthquake"],
    updateIntervalMs: 2 * 60 * 1000,
    attribution: "European-Mediterranean Seismological Centre",
    officialUrl: "https://www.seismicportal.eu/",
    dataNature: "instrumental-observation",
    potentialDelay: "Contributor solutions and felt reports can be revised.",
  },
  gdacsGeological: {
    id: "gdacs-geological",
    name: "GDACS geological hazards",
    categories: ["earthquake", "volcano"],
    updateIntervalMs: 10 * 60 * 1000,
    attribution: "GDACS · European Commission Joint Research Centre and United Nations",
    officialUrl: "https://www.gdacs.org/",
    dataNature: "impact-estimation",
    potentialDelay: "Impact estimates are indicative and can change between episodes.",
  },
  copernicusGfm: {
    id: "copernicus-gfm",
    name: "Copernicus Emergency Management Service — Global Flood Monitoring",
    categories: ["flood"],
    updateIntervalMs: 15 * 60 * 1000,
    attribution: "European Union, Copernicus Emergency Management Service",
    officialUrl: "https://global-flood.emergency.copernicus.eu/",
    dataNature: "satellite-observation",
    potentialDelay: "Sentinel-1 acquisition processing and publication are not instantaneous.",
  },
  openMeteoEcmwf: {
    id: "open-meteo-ecmwf",
    name: "Open-Meteo ECMWF IFS",
    categories: ["wildfire"],
    updateIntervalMs: 15 * 60 * 1000,
    attribution: "Open-Meteo · ECMWF IFS model data",
    officialUrl: "https://open-meteo.com/en/docs/ecmwf-api",
    dataNature: "forecast-model",
    potentialDelay: "Model data updates approximately every six hours.",
  },
} as const satisfies Record<string, AlertSourceDefinition>;

export function getAlertSource(id: keyof typeof ALERT_SOURCES): AlertSourceDefinition {
  return ALERT_SOURCES[id];
}
