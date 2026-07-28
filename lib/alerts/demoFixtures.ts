import type { NormalizedAlert } from "@/lib/alerts/types";

export function alertDemoModeEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALERTS_DEMO_MODE === "true"
  );
}

function base(
  values: Partial<NormalizedAlert> &
    Pick<
      NormalizedAlert,
      "id" | "source" | "sourceEventId" | "category" | "hazard" | "title"
    >,
): NormalizedAlert {
  return {
    description: null,
    instructions: null,
    severity: "moderate",
    status: "active",
    certainty: null,
    urgency: null,
    effectiveAt: "2026-07-28T06:00:00Z",
    onsetAt: "2026-07-28T06:00:00Z",
    expiresAt: null,
    updatedAt: "2026-07-28T08:00:00Z",
    fetchedAt: "2026-07-28T08:05:00Z",
    countryCodes: ["FR"],
    affectedAreaNames: ["Southern France"],
    geometry: null,
    centroid: { longitude: 3.45, latitude: 43.62 },
    sourceUrl: "https://www.gdacs.org/",
    officialSourceName: "GDACS",
    observed: false,
    forecast: false,
    metadata: { dataNature: "impact-estimation", demo: true },
    ...values,
  };
}

export function demoFloodAlerts(): NormalizedAlert[] {
  return [
    base({
      id: "demo:gdacs:flood-france",
      source: "gdacs",
      sourceEventId: "DEMO-FL-001",
      category: "flood",
      hazard: "river_flood",
      title: "Flooding in southern France",
      description:
        "Deterministic demonstration event for testing the GDACS flood marker and panel.",
      metadata: {
        dataNature: "impact-estimation",
        demo: true,
        populationExposure: 12500,
        affectedAreaSquareKilometers: null,
        associatedSatelliteObservationId: "demo:gfm:observation-france",
      },
    }),
    base({
      id: "demo:gfm:observation-france",
      source: "copernicus-gfm",
      sourceEventId: "DEMO-GFM-001",
      category: "flood",
      hazard: "river_flood",
      title: "Satellite-observed flood extent",
      observed: true,
      officialSourceName:
        "Copernicus Emergency Management Service — Global Flood Monitoring",
      sourceUrl: "https://services.eodc.eu/browser/#/v1/collections/GFM",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [3.36, 43.57],
            [3.55, 43.57],
            [3.55, 43.68],
            [3.36, 43.68],
            [3.36, 43.57],
          ],
        ],
      },
      metadata: {
        dataNature: "satellite-observation",
        demo: true,
        acquisitionTime: "2026-07-28T06:27:37Z",
        publishedAt: "2026-07-28T07:10:00Z",
        satellite: "Sentinel-1",
        confidencePercent: 82,
        associatedGdacsAlertId: "demo:gdacs:flood-france",
      },
    }),
    base({
      id: "demo:gdacs:flood-ended",
      source: "gdacs",
      sourceEventId: "DEMO-FL-ENDED",
      category: "flood",
      hazard: "river_flood",
      title: "Recent ended flood — Spain",
      status: "ended",
      countryCodes: ["ES"],
      affectedAreaNames: ["Spain"],
      centroid: { longitude: -3.7, latitude: 40.4 },
      expiresAt: "2026-07-28T04:00:00Z",
      updatedAt: "2026-07-28T04:15:00Z",
      metadata: { dataNature: "impact-estimation", demo: true },
    }),
  ];
}

export function demoWeatherAlerts(): NormalizedAlert[] {
  return [
    base({
      id: "demo:meteoalarm:orange",
      source: "meteoalarm",
      sourceEventId: "DEMO-WEATHER-ORANGE",
      category: "weather",
      hazard: "heavy_rain",
      title: "Orange heavy-rain warning",
      severity: "severe",
      forecast: true,
      officialSourceName: "Meteoalarm demonstration",
      sourceUrl: "https://www.meteoalarm.org/",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [6.0, 44.0],
            [7.0, 44.0],
            [7.0, 45.0],
            [6.0, 45.0],
            [6.0, 44.0],
          ],
        ],
      },
      metadata: { dataNature: "official-warning", demo: true },
    }),
  ];
}

