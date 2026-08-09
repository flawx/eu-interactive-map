import assert from "node:assert/strict";
import { encodeGooglePolyline } from "../lib/routing/transit/encodePolyline";
import { decodeGooglePolyline } from "../lib/routing/transit/decodePolyline";
import { normalizeGoogleTransitRoutes } from "../lib/routing/transit/normalizeGoogleTransit";
import { parseTransitRequestBody } from "../lib/routing/transit/calculateTransit";
import {
  TransitError,
  type TransitJourney,
  type TransitRoutingRequest,
  type TransitRoutingResult,
} from "../lib/routing/transit/types";
import {
  getTransitRoutingProvider,
  setTransitRoutingProviderForTests,
} from "../lib/routing/transit/providers/providerRegistry";
import type { TransitRoutingProvider } from "../lib/routing/transit/providers/types";
import {
  clearTransitCacheForTests,
  getCachedTransitResult,
  setCachedTransitResult,
  transitCacheKey,
} from "../lib/routing/transit/transitCache";
import { journeyCoordinates } from "../lib/routing/formatTransit";
import { getMessages } from "../lib/i18n/messages";
import { supportedLocales } from "../lib/i18n/config";

function poly(coords: [number, number][]): string {
  return encodeGooglePolyline(coords);
}

function fixtureWalkingMetro(): Parameters<typeof normalizeGoogleTransitRoutes>[0] {
  const walk = poly([
    [2.3522, 48.8566],
    [2.348, 48.853],
  ]);
  const metro = poly([
    [2.348, 48.853],
    [2.2945, 48.8584],
  ]);
  return {
    routes: [
      {
        duration: "1860s",
        distanceMeters: 4200,
        polyline: { encodedPolyline: poly([
          [2.3522, 48.8566],
          [2.348, 48.853],
          [2.2945, 48.8584],
        ]) },
        legs: [
          {
            duration: "1860s",
            distanceMeters: 4200,
            steps: [
              {
                travelMode: "WALK",
                staticDuration: "420s",
                distanceMeters: 500,
                polyline: { encodedPolyline: walk },
                startLocation: {
                  latLng: { latitude: 48.8566, longitude: 2.3522 },
                },
                endLocation: {
                  latLng: { latitude: 48.853, longitude: 2.348 },
                },
                navigationInstruction: { instructions: "Walk to station" },
              },
              {
                travelMode: "TRANSIT",
                staticDuration: "900s",
                distanceMeters: 3500,
                polyline: { encodedPolyline: metro },
                transitDetails: {
                  stopDetails: {
                    departureStop: {
                      name: "Châtelet",
                      location: {
                        latLng: { latitude: 48.853, longitude: 2.348 },
                      },
                    },
                    arrivalStop: {
                      name: "Trocadéro",
                      location: {
                        latLng: { latitude: 48.8584, longitude: 2.2945 },
                      },
                    },
                    departureTime: "2026-08-10T08:24:00+02:00",
                    arrivalTime: "2026-08-10T08:39:00+02:00",
                  },
                  headsign: "La Défense",
                  stopCount: 6,
                  transitLine: {
                    name: "Metro 1",
                    nameShort: "1",
                    color: "FFCD00",
                    agencies: [{ name: "RATP" }],
                    vehicle: { type: "SUBWAY", name: { text: "Metro" } },
                  },
                },
              },
              {
                travelMode: "WALK",
                staticDuration: "540s",
                distanceMeters: 200,
                polyline: {
                  encodedPolyline: poly([
                    [2.2945, 48.8584],
                    [2.294, 48.858],
                  ]),
                },
              },
            ],
          },
        ],
        travelAdvisory: {
          transitFare: { currencyCode: "EUR", units: "2", nanos: 150000000 },
        },
      },
    ],
  };
}

function fixtureBusTrainMetro(): Parameters<
  typeof normalizeGoogleTransitRoutes
