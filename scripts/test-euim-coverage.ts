import assert from "node:assert/strict";
import {
  EUIM_COUNTRY_CODES,
  EUIM_EU_CANDIDATE_CODES,
  EUIM_EU_MEMBER_CODES,
  EUIM_EXCLUDED_COUNTRY_CODES,
  getEUIMCountryStatus,
  isCoordinateInEUIMScope,
  isCountryInEUIMScope,
  isFeatureInEUIMScope,
  isRoutingEndpointInEUIMScope,
  normalizeEUIMCountryCode,
} from "../lib/geography/euimCoverage";
import { ensureEUIMLayerOrder, EUIM_LAYER_STACK_BOTTOM_TO_TOP } from "../lib/map/ensureEUIMLayerOrder";
import { isRouteGeometryAllowed, isRoutingPointAllowed } from "../lib/routing/routingGeofence";
import { EUROPEAN_AIRPORTS } from "../lib/transport/europeanAirports";
import { EUROSTAR_STATIONS } from "../lib/transport/eurostarNetwork";
import { MAJOR_CIVIL_ENGINEERING_WORKS } from "../lib/tourism/majorCivilEngineeringWorks";

function main() {
  assert.equal(EUIM_EU_MEMBER_CODES.length, 27);
  assert.ok(EUIM_EU_CANDIDATE_CODES.includes("AL"));
  assert.ok(EUIM_COUNTRY_CODES.includes("FR"));
  assert.ok(EUIM_COUNTRY_CODES.includes("UA"));
  for (const code of ["UK", "CH", "NO", "IS", "LI", "XK", "GB"] as const) {
    assert.equal(isCountryInEUIMScope(code), false);
    assert.equal(getEUIMCountryStatus(code), "outside_scope");
  }

  assert.equal(normalizeEUIMCountryCode("GB"), "UK");
  assert.equal(normalizeEUIMCountryCode("GR"), "EL");
  assert.equal(normalizeEUIMCountryCode("FRA"), "FR");
  assert.equal(isCountryInEUIMScope("FR"), true);
  assert.equal(isCountryInEUIMScope("DE"), true);
  assert.equal(isCountryInEUIMScope("IE"), true);
  assert.equal(isCountryInEUIMScope("CY"), true);
  assert.equal(isCountryInEUIMScope("RS"), true);
  assert.equal(getEUIMCountryStatus("FR"), "eu_member");
  assert.equal(getEUIMCountryStatus("AL"), "eu_candidate");

  // Capitals / cities
  assert.equal(isCoordinateInEUIMScope(2.3522, 48.8566), true); // Paris
  assert.equal(isCoordinateInEUIMScope(13.405, 52.52), true); // Berlin
  assert.equal(isCoordinateInEUIMScope(-6.2603, 53.3498), true); // Dublin
  assert.equal(isCoordinateInEUIMScope(33.3823, 35.1856), true); // Nicosia
  assert.equal(isCoordinateInEUIMScope(19.8187, 41.3275), true); // Tirana

  assert.equal(isCoordinateInEUIMScope(-0.1276, 51.5074), false); // London
  assert.equal(isCoordinateInEUIMScope(8.5417, 47.3769), false); // Zurich
  assert.equal(isCoordinateInEUIMScope(10.7522, 59.9139), false); // Oslo
  assert.equal(isCoordinateInEUIMScope(-21.8174, 64.1466), false); // Reykjavik
  assert.equal(isCoordinateInEUIMScope(9.5209, 47.141), false); // Vaduz
  assert.equal(isCoordinateInEUIMScope(37.6173, 55.7558), false); // Moscow (outside bbox)
  assert.equal(isCountryInEUIMScope("BY"), false);
  assert.equal(isCountryInEUIMScope("RU"), false);

  assert.equal(
    isRoutingPointAllowed({
      latitude: 51.5074,
      longitude: -0.1276,
      countryCode: "UK",
    }),
    false,
  );
  assert.equal(
    isRoutingPointAllowed({
      latitude: 48.8566,
      longitude: 2.3522,
      countryCode: "FR",
    }),
    true,
  );
  assert.equal(
    isRoutingEndpointInEUIMScope({
      latitude: 46.948,
      longitude: 7.4474,
      countryCode: "CH",
    }),
    false,
  );

  // UE→UE geometry may cross Switzerland
  assert.equal(
    isRouteGeometryAllowed({
      type: "LineString",
      coordinates: [
        [7.26, 43.71], // Nice
        [8.54, 47.37], // Zurich (third country)
        [9.19, 45.46], // Milan
      ],
    }),
    true,
  );

  assert.equal(
    isFeatureInEUIMScope({ countryCode: "UK", longitude: -0.1, latitude: 51.5 }),
    false,
  );
  assert.equal(
    isFeatureInEUIMScope({ countryCode: "FR", longitude: 2.3, latitude: 48.8 }),
    true,
  );

  for (const airport of EUROPEAN_AIRPORTS) {
    assert.equal(
      isCountryInEUIMScope(airport.countryCode),
      true,
      `airport ${airport.iataCode ?? airport.id}`,
    );
  }
  for (const station of EUROSTAR_STATIONS) {
    assert.equal(isCountryInEUIMScope(station.countryCode), true, station.id);
  }
  for (const work of MAJOR_CIVIL_ENGINEERING_WORKS) {
    assert.ok(
      work.countryCodes.some((code) => isCountryInEUIMScope(code)),
      work.id,
    );
  }

  assert.ok(EUIM_LAYER_STACK_BOTTOM_TO_TOP.includes("tomtom-traffic-flow-layer"));
  assert.ok(EUIM_LAYER_STACK_BOTTOM_TO_TOP.includes("eu-capitals-symbol"));
  const trafficIdx = EUIM_LAYER_STACK_BOTTOM_TO_TOP.indexOf(
    "tomtom-traffic-flow-layer",
  );
  const capitalIdx = EUIM_LAYER_STACK_BOTTOM_TO_TOP.indexOf("eu-capitals-symbol");
  assert.ok(trafficIdx < capitalIdx, "traffic must stack below capital POIs");

  // ensureEUIMLayerOrder is a no-op-safe helper (map mock)
  const layers = new Set<string>();
  const map = {
    getLayer: (id: string) => (layers.has(id) ? {} : undefined),
    moveLayer: (id: string) => {
      layers.delete(id);
      layers.add(id);
    },
  };
  layers.add("tomtom-traffic-flow-layer");
  layers.add("eu-capitals-symbol");
  ensureEUIMLayerOrder(map as never);

  console.log("test-euim-coverage: ok");
}

main();