export function demoStormAlerts(): NormalizedAlert[] {
  return [
    base({
      id: "demo:gdacs:cyclone",
      source: "gdacs",
      sourceEventId: "DEMO-TC-001",
      category: "tropical_cyclone",
      hazard: "tropical_cyclone",
      title: "Demonstration cyclone",
      countryCodes: ["PT"],
      affectedAreaNames: ["Portugal"],
      centroid: { longitude: -15, latitude: 38 },
      metadata: {
        dataNature: "impact-estimation",
        demo: true,
        trackGeometry: {
          type: "LineString",
          coordinates: [
            [-20, 35],
            [-18, 36],
            [-15, 38],
          ],
        },
        forecastTrackGeometry: {
          type: "LineString",
          coordinates: [
            [-15, 38],
            [-12, 40],
            [-9, 41],
          ],
        },
      },
    }),
  ];
}

export function demoEarthquakeAlerts(): NormalizedAlert[] {
  return [
    base({
      id: "demo:earthquake:minor",
      source: "usgs",
      sourceEventId: "DEMO-USGS-M32",
      category: "earthquake",
      hazard: "earthquake",
      title: "M3.2 · Western Greece",
      severity: "minor",
      affectedAreaNames: ["Western Greece"],
      countryCodes: ["EL"],
      centroid: { longitude: 20.7, latitude: 38.7 },
      geometry: { type: "Point", coordinates: [20.7, 38.7, 9.4] },
      officialSourceName: "USGS demonstration",
      sourceUrl: "https://earthquake.usgs.gov/earthquakes/",
      observed: true,
      metadata: {
        dataNature: "instrumental-observation",
        demo: true,
        magnitude: 3.2,
        magnitudeType: "ml",
        depthKilometers: 9.4,
        feltReports: null,
        maximumReportedIntensity: null,
        estimatedIntensity: null,
        tsunamiFlag: false,
        reviewStatus: "automatic",
        usgsEventId: "DEMO-USGS-M32",
        emscEventId: null,
        gdacsEventId: null,
        providerEventIds: { usgs: "DEMO-USGS-M32" },
        providerMagnitudes: { usgs: 3.2 },
        providerUpdatedAt: { usgs: "2026-07-28T08:00:00Z" },
        providerUrls: { usgs: "https://earthquake.usgs.gov/earthquakes/" },
        affectedPopulation: null,
        gdacsSeverity: null,
      },
    }),
    base({
      id: "demo:earthquake:felt-merged",
      source: "usgs",
      sourceEventId: "DEMO-USGS-M48",
      category: "earthquake",
      hazard: "earthquake",
      title: "M4.8 · 18 km south of Kalamata",
      severity: "moderate",
      affectedAreaNames: ["18 km south of Kalamata"],
      countryCodes: ["EL"],
      centroid: { longitude: 22.1, latitude: 36.9 },
      geometry: { type: "Point", coordinates: [22.1, 36.9, 18] },
      officialSourceName: "USGS · enriched by EMSC",
      sourceUrl: "https://earthquake.usgs.gov/earthquakes/",
      observed: true,
      metadata: {
        dataNature: "instrumental-observation",
        demo: true,
        magnitude: 4.8,
        magnitudeType: "mw",
        depthKilometers: 18,
        feltReports: 47,
        maximumReportedIntensity: 4.1,
        estimatedIntensity: 4.5,
        tsunamiFlag: false,
        reviewStatus: "reviewed",
        usgsEventId: "DEMO-USGS-M48",
        emscEventId: "DEMO-EMSC-M48",
        gdacsEventId: null,
        providerEventIds: {
          usgs: "DEMO-USGS-M48",
          emsc: "DEMO-EMSC-M48",
        },
        providerMagnitudes: { usgs: 4.8, emsc: 4.7 },
        providerUpdatedAt: {
          usgs: "2026-07-28T08:00:00Z",
          emsc: "2026-07-28T08:01:00Z",
        },
        providerUrls: {
          usgs: "https://earthquake.usgs.gov/earthquakes/",
          emsc: "https://www.emsc-csem.org/",
        },
        affectedPopulation: null,
        gdacsSeverity: null,
      },
    }),
    base({
      id: "demo:earthquake:major-gdacs",
      source: "usgs",
      sourceEventId: "DEMO-USGS-M61",
      category: "earthquake",
      hazard: "earthquake",
      title: "M6.1 · Central Italy",
      severity: "severe",
      affectedAreaNames: ["Central Italy"],
      countryCodes: ["IT"],
      centroid: { longitude: 13.1, latitude: 42.7 },
      geometry: { type: "Point", coordinates: [13.1, 42.7, 10] },
      officialSourceName: "USGS · EMSC · GDACS",
      sourceUrl: "https://earthquake.usgs.gov/earthquakes/",
      observed: true,
      metadata: {
        dataNature: "instrumental-observation",
        demo: true,
        magnitude: 6.1,
        magnitudeType: "mww",
        depthKilometers: 10,
        feltReports: 823,
        maximumReportedIntensity: 6.2,
        estimatedIntensity: 6.5,
        tsunamiFlag: false,
        reviewStatus: "reviewed",
        usgsEventId: "DEMO-USGS-M61",
        emscEventId: "DEMO-EMSC-M61",
        gdacsEventId: "DEMO-GDACS-EQ-61",
        providerEventIds: {
          usgs: "DEMO-USGS-M61",
          emsc: "DEMO-EMSC-M61",
          gdacs: "DEMO-GDACS-EQ-61",
        },
        providerMagnitudes: { usgs: 6.1, emsc: 6.0, gdacs: 6.1 },
        providerUpdatedAt: {
          usgs: "2026-07-28T08:00:00Z",
          emsc: "2026-07-28T08:01:00Z",
          gdacs: "2026-07-28T08:05:00Z",
        },
        providerUrls: {
          usgs: "https://earthquake.usgs.gov/earthquakes/",
          emsc: "https://www.emsc-csem.org/",
          gdacs: "https://www.gdacs.org/",
        },
        affectedPopulation: 145000,
        gdacsSeverity: "orange",
      },
    }),
  ];
}