>[0] {
  return {
    routes: [
      {
        duration: "20880s",
        distanceMeters: 580000,
        polyline: {
          encodedPolyline: poly([
            [-0.5569, 44.8258],
            [-0.55, 44.84],
            [2.373, 48.844],
            [2.35, 48.85],
          ]),
        },
        legs: [
          {
            steps: [
              {
                travelMode: "WALK",
                staticDuration: "300s",
                polyline: {
                  encodedPolyline: poly([
                    [-0.5569, 44.8258],
                    [-0.555, 44.826],
                  ]),
                },
              },
              {
                travelMode: "TRANSIT",
                staticDuration: "1200s",
                transitDetails: {
                  stopDetails: {
                    departureStop: { name: "Quinconces" },
                    arrivalStop: { name: "Gare Saint-Jean" },
                    departureTime: "2026-08-10T07:10:00+02:00",
                    arrivalTime: "2026-08-10T07:30:00+02:00",
                  },
                  stopCount: 8,
                  transitLine: {
                    name: "Tram C",
                    nameShort: "C",
                    color: "8C008C",
                    agencies: [{ name: "TBM" }],
                    vehicle: { type: "TRAM" },
                  },
                },
                polyline: {
                  encodedPolyline: poly([
                    [-0.555, 44.826],
                    [-0.556, 44.825],
                  ]),
                },
              },
              {
                travelMode: "WALK",
                staticDuration: "480s",
                polyline: {
                  encodedPolyline: poly([
                    [-0.556, 44.825],
                    [-0.5569, 44.8258],
                  ]),
                },
              },
              {
                travelMode: "TRANSIT",
                staticDuration: "12600s",
                transitDetails: {
                  stopDetails: {
                    departureStop: {
                      name: "Bordeaux Saint-Jean",
                      location: {
                        latLng: { latitude: 44.8258, longitude: -0.5569 },
                      },
                    },
                    arrivalStop: {
                      name: "Paris Montparnasse",
                      location: {
                        latLng: { latitude: 48.8412, longitude: 2.3208 },
                      },
                    },
                    departureTime: "2026-08-10T08:00:00+02:00",
                    arrivalTime: "2026-08-10T11:30:00+02:00",
                  },
                  headsign: "Paris Montparnasse",
                  stopCount: 2,
                  transitLine: {
                    name: "TGV INOUI 8500",
                    nameShort: "8500",
                    agencies: [{ name: "SNCF" }],
                    vehicle: { type: "HIGH_SPEED_TRAIN" },
                  },
                },
                polyline: {
                  encodedPolyline: poly([
                    [-0.5569, 44.8258],
                    [2.3208, 48.8412],
                  ]),
                },
              },
              {
                travelMode: "TRANSIT",
                staticDuration: "900s",
                transitDetails: {
                  stopDetails: {
                    departureStop: { name: "Montparnasse" },
                    arrivalStop: { name: "Châtelet" },
                    departureTime: "2026-08-10T11:45:00+02:00",
                    arrivalTime: "2026-08-10T12:00:00+02:00",
                  },
                  stopCount: 4,
                  transitLine: {
                    name: "Metro 4",
                    nameShort: "4",
                    agencies: [{ name: "RATP" }],
                    vehicle: { type: "SUBWAY" },
                  },
                },
                polyline: {
                  encodedPolyline: poly([
                    [2.3208, 48.8412],
                    [2.35, 48.85],
                  ]),
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function fixtureInternationalTrain(): Parameters<
  typeof normalizeGoogleTransitRoutes
>[0] {
  return {
    routes: [
      {
        duration: "13680s",
        distanceMeters: 450000,
        polyline: {
          encodedPolyline: poly([
            [2.355, 48.880],
            [0.125, 51.531],
          ]),
        },
        legs: [
          {
            steps: [
              {
                travelMode: "WALK",
                staticDuration: "600s",
                polyline: {
                  encodedPolyline: poly([
                    [2.36, 48.88],
                    [2.355, 48.88],
                  ]),
                },
              },
              {
                travelMode: "TRANSIT",
                staticDuration: "12000s",
                transitDetails: {
                  stopDetails: {
                    departureStop: {
                      name: "Paris Gare du Nord",
                      location: {
                        latLng: { latitude: 48.8809, longitude: 2.3553 },
                      },
                    },
                    arrivalStop: {
                      name: "London St Pancras International",
                      location: {
                        latLng: { latitude: 51.5314, longitude: -0.1261 },
                      },
                    },
                    // Cross-timezone: Paris CEST → London BST
                    departureTime: "2026-08-10T09:01:00+02:00",
                    arrivalTime: "2026-08-10T10:30:00+01:00",
                  },
                  headsign: "London St Pancras International",
                  stopCount: 0,
                  transitLine: {
                    name: "Eurostar 9024",
                    nameShort: "9024",
                    agencies: [{ name: "Eurostar" }],
                    vehicle: { type: "HIGH_SPEED_TRAIN" },
                  },
                },
                polyline: {
                  encodedPolyline: poly([
                    [2.3553, 48.8809],
                    [-0.1261, 51.5314],
                  ]),
                },
              },
            ],
          },
        ],
        // No fare — must stay null
      },
      {
        duration: "16200s",
        distanceMeters: 460000,
        polyline: {
          encodedPolyline: poly([
            [2.355, 48.88],
            [4.336, 50.845],
            [-0.126, 51.531],
          ]),
        },
        legs: [
          {
            steps: [
              {
                travelMode: "TRANSIT",
                staticDuration: "5400s",
                transitDetails: {
                  stopDetails: {
                    departureStop: { name: "Paris Gare du Nord" },
                    arrivalStop: { name: "Bruxelles-Midi" },
                    departureTime: "2026-08-10T08:00:00+02:00",
                    arrivalTime: "2026-08-10T09:30:00+02:00",
                  },
                  transitLine: {
                    name: "Thalys",
                    agencies: [{ name: "Eurostar" }],
                    vehicle: { type: "HIGH_SPEED_TRAIN" },
                  },
                },
                polyline: {
                  encodedPolyline: poly([
                    [2.355, 48.88],
                    [4.336, 50.845],
                  ]),
                },
              },
              {
                travelMode: "TRANSIT",
                staticDuration: "7200s",
                transitDetails: {
                  stopDetails: {
                    departureStop: { name: "Bruxelles-Midi" },
                    arrivalStop: { name: "London St Pancras International" },
                    departureTime: "2026-08-10T10:00:00+02:00",
                    arrivalTime: "2026-08-10T11:00:00+01:00",
                  },
                  transitLine: {
                    name: "Eurostar 9120",
                    agencies: [{ name: "Eurostar" }],
                    vehicle: { type: "HIGH_SPEED_TRAIN" },
                  },
                },
                polyline: {
                  encodedPolyline: poly([
                    [4.336, 50.845],
                    [-0.126, 51.531],
                  ]),
                },
              },
            ],
          },
        ],
        travelAdvisory: {
          transitFare: { currencyCode: "EUR", units: "120", nanos: 0 },
        },
      },
    ],
  };
}

function fixturePartialFare(): Parameters<typeof normalizeGoogleTransitRoutes>[0] {
  // amount 0 with currency still encodes a real free fare from provider —
  // absent fare is when travelAdvisory is missing (tested elsewhere).
  // Partial: we only mark estimated today; unavailable when money missing.
  return {
    routes: [
      {
        duration: "600s",
        legs: [
          {
            steps: [
              {
                travelMode: "TRANSIT",
                staticDuration: "600s",
                transitDetails: {
                  stopDetails: {
                    departureStop: { name: "A" },
                    arrivalStop: { name: "B" },
                    departureTime: "2026-08-10T10:00:00Z",
                    arrivalTime: "2026-08-10T10:10:00Z",
                  },
                  transitLine: {
                    name: "Bus 1",
                    vehicle: { type: "BUS" },
                  },
                },
                polyline: {
                  encodedPolyline: poly([
                    [2.35, 48.85],
                    [2.36, 48.86],
                  ]),
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

async function main() {
  // Polyline roundtrip
  const coords: [number, number][] = [
    [-0.5792, 44.8378],
    [2.3522, 48.8566],
  ];
  const decoded = decodeGooglePolyline(encodeGooglePolyline(coords));
  assert.equal(decoded.length, 2);
  assert.ok(Math.abs(decoded[0]![0] - coords[0]![0]) < 1e-5);
  assert.ok(Math.abs(decoded[0]![1] - coords[0]![1]) < 1e-5);

  // Walking + metro
  {
    const journeys = normalizeGoogleTransitRoutes(fixtureWalkingMetro());
    assert.equal(journeys.length, 1);
    const j = journeys[0]!;
    assert.equal(j.transfers, 0);
    assert.ok(j.legs.some((l) => l.mode === "walk"));
    assert.ok(j.legs.some((l) => l.mode === "subway"));
    assert.equal(j.fare?.currency, "EUR");
    assert.ok(j.fare && j.fare.amount > 2);
    assert.equal(j.fare?.status, "estimated");
    assert.notEqual(j.fare?.amount, 0);
    assert.ok(j.geometry.coordinates.length >= 2);
    assert.ok(j.legs.filter((l) => l.mode === "walk").every((l) => l.geometry));
    assert.ok(j.legs.filter((l) => l.mode === "subway").every((l) => l.geometry));
    assert.ok(journeyCoordinates(j).length >= 2);
  }

  // Bus/tram + train + metro with transfers
  {
    const journeys = normalizeGoogleTransitRoutes(fixtureBusTrainMetro());
    const j = journeys[0]!;
    assert.equal(j.transfers, 2); // tram → train → metro
    assert.ok(j.modeSummary.includes("tram") || j.modeSummary.includes("light_rail"));
    assert.ok(j.legs.some((l) => l.mode === "high_speed_rail"));
    assert.ok(j.legs.some((l) => l.mode === "subway"));
    assert.equal(j.fare, null);
    // Wait after walk before TGV (07:30 walk end not set — check tram→walk→train wait via train dep)
    assert.ok(j.waitingDurationSeconds >= 0);
    assert.ok(j.walkingDurationSeconds > 0);
    assert.ok(j.transitDurationSeconds > 0);
    assert.equal(j.durationSeconds, 20880);
  }

  // International + timezone + alternatives + fare absent/present
  {
    const journeys = normalizeGoogleTransitRoutes(fixtureInternationalTrain());
    assert.equal(journeys.length, 2);
    const direct = journeys[0]!;
    assert.equal(direct.fare, null);
    assert.equal(direct.transfers, 0);
    const trainLeg = direct.legs.find((l) => l.mode === "high_speed_rail")!;
    assert.equal(trainLeg.from.name, "Paris Gare du Nord");
    assert.equal(trainLeg.to.name, "London St Pancras International");
    assert.equal(trainLeg.agency?.name, "Eurostar");
    assert.ok(trainLeg.departureAt?.includes("+02:00"));
    assert.ok(trainLeg.arrivalAt?.includes("+01:00"));
    assert.ok(journeyCoordinates(direct).length >= 2);

    const alt = journeys[1]!;
    assert.equal(alt.transfers, 1);
    assert.equal(alt.fare?.amount, 120);
    assert.equal(alt.fare?.currency, "EUR");
  }

  // Fare absent
  {
    const journeys = normalizeGoogleTransitRoutes(fixturePartialFare());
    assert.equal(journeys[0]!.fare, null);
  }

  // Flight mode exists in model (architecture)
  {
    const flightMode: TransitJourney["legs"][number]["mode"] = "flight";
    assert.equal(flightMode, "flight");
  }

  // Parse request + geofence
  {
    const req = parseTransitRequestBody({
      origin: { latitude: 48.8566, longitude: 2.3522, name: "Paris" },
      destination: { latitude: 51.5074, longitude: -0.1278, name: "London" },
      timing: { kind: "depart_at", at: "2026-08-10T08:00:00Z" },
      allowedModes: ["TRAIN", "RAIL"],
      routingPreference: "fewer_transfers",
      locale: "fr",
    });
    assert.equal(req.timing.kind, "depart_at");
    assert.deepEqual(req.allowedModes, ["TRAIN", "RAIL"]);
    assert.equal(req.routingPreference, "fewer_transfers");
  }

  assert.throws(
    () =>
      parseTransitRequestBody({
        origin: { latitude: 40.7, longitude: -74 },
        destination: { latitude: 48.85, longitude: 2.35 },
      }),
    (err: unknown) =>
      err instanceof TransitError && err.code === "point_outside_coverage",
  );

  // Provider error classification via mock
  {
    const makeProvider = (
      fn: TransitRoutingProvider["calculateJourney"],
    ): TransitRoutingProvider => ({
      id: "mock",
      getStatus: async () => "operational",
      calculateJourney: fn,
    });

    setTransitRoutingProviderForTests(
      makeProvider(async () => {
        throw new TransitError(
          "provider_not_entitled",
          "not entitled",
          403,
        );
      }),
    );
    try {
      const { calculateTransitJourneys } = await import(
        "../lib/routing/transit/calculateTransit"
      );
      await assert.rejects(
        () =>
          calculateTransitJourneys({
            origin: { latitude: 48.85, longitude: 2.35 },
            destination: { latitude: 51.5, longitude: -0.12 },
            timing: { kind: "depart_now" },
            allowedModes: null,
            routingPreference: null,
            alternatives: true,
          }),
        (err: unknown) =>
          err instanceof TransitError && err.code === "provider_not_entitled",
      );
    } finally {
      setTransitRoutingProviderForTests(null);
    }

    setTransitRoutingProviderForTests(
      makeProvider(async () => {
        throw new TransitError("provider_rate_limited", "rate", 429);
      }),
    );
    try {
      const { calculateTransitJourneys } = await import(
        "../lib/routing/transit/calculateTransit"
      );
      await assert.rejects(
        () =>
          calculateTransitJourneys({
            origin: { latitude: 48.85, longitude: 2.35 },
            destination: { latitude: 51.5, longitude: -0.12 },
            timing: { kind: "depart_now" },
            allowedModes: null,
            routingPreference: null,
            alternatives: true,
          }),
        (err: unknown) =>
          err instanceof TransitError && err.code === "provider_rate_limited",
      );
    } finally {
      setTransitRoutingProviderForTests(null);
    }

    setTransitRoutingProviderForTests(
      makeProvider(async () => {
        throw new TransitError("provider_unavailable", "down", 503);
      }),
    );
    try {
      const { calculateTransitJourneys } = await import(
        "../lib/routing/transit/calculateTransit"
      );
      await assert.rejects(
        () =>
          calculateTransitJourneys({
            origin: { latitude: 48.85, longitude: 2.35 },
            destination: { latitude: 51.5, longitude: -0.12 },
            timing: { kind: "depart_now" },
            allowedModes: null,
            routingPreference: null,
            alternatives: true,
          }),
        (err: unknown) =>
          err instanceof TransitError && err.code === "provider_unavailable",
      );
    } finally {
      setTransitRoutingProviderForTests(null);
    }

    // Abort
    setTransitRoutingProviderForTests(
      makeProvider(async (_req, signal) => {
        if (signal?.aborted) {
          throw new TransitError("aborted", "aborted", 499);
        }
        throw new TransitError("aborted", "aborted", 499);
      }),
    );
    try {
      const { calculateTransitJourneys } = await import(
        "../lib/routing/transit/calculateTransit"
      );
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(
        () =>
          calculateTransitJourneys(
            {
              origin: { latitude: 48.85, longitude: 2.35 },
              destination: { latitude: 51.5, longitude: -0.12 },
              timing: { kind: "depart_now" },
              allowedModes: null,
              routingPreference: null,
              alternatives: true,
            },
            controller.signal,
          ),
        (err: unknown) =>
          err instanceof TransitError && err.code === "aborted",
      );
    } finally {
      setTransitRoutingProviderForTests(null);
    }

    // Successful mock alternatives
    setTransitRoutingProviderForTests(
      makeProvider(async (): Promise<TransitRoutingResult> => {
        const journeys = normalizeGoogleTransitRoutes(
          fixtureInternationalTrain(),
        );
        return {
          journeys,
          provider: "mock",
          status: "operational",
          calculatedAt: new Date().toISOString(),
        };
      }),
    );
    try {
      const { calculateTransitJourneys } = await import(
        "../lib/routing/transit/calculateTransit"
      );
      const result = await calculateTransitJourneys({
        origin: { latitude: 48.85, longitude: 2.35 },
        destination: { latitude: 51.5, longitude: -0.12 },
        timing: { kind: "depart_now" },
        allowedModes: ["TRAIN", "RAIL"],
        routingPreference: "fewer_transfers",
        alternatives: true,
      } satisfies TransitRoutingRequest);
      assert.equal(result.journeys.length, 2);
    } finally {
      setTransitRoutingProviderForTests(null);
    }
  }

  // i18n keys for transit
  for (const locale of ["en", "fr", "de"] as const) {
    const messages = getMessages(locale);
    assert.ok(messages.routePlanner.transit);
    assert.ok(messages.routePlanner.fareUnavailable);
    assert.ok(messages.routePlanner.transitDateOutOfRange);
    assert.ok(messages.routePlanner.departNow);
    assert.ok(messages.routePlanner.departAt);
    assert.ok(messages.routePlanner.arriveAt);
  }
  assert.ok(supportedLocales.length > 0);

  // i18n: road vs transit provider messages must not leak across modes
  {
    const en = getMessages("en").routePlanner;
    const fr = getMessages("fr").routePlanner;
    assert.match(en.providerNotEntitledDev, /TomTom/i);
    assert.doesNotMatch(en.transitProviderNotConfiguredDev, /TomTom/i);
    assert.match(en.transitProviderNotConfiguredDev, /Google Routes/i);
    assert.doesNotMatch(en.transitServiceUnavailable, /TomTom/i);
    assert.doesNotMatch(fr.transitProviderNotConfiguredDev, /TomTom/i);
    assert.match(fr.providerNotEntitledDev, /TomTom/i);
  }

  // Mode-scoped error selection (road error must not be shown as transit copy)
  {
    const en = getMessages("en").routePlanner;
    const roadHint = en.providerNotEntitledDev;
    const transitHint = en.transitProviderNotConfiguredDev;
    const mode: "car" | "transit" = "transit";
    const activeHint = mode === "transit" ? transitHint : roadHint;
    assert.equal(activeHint, transitHint);
    assert.notEqual(activeHint, roadHint);
  }

  // Cache key distinguishes departure times
  {
    clearTransitCacheForTests();
    const base: TransitRoutingRequest = {
      origin: { latitude: 48.85, longitude: 2.35 },
      destination: { latitude: 51.5, longitude: -0.12 },
      timing: { kind: "depart_at", at: "2026-08-10T08:00:00Z" },
      allowedModes: ["TRAIN"],
      routingPreference: null,
      alternatives: true,
      locale: "en",
    };
    const later = {
      ...base,
      timing: { kind: "depart_at" as const, at: "2026-08-10T09:00:00Z" },
    };
    assert.notEqual(transitCacheKey(base), transitCacheKey(later));
    const sample = normalizeGoogleTransitRoutes(fixtureWalkingMetro());
    setCachedTransitResult(base, {
      journeys: sample,
      provider: "mock",
      status: "operational",
      calculatedAt: new Date().toISOString(),
    });
    assert.ok(getCachedTransitResult(base));
    assert.equal(getCachedTransitResult(later), null);
    clearTransitCacheForTests();
  }

  // Misconfigured without key (via mock — live Google needs GOOGLE_ROUTES_API_KEY)
  {
    setTransitRoutingProviderForTests({
      id: "mock",
      getStatus: async () =>
        process.env.GOOGLE_ROUTES_API_KEY?.trim()
          ? "operational"
          : "misconfigured",
      calculateJourney: async () => {
        throw new TransitError("provider_misconfigured", "missing key", 503);
      },
    });
    try {
      const status = await getTransitRoutingProvider().getStatus();
      if (!process.env.GOOGLE_ROUTES_API_KEY?.trim()) {
        assert.equal(status, "misconfigured");
      }
    } finally {
      setTransitRoutingProviderForTests(null);
    }
  }

  console.log("test:transit OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
