/**
 * Offline unit tests for the SerpApi Google Flights integration: normalizer
 * fixtures (direct / 1-stop / multi-stop / layovers / price / no-price /
 * airline / flight number), geodesic + antimeridian geometry, connection
 * buffers, deterministic scoring (recommended sort preserves best_flights
 * ranking), provider misconfiguration, cache dedup, and abort handling.
 *
 * No live network calls, no Amadeus references — SerpApi Google Flights is
 * the only flight provider in this tree.
 */
import assert from "node:assert/strict";

const ORIGINAL_FETCH = globalThis.fetch;

function clearSerpApiCredentials() {
  delete process.env.SERPAPI_API_KEY;
}

function setSerpApiCredentials(key = "test-key") {
  process.env.SERPAPI_API_KEY = key;
}

async function testNormalizeFixtures() {
  const {
    normalizeSerpApiFlights,
    bareFlightPlace,
    toLocalIsoLikeString,
    parseFlightNumber,
  } = await import("../lib/routing/flights/normalizeSerpApiFlights");
  type SerpApiGoogleFlightsSearchResult =
    import("../lib/routing/flights/normalizeSerpApiFlights").SerpApiGoogleFlightsSearchResult;

  // Local-time string handling: never invent a "Z"/UTC offset.
  assert.equal(toLocalIsoLikeString("2026-09-01 09:00"), "2026-09-01T09:00:00");
  assert.equal(toLocalIsoLikeString("2026-09-01T09:00:00"), "2026-09-01T09:00:00");
  assert.ok(!toLocalIsoLikeString("2026-09-01 09:00").includes("Z"));
  assert.equal(toLocalIsoLikeString(null), "");

  assert.deepEqual(parseFlightNumber("AF 1404"), { carrierCode: "AF", flightNumber: "1404" });
  assert.deepEqual(parseFlightNumber("TO 3950"), { carrierCode: "TO", flightNumber: "3950" });
  assert.deepEqual(parseFlightNumber(null), { carrierCode: "", flightNumber: "" });

  assert.equal(bareFlightPlace("cdg").iataCode, "CDG");
  assert.equal(bareFlightPlace("cdg").name, null);

  const placesByIata: Record<string, { name: string; lat: number; lon: number; country: string }> = {
    CDG: { name: "Paris Charles de Gaulle", lat: 49.0097, lon: 2.5479, country: "FR" },
    FCO: { name: "Rome Fiumicino", lat: 41.8003, lon: 12.2389, country: "IT" },
    ORY: { name: "Paris Orly", lat: 48.7233, lon: 2.3794, country: "FR" },
    MXP: { name: "Milan Malpensa", lat: 45.63, lon: 8.7231, country: "IT" },
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

  const fixture: SerpApiGoogleFlightsSearchResult = {
    best_flights: [
      {
        // Direct flight, with price + booking token + carbon emissions.
        flights: [
          {
            departure_airport: { name: "Paris Charles de Gaulle", id: "CDG", time: "2026-09-01 09:00" },
            arrival_airport: { name: "Rome Fiumicino", id: "FCO", time: "2026-09-01 11:05" },
            duration: 125,
            airplane: "Airbus A320neo",
            airline: "Air France",
            airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/AF.png",
            travel_class: "Economy",
            flight_number: "AF 1404",
          },
        ],
        total_duration: 125,
        carbon_emissions: { this_flight: 89000, typical_for_this_route: 146000, difference_percent: -39 },
        price: 109,
        type: "One way",
        airline_logo: "https://www.gstatic.com/flights/airline_logos/70px/AF.png",
        booking_token: "TOKEN123",
      },
    ],
    other_flights: [
      {
        // 1-stop with a layover, no price (must not be invented).
        flights: [
          {
            departure_airport: { name: "Paris Orly", id: "ORY", time: "2026-09-01 07:00" },
            arrival_airport: { name: "Milan Malpensa", id: "MXP", time: "2026-09-01 08:40" },
            duration: 100,
            airline: "ITA Airways",
            travel_class: "Economy",
            flight_number: "AZ 312",
          },
          {
            departure_airport: { name: "Milan Malpensa", id: "MXP", time: "2026-09-01 10:10" },
            arrival_airport: { name: "Rome Fiumicino", id: "FCO", time: "2026-09-01 11:15" },
            duration: 65,
            airline: "ITA Airways",
            travel_class: "Economy",
            flight_number: "AZ 1478",
          },
        ],
        layovers: [{ duration: 90, name: "Milan Malpensa", id: "MXP" }],
        total_duration: 255,
        type: "One way",
      },
      {
        // 2-stop itinerary, overnight layover, unknown carrier code.
        flights: [
          {
            departure_airport: { id: "CDG", time: "2026-09-01 22:00" },
            arrival_airport: { id: "ATH", time: "2026-09-02 02:10" },
            duration: 190,
            flight_number: "ZZ 100",
            overnight: true,
          },
          {
            departure_airport: { id: "ATH", time: "2026-09-02 10:00" },
            arrival_airport: { id: "IST", time: "2026-09-02 11:20" },
            duration: 80,
            flight_number: "ZZ 200",
          },
          {
            departure_airport: { id: "IST", time: "2026-09-02 13:00" },
            arrival_airport: { id: "FCO", time: "2026-09-02 15:30" },
            duration: 150,
            flight_number: "ZZ 300",
          },
        ],
        layovers: [
          { duration: 470, name: "Athens", id: "ATH", overnight: true },
          { duration: 100, name: "Istanbul", id: "IST" },
        ],
        total_duration: 990,
        price: 340,
      },
    ],
  };

  const journeys = normalizeSerpApiFlights(fixture, { currency: "EUR", resolvePlace });
  assert.equal(journeys.length, 3);

  // --- Direct flight (best_flights[0]) ---
  const direct = journeys[0]!;
  assert.equal(direct.sourceRank, "best");
  assert.equal(direct.segments.length, 1);
  assert.equal(direct.stops, 0);
  assert.equal(direct.durationSeconds, 125 * 60);
  assert.equal(direct.price?.amount, 109);
  assert.equal(direct.price?.currency, "EUR");
  assert.equal(direct.price?.status, "search");
  assert.equal(direct.price?.source, "serpapi");
  assert.equal(direct.cabin, "ECONOMY");
  assert.equal(direct.bookingToken, "TOKEN123");
  assert.equal(direct.overnight, false);
  assert.equal(direct.carbonEmissions?.thisFlightGrams, 89000);
  assert.equal(direct.carbonEmissions?.differencePercent, -39);
  const directSeg = direct.segments[0]!;
  assert.equal(directSeg.carrierCode, "AF");
  assert.equal(directSeg.flightNumber, "1404");
  assert.equal(directSeg.carrierName, "Air France");
  assert.equal(directSeg.airplane, "Airbus A320neo");
  assert.equal(directSeg.departure.place.name, "Paris Charles de Gaulle");
  assert.equal(directSeg.departure.at, "2026-09-01T09:00:00");
  assert.equal(directSeg.arrival.terminal, null);

  // --- 1-stop, no price ---
  const oneStop = journeys[1]!;
  assert.equal(oneStop.sourceRank, "other");
  assert.equal(oneStop.segments.length, 2);
  assert.equal(oneStop.stops, 1);
  assert.equal(oneStop.layovers.length, 1);
  assert.equal(oneStop.layovers[0]!.durationSeconds, 90 * 60);
  assert.equal(oneStop.layovers[0]!.airport.iataCode, "MXP");
  assert.equal(oneStop.durationSeconds, 255 * 60);
  assert.equal(oneStop.price, null, "missing price must never be invented");
  assert.equal(oneStop.segments[0]!.carrierCode, "AZ");
  assert.equal(oneStop.segments[0]!.carrierName, "ITA Airways");

  // --- 2-stop, unknown carrier, overnight ---
  const multiStop = journeys[2]!;
  assert.equal(multiStop.segments.length, 3);
  assert.equal(multiStop.stops, 2);
  assert.equal(multiStop.layovers.length, 2);
  assert.equal(multiStop.layovers[0]!.overnight, true);
  assert.equal(multiStop.overnight, true, "overnight must propagate from segments/layovers");
  assert.equal(multiStop.durationSeconds, 990 * 60);
  assert.equal(multiStop.price?.amount, 340);
  // Unknown carrier code must never invent a name.
  assert.equal(multiStop.segments[0]!.carrierName, null);
  assert.equal(multiStop.segments[1]!.flightNumber, "200");
  assert.equal(multiStop.segments[2]!.departure.place.name, null);

  // Empty payload normalizes to an empty array, not an error.
  assert.deepEqual(normalizeSerpApiFlights({}, { currency: "EUR" }), []);

  console.log("  normalize fixtures: OK");
}

async function testBookingOptionsSession() {
  const {
    shouldFetchBookingOptions,
    bookingOptionsLoadingEntry,
    bookingOptionsSuccessEntry,
    bookingOptionsEmptyEntry,
    bookingOptionsErrorEntry,
    isBookingResultCurrent,
    formatBookWithSeller,
    compactSellerLabel,
  } = await import("../lib/routing/flights/bookingOptionsSession");

  assert.equal(shouldFetchBookingOptions({}, "a"), true);
  assert.equal(
    shouldFetchBookingOptions({ a: bookingOptionsLoadingEntry() }, "a"),
    false,
  );
  assert.equal(
    shouldFetchBookingOptions(
      { a: bookingOptionsSuccessEntry([{ id: "1" } as never]) },
      "a",
    ),
    false,
  );
  assert.equal(
    shouldFetchBookingOptions({ a: bookingOptionsEmptyEntry("empty") }, "a"),
    false,
  );
  assert.equal(
    shouldFetchBookingOptions({ a: bookingOptionsErrorEntry("err") }, "a"),
    false,
  );
  assert.equal(
    shouldFetchBookingOptions(
      { a: bookingOptionsErrorEntry("err") },
      "a",
      { retry: true },
    ),
    true,
  );
  assert.equal(isBookingResultCurrent("a", "a"), true);
  assert.equal(isBookingResultCurrent("a", "b"), false);
  assert.equal(isBookingResultCurrent("a", null), false);
  assert.equal(formatBookWithSeller("Book with {seller}", "KLM"), "Book with KLM");
  assert.equal(formatBookWithSeller("Réserver avec {seller}", "Expedia"), "Réserver avec Expedia");
  assert.equal(compactSellerLabel("Short"), "Short");
  assert.ok(compactSellerLabel("A".repeat(40), 28).endsWith("…"));

  console.log("  booking options session: OK");
}

async function testBookingOptionsNormalizer() {
  const { normalizeSerpApiBookingOptions } = await import(
    "../lib/routing/flights/providers/serpapiFlightProvider"
  );

  const options = normalizeSerpApiBookingOptions(
    {
      booking_options: [
        {
          together: {
            book_with: "KLM",
            airline: true,
            airline_logos: ["https://example.com/kl.png"],
            marketed_as: ["KL 1406"],
            price: 242,
            local_prices: [{ currency: "EUR", price: 242 }],
            option_title: "Economy",
            extensions: ["Cabin bag included"],
            baggage_prices: ["1 free carry-on"],
            booking_request: {
              url: "https://www.google.com/travel/clk/f",
              post_data: "u=TESTPAYLOAD",
            },
          },
        },
        {
          together: {
            book_with: "Gotogate",
            price: 230,
            local_prices: [{ currency: "EUR", price: 230 }],
            booking_request: {
              url: "https://www.google.com/travel/clk/f",
              post_data: "u=OTHER",
            },
          },
        },
        {
          departing: {
            book_with: "Phone Seller",
            booking_phone: "1 (800) 555-0100",
            price: 300,
          },
        },
      ],
    },
    "EUR",
  );

  assert.equal(options.length, 3);
  assert.equal(options[0]!.seller, "KLM");
  assert.equal(options[0]!.sellerType, "airline");
  assert.equal(options[0]!.airline, true);
  assert.equal(options[0]!.price, 242);
  assert.equal(options[0]!.currency, "EUR");
  assert.equal(options[0]!.bookingAction?.type, "post");
  assert.equal(options[0]!.baggagePrices[0], "1 free carry-on");
  assert.equal(options[1]!.sellerType, "agency");
  assert.equal(options[1]!.bookingAction?.type, "post");
  assert.equal(options[2]!.bookingAction?.type, "phone");

  console.log("  booking options normalizer: OK");
}

async function testGreatCircleAndAntimeridian() {
  const { greatCircleLine, greatCircleGeometry, splitAtAntimeridian } = await import(
    "../lib/routing/flights/greatCircle"
  );

  const line = greatCircleLine(2.5479, 49.0097, 12.2389, 41.8003, 32);
  assert.equal(line.length, 33);
  assert.ok(Math.abs(line[0]![0] - 2.5479) < 1e-6);
  assert.ok(Math.abs(line[0]![1] - 49.0097) < 1e-6);
  assert.ok(Math.abs(line[line.length - 1]![0] - 12.2389) < 1e-6);
  assert.ok(Math.abs(line[line.length - 1]![1] - 41.8003) < 1e-6);

  const degenerate = greatCircleLine(10, 45, 10, 45, 10);
  assert.equal(degenerate.length, 2);

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
    assert.ok(geometry.coordinates.length >= 2);
  }

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
    shareCalendarDate,
    calendarDatePrefix,
    RECOMMENDED_FLIGHT_BUFFERS,
  } = await import("../lib/routing/flights/airportBuffers");

  assert.equal(RECOMMENDED_FLIGHT_BUFFERS.domesticMinutes, 90);
  assert.equal(RECOMMENDED_FLIGHT_BUFFERS.internationalMinutes, 120);
  assert.equal(RECOMMENDED_FLIGHT_BUFFERS.egressMinutes, 45);

  assert.equal(isConnectionViable("2026-09-01T08:00:00", "2026-09-01T10:00:00", 90), true);
  assert.equal(isConnectionViable("2026-09-01T09:30:00", "2026-09-01T10:00:00", 90), false);
  assert.equal(isConnectionViable(null, "2026-09-01T10:00:00", 90), false);
  assert.equal(isConnectionViable("2026-09-01T08:00:00", null, 90), false);

  assert.equal(calendarDatePrefix("2026-08-23 21:10"), "2026-08-23");
  assert.equal(calendarDatePrefix("2026-08-09T14:21:00Z"), "2026-08-09");
  assert.equal(shareCalendarDate("2026-08-23T10:00:00Z", "2026-08-23 21:10"), true);
  assert.equal(shareCalendarDate("2026-08-09T14:21:00Z", "2026-08-23 21:10"), false);

  assert.equal(isEgressViable("2026-09-01T10:00:00", "2026-09-01T10:50:00", 45), true);
  assert.equal(isEgressViable("2026-09-01T10:00:00", "2026-09-01T10:20:00", 45), false);

  assert.equal(connectionMarginMinutes("2026-09-01T08:00:00", "2026-09-01T09:30:00"), 90);
  assert.equal(connectionMarginMinutes(null, "2026-09-01T09:30:00"), null);
  assert.equal(connectionMarginMinutes("not-a-date", "2026-09-01T09:30:00"), null);

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
      bookingToken: null,
      airlineLogo: null,
      carbonEmissions: null,
      sourceRank: "other",
      overnight: false,
      ...overrides,
    };
  }

  const cheapSlow = journey({
    id: "cheap-slow",
    durationSeconds: 5 * 3600,
    stops: 1,
    price: { amount: 80, currency: "EUR", status: "search", source: "serpapi" },
  });
  const pricyFast = journey({
    id: "pricy-fast",
    durationSeconds: 2 * 3600,
    stops: 0,
    price: { amount: 400, currency: "EUR", status: "search", source: "serpapi" },
  });
  const noPrice = journey({ id: "no-price", durationSeconds: 3 * 3600, stops: 0, price: null });

  const byCheapest = sortOffers([pricyFast, cheapSlow, noPrice], "cheapest");
  assert.deepEqual(byCheapest.map((j) => j.id), ["cheap-slow", "pricy-fast", "no-price"]);

  const byFastest = sortOffers([cheapSlow, pricyFast, noPrice], "fastest");
  assert.deepEqual(byFastest.map((j) => j.id), ["pricy-fast", "no-price", "cheap-slow"]);

  const input = [cheapSlow, pricyFast, noPrice];
  const inputCopy = input.slice();
  sortOffers(input, "recommended");
  assert.deepEqual(input, inputCopy, "sortOffers must never mutate its input");

  const runA = sortOffers(input, "recommended").map((j) => j.id);
  const runB = sortOffers(input, "recommended").map((j) => j.id);
  assert.deepEqual(runA, runB, "recommended sort must be deterministic");

  const nonstop = journey({ id: "nonstop", durationSeconds: 3600, stops: 0 });
  const oneStop = journey({ id: "onestop", durationSeconds: 3600, stops: 1 });
  assert.ok(recommendedScore(oneStop) > recommendedScore(nonstop));

  // On an otherwise-tied score, "recommended" must keep Google's own
  // best_flights ranking ahead of other_flights.
  const bestTie = journey({ id: "best-tie", durationSeconds: 3600, stops: 0, sourceRank: "best" });
  const otherTie = journey({ id: "other-tie", durationSeconds: 3600, stops: 0, sourceRank: "other" });
  const tieBroken = sortOffers([otherTie, bestTie], "recommended");
  assert.deepEqual(tieBroken.map((j) => j.id), ["best-tie", "other-tie"]);

  console.log("  flight score: OK");
}

