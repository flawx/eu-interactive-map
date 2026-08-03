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

function demoAoi(
  id: string,
  name: string,
  longitude: number,
  latitude: number,
  products: unknown[] = [],
) {
  return {
    id,
    name,
    geometry: {
      type: "Polygon",
      coordinates: [[
        [longitude - 0.18, latitude - 0.12],
        [longitude + 0.18, latitude - 0.12],
        [longitude + 0.18, latitude + 0.12],
        [longitude - 0.18, latitude + 0.12],
        [longitude - 0.18, latitude - 0.12],
      ]],
    },
    products,
  };
}

function demoProduct(
  id: string,
  aoiId: string,
  kind: "reference" | "delineation" | "grading" | "monitoring",
) {
  return {
    id,
    aoiId,
    kind,
    feasible: true,
    latestVersion: "1",
    deliveredAt: "2026-07-28T08:00:00Z",
    geometry: null,
    layers: [
      {
        format: kind === "grading" ? "cog" : "geojson",
        url: "https://rapidmapping.emergency.copernicus.eu/",
        attribution: "European Union, Copernicus EMS",
      },
    ],
    downloadUrl: "https://rapidmapping.emergency.copernicus.eu/",
  };
}

export function demoCemsAlerts(): NormalizedAlert[] {
  const landslideProduct = demoProduct(
    "DEMO-LANDSLIDE-DEL",
    "DEMO-LANDSLIDE-AOI",
    "delineation",
  );
  const industrialProduct = demoProduct(
    "DEMO-INDUSTRIAL-GRA",
    "DEMO-INDUSTRIAL-AOI",
    "grading",
  );
  const values = [
    {
      code: "EMSR990",
      category: "landslide" as const,
      hazard: "landslide_event" as const,
      title: "Landslide in the French Alps",
      countryCodes: ["FR"],
      areas: ["Savoie", "France"],
      longitude: 6.45,
      latitude: 45.48,
      closed: false,
      activationKind: "landslide",
      aois: [demoAoi("DEMO-LANDSLIDE-AOI", "Savoie landslide", 6.45, 45.48, [landslideProduct])],
      products: [landslideProduct],
      observedArea: 1.8,
    },
    {
      code: "EMSR991",
      category: "landslide" as const,
      hazard: "landslide_event" as const,
      title: "Recent closed landslide mapping",
      countryCodes: ["IT"],
      areas: ["Lombardy", "Italy"],
      longitude: 9.75,
      latitude: 46.05,
      closed: true,
      activationKind: "landslide",
      aois: [demoAoi("DEMO-LANDSLIDE-CLOSED-AOI", "Lombardy", 9.75, 46.05)],
      products: [],
      observedArea: null,
    },
    {
      code: "EMSR992",
      category: "industrial_incident" as const,
      hazard: "industrial_accident" as const,
      title: "Major industrial accident — Rotterdam",
      countryCodes: ["NL"],
      areas: ["Rotterdam", "Netherlands"],
      longitude: 4.32,
      latitude: 51.9,
      closed: false,
      activationKind: "industrial_accident",
      aois: [demoAoi("DEMO-INDUSTRIAL-AOI", "Rotterdam port", 4.32, 51.9, [industrialProduct])],
      products: [industrialProduct],
      observedArea: null,
    },
    {
      code: "EMSR993",
      category: "industrial_incident" as const,
      hazard: "chemical_accident" as const,
      title: "Confirmed chemical spill — Croatia",
      countryCodes: ["HR"],
      areas: ["Osijek-Baranja", "Croatia"],
      longitude: 18.7,
      latitude: 45.55,
      closed: false,
      activationKind: "chemical_accident",
      aois: [demoAoi("DEMO-CHEMICAL-AOI", "Affected river sector", 18.7, 45.55)],
      products: [],
      observedArea: null,
    },
    {
      code: "EMSR994",
      category: "industrial_incident" as const,
      hazard: "explosion" as const,
      title: "Industrial explosion — Belgium",
      countryCodes: ["BE"],
      areas: ["Antwerp", "Belgium"],
      longitude: 4.4,
      latitude: 51.25,
      closed: false,
      activationKind: "explosion",
      aois: [demoAoi("DEMO-EXPLOSION-AOI", "Antwerp", 4.4, 51.25)],
      products: [],
      observedArea: null,
    },
  ];
  return values.map((item) =>
    base({
      id: `demo:cems:${item.code.toLowerCase()}`,
      source: "copernicus-emergency-mapping",
      sourceEventId: item.code,
      category: item.category,
      hazard: item.hazard,
      title: item.title,
      description:
        "Deterministic Copernicus emergency-mapping activation for interface testing.",
      status: item.closed ? "ended" : "active",
      countryCodes: item.countryCodes,
      affectedAreaNames: item.areas,
      centroid: { longitude: item.longitude, latitude: item.latitude },
      geometry: item.aois[0]?.geometry as GeoJSON.Geometry,
      sourceUrl: "https://rapidmapping.emergency.copernicus.eu/",
      officialSourceName:
        "Copernicus Emergency Management Service — Rapid Mapping",
      observed: true,
      metadata: {
        dataNature: "satellite-observation",
        demo: true,
        activationKind: item.activationKind,
        cemsActivationCode: item.code,
        category: item.category,
        subCategory: item.activationKind,
        eventTime: "2026-07-28T06:00:00Z",
        activationTime: "2026-07-28T07:00:00Z",
        closed: item.closed,
        aoiCount: item.aois.length,
        productCount: item.products.length,
        aois: item.aois,
        products: item.products,
        reportUrl: "https://rapidmapping.emergency.copernicus.eu/",
        viewerUrl: "https://rapidmapping.emergency.copernicus.eu/",
        observedAreaSquareKilometers: item.observedArea,
        affectedAreaSquareKilometers: item.observedArea,
        affectedBuildings: item.activationKind === "industrial_accident" ? 4 : null,
        affectedPopulation: null,
        substances: item.activationKind === "chemical_accident" ? ["Officially confirmed substance"] : [],
        officialInstructions: null,
        emarsReportUrl: null,
        mappingActivationNotIncidentConfirmation: true,
      },
    }),
  );
}

