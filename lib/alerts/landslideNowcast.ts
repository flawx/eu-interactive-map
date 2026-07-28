import type { AlertConnectorStatus } from "@/lib/alerts/types";

export type LandslideNowcastLayerStatus = {
  connectorStatus: AlertConnectorStatus;
  validAt: string | null;
  fetchedAt: string;
  refreshIntervalMinutes: 30;
  tileTemplates: { moderate: string; high: string };
  bounds: [number, number, number, number];
  maxZoom: number;
  demoMode?: boolean;
  warnings: string[];
};