async function testProviderStatus() {
  const { serpapiFlightProvider } = await import(
    "../lib/routing/flights/providers/serpapiFlightProvider"
  );

  clearSerpApiCredentials();
  assert.equal(await serpapiFlightProvider.getStatus(), "misconfigured");

  setSerpApiCredentials();
  assert.equal(await serpapiFlightProvider.getStatus(), "operational");

  clearSerpApiCredentials();
  console.log("  provider misconfigured/operational: OK");
}

async function testFlightCacheDedup() {
  const {
    flightSearchCacheKey,
    withFlightSearchDedup,
    clearFlightCacheForTests,
  } = await import("../lib/routing/flights/flightCache");
  type FlightJourney = import("../lib/routing/flights/types").FlightJourney;

  clearFlightCacheForTests();
  const key = flightSearchCacheKey({
    originIata: "CDG,ORY",
    destinationIata: "FCO,CIA",
    departureDate: "2026-09-01",
    adults: 1,
    nonStop: false,
    currency: "EUR",
  });

  let fetchCalls = 0;
  const fetcher = () =>
    new Promise<FlightJourney[]>((resolve) => {
      fetchCalls += 1;
      setTimeout(() => resolve([]), 15);
    });

  const [a, b] = await Promise.all([
    withFlightSearchDedup(key, fetcher),
    withFlightSearchDedup(key, fetcher),
  ]);
  assert.deepEqual(a, []);
  assert.deepEqual(b, []);
  assert.equal(fetchCalls, 1, "concurrent identical searches must dedup into a single call");

  await withFlightSearchDedup(key, fetcher);
  assert.equal(fetchCalls, 1, "a cached result must be reused without another fetch");

  clearFlightCacheForTests();
  console.log("  flight cache dedup: OK");
}