type DemoTrafficInput = {
  id: string;
  hazard: NormalizedAlert["hazard"];
  title: string;
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.MultiLineString;
  road: string;
  status?: "active" | "upcoming" | "ended";
  delaySeconds?: number | null;
  lengthMeters?: number | null;
  magnitude?: "minor" | "moderate" | "major" | null;
  from?: string | null;
  to?: string | null;
  countryCode?: string;
};

function demoTrafficAlert(input: DemoTrafficInput): NormalizedAlert {
  const now = new Date();
  const updatedAt = new Date(now.getTime() - 4 * 60 * 1000).toISOString();
  const coordinates =
    input.geometry.type === "Point"
      ? input.geometry.coordinates
      : input.geometry.type === "LineString"
        ? input.geometry.coordinates[Math.floor(input.geometry.coordinates.length / 2)]
        : input.geometry.coordinates[0][
            Math.floor(input.geometry.coordinates[0].length / 2)
          ];
  const status = input.status ?? "active";
  const startAt =
    status === "upcoming"
      ? new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() - 35 * 60 * 1000).toISOString();
  const endAt =
    status === "upcoming"
      ? new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString()
      : status === "ended"
        ? new Date(now.getTime() - 60 * 60 * 1000).toISOString()
        : null;
  return {
    id: `demo:tomtom:${input.id}`,
    source: "tomtom-traffic",
    sourceEventId: input.id,
    category: "road_traffic",
    hazard: input.hazard,
    title: input.title,
    description:
      input.hazard === "road_accident"
        ? "Traffic incident reported by the demonstration provider."
        : input.title,
    instructions: null,
    severity:
      input.magnitude === "major"
        ? "severe"
        : input.magnitude === "moderate"
          ? "moderate"
          : "minor",
    status,
    certainty: "certain",
    urgency: null,
    effectiveAt: startAt,
    onsetAt: startAt,
    expiresAt: endAt,
    updatedAt,
    fetchedAt: now.toISOString(),
    countryCodes: [input.countryCode ?? "FR"],
    affectedAreaNames: [input.from, input.to].filter(
      (value): value is string => Boolean(value),
    ),
    geometry: input.geometry,
    centroid: { longitude: coordinates[0], latitude: coordinates[1] },
    sourceUrl: "https://www.tomtom.com/products/traffic-and-travel-information/",
    officialSourceName: "TomTom Traffic demonstration",
    observed: true,
    forecast: status === "upcoming",
    metadata: {
      providerIncidentId: input.id,
      incidentType: input.hazard,
      status:
        status === "upcoming" ? "planned" : status === "ended" ? "ended" : "active",
      roadNumbers: [input.road],
      fromLocation: input.from ?? null,
      toLocation: input.to ?? null,
      direction: input.to ?? null,
      lengthMeters: input.lengthMeters ?? null,
      delaySeconds: input.delaySeconds ?? null,
      currentSpeedKph: input.hazard === "traffic_jam" ? 18 : null,
      freeFlowSpeedKph: input.hazard === "traffic_jam" ? 90 : null,
      currentTravelTimeSeconds: input.delaySeconds
        ? 900 + input.delaySeconds
        : null,
      freeFlowTravelTimeSeconds: input.delaySeconds ? 900 : null,
      magnitudeOfDelay:
        input.magnitude === "major" ? 3 : input.magnitude === "moderate" ? 2 : 1,
      magnitudeOfDelayLabel: input.magnitude ?? "minor",
      probabilityOfOccurrence: "certain",
      confidence: null,
      numberOfReports: null,
      roadClosed: input.hazard === "road_closure" ? true : null,
      lanesClosed: input.hazard === "lane_closure" ? 1 : null,
      totalLanes: input.hazard === "lane_closure" ? 3 : null,
      startAt,
      endAt,
      lastReportAt: updatedAt,
      updatedAt,
      providerModelId: "demo-traffic-model",
      emergencyServices: null,
      estimatedClearanceAt: null,
      providerEvents: [{ code: null, description: input.title, iconCategory: null }],
      dataNature: "instrumental-observation",
      demo: true,
    },
  };
}

