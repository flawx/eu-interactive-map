import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildTrafficLineCollection,
  buildTrafficMarkerCollection,
  filterTrafficAlerts,
} from "../components/map/trafficMapLayers";
import { demoTrafficAlerts } from "../lib/alerts/demoFixtures";
import {
  geometryIntersectsProjectEurope,
  isAlertInsideProjectEurope,
} from "../lib/alerts/geography";
import { getMessages } from "../lib/i18n/messages";
import { supportedLocales } from "../lib/i18n/config";
import {
  DEFAULT_MAP_LAYER_PREFERENCES,
  countActiveMapLayers,
  migrateMapLayerPreferences,
} from "../lib/map/mapLayerPreferences";
import {
  hazardForTomTomIcon,
  normalizeTomTomResponse,
} from "../lib/alerts/providers/traffic/normalization";
import {
  TomTomTrafficProvider,
  validateTrafficBounds,
} from "../lib/alerts/providers/traffic/tomTomTraffic";
import {
  flowCongestionColor,
  trafficSeverity,
} from "../lib/alerts/providers/traffic/severity";
import { buildLocalSearchIndex } from "../lib/search/mapSearch";

const fixtureDirectory = new URL("../tests/fixtures/alerts/traffic/", import.meta.url);
const fetchedAt = "2026-07-28T08:40:00Z";
const now = new Date(fetchedAt);

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(name, fixtureDirectory), "utf8")) as unknown;
}

