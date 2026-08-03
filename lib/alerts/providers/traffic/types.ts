import type {
  AlertConnectorStatus,
  NormalizedAlert,
  TrafficIncidentTimeMode,
} from "@/lib/alerts/types";
import type { GeographicBounds } from "@/lib/alerts/geography";

export type TrafficTileKind = "flow" | "incidents";

export type TrafficProviderState = {
  connectorStatus: AlertConnectorStatus;
  configured: boolean;
  trafficModelId: string | null;
  updatedAt: string | null;
  warning: string | null;
};

export type TrafficViewportRequest = {
  bounds: GeographicBounds;
  locale: string;
  timeMode: TrafficIncidentTimeMode;
};

export type TrafficProviderResponse = {
  alerts: NormalizedAlert[];
  connectorStatus: AlertConnectorStatus;
  trafficModelId: string | null;
  fetchedAt: string;
  warnings: string[];
};

export type TrafficTileResponse = {
  body: ArrayBuffer;
  contentType: string;
  connectorStatus: AlertConnectorStatus;
  trafficModelId: string | null;
  dataState: string;
  retryAfter: string | null;
};

export interface TrafficProvider {
  readonly id: string;
  getStatus(): Promise<TrafficProviderState>;
  getIncidents(request: TrafficViewportRequest): Promise<TrafficProviderResponse>;
  getIncidentById(
    incidentId: string,
    locale: string,
  ): Promise<TrafficProviderResponse>;
  getTile(
    kind: TrafficTileKind,
    z: number,
    x: number,
    y: number,
  ): Promise<TrafficTileResponse>;
}
