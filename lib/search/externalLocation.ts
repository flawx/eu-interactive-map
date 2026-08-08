export type ExternalLocationType =
  | "address"
  | "street"
  | "intersection"
  | "poi"
  | "city"
  | "geography";

export type ExternalLocationSearchResult = {
  id: string;
  provider: "tomtom" | "nominatim";
  type: ExternalLocationType;
  name: string;
  addressLabel: string | null;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  municipality: string | null;
  region: string | null;
  providerId: string | null;
};

export type UnifiedLocationResult = {
  id: string;
  source: "local" | "tomtom" | "nominatim";
  kind:
    | "internal"
    | "address"
    | "street"
    | "intersection"
    | "poi"
    | "city"
    | "geography";
  name: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  /** Original MapSearchResult id when source=local */
  localResultId?: string;
  providerId?: string | null;
};
