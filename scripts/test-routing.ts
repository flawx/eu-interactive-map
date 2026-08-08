import assert from "node:assert/strict";
import { estimateFuelOrEnergyCost } from "../lib/routing/costs/fuelCost";
import {
  areCountriesAllowed,
  getDisallowedRouteSegments,
  isRouteGeometryAllowed,
  isRoutingPointAllowed,
} from "../lib/routing/routingGeofence";
import { normalizeTomTomRoutes } from "../lib/routing/normalizeTomTomRoute";
import { buildTomTomRouteUrl } from "../lib/routing/providers/tomTomRouting";
import {
  decodeShareableRoute,
  encodeShareableRoute,
} from "../lib/routing/shareableRoute";
import {
  distanceToLineStringMeters,
  filterIncidentsAlongRoute,
} from "../lib/routing/routeIncidents";
import { parseRoutingRequestBody } from "../lib/routing/calculateRoute";
import {
  DEFAULT_ROUTE_AVOID,
  RoutingError,
  type RoutingRequest,
} from "../lib/routing/types";
import { getMessages } from "../lib/i18n/messages";
import { supportedLocales } from "../lib/i18n/config";
import { setRoutingProviderForTests } from "../lib/routing/providers/providerRegistry";
import type { RoutingProvider } from "../lib/routing/providers/types";

function baseRequest(
  overrides: Partial<RoutingRequest> = {},
): RoutingRequest {
  return {
    origin: {
      latitude: 44.8378,
      longitude: -0.5792,
      name: "Bordeaux",
      countryCode: "FR",
    },
    destination: {
      latitude: 48.8566,
      longitude: 2.3522,
      name: "Paris",
      countryCode: "FR",
    },
    waypoints: [],
    mode: "car",
    preference: "fastest",
    departureTime: "now",
    alternatives: 2,
    avoid: { ...DEFAULT_ROUTE_AVOID },
    vehicleProfile: {
      propulsion: "petrol",
      consumptionPer100Km: 6.5,
      fuelPricePerLiter: 1.82,
      electricityConsumptionKwhPer100Km: null,
      electricityPricePerKwh: null,
    },
    locale: "en",
    ...overrides,
  };
}

