export const ROUTE_PLANNER_SOURCE_ID = "route-planner-routes";
export const ROUTE_PLANNER_ALT_SOURCE_ID = "route-planner-alternatives";
export const ROUTE_PLANNER_TRAFFIC_SOURCE_ID = "route-planner-traffic";
export const ROUTE_PLANNER_POINTS_SOURCE_ID = "route-planner-points";

export const ROUTE_PLANNER_LAYER_HALO = "route-planner-halo";
export const ROUTE_PLANNER_LAYER_MAIN = "route-planner-main";
export const ROUTE_PLANNER_LAYER_ALT = "route-planner-alt";
export const ROUTE_PLANNER_LAYER_TRAFFIC = "route-planner-traffic";
export const ROUTE_PLANNER_LAYER_POINTS = "route-planner-points";
export const ROUTE_PLANNER_LAYER_POINT_LABELS = "route-planner-point-labels";

export type RoutePlannerMapPoint = {
  id: string;
  role: "origin" | "destination" | "waypoint";
  longitude: number;
  latitude: number;
  label: string;
  color: string;
};

export type RoutePlannerMapState = {
  selectedRouteId: string | null;
  routes: Array<{
    id: string;
    coordinates: [number, number][];
    selected: boolean;
  }>;
  trafficSegments: Array<{
    coordinates: [number, number][];
    color: string;
  }>;
  points: RoutePlannerMapPoint[];
};