export function demoVolcanoAlerts(): NormalizedAlert[] {
  return [
    base({
      id: "demo:volcano:eruption",
      source: "gdacs",
      sourceEventId: "DEMO-GDACS-VO-ETNA",
      category: "volcano",
      hazard: "volcanic_eruption",
      title: "Etna",
      description: "Deterministic GDACS eruption scenario for interface testing.",
      severity: "severe",
      countryCodes: ["IT"],
      affectedAreaNames: ["Sicily, Italy"],
      centroid: { longitude: 15.004, latitude: 37.751 },
      geometry: { type: "Point", coordinates: [15.004, 37.751] },
      sourceUrl: "https://www.gdacs.org/",
      metadata: {
        dataNature: "impact-estimation",
        demo: true,
        volcanoName: "Etna",
        volcanoId: "DEMO-ETNA",
        activityType: "eruption",
        gdacsEventId: "DEMO-GDACS-VO-ETNA",
        eruptionStartAt: "2026-07-28T06:00:00Z",
        lastActivityAt: "2026-07-28T08:00:00Z",
        ashCloudInformation: null,
        affectedPopulation: null,
        gdacsSeverity: "orange",
      },
    }),
    base({
      id: "demo:volcano:ash",
      source: "gdacs",
      sourceEventId: "DEMO-GDACS-VO-ASH",
      category: "volcano",
      hazard: "ash_emission",
      title: "Reykjanes",
      description: "Deterministic ash-emission scenario for interface testing.",
      severity: "moderate",
      countryCodes: ["IS"],
      affectedAreaNames: ["Reykjanes, Iceland"],
      centroid: { longitude: -22.4, latitude: 63.9 },
      geometry: { type: "Point", coordinates: [-22.4, 63.9] },
      sourceUrl: "https://www.gdacs.org/",
      metadata: {
        dataNature: "impact-estimation",
        demo: true,
        volcanoName: "Reykjanes",
        volcanoId: "DEMO-REYKJANES",
        activityType: "ash_emission",
        gdacsEventId: "DEMO-GDACS-VO-ASH",
        eruptionStartAt: "2026-07-28T05:00:00Z",
        lastActivityAt: "2026-07-28T08:00:00Z",
        ashCloudInformation: "Ash emission reported in the demonstration fixture.",
        affectedPopulation: null,
        gdacsSeverity: "green",
      },
    }),
  ];
}