export function demoTrafficAlerts(): NormalizedAlert[] {
  return [
    demoTrafficAlert({
      id: "accident-a7",
      hazard: "road_accident",
      title: "Accident — A7",
      geometry: {
        type: "LineString",
        coordinates: [[4.82, 45.62], [4.84, 45.65], [4.86, 45.68]],
      },
      road: "A7",
      delaySeconds: 22 * 60,
      lengthMeters: 3_400,
      magnitude: "major",
      from: "Vienne",
      to: "Lyon",
    }),
    demoTrafficAlert({
      id: "accident-no-details",
      hazard: "road_accident",
      title: "Accident reported",
      geometry: { type: "Point", coordinates: [2.31, 48.87] },
      road: "Boulevard périphérique",
      magnitude: null,
    }),
    demoTrafficAlert({
      id: "major-jam-e40",
      hazard: "traffic_jam",
      title: "Major congestion — E40",
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [[4.21, 50.88], [4.28, 50.9]],
          [[4.28, 50.9], [4.35, 50.91]],
        ],
      },
      road: "E40",
      delaySeconds: 18 * 60,
      lengthMeters: 6_200,
      magnitude: "major",
      from: "Brussels",
      to: "Leuven",
      countryCode: "BE",
    }),
    demoTrafficAlert({
      id: "road-closure-a10",
      hazard: "road_closure",
      title: "Road closed — A10",
      geometry: {
        type: "LineString",
        coordinates: [[2.04, 48.73], [2.1, 48.75]],
      },
      road: "A10",
      magnitude: "major",
      from: "Saint-Quentin-en-Yvelines",
      to: "Paris",
    }),
    demoTrafficAlert({
      id: "lane-closure-m25",
      hazard: "lane_closure",
      title: "Lane closed — M25",
      geometry: { type: "Point", coordinates: [-0.42, 51.47] },
      road: "M25",
      magnitude: "moderate",
      countryCode: "GB",
    }),
    demoTrafficAlert({
      id: "roadworks-active",
      hazard: "roadworks",
      title: "Roadworks — A1",
      geometry: {
        type: "LineString",
        coordinates: [[2.52, 49.01], [2.56, 49.04]],
      },
      road: "A1",
      magnitude: "moderate",
      from: "Roissy",
      to: "Senlis",
    }),
    demoTrafficAlert({
      id: "roadworks-planned",
      hazard: "roadworks",
      title: "Planned roadworks — A6",
      geometry: { type: "Point", coordinates: [2.45, 48.61] },
      road: "A6",
      status: "upcoming",
      magnitude: "minor",
    }),
    demoTrafficAlert({
      id: "broken-vehicle",
      hazard: "broken_down_vehicle",
      title: "Broken-down vehicle — A4",
      geometry: { type: "Point", coordinates: [6.08, 49.61] },
      road: "A4",
      magnitude: "minor",
      countryCode: "LU",
    }),
    demoTrafficAlert({
      id: "recent-ended",
      hazard: "road_hazard",
      title: "Recently ended road hazard",
      geometry: { type: "Point", coordinates: [7.43, 43.74] },
      road: "A8",
      status: "ended",
      magnitude: "minor",
      countryCode: "MC",
    }),
  ];
}
