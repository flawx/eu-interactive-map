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
  WIFI4EU: "wifi4eu",
  WIFI4EU_MUNICIPAL_OPEN_DATA: "wifi4eu-municipal-open-data",
  ETC: "etc-european-travel-commission",
  TOURIST_OFFICES_CURATED: "tourist-offices-curated",
  EEAS_DIPLOMATIC: "eeas-diplomatic",
  DIPLOMATIC_CURATED: "diplomatic-curated",
  VISITOR_SAFETY_CURATED: "visitor-safety-curated",
  EEA_NATURA2000: "eea-natura2000",
  EUROPEAN_COMMISSION_NATURA2000: "european-commission-natura2000",
  EEA_BATHING_WATER: "eea-bathing-water",
  BEACHES_CURATED: "beaches-curated",
  EUROVELO: "eurovelo",
  HIKING_ROUTES_SOURCE: "hiking-routes-source",
  OPENSTREETMAP_ROUTES: "openstreetmap-routes",
} as const;

export type DataLayerSourceId =
  (typeof DATA_LAYER_SOURCE_IDS)[keyof typeof DATA_LAYER_SOURCE_IDS];
