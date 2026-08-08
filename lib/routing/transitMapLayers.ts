export const TRANSIT_ROUTE_SOURCE_ID = "transit-route-source";
export const TRANSIT_ROUTE_WALK_SOURCE_ID = "transit-route-walk-source";
export const TRANSIT_POINTS_SOURCE_ID = "transit-route-points";

export const TRANSIT_LAYER_WALK = "transit-route-walk";
export const TRANSIT_LAYER_HALO = "transit-route-halo";
export const TRANSIT_LAYER_MAIN = "transit-route-main";
export const TRANSIT_LAYER_POINTS = "transit-route-points";
export const TRANSIT_LAYER_POINT_LABELS = "transit-route-point-labels";

export type TransitMapPoint = {
  id: string;
  role: "origin" | "destination" | "transfer";
  longitude: number;
  latitude: number;
  label: string;
  color: string;
};