async function main() {
  // Geofence
  assert.equal(
    isRoutingPointAllowed({ latitude: 48.85, longitude: 2.35, countryCode: "FR" }),
    true,
  );
  assert.equal(
    isRoutingPointAllowed({ latitude: 40.7, longitude: -74.0 }),
    false,
  );
  assert.equal(
    isRouteGeometryAllowed({
      type: "LineString",
      coordinates: [
        [2.35, 48.85],
        [13.4, 52.52],
      ],
    }),
    true,
  );
  assert.ok(
    getDisallowedRouteSegments({
      type: "LineString",
      coordinates: [
        [2.35, 48.85],
        [-74.0, 40.7],
      ],
    }).length > 0,
  );
  assert.equal(areCountriesAllowed(["FR", "DE"]), true);
  assert.equal(areCountriesAllowed(["FR", "US"]), false);

  // Fuel cost: 500 km * 6.5 / 100 * 1.82
  const fuel = estimateFuelOrEnergyCost(500_000, {
    propulsion: "petrol",
    consumptionPer100Km: 6.5,
    fuelPricePerLiter: 1.82,
    electricityConsumptionKwhPer100Km: null,
    electricityPricePerKwh: null,
  });
  assert.ok(fuel);
  assert.equal(fuel.unit, "L");
  assert.equal(fuel.amount, 32.5);
  assert.equal(fuel.costEur, 59.15);

  const energy = estimateFuelOrEnergyCost(100_000, {
    propulsion: "electric",
    consumptionPer100Km: null,
    fuelPricePerLiter: null,
    electricityConsumptionKwhPer100Km: 18,
    electricityPricePerKwh: 0.25,
  });
  assert.ok(energy);
  assert.equal(energy.unit, "kWh");
  assert.equal(energy.amount, 18);
  assert.equal(energy.costEur, 4.5);

  // URL builder uses Routing v1 query-key auth (not Orbis headers)
  const url = buildTomTomRouteUrl(baseRequest(), "secret-key");
  assert.match(url, /[?&]key=secret-key/);
  assert.match(url, /travelMode=car/);
  assert.match(url, /traffic=true/);
  assert.match(url, /maxAlternatives=2/);
  assert.match(url, /sectionType=traffic/);
  assert.match(url, /sectionType=tollRoad/);
  assert.doesNotMatch(url, /NEXT_PUBLIC/);
  assert.doesNotMatch(url, /TomTom-Api-Key/i);

  const bikeUrl = buildTomTomRouteUrl(
    baseRequest({ mode: "bicycle" }),
    "secret-key",
  );
  assert.match(bikeUrl, /travelMode=bicycle/);
  assert.match(bikeUrl, /traffic=false/);

  // Normalization fixture
  const normalized = normalizeTomTomRoutes(
    {
      routes: [
        {
          summary: {
            lengthInMeters: 268000,
            travelTimeInSeconds: 9600,
            trafficDelayInSeconds: 1080,
            noTrafficTravelTimeInSeconds: 8520,
            departureTime: "2026-08-08T10:00:00Z",
            arrivalTime: "2026-08-08T12:40:00Z",
          },
          legs: [
            {
              summary: {
                lengthInMeters: 268000,
                travelTimeInSeconds: 9600,
                trafficDelayInSeconds: 1080,
              },
              points: [
                { latitude: 44.8378, longitude: -0.5792 },
                { latitude: 46.5, longitude: 0.5 },
                { latitude: 48.8566, longitude: 2.3522 },
              ],
            },
          ],
          sections: [
            {
              sectionType: "TOLL_ROAD",
              startPointIndex: 0,
              endPointIndex: 1,
            },
            {
              sectionType: "TRAFFIC",
              startPointIndex: 1,
              endPointIndex: 2,
              magnitudeOfDelay: 2,
              simpleCategory: "JAM",
              delayInSeconds: 600,
            },
            {
              sectionType: "COUNTRY",
              startPointIndex: 0,
              endPointIndex: 2,
              countryCode: "FR",
            },
          ],
          guidance: {
            instructions: [
              {
                message: "Take the A10 toward Paris",
                routeOffsetInMeters: 0,
                point: { latitude: 44.8378, longitude: -0.5792 },
              },
            ],
          },
        },
      ],
    },
    baseRequest(),
  );
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0]!.hasTolls, true);
  assert.equal(normalized[0]!.estimatedCosts.tollExact, null);
  assert.equal(normalized[0]!.trafficDelaySeconds, 1080);
  assert.equal(normalized[0]!.instructions.length, 1);
  assert.ok(normalized[0]!.warnings.some((w) => w.code === "toll_detected"));

  // Identical origin/destination
  assert.throws(
    () =>
      parseRoutingRequestBody({
        origin: { latitude: 48.85, longitude: 2.35 },
        destination: { latitude: 48.85, longitude: 2.35 },
        mode: "car",
      }),
    (error: unknown) =>
      error instanceof RoutingError && error.code === "no_route_found",
  );

  // Outside Europe point
  assert.throws(
    () =>
      parseRoutingRequestBody({
        origin: { latitude: 40.7, longitude: -74 },
        destination: { latitude: 48.85, longitude: 2.35 },
        mode: "car",
      }),
    (error: unknown) =>
      error instanceof RoutingError && error.code === "point_outside_coverage",
  );

  // Shareable route roundtrip
  const encoded = encodeShareableRoute({
    origin: baseRequest().origin,
    destination: baseRequest().destination,
    waypoints: [],
    mode: "car",
    preference: "fastest",
    avoid: { ...DEFAULT_ROUTE_AVOID, tollRoads: true },
    timing: { kind: "depart_now" },
  });
  const decoded = decodeShareableRoute(encoded);
  assert.ok(decoded);
  assert.equal(decoded.mode, "car");
  assert.equal(decoded.avoid.tollRoads, true);

  // Corridor distance
  const line: [number, number][] = [
    [2.35, 48.85],
    [2.36, 48.86],
  ];
  assert.ok(distanceToLineStringMeters(2.351, 48.851, line) < 300);
  const filtered = filterIncidentsAlongRoute(
    [
      {
        id: "near",
        category: "road_traffic",
        hazard: "traffic_jam",
        title: "Jam",
        summary: null,
        severity: "moderate",
        status: "active",
        source: "tomtom",
        officialSourceName: "TomTom",
        officialSourceUrl: null,
        updatedAt: null,
        observedAt: null,
        startsAt: null,
        endsAt: null,
        countryCodes: ["FR"],
        geometry: {
          type: "Point",
          coordinates: [2.351, 48.851],
        },
        centroid: { longitude: 2.351, latitude: 48.851 },
        metadata: {},
      } as never,
    ],
    line,
  );
  assert.equal(filtered.length, 1);

  // Abort via mock provider
  const abortController = new AbortController();
  abortController.abort();
  setRoutingProviderForTests({
    id: "tomtom",
    async getStatus() {
      return "operational";
    },
    async calculateRoute(_request, signal) {
      if (signal?.aborted) {
        throw new RoutingError("aborted", "aborted", 499);
      }
      return { routes: [], provider: "tomtom", calculatedAt: new Date().toISOString() };
    },
  } satisfies RoutingProvider);
  try {
    const { calculateNormalizedRoutes } = await import(
      "../lib/routing/calculateRoute"
    );
    await assert.rejects(
      () => calculateNormalizedRoutes(baseRequest(), abortController.signal),
      (error: unknown) =>
        error instanceof RoutingError && error.code === "aborted",
    );
  } finally {
    setRoutingProviderForTests(null);
  }

  // Misconfigured status
  const previous = process.env.TOMTOM_API_KEY;
  delete process.env.TOMTOM_API_KEY;
  const { tomTomRoutingProvider } = await import(
    "../lib/routing/providers/tomTomRouting"
  );
  assert.equal(await tomTomRoutingProvider.getStatus(), "misconfigured");
  if (previous) process.env.TOMTOM_API_KEY = previous;

  // i18n coverage
  for (const locale of supportedLocales) {
    const messages = getMessages(locale);
    assert.ok(messages.routePlanner.title.length > 0);
    assert.ok(messages.routePlanner.car.length > 0);
    assert.ok(messages.routePlanner.routeToPlace.length > 0);
  }

  console.log("test-routing: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
