import assert from "node:assert/strict";

const ORIGINAL_FETCH = globalThis.fetch;

function clearAmadeusCredentials() {
  delete process.env.AMADEUS_API_KEY;
  delete process.env.AMADEUS_API_SECRET;
  delete process.env.AMADEUS_ENV;
}

function setAmadeusCredentials(key = "test-key", secret = "test-secret") {
  process.env.AMADEUS_API_KEY = key;
  process.env.AMADEUS_API_SECRET = secret;
}

function mockTokenResponse(accessToken: string, expiresIn = 1800, status = 200) {
  return (async () =>
    new Response(
      status === 200
        ? JSON.stringify({ access_token: accessToken, expires_in: expiresIn })
        : JSON.stringify({ error_description: "invalid_client" }),
      { status, headers: { "content-type": "application/json" } },
    )) as typeof fetch;
}

async function testTokenCache() {
  const {
    getAmadeusAccessToken,
    hasAmadeusCredentials,
    resetAmadeusAuthForTests,
    getAmadeusEnvironment,
    getAmadeusBaseUrl,
    AmadeusAuthError,
  } = await import("../lib/routing/flights/amadeusAuth");

  // Environment resolution
  clearAmadeusCredentials();
  assert.equal(getAmadeusEnvironment(), "test");
  assert.equal(getAmadeusBaseUrl(), "https://test.api.amadeus.com");
  process.env.AMADEUS_ENV = "production";
  assert.equal(getAmadeusEnvironment(), "production");
  assert.equal(getAmadeusBaseUrl(), "https://api.amadeus.com");
  delete process.env.AMADEUS_ENV;

  // Misconfigured — no credentials at all
  resetAmadeusAuthForTests();
  assert.equal(hasAmadeusCredentials(), false);
  await assert.rejects(
    () => getAmadeusAccessToken(),
    (err: unknown) => err instanceof AmadeusAuthError && err.kind === "misconfigured",
  );

  // Successful fetch + in-memory cache (second call must not hit fetch again)
  setAmadeusCredentials();
  resetAmadeusAuthForTests();
  let fetchCalls = 0;
  globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
    fetchCalls += 1;
    return mockTokenResponse("tok-cache")(...args);
  }) as typeof fetch;
  try {
    const token1 = await getAmadeusAccessToken();
    assert.equal(token1, "tok-cache");
    assert.equal(fetchCalls, 1);
    const token2 = await getAmadeusAccessToken();
    assert.equal(token2, "tok-cache");
    assert.equal(fetchCalls, 1, "second call should reuse the cached token");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }

  // Concurrent requests dedup into a single in-flight fetch
  resetAmadeusAuthForTests();
  let concurrentFetchCalls = 0;
  globalThis.fetch = (async () => {
    concurrentFetchCalls += 1;
    await new Promise((r) => setTimeout(r, 15));
    return new Response(
      JSON.stringify({ access_token: "tok-concurrent", expires_in: 1800 }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const [a, b] = await Promise.all([getAmadeusAccessToken(), getAmadeusAccessToken()]);
    assert.equal(a, "tok-concurrent");
    assert.equal(b, "tok-concurrent");
    assert.equal(concurrentFetchCalls, 1, "concurrent calls must dedup into one request");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }

  // Authentication error (bad key/secret) is classified, not swallowed
  resetAmadeusAuthForTests();
  globalThis.fetch = mockTokenResponse("", 0, 401);
  try {
    await assert.rejects(
      () => getAmadeusAccessToken(),
      (err: unknown) => err instanceof AmadeusAuthError && err.kind === "authentication_error",
    );
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }

  resetAmadeusAuthForTests();
  clearAmadeusCredentials();
  console.log("  token cache: OK");
}

async function testNormalizeFixtures() {
  const { normalizeAmadeusOffers, parseIso8601Duration, bareFlightPlace } = await import(
    "../lib/routing/flights/normalizeAmadeusOffers"
  );

  assert.equal(parseIso8601Duration("PT2H5M"), 7500);
  assert.equal(parseIso8601Duration("P1DT3H"), 97200);
  assert.equal(parseIso8601Duration("PT45M"), 2700);
  assert.equal(parseIso8601Duration(null), 0);
  assert.equal(parseIso8601Duration("not-a-duration"), 0);

  const placesByIata: Record<string, { name: string; lat: number; lon: number; country: string }> = {
    CDG: { name: "Paris Charles de Gaulle", lat: 49.0097, lon: 2.5479, country: "FR" },
    FRA: { name: "Frankfurt Airport", lat: 50.0379, lon: 8.5622, country: "DE" },
    MAD: { name: "Madrid-Barajas", lat: 40.4983, lon: -3.5676, country: "ES" },
  };
  const resolvePlace = (iataCode: string) => {
    const entry = placesByIata[iataCode];
    if (!entry) return bareFlightPlace(iataCode);
    return {
      iataCode,
      name: entry.name,
      city: null,
      countryCode: entry.country,
      latitude: entry.lat,
      longitude: entry.lon,
    };
  };

  const fixture = {
    data: [
      {
        id: "1",
        numberOfBookableSeats: 4,
        lastTicketingDate: "2026-08-20",
        itineraries: [
          {
            duration: "PT7H30M",
            segments: [
              {
                id: "1",
                departure: { iataCode: "CDG", terminal: "2E", at: "2026-09-01T09:00:00" },
                arrival: { iataCode: "FRA", terminal: "1", at: "2026-09-01T10:30:00" },
                carrierCode: "AF",
                number: "1234",
                aircraft: { code: "320" },
                operating: { carrierCode: "AF" },
                duration: "PT1H30M",
                numberOfStops: 0,
              },
              {
                id: "2",
                departure: { iataCode: "FRA", terminal: "1", at: "2026-09-01T12:00:00" },
                arrival: { iataCode: "MAD", terminal: "4", at: "2026-09-01T14:30:00" },
                carrierCode: "LH",
                number: "5678",
                aircraft: { code: "321" },
                operating: { carrierCode: "LH" },
                duration: "PT2H30M",
                numberOfStops: 0,
              },
            ],
          },
        ],
        price: { currency: "EUR", total: "245.50", grandTotal: "245.50" },
        validatingAirlineCodes: ["AF"],
        travelerPricings: [{ fareDetailsBySegment: [{ cabin: "ECONOMY" }] }],
      },
    ],
    dictionaries: { carriers: { AF: "AIR FRANCE" } },
  };

  const journeys = normalizeAmadeusOffers(fixture, { environment: "test", resolvePlace });
  assert.equal(journeys.length, 1);
  const journey = journeys[0]!;
  assert.equal(journey.segments.length, 2);
  assert.equal(journey.stops, 1);
  assert.equal(journey.durationSeconds, 27000);
  assert.equal(journey.layovers.length, 1);
  assert.equal(journey.layovers[0]!.durationSeconds, 5400);
  assert.equal(journey.layovers[0]!.airport.iataCode, "FRA");
  assert.equal(journey.price?.amount, 245.5);
  assert.equal(journey.price?.currency, "EUR");
  assert.equal(journey.price?.status, "search");
  assert.equal(journey.cabin, "ECONOMY");
  assert.equal(journey.rawOfferId, "1");
  assert.equal(journey.sourceEnvironment, "test");
  // Dictionary entry wins when present.
  assert.equal(journey.segments[0]!.carrierName, "AIR FRANCE");
  // Curated EU_AIRLINE_NAMES fallback when the Amadeus dictionary omits the carrier.
  assert.equal(journey.segments[1]!.carrierName, "Lufthansa");
  assert.equal(journey.segments[0]!.departure.place.name, "Paris Charles de Gaulle");
  assert.equal(journey.segments[0]!.departure.place.latitude, 49.0097);

  // Unknown carrier code must never be invented.
  const unknownCarrierFixture = {
    data: [
      {
        id: "2",
        itineraries: [
          {
            duration: "PT1H0M",
            segments: [
              {
                id: "1",
                departure: { iataCode: "CDG", at: "2026-09-01T09:00:00" },
                arrival: { iataCode: "ORY", at: "2026-09-01T10:00:00" },
                carrierCode: "ZZ",
                number: "1",
              },
            ],
          },
        ],
      },
    ],
  };
  const unknownJourneys = normalizeAmadeusOffers(unknownCarrierFixture, { environment: "test" });
  assert.equal(unknownJourneys[0]!.segments[0]!.carrierName, null);
  assert.equal(unknownJourneys[0]!.price, null);
  assert.equal(unknownJourneys[0]!.segments[0]!.departure.place.name, null);

  // Round trip: two itineraries on the same offer share the offer id + price.
  const roundTripFixture = {
    data: [
      {
        id: "rt-1",
        itineraries: [
          {
            duration: "PT2H0M",
            segments: [
              {
                id: "1",
                departure: { iataCode: "CDG", at: "2026-09-01T09:00:00" },
                arrival: { iataCode: "MAD", at: "2026-09-01T11:00:00" },
                carrierCode: "AF",
                number: "100",
              },
            ],
          },
          {
            duration: "PT2H0M",
            segments: [
              {
                id: "2",
                departure: { iataCode: "MAD", at: "2026-09-08T09:00:00" },
                arrival: { iataCode: "CDG", at: "2026-09-08T11:00:00" },
                carrierCode: "AF",
                number: "101",
              },
            ],
          },
        ],
        price: { currency: "EUR", total: "300.00" },
      },
    ],
  };
  const roundTripJourneys = normalizeAmadeusOffers(roundTripFixture, { environment: "test" });
  assert.equal(roundTripJourneys.length, 2);
  assert.equal(roundTripJourneys[0]!.rawOfferId, "rt-1");
  assert.equal(roundTripJourneys[1]!.rawOfferId, "rt-1");
  assert.equal(roundTripJourneys[0]!.price?.amount, 300);
  assert.equal(roundTripJourneys[1]!.price?.amount, 300);

  console.log("  normalize fixtures: OK");
}

async function testGreatCircleAndAntimeridian() {
  const { greatCircleLine, greatCircleGeometry, splitAtAntimeridian } = await import(
    "../lib/routing/flights/greatCircle"
  );

  // Basic arc: endpoints preserved, correct point count.
  const line = greatCircleLine(2.5479, 49.0097, -3.5676, 40.4983, 32);
  assert.equal(line.length, 33);
  assert.ok(Math.abs(line[0]![0] - 2.5479) < 1e-6);
  assert.ok(Math.abs(line[0]![1] - 49.0097) < 1e-6);
  assert.ok(Math.abs(line[line.length - 1]![0] - -3.5676) < 1e-6);
  assert.ok(Math.abs(line[line.length - 1]![1] - 40.4983) < 1e-6);

  // Identical points shouldn't blow up (degenerate great circle).
  const degenerate = greatCircleLine(10, 45, 10, 45, 10);
  assert.equal(degenerate.length, 2);

  // Antimeridian crossing: consecutive points must stay continuous (no ±360 jump).
  const crossing = greatCircleLine(170, 40, -170, 45, 32);
  for (let i = 1; i < crossing.length; i += 1) {
    const delta = Math.abs(crossing[i]![0] - crossing[i - 1]![0]);
    assert.ok(delta < 180, `unwrapped longitude jumped by ${delta} at index ${i}`);
  }

  const geometry = greatCircleGeometry(170, 40, -170, 45, 32);
  if (geometry.type === "MultiLineString") {
    for (const part of geometry.coordinates) {
      for (const [lon] of part) {
        assert.ok(lon >= -180 && lon <= 180, `MultiLineString longitude out of range: ${lon}`);
      }
    }
  } else {
    // Continuous LineString is also an acceptable, MapLibre-renderable result.
    assert.ok(geometry.coordinates.length >= 2);
  }

  // Direct split test with a crafted continuous crossing.
  const parts = splitAtAntimeridian([
    [170, 40],
    [175, 41],
    [-179, 42],
    [-170, 43],
  ]);
  assert.equal(parts.length, 2);
  for (const part of parts) {
    for (const [lon] of part) {
      assert.ok(lon >= -180 && lon <= 180);
    }
  }
  assert.ok(parts[0]!.at(-1)![0] === 180 || parts[0]!.at(-1)![0] === -180);

  // Non-crossing input must stay a single part.
  const noCrossing = splitAtAntimeridian([
    [2, 48],
    [3, 48.5],
    [4, 49],
  ]);
  assert.equal(noCrossing.length, 1);

  console.log("  great-circle + antimeridian: OK");
}

async function testAirportBuffers() {
  const {
    isConnectionViable,
    isEgressViable,
    connectionMarginMinutes,
    RECOMMENDED_FLIGHT_BUFFERS,
  } = await import("../lib/routing/flights/airportBuffers");

  assert.equal(RECOMMENDED_FLIGHT_BUFFERS.domesticMinutes, 90);
  assert.equal(RECOMMENDED_FLIGHT_BUFFERS.internationalMinutes, 120);
  assert.equal(RECOMMENDED_FLIGHT_BUFFERS.egressMinutes, 45);

  assert.equal(
    isConnectionViable("2026-09-01T08:00:00Z", "2026-09-01T10:00:00Z", 90),
    true,
  );
  assert.equal(
    isConnectionViable("2026-09-01T09:30:00Z", "2026-09-01T10:00:00Z", 90),
    false,
  );
  assert.equal(isConnectionViable(null, "2026-09-01T10:00:00Z", 90), false);
  assert.equal(isConnectionViable("2026-09-01T08:00:00Z", null, 90), false);

  assert.equal(
    isEgressViable("2026-09-01T10:00:00Z", "2026-09-01T10:50:00Z", 45),
    true,
  );
  assert.equal(
    isEgressViable("2026-09-01T10:00:00Z", "2026-09-01T10:20:00Z", 45),
    false,
  );

  assert.equal(
    connectionMarginMinutes("2026-09-01T08:00:00Z", "2026-09-01T09:30:00Z"),
    90,
  );
  assert.equal(connectionMarginMinutes(null, "2026-09-01T09:30:00Z"), null);
  assert.equal(connectionMarginMinutes("not-a-date", "2026-09-01T09:30:00Z"), null);

  console.log("  airport buffers: OK");
}

async function testFlightScore() {
  const { sortOffers, recommendedScore } = await import("../lib/routing/flights/flightScore");

  type FlightJourney = import("../lib/routing/flights/types").FlightJourney;

  function journey(overrides: Partial<FlightJourney> & { id: string }): FlightJourney {
    return {
      segments: [],
      durationSeconds: 3600,
      stops: 0,
      layovers: [],
      price: null,
      cabin: null,
      validatingAirlineCodes: [],
      bookableSeats: null,
      lastTicketingDate: null,
      sourceEnvironment: "test",
      rawOfferId: overrides.id,
      rawOffer: null,
      ...overrides,
    };
  }

  const cheapSlow = journey({
    id: "cheap-slow",
    durationSeconds: 5 * 3600,
    stops: 1,
    price: { amount: 80, currency: "EUR", status: "search", source: "amadeus" },
  });
  const pricyFast = journey({
    id: "pricy-fast",
    durationSeconds: 2 * 3600,
    stops: 0,
    price: { amount: 400, currency: "EUR", status: "search", source: "amadeus" },
  });
  const noPrice = journey({
    id: "no-price",
    durationSeconds: 3 * 3600,
    stops: 0,
    price: null,
  });

  const byCheapest = sortOffers([pricyFast, cheapSlow, noPrice], "cheapest");
  assert.deepEqual(byCheapest.map((j) => j.id), ["cheap-slow", "pricy-fast", "no-price"]);

  const byFastest = sortOffers([cheapSlow, pricyFast, noPrice], "fastest");
  assert.deepEqual(byFastest.map((j) => j.id), ["pricy-fast", "no-price", "cheap-slow"]);

  // sortOffers never mutates its input.
  const input = [cheapSlow, pricyFast, noPrice];
  const inputCopy = input.slice();
  sortOffers(input, "recommended");
  assert.deepEqual(input, inputCopy);

  // Determinism: same input, same output, every time.
  const runA = sortOffers(input, "recommended").map((j) => j.id);
  const runB = sortOffers(input, "recommended").map((j) => j.id);
  assert.deepEqual(runA, runB);

  // More stops must never score better than an otherwise-identical nonstop.
  const nonstop = journey({ id: "nonstop", durationSeconds: 3600, stops: 0 });
  const oneStop = journey({ id: "onestop", durationSeconds: 3600, stops: 1 });
  assert.ok(recommendedScore(oneStop) > recommendedScore(nonstop));

  console.log("  flight score: OK");
}

async function testProviderMisconfigured() {
  const { amadeusFlightProvider } = await import(
    "../lib/routing/flights/providers/amadeusFlightProvider"
  );
  const { resetAmadeusAuthForTests } = await import("../lib/routing/flights/amadeusAuth");

  clearAmadeusCredentials();
  resetAmadeusAuthForTests();
  assert.equal(await amadeusFlightProvider.getStatus(), "misconfigured");

  setAmadeusCredentials();
  resetAmadeusAuthForTests();
  globalThis.fetch = mockTokenResponse("tok-status");
  try {
    assert.equal(await amadeusFlightProvider.getStatus(), "operational");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }

  resetAmadeusAuthForTests();
  globalThis.fetch = mockTokenResponse("", 0, 401);
  try {
    assert.equal(await amadeusFlightProvider.getStatus(), "authentication_error");
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }

  resetAmadeusAuthForTests();
  clearAmadeusCredentials();
  console.log("  provider misconfigured/operational/authentication_error: OK");
}

async function testAirportResolver() {
  clearAmadeusCredentials();
  const { resetAmadeusAuthForTests } = await import("../lib/routing/flights/amadeusAuth");
  resetAmadeusAuthForTests();

  const { resolveByIata, airportsForCity, resolveAirportsForPlace, haversineDistanceKm } =
    await import("../lib/routing/flights/airportResolver");

  const cdg = resolveByIata("CDG");
  assert.ok(cdg);
  assert.equal(cdg!.source, "curated");
  assert.equal(cdg!.iataCode, "CDG");

  const bod = resolveByIata("BOD");
  assert.ok(bod, "Bordeaux–Mérignac (BOD) must resolve from the curated list");
  assert.equal(bod!.icaoCode, "LFBD");

  assert.equal(resolveByIata("ZZZ"), null);

  const parisAirports = airportsForCity("Paris");
  const parisIatas = parisAirports.map((a) => a.iataCode).sort();
  assert.deepEqual(parisIatas, ["CDG", "ORY"]);

  const distanceCdgOry = haversineDistanceKm(49.0097, 2.5479, 48.7233, 2.3794);
  assert.ok(distanceCdgOry > 20 && distanceCdgOry < 50);

  const resolved = await resolveAirportsForPlace({
    latitude: 48.8566,
    longitude: 2.3522,
    name: "Paris",
  });
  assert.ok(resolved.length >= 1 && resolved.length <= 3);
  assert.ok(resolved.some((a) => a.iataCode === "CDG" || a.iataCode === "ORY"));

  const byIataHint = await resolveAirportsForPlace({
    latitude: 44.8283,
    longitude: -0.7156,
    iataHint: "BOD",
  });
  assert.equal(byIataHint[0]!.iataCode, "BOD");

  console.log("  airport resolver: OK");
}

async function main() {
  console.log("test:flights");
  await testTokenCache();
  await testNormalizeFixtures();
  await testGreatCircleAndAntimeridian();
  await testAirportBuffers();
  await testFlightScore();
  await testProviderMisconfigured();
  await testAirportResolver();
  globalThis.fetch = ORIGINAL_FETCH;
  console.log("test:flights OK");
}

main().catch((error) => {
  globalThis.fetch = ORIGINAL_FETCH;
  console.error(error);
  process.exit(1);
});