async function testAbortHandling() {
  const { fetchSerpApiGoogleFlights } = await import("../lib/routing/flights/serpapiClient");
  const { FlightError } = await import("../lib/routing/flights/types");

  // Misconfigured: no network call should even be attempted.
  clearSerpApiCredentials();
  await assert.rejects(
    () => fetchSerpApiGoogleFlights({ departure_id: "CDG" }),
    (err: unknown) => err instanceof FlightError && err.code === "provider_misconfigured",
  );

  setSerpApiCredentials();
  const controller = new AbortController();
  globalThis.fetch = ((_url: unknown, init?: { signal?: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const abortError = new Error("This operation was aborted");
        abortError.name = "AbortError";
        reject(abortError);
      });
    })) as typeof fetch;

  try {
    const pending = fetchSerpApiGoogleFlights(
      { departure_id: "CDG", arrival_id: "FCO" },
      { signal: controller.signal },
    );
    controller.abort();
    await assert.rejects(
      () => pending,
      (err: unknown) => err instanceof FlightError && err.code === "aborted",
    );
  } finally {
    globalThis.fetch = ORIGINAL_FETCH;
  }

  clearSerpApiCredentials();
  console.log("  abort / misconfigured handling: OK");
}

async function testAirportResolver() {
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
  assert.ok(resolved.every((a) => a.source === "curated"));
  assert.ok(resolved.some((a) => a.iataCode === "CDG" || a.iataCode === "ORY"));
  assert.ok(
    resolved.every((a) => a.iataCode === "CDG" || a.iataCode === "ORY"),
    "Paris must not pad with distant airports like BRU",
  );

  const rome = await resolveAirportsForPlace({
    latitude: 41.9028,
    longitude: 12.4964,
    name: "Rome",
  });
  assert.ok(rome.some((a) => a.iataCode === "FCO" || a.iataCode === "CIA"));
  assert.ok(
    rome.every((a) => a.iataCode === "FCO" || a.iataCode === "CIA"),
    "Rome must not pad with distant airports like NCE",
  );

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
  await testNormalizeFixtures();
  await testBookingOptionsSession();
  await testBookingOptionsNormalizer();
  await testGreatCircleAndAntimeridian();
  await testAirportBuffers();
  await testFlightScore();
  await testProviderStatus();
  await testFlightCacheDedup();
  await testAbortHandling();
  await testAirportResolver();
  globalThis.fetch = ORIGINAL_FETCH;
  console.log("test:flights OK");
}

main().catch((error) => {
  globalThis.fetch = ORIGINAL_FETCH;
  console.error(error);
  process.exit(1);
});
