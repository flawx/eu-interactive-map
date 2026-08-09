export {
  ENTITY_STATUS_COLORS,
  normalizeEntityStatus,
  type EntityStatus,
} from "./entityStatus";

export {
  entitiesToFeatureCollection,
  entityToGeoJsonFeature,
  getEntityPointCoordinates,
  isValidMapGeometry,
  type EUIMMapEntity,
  type EUIMMapGeometry,
} from "./mapEntity";

export {
  assertDataLayerRegistryIntegrity,
  DATA_LAYER_REGISTRY,
  getDataLayerById,
  getDataLayersByCategory,
  getDataLayersBySection,
  getNewEuropeV2LayerIds,
  type DataLayerCategory,
  type DataLayerClusterConfig,
  type DataLayerDefinition,
  type DataLayerGeometryType,
  type DataLayerZOrderGroup,
} from "./dataLayerRegistry";

export {
  DATA_LAYER_SOURCE_IDS,
  type DataLayerSourceId,
} from "./sourceIds";
