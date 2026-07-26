import type { WildfireIncident } from "@/lib/incidents/types";

export type WildfireVerificationStatus =
  | "official"
  | "verified"
  | "unverified"
  | "disputed";

export type WildfireSourceType =
  | "authority"
  | "emergency_service"
  | "satellite"
  | "gdacs"
  | "media"
  | "community"
  | "manual";

export type WildfireUpdateCategory =
  | "cause"
  | "situation"
  | "resources"
  | "authority_message"
  | "evacuation_order"
  | "safety_instruction"
  | "gathering_point"
  | "shelter"
  | "reception_center"
  | "road_closure"
  | "media"
  | "community";

export type WildfireObservationType =
  | "firms_active_detection"
  | "firms_seven_day_history"
  | "effis_burned_area"
  | "gdacs_reported_area"
  | "gdacs_alert_level";

export type WildfireCauseStatus = "unknown" | "known" | "disputed";

export type WildfireAreaMeasurementKind =
  | "firms_24h"
  | "firms_7d"
  | "effis"
  | "gdacs";

export type WildfireAreaBadge =
  | "official"
  | "satellite_estimate"
  | "gdacs_declared";

export type WildfireOperationalUpdate = {
  id: string;
  incidentId: string;
  externalId: string | null;
  category: WildfireUpdateCategory;
  title: string | null;
  body: string | null;
  status: string | null;
  sourceType: WildfireSourceType;
  sourceName: string;
  sourceUrl: string | null;
  verificationStatus: WildfireVerificationStatus;
  publishedAt: string | null;
  effectiveFrom: string | null;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  locationName: string | null;
  geometry: GeoJSON.Geometry | null;
  structuredData: Record<string, unknown>;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WildfireIncidentObservation = {
  id: string;
  incidentId: string;
  source: string;
  observationType: WildfireObservationType;
  observedAt: string;
  areaHectares: number | null;
  areaIsApproximate: boolean;
  detectionCount: number | null;
  alertLevel: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type WildfireAreaMeasurement = {
  kind: WildfireAreaMeasurementKind;
  labelKey:
    | "areaFirms24h"
    | "areaFirms7d"
    | "areaEffis"
    | "areaGdacs";
  valueHectares: number | null;
  source: string;
  observedAt: string | null;
  isApproximate: boolean;
  sourceUrl: string | null;
  badge: WildfireAreaBadge;
};

export type WildfireSafetyLocation = {
  id: string;
  category: Extract<
    WildfireUpdateCategory,
    "gathering_point" | "shelter" | "reception_center"
  >;
  title: string | null;
  body: string | null;
  status: string | null;
  locationName: string | null;
  sourceType: WildfireSourceType;
  sourceName: string;
  sourceUrl: string | null;
  verificationStatus: WildfireVerificationStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  geometry: GeoJSON.Geometry | null;
  isOfficiallyOpen: boolean;
};

export type WildfireDeployedResources = {
  summary: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  verificationStatus: WildfireVerificationStatus | null;
  publishedAt: string | null;
  lastVerifiedAt: string | null;
  structuredData: Record<string, unknown>;
};

export type WildfireCauseInfo = {
  status: WildfireCauseStatus;
  description: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  verificationStatus: WildfireVerificationStatus | null;
  publishedAt: string | null;
  lastVerifiedAt: string | null;
};

export type WildfireSituationInfo = {
  title: string | null;
  body: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  verificationStatus: WildfireVerificationStatus | null;
  publishedAt: string | null;
  lastVerifiedAt: string | null;
};

export type WildfireTimelineItem = {
  id: string;
  kind:
    | "observation"
    | "authority_message"
    | "evacuation_order"
    | "safety_instruction"
    | "resources"
    | "situation"
    | "media"
    | "community"
    | "other";
  title: string;
  body: string | null;
  occurredAt: string;
  sourceName: string;
  sourceType: WildfireSourceType | "satellite" | "gdacs";
  verificationStatus: WildfireVerificationStatus;
  sourceUrl: string | null;
  observationType?: WildfireObservationType;
  category?: WildfireUpdateCategory;
};

export type WildfireOperationalSummary = {
  incidentId: string;
  incident: WildfireIncident | null;
  cause: WildfireCauseInfo;
  currentSituation: WildfireSituationInfo | null;
  areaMeasurements: WildfireAreaMeasurement[];
  deployedResources: WildfireDeployedResources | null;
  timeline: WildfireTimelineItem[];
  authorityMessages: WildfireOperationalUpdate[];
  evacuationOrders: WildfireOperationalUpdate[];
  safetyInstructions: WildfireOperationalUpdate[];
  gatheringPoints: WildfireSafetyLocation[];
  shelters: WildfireSafetyLocation[];
  receptionCenters: WildfireSafetyLocation[];
  roadClosures: WildfireOperationalUpdate[];
  mediaUpdates: WildfireOperationalUpdate[];
  communityUpdates: WildfireOperationalUpdate[];
  lastUpdatedAt: string | null;
};

export function isActiveOfficialEvacuation(
  update: WildfireOperationalUpdate,
  nowMs: number = Date.now(),
): boolean {
  if (update.category !== "evacuation_order") return false;
  if (
    update.sourceType !== "authority" &&
    update.sourceType !== "emergency_service"
  ) {
    return false;
  }
  if (update.verificationStatus !== "official") return false;

  const status = (update.status ?? "").toLowerCase();
  if (status === "inactive" || status === "lifted" || status === "cancelled") {
    return false;
  }

  if (update.expiresAt) {
    const expires = Date.parse(update.expiresAt);
    if (!Number.isNaN(expires) && expires < nowMs) return false;
  }

  return true;
}

export function isOfficiallyOpenSafetyLocation(
  update: WildfireOperationalUpdate,
): boolean {
  if (
    update.category !== "gathering_point" &&
    update.category !== "shelter" &&
    update.category !== "reception_center"
  ) {
    return false;
  }
  if (
    update.sourceType !== "authority" &&
    update.sourceType !== "emergency_service"
  ) {
    return false;
  }
  if (update.verificationStatus !== "official") return false;

  const status = (update.status ?? "").toLowerCase();
  return status === "open" || status === "active" || status === "available";
}
