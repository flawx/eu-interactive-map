import type { NormalizedAlert } from "@/lib/alerts/types";

export const TRAFFIC_DETAILS_SOURCE_ID = "traffic-incident-details";
export const TRAFFIC_LINES_SOURCE_ID = "traffic-incident-lines";
export const TRAFFIC_CLUSTER_LAYER_ID = "traffic-incident-clusters";
export const TRAFFIC_CLUSTER_COUNT_LAYER_ID = "traffic-incident-cluster-count";
export const TRAFFIC_MARKER_LAYER_ID = "traffic-incident-markers";
export const TRAFFIC_LABEL_LAYER_ID = "traffic-incident-labels";
export const TRAFFIC_LINE_LAYER_ID = "traffic-incident-lines-layer";
export const TRAFFIC_LINE_CASING_LAYER_ID = "traffic-incident-lines-casing";
export const TRAFFIC_SELECTED_LAYER_ID = "traffic-incident-selected";
export const TRAFFIC_FLOW_TILE_SOURCE_ID = "tomtom-traffic-flow";
export const TRAFFIC_FLOW_TILE_LAYER_ID = "tomtom-traffic-flow-layer";
export const TRAFFIC_INCIDENT_TILE_SOURCE_ID = "tomtom-traffic-incidents";
export const TRAFFIC_INCIDENT_TILE_LINE_LAYER_ID =
  "tomtom-traffic-incidents-overview";

export type TrafficFilters = {
  accidents: boolean;
  majorJams: boolean;
  brokenVehicles: boolean;
  hazards: boolean;
  roadWeather: boolean;
  otherIncidents: boolean;
  roadClosures: boolean;
  laneClosures: boolean;
  restrictions: boolean;
  activeRoadworks: boolean;
  plannedRoadworks: boolean;
};

export type TrafficParentLayers = {
  incidents: boolean;
  closures: boolean;
  roadworks: boolean;
};

function visibleByFilter(
  alert: NormalizedAlert,
  parents: TrafficParentLayers,
  filters: TrafficFilters,
): boolean {
  if (alert.hazard === "road_accident") return parents.incidents && filters.accidents;
  if (alert.hazard === "traffic_jam") return parents.incidents && filters.majorJams;
  if (alert.hazard === "broken_down_vehicle") {
    return parents.incidents && filters.brokenVehicles;
  }
  if (alert.hazard === "road_hazard") return parents.incidents && filters.hazards;
  if (alert.hazard === "road_weather") return parents.incidents && filters.roadWeather;
  if (alert.hazard === "road_closure") {
    return parents.closures && filters.roadClosures;
  }
  if (alert.hazard === "lane_closure") {
    return parents.closures && filters.laneClosures;
  }
  if (alert.hazard === "traffic_restriction") {
    return parents.closures && filters.restrictions;
  }
  if (alert.hazard === "roadworks") {
    return (
      parents.roadworks &&
      (alert.status === "upcoming"
        ? filters.plannedRoadworks
        : filters.activeRoadworks)
    );
  }
  return parents.incidents && filters.otherIncidents;
}

function markerColor(alert: NormalizedAlert): string {
  if (alert.status === "ended") return "#64748b";
  if (alert.hazard === "road_closure") return "#7f1d1d";
  if (alert.hazard === "road_accident") return "#ef4444";
  if (alert.hazard === "traffic_jam") return "#991b1b";
  if (alert.hazard === "roadworks") return "#f59e0b";
  if (alert.hazard === "lane_closure") return "#f97316";
  if (alert.hazard === "broken_down_vehicle") return "#eab308";
  if (alert.hazard === "road_weather") return "#0ea5e9";
  return "#f97316";
}

function markerGlyph(alert: NormalizedAlert): string {
  if (alert.hazard === "road_closure") return "×";
  if (alert.hazard === "roadworks" || alert.hazard === "lane_closure") return "◆";
  if (alert.hazard === "traffic_jam") return "≋";
  if (alert.hazard === "broken_down_vehicle") return "⚒";
  return "!";
}

function coordinatesOf(geometry: GeoJSON.Geometry): Array<[number, number]> {
  const output: Array<[number, number]> = [];
  const visit = (value: unknown) => {
    if (!Array.isArray(value)) return;
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      output.push([value[0], value[1]]);
      return;
    }
    value.forEach(visit);
  };
  if (geometry.type !== "GeometryCollection") visit(geometry.coordinates);
  return output;
}

function representativePoint(alert: NormalizedAlert): GeoJSON.Point | null {
  if (alert.geometry?.type === "Point") return alert.geometry;
  if (alert.geometry) {
    const coordinates = coordinatesOf(alert.geometry);
    if (coordinates.length) {
      return {
        type: "Point",
        coordinates: coordinates[Math.floor(coordinates.length / 2)],
      };
    }
  }
  return alert.centroid
    ? {
        type: "Point",
        coordinates: [alert.centroid.longitude, alert.centroid.latitude],
      }
    : null;
}

function properties(alert: NormalizedAlert): Record<string, unknown> {
  const roadNumbers = Array.isArray(alert.metadata.roadNumbers)
    ? alert.metadata.roadNumbers.join(", ")
    : "";
  const delay =
    typeof alert.metadata.delaySeconds === "number"
      ? Math.round(alert.metadata.delaySeconds / 60)
      : null;
  const length =
    typeof alert.metadata.lengthMeters === "number"
      ? alert.metadata.lengthMeters
      : null;
  const label = delay && delay > 0
    ? `+${delay} min${roadNumbers ? ` · ${roadNumbers}` : ""}`
    : length && alert.hazard === "traffic_jam"
      ? `Jam · ${(length / 1_000).toFixed(1)} km`
      : `${alert.title}${roadNumbers && !alert.title.includes(roadNumbers) ? ` · ${roadNumbers}` : ""}`;
  return {
    alertId: alert.id,
    providerIncidentId: alert.sourceEventId,
    title: alert.title,
    hazard: alert.hazard,
    status: alert.status,
    roadNumbers,
    fromLocation: alert.metadata.fromLocation ?? null,
    toLocation: alert.metadata.toLocation ?? null,
    direction: alert.metadata.direction ?? null,
    lengthMeters: length,
    delaySeconds: alert.metadata.delaySeconds ?? null,
    startAt: alert.onsetAt,
    endAt: alert.expiresAt,
    updatedAt: alert.updatedAt,
    sourceName: alert.officialSourceName,
    markerColor: markerColor(alert),
    markerGlyph: markerGlyph(alert),
    label,
  };
}

export function filterTrafficAlerts(
  alerts: readonly NormalizedAlert[],
  parents: TrafficParentLayers,
  filters: TrafficFilters,
): NormalizedAlert[] {
  return alerts.filter(
    (alert) =>
      alert.category === "road_traffic" &&
      visibleByFilter(alert, parents, filters),
  );
}

export function buildTrafficMarkerCollection(
  alerts: readonly NormalizedAlert[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts.flatMap((alert) => {
      const geometry = representativePoint(alert);
      return geometry
        ? [{
            type: "Feature" as const,
            id: alert.id,
            properties: properties(alert),
            geometry,
          }]
        : [];
    }),
  };
}

export function buildTrafficLineCollection(
  alerts: readonly NormalizedAlert[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: alerts.flatMap((alert) => {
      const geometry = alert.geometry;
      if (
        !geometry ||
        (geometry.type !== "LineString" && geometry.type !== "MultiLineString")
      ) {
        return [];
      }
      return [{
        type: "Feature" as const,
        id: alert.id,
        properties: properties(alert),
        geometry,
      }];
    }),
  };
}
