export type MapFocusRequest =
  | { kind: "europe"; nonce: number }
  | { kind: "country"; countryCode: string; nonce: number }
  | {
      kind: "point";
      longitude: number;
      latitude: number;
      zoom: number;
      nonce: number;
    }
  | {
      kind: "bounds";
      west: number;
      south: number;
      east: number;
      north: number;
      padding?: number;
      maxZoom?: number;
      nonce: number;
    };

export type TemporaryMapMarker = {
  longitude: number;
  latitude: number;
};
