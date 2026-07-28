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
