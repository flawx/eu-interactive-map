export type IncidentAlertLevel =
  | "green"
  | "orange"
  | "red"
  | "unknown";

export type WildfireIncident = {
  id: string;
  title: string;
  alertLevel: IncidentAlertLevel;
  longitude: number;
  latitude: number;
  countryCode: string | null;
  countryName: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  areaHectares: number | null;
  populationExposure: number | null;
  description: string | null;
  sourceUrl: string | null;
  sourceName: "GDACS";
};

export type EffisBurnedArea = {
  id: string;
  areaHectares: number | null;
  areaSource: "effis-attribute" | "calculated-from-geometry" | null;
  detectedAt: string | null;
  updatedAt: string | null;
  countryName: string | null;
  regionName: string | null;
  sourceLayer: string;
  sourceName: "EFFIS";
  sourceUrl: string;
};