async function main() {
  const fixtureNames = [
    "accident-active.json",
    "major-jam.json",
    "road-closure.json",
    "lane-closure.json",
    "roadworks-active.json",
    "roadworks-planned.json",
    "broken-down-vehicle.json",
    "incident-ended.json",
  ];
  const alerts = (
    await Promise.all(
      fixtureNames.map(async (name) =>
        normalizeTomTomResponse(await fixture(name), {
          fetchedAt,
          trafficModelId: "fixture-model",
          now,
        }),
      ),
    )
  ).flat();
  assert.equal(alerts.length, fixtureNames.length);
  assert(alerts.every(isAlertInsideProjectEurope));
  assert(alerts.every((alert) => alert.geometry && geometryIntersectsProjectEurope(alert.geometry)));

  const byHazard = new Map(alerts.map((alert) => [alert.hazard, alert]));
  assert.equal(byHazard.get("road_accident")?.geometry?.type, "LineString");
  assert.equal(byHazard.get("traffic_jam")?.geometry?.type, "MultiLineString");
  assert.equal(byHazard.get("road_closure")?.metadata.roadClosed, true);
  assert.equal(byHazard.get("lane_closure")?.metadata.lanesClosed, null);
  assert.equal(byHazard.get("road_accident")?.metadata.numberOfReports, 3);
  assert.equal(byHazard.get("road_accident")?.metadata.confidence, null);
  assert.equal(byHazard.get("roadworks")?.officialSourceName, "TomTom Traffic");
  assert.equal(byHazard.get("broken_down_vehicle")?.metadata.delaySeconds, null);
  assert.equal(byHazard.get("broken_down_vehicle")?.metadata.lengthMeters, null);
  assert.equal(byHazard.get("broken_down_vehicle")?.metadata.currentSpeedKph, null);
  assert(alerts.every((alert) => alert.metadata.emergencyServices === null));
  assert(alerts.every((alert) => alert.metadata.estimatedClearanceAt === null));
  assert(alerts.some((alert) => alert.status === "upcoming"));
  assert(alerts.some((alert) => alert.status === "ended"));

  assert.equal(hazardForTomTomIcon("accident"), "road_accident");
  assert.equal(hazardForTomTomIcon("jam"), "traffic_jam");
  assert.equal(hazardForTomTomIcon("roadClosed"), "road_closure");
  assert.equal(hazardForTomTomIcon("laneClosed"), "lane_closure");
  assert.equal(hazardForTomTomIcon("roadWorks"), "roadworks");
  assert.equal(hazardForTomTomIcon("brokenDownVehicle"), "broken_down_vehicle");
  assert.equal(hazardForTomTomIcon("fog"), "road_weather");
  assert.equal(hazardForTomTomIcon("unexpected"), "other_traffic_incident");
  assert.equal(trafficSeverity("major", null), "severe");
  assert.equal(trafficSeverity(null, 11 * 60), "moderate");
  assert.equal(flowCongestionColor(0.1), "#7f1d1d");
  assert.equal(flowCongestionColor(0.9), "#22c55e");

  assert.equal(
    validateTrafficBounds({ west: 4.1, south: 50.7, east: 4.4, north: 50.95 }),
    null,
  );
  assert.equal(
    validateTrafficBounds({ west: -120, south: 34, east: -119.9, north: 34.1 }),
    "outside_project_europe",
  );
  assert.equal(
    validateTrafficBounds({ west: -10, south: 35, east: 30, north: 65 }),
    "bbox_too_large",
  );

  const allFilters = {
    accidents: true,
    majorJams: true,
    brokenVehicles: true,
    hazards: true,
    roadWeather: true,
    otherIncidents: true,
    roadClosures: true,
    laneClosures: true,
    restrictions: true,
    activeRoadworks: true,
    plannedRoadworks: true,
  };
  const visible = filterTrafficAlerts(
    alerts,
    { incidents: true, closures: true, roadworks: true },
    allFilters,
  );
  assert.equal(visible.length, alerts.length);
  assert.equal(buildTrafficMarkerCollection(visible).features.length, alerts.length);
  assert.equal(buildTrafficLineCollection(visible).features.length, 4);
  assert.equal(
    filterTrafficAlerts(
      alerts,
      { incidents: false, closures: true, roadworks: false },
      allFilters,
    ).length,
    2,
  );

  const demos = demoTrafficAlerts();
  assert.equal(demos.length, 9);
  assert(demos.every(isAlertInsideProjectEurope));
  assert(demos.some((alert) => alert.metadata.demo === true));
  assert(demos.some((alert) => alert.status === "upcoming"));
  assert(demos.some((alert) => alert.status === "ended"));

  const migrated = migrateMapLayerPreferences({});
  assert.equal(migrated.liveTrafficFlow, false);
  assert.equal(migrated.roadTrafficIncidents, false);
  assert.equal(migrated.trafficAccidents, true);
  assert.equal(migrated.roadClosuresRestrictions, false);
  assert.equal(migrated.roadworks, false);
  const baseCount = countActiveMapLayers(DEFAULT_MAP_LAYER_PREFERENCES);
  const enabledParents = {
    ...DEFAULT_MAP_LAYER_PREFERENCES,
    roadTrafficIncidents: true,
    roadClosuresRestrictions: true,
    roadworks: true,
  };
  assert.equal(countActiveMapLayers(enabledParents), baseCount + 3);
  assert.equal(
    countActiveMapLayers({ ...enabledParents, trafficAccidents: false }),
    baseCount + 3,
    "traffic subfilters must not increase the main-layer counter",
  );

  const search = buildLocalSearchIndex("en", [], [], demos);
  assert(search.some((item) => item.type === "traffic_incident"));
  assert(search.some((item) => item.type === "road_closure"));
  assert(search.some((item) => item.type === "roadworks"));
  assert(search.some((item) => String(item.metadata.searchText).includes("A7")));

  for (const locale of supportedLocales) {
    const legend = getMessages(locale).legend;
    for (const key of [
      "groupRoadTraffic",
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
    ] as const) {
      assert(legend[key].trim(), `${locale}.${key}`);
    }
  }

  const previousKey = process.env.TOMTOM_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.TOMTOM_API_KEY = "server-only-test-key";
  const requestHeaders: Headers[] = [];
  let modelId = "fixture-model-1";
  const validPayload = await fixture("accident-active.json");
  globalThis.fetch = async (_input, init) => {
    requestHeaders.push(new Headers(init?.headers));
    return new Response(JSON.stringify(validPayload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        TrafficModelID: modelId,
        Date: "Tue, 28 Jul 2026 08:40:00 GMT",
      },
    });
  };
  const provider = new TomTomTrafficProvider();
  const valid = await provider.getIncidents({
    bounds: { west: 4.7, south: 45.5, east: 4.9, north: 45.75 },
    locale: "en",
    timeMode: "current",
  });
  assert.equal(valid.connectorStatus, "operational");
  assert.equal(valid.alerts.length, 1);
  assert.equal(valid.trafficModelId, "fixture-model-1");
  assert.equal(requestHeaders[0].get("TomTom-Api-Key"), "server-only-test-key");
  assert(!requestHeaders[0].get("TomTom-Api-Key")?.includes("http"));

  modelId = "fixture-model-2";
  const renewed = await provider.getIncidents({
    bounds: { west: 4.5, south: 45.4, east: 4.7, north: 45.6 },
    locale: "fr",
    timeMode: "current",
  });
  assert.equal(renewed.trafficModelId, "fixture-model-2");
  assert.equal(requestHeaders[1].get("TrafficModelID"), "fixture-model-1");

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  const badKey = await provider.getIncidents({
    bounds: { west: 5, south: 45.5, east: 5.2, north: 45.7 },
    locale: "en",
    timeMode: "current",
  });
  assert.equal(badKey.connectorStatus, "misconfigured");

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "quota" }), {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  const quota = await provider.getIncidents({
    bounds: { west: 5.3, south: 45.5, east: 5.5, north: 45.7 },
    locale: "en",
    timeMode: "current",
  });
  assert.equal(quota.connectorStatus, "unavailable");
  assert(quota.warnings.includes("tomtom_quota_exceeded"));

  globalThis.fetch = async () => {
    throw new TypeError("simulated provider outage");
  };
  const outage = await provider.getIncidents({
    bounds: { west: 5.6, south: 45.5, east: 5.8, north: 45.7 },
    locale: "en",
    timeMode: "current",
  });
  assert.equal(outage.connectorStatus, "unavailable");

  delete process.env.TOMTOM_API_KEY;
  const status = await provider.getStatus();
  const emptyTile = await provider.getTile("flow", 8, 130, 84);
  globalThis.fetch = originalFetch;
  if (previousKey === undefined) delete process.env.TOMTOM_API_KEY;
  else process.env.TOMTOM_API_KEY = previousKey;
  assert.equal(status.connectorStatus, "misconfigured");
  assert.equal(status.configured, false);
  assert.equal(emptyTile.body.byteLength, 0);
  assert.equal(emptyTile.connectorStatus, "misconfigured");

  const mapContainer = await readFile(
    new URL("../components/map/MapContainer.tsx", import.meta.url),
    "utf8",
  );
  const providerSource = await readFile(
    new URL("../lib/alerts/providers/traffic/tomTomTraffic.ts", import.meta.url),
    "utf8",
  );
  const panelSource = await readFile(
    new URL("../components/alerts/TrafficIncidentPanel.tsx", import.meta.url),
    "utf8",
  );
  assert(mapContainer.includes("cluster: true"));
  assert(mapContainer.includes("TRAFFIC_FLOW_TILE_LAYER_ID"));
  assert(mapContainer.includes("TRAFFIC_LINE_LAYER_ID"));
  assert(!mapContainer.includes("TOMTOM_API_KEY"));
  assert(providerSource.includes('"TomTom-Api-Key"'));
  assert(providerSource.includes("process.env.TOMTOM_API_KEY"));
  assert(panelSource.includes("AbortController"));
  assert(panelSource.includes("metadata.emergencyServices"));
  assert(panelSource.includes("metadata.estimatedClearanceAt"));

  const {
    areTrafficAlertsEqual,
    dedupeTrafficAlertsById,
    trafficAlertsSignature,
  } = await import("../lib/alerts/trafficAlertEquality");
  const {
    areCameraSnapshotsEqual,
    angularDifference,
    normalizeBearing,
  } = await import("../lib/map/cameraSnapshot");

  const sample = alerts.slice(0, 3);
  assert.equal(areTrafficAlertsEqual(sample, sample), true);
  assert.equal(
    areTrafficAlertsEqual(sample, sample.map((alert) => ({ ...alert }))),
    true,
  );
  assert.equal(
    trafficAlertsSignature(sample),
    trafficAlertsSignature([...sample].reverse()),
  );

  let parentTrafficUpdates = 0;
  let parentTrafficState: typeof sample = [];
  const applyTrafficParent = (next: typeof sample) => {
    const deduped = dedupeTrafficAlertsById(next);
    if (areTrafficAlertsEqual(parentTrafficState, deduped)) {
      return;
    }
    parentTrafficState = deduped;
    parentTrafficUpdates += 1;
  };
  applyTrafficParent(sample);
  applyTrafficParent(sample.map((alert) => ({ ...alert })));
  applyTrafficParent([...sample].reverse().map((alert) => ({ ...alert })));
  assert.equal(parentTrafficUpdates, 1, "identical traffic lists must update parent once");

  const updated = sample.map((alert, index) =>
    index === 0
      ? ({ ...alert, updatedAt: "2026-07-28T09:00:00Z", title: `${alert.title} (updated)` } satisfies typeof alert)
      : alert,
  );
  applyTrafficParent(updated);
  assert.equal(parentTrafficUpdates, 2, "real traffic change must update parent");

  const withoutFirst = sample.slice(1);
  applyTrafficParent(withoutFirst);
  assert.equal(parentTrafficUpdates, 3, "removed traffic alert must update parent");

  const duplicated = dedupeTrafficAlertsById([...sample, sample[0]!]);
  assert.equal(duplicated.length, sample.length);

  assert.equal(normalizeBearing(-90), 270);
  assert.equal(normalizeBearing(370), 10);
  assert.ok(angularDifference(359.9, 0.05) < 0.2);

  let cameraUpdates = 0;
  let lastCamera: {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
  } | null = null;
  const emitCamera = (snapshot: NonNullable<typeof lastCamera>) => {
    if (areCameraSnapshotsEqual(lastCamera, snapshot)) return;
    lastCamera = snapshot;
    cameraUpdates += 1;
  };
  const baseCamera = {
    longitude: 15.2551,
    latitude: 54.526,
    zoom: 4,
    pitch: 0,
    bearing: 0,
  };
  emitCamera(baseCamera);
  emitCamera({ ...baseCamera });
  emitCamera({
    ...baseCamera,
    pitch: 0.005,
    bearing: 0.005,
  });
  assert.equal(cameraUpdates, 1, "unchanged camera must not emit again");

  emitCamera({ ...baseCamera, pitch: 45 });
  assert.equal(cameraUpdates, 2, "real pitch change must emit once");

  emitCamera({ ...baseCamera, pitch: 45, bearing: 90 });
  assert.equal(cameraUpdates, 3, "real bearing change must emit once");
  emitCamera({ ...baseCamera, pitch: 45, bearing: 90.004 });
  assert.equal(cameraUpdates, 3, "near-identical bearing must not re-emit");

  const mapInterface = await readFile(
    new URL("../components/map/MapInterface.tsx", import.meta.url),
    "utf8",
  );
  assert(mapInterface.includes("areTrafficAlertsEqual"));
  assert(mapInterface.includes("handleCameraChange"));
  assert(mapContainer.includes("lastTrafficSignatureRef"));
  assert(mapContainer.includes("areCameraSnapshotsEqual"));
  assert(mapContainer.includes('map.on("moveend", emitCameraChange)'));
  assert(mapContainer.includes('map.on("rotateend", emitCameraChange)'));
  assert(mapContainer.includes('map.on("pitchend", emitCameraChange)'));
  assert(!mapContainer.includes('map.on("rotate", emitCameraChange)'));
  assert(!mapContainer.includes('map.on("move", emitCameraChange)'));
  assert(!mapContainer.includes('map.on("pitch", emitCameraChange)'));

  console.log(
    JSON.stringify({
      provider: "TomTom Traffic Orbis v2",
      serverOnlyKey: true,
      europeFiltering: true,
      geometries: ["Point", "LineString", "MultiLineString"],
      fixtures: fixtureNames.length + 1,
      locales: supportedLocales.length,
      legendCounter: true,
      search: true,
      loopGuards: {
        identicalTrafficParentUpdates: parentTrafficUpdates >= 1,
        cameraUnchangedNoExtraEmit: true,
        pitchEmit: true,
        bearingEmit: true,
      },
      tests: "passed",
    }),
  );
}

void main();
