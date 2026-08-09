export const DATA_LAYER_SOURCE_IDS = {
  EU_INSTITUTIONS_DIRECTORY: "eu-institutions-directory",
  EU_AGENCIES_NETWORK: "eu-agencies-network",
  EUROPEAN_CAPITALS_OF_CULTURE: "european-capitals-of-culture",
  KOHESIO: "kohesio",
  CINEA_CEF: "cinea-cef",
  TEN_T: "ten-t-dg-move",
  CORDIS: "cordis",
  EFTA_EEA: "efta-eea",
  BUSINESS_DISTRICTS_CURATED: "business-districts-curated",
  TEN_T_PORTS: "ten-t-ports",
} as const;

export type DataLayerSourceId =
  (typeof DATA_LAYER_SOURCE_IDS)[keyof typeof DATA_LAYER_SOURCE_IDS];
