import "server-only";

import { deduplicateAlerts } from "@/lib/alerts/deduplication";
import { normalizeGdacsFeature } from "@/lib/alerts/normalization";
import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";
import type { AlertApiResponse, NormalizedAlert } from "@/lib/alerts/types";

const GDACS_GEOJSON_URL =
  "https://www.gdacs.org/contentdata/xml/gdacsAPP_Home.geojson";

function featuresFrom(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const features = (value as { features?: unknown }).features;
  return Array.isArray(features) ? features : [];
}
export async function fetchGdacsAlerts(
  eventType: "FL" | "TC",
): Promise<AlertApiResponse> {
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(GDACS_GEOJSON_URL, {
      headers: { Accept: "application/geo+json, application/json" },
      signal: controller.signal,
      next: { revalidate: 600 },
    });
    if (!response.ok) throw new Error(`gdacs_http_${response.status}`);
    const data: unknown = await response.json();
    const alerts = featuresFrom(data)
      .map((feature) => normalizeGdacsFeature(feature, eventType, fetchedAt))
      .filter((alert): alert is NormalizedAlert => Boolean(alert));

    return {
      alerts: deduplicateAlerts(alerts),
      fetchedAt,
      source: ALERT_SOURCES.gdacs,
      connectorStatus: "operational",
      warnings: [],
    };
  } catch (error) {
    return {
      alerts: [],
      fetchedAt,
      source: ALERT_SOURCES.gdacs,
      connectorStatus: "unavailable",
      warnings: [error instanceof Error ? error.message : "gdacs_unavailable"],
    };
  } finally {
    clearTimeout(timeout);
  }
}
