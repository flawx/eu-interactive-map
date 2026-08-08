import type {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  PointLike,
  QueryRenderedFeaturesOptions,
} from "maplibre-gl";

function isDictionaryCoderBoundsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Out of bounds/i.test(message) && /_numberToString/i.test(message);
}

/** Defensive wrapper for MapLibre DictionaryCoder race (#7752/#8064). Returns [] instead of throwing. */
export function safeQueryRenderedFeatures(
  map: MapLibreMap,
  geometry?: PointLike | [PointLike, PointLike],
  options?: QueryRenderedFeaturesOptions,
): MapGeoJSONFeature[] {
  try {
    return geometry === undefined
      ? map.queryRenderedFeatures(options)
      : map.queryRenderedFeatures(geometry, options);
  } catch (error) {
    if (isDictionaryCoderBoundsError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "maplibre_query_rendered_features_skipped",
          "DictionaryCoder race",
        );
      }
      return [];
    }
    throw error;
  }
}
