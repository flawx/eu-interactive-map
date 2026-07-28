import "server-only";

import { deduplicateAlerts } from "@/lib/alerts/deduplication";
import { normalizeMeteoalarmFeature } from "@/lib/alerts/normalization";
import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";
import { isBeyondExpiryGrace } from "@/lib/alerts/staleness";
import type { AlertApiResponse, NormalizedAlert } from "@/lib/alerts/types";

const ENDPOINT =
  "https://api.meteoalarm.org/edr/v1/collections/warnings/locations";
const ALLOWED_LOCALES = new Set([
  "bg", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "de", "el", "hu",
  "ga", "it", "lv", "lt", "mt", "pl", "pt", "ro", "sk", "sl", "es", "sv",
]);

function localeParameter(locale: string): string {
  return ALLOWED_LOCALES.has(locale) ? locale : "en";
}
async function fetchJson(url: string, token: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/geo+json, application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`meteoalarm_http_${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function featuresFrom(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const features = (value as { features?: unknown }).features;
  return Array.isArray(features) ? features : [];
}

export async function fetchMeteoalarmWarnings(
  locale: string,
): Promise<AlertApiResponse> {
  const fetchedAt = new Date().toISOString();
  const token = process.env.METEOALARM_API_TOKEN?.trim();
  if (!token) {
    return {
      alerts: [],
      fetchedAt,
      source: ALERT_SOURCES.meteoalarm,
      connectorStatus: "misconfigured",
      warnings: ["meteoalarm_token_missing"],
    };
  }

  try {
    const alerts: NormalizedAlert[] = [];
    for (let page = 1; page <= 8; page += 1) {
      const params = new URLSearchParams({
        active: "true",
        language: localeParameter(locale),
        page: String(page),
      });
      const data = await fetchJson(`${ENDPOINT}?${params}`, token);
      const features = featuresFrom(data);
      for (const feature of features) {
        const alert = normalizeMeteoalarmFeature(feature, fetchedAt);
        if (alert && !isBeyondExpiryGrace(alert.expiresAt)) alerts.push(alert);
      }
      if (features.length === 0) break;
    }

    return {
      alerts: deduplicateAlerts(alerts),
      fetchedAt,
      source: ALERT_SOURCES.meteoalarm,
      connectorStatus: "operational",
      warnings: [],
    };
  } catch (error) {
    return {
      alerts: [],
      fetchedAt,
      source: ALERT_SOURCES.meteoalarm,
      connectorStatus: "unavailable",
      warnings: [
        error instanceof Error ? error.message : "meteoalarm_unavailable",
      ],
    };
  }
}
