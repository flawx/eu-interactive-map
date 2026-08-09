import assert from "node:assert/strict";
import {
  DATA_LAYER_REGISTRY,
  assertDataLayerRegistryIntegrity,
  getNewEuropeV2LayerIds,
} from "../lib/map/dataLayers/dataLayerRegistry";
import { normalizeEntityStatus } from "../lib/map/dataLayers/entityStatus";
import {
  entityToGeoJsonFeature,
  getEntityPointCoordinates,
  isValidMapGeometry,
  type EUIMMapEntity,
} from "../lib/map/dataLayers/mapEntity";

function testRegistryIntegrity(): void {
  assertDataLayerRegistryIntegrity();

  const ids = DATA_LAYER_REGISTRY.map((layer) => layer.id);
  assert.equal(new Set(ids).size, ids.length, "registry ids must be unique");

  const preferenceKeys = DATA_LAYER_REGISTRY.map((layer) => layer.preferenceKey);
  assert.equal(
    new Set(preferenceKeys).size,
    preferenceKeys.length,
    "registry preferenceKeys must be unique",
  );

  for (const layer of DATA_LAYER_REGISTRY) {
    assert.ok(layer.sourceIds.length > 0, `${layer.id} must have sourceIds`);
    assert.ok(layer.zOrderGroup, `${layer.id} must have zOrderGroup`);
  }
}

function testNewEuropeV2LayersDisabledByDefault(): void {
  const newLayerIds = getNewEuropeV2LayerIds();
  assert.ok(newLayerIds.length > 0, "expected new Europe V2 layer ids");

  for (const id of newLayerIds) {
    const layer = DATA_LAYER_REGISTRY.find((entry) => entry.id === id);
    assert.ok(layer, `missing layer ${id}`);
    assert.equal(
      layer.defaultEnabled,
      false,
      `${id} must stay disabled by default`,
    );
  }

  assert.ok(!newLayerIds.includes("eu-capitals"));
  assert.ok(!newLayerIds.includes("schengen-outside-eu"));
}

function testNormalizeEntityStatus(): void {
  assert.equal(normalizeEntityStatus(null), "unknown");
  assert.equal(normalizeEntityStatus(""), "unknown");
  assert.equal(normalizeEntityStatus("   "), "unknown");
  assert.equal(normalizeEntityStatus("in progress"), "ongoing");
  assert.equal(normalizeEntityStatus("under construction"), "under_construction");
  assert.equal(normalizeEntityStatus("construction"), "under_construction");
  assert.equal(normalizeEntityStatus("operational"), "operational");
  assert.equal(normalizeEntityStatus("cancelled"), "cancelled");
  assert.equal(normalizeEntityStatus("abandoned"), "abandoned");
  assert.equal(normalizeEntityStatus("completed"), "completed");

  assert.equal(normalizeEntityStatus("old"), "unknown");
  assert.equal(normalizeEntityStatus("inactive"), "unknown");
  assert.equal(normalizeEntityStatus("archived"), "unknown");
  assert.equal(normalizeEntityStatus("deprecated"), "unknown");
  assert.equal(normalizeEntityStatus("closed"), "unknown");
}

function createEntity(
  geometry: EUIMMapEntity["geometry"],
  overrides: Partial<EUIMMapEntity> = {},
): EUIMMapEntity {
  return {
    id: "test-entity",
    category: "europe",
    subcategory: "test",
    layerId: "eu-projects-transport",
    name: "Test Entity",
    geometry,
    sourceIds: ["kohesio"],
    properties: { sample: true },
    ...overrides,
  };
}

function testEntityGeoJsonRoundtrip(): void {
  const pointEntity = createEntity({
    type: "Point",
    coordinates: [4.3517, 50.8503],
  });
  const pointFeature = entityToGeoJsonFeature(pointEntity);
  assert.equal(pointFeature.type, "Feature");
  assert.deepEqual(pointFeature.geometry, pointEntity.geometry);
  assert.equal(pointFeature.properties?.id, pointEntity.id);
  assert.equal(pointFeature.properties?.name, pointEntity.name);
  assert.equal(pointFeature.properties?.layerId, pointEntity.layerId);
  assert.equal(pointFeature.properties?.sample, true);

  const lineEntity = createEntity({
    type: "LineString",
    coordinates: [
      [4.35, 50.85],
      [4.36, 50.86],
    ],
  });
  const lineFeature = entityToGeoJsonFeature(lineEntity);
  assert.deepEqual(lineFeature.geometry, lineEntity.geometry);

  const polygonEntity = createEntity({
    type: "Polygon",
    coordinates: [
      [
        [4.35, 50.85],
        [4.36, 50.85],
        [4.36, 50.86],
        [4.35, 50.86],
        [4.35, 50.85],
      ],
    ],
  });
  const polygonFeature = entityToGeoJsonFeature(polygonEntity);
  assert.deepEqual(polygonFeature.geometry, polygonEntity.geometry);
}

function testIsValidMapGeometry(): void {
  assert.equal(
    isValidMapGeometry({ type: "Point", coordinates: [4.35, 50.85] }),
    true,
  );
  assert.equal(
    isValidMapGeometry({
      type: "LineString",
      coordinates: [
        [4.35, 50.85],
        [4.36, 50.86],
      ],
    }),
    true,
  );
  assert.equal(isValidMapGeometry({ type: "Point", coordinates: ["a", "b"] }), false);
  assert.equal(isValidMapGeometry({ type: "GeometryCollection", geometries: [] }), false);
  assert.equal(isValidMapGeometry(null), false);
  assert.equal(isValidMapGeometry({ type: "Point" }), false);
}

function testGetEntityPointCoordinates(): void {
  const pointEntity = createEntity({
    type: "Point",
    coordinates: [4.3517, 50.8503],
  });
  assert.deepEqual(getEntityPointCoordinates(pointEntity), [4.3517, 50.8503]);

  const polygonEntity = createEntity({
    type: "Polygon",
    coordinates: [
      [
        [4.35, 50.85],
        [4.36, 50.85],
        [4.36, 50.86],
        [4.35, 50.86],
        [4.35, 50.85],
      ],
    ],
  });
  assert.equal(getEntityPointCoordinates(polygonEntity), null);
}

function main(): void {
  testRegistryIntegrity();
  testNewEuropeV2LayersDisabledByDefault();
  testNormalizeEntityStatus();
  testEntityGeoJsonRoundtrip();
  testIsValidMapGeometry();
  testGetEntityPointCoordinates();
  console.log("test-data-layers: ok");
}

main();
