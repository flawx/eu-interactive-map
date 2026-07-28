import type { AlertSeverity } from "@/lib/alerts/types";

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  unknown: 0,
  minor: 1,
  moderate: 2,
  severe: 3,
  extreme: 4,
};

export function severityRank(severity: AlertSeverity): number {
  return SEVERITY_RANK[severity];
}
export function normalizeMeteoalarmSeverity(value: unknown): AlertSeverity {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (/\b(4|red|extreme)\b/.test(normalized)) return "extreme";
  if (/\b(3|orange|severe)\b/.test(normalized)) return "severe";
  if (/\b(2|yellow|moderate)\b/.test(normalized)) return "moderate";
  if (/\b(1|green|minor)\b/.test(normalized)) return "minor";
  return "unknown";
}

export function normalizeGdacsSeverity(value: unknown): AlertSeverity {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "red") return "extreme";
  if (normalized === "orange") return "severe";
  if (normalized === "green") return "minor";
  return "unknown";
}

export function severityColor(severity: AlertSeverity): string {
  if (severity === "extreme") return "#dc2626";
  if (severity === "severe") return "#f97316";
  if (severity === "moderate") return "#eab308";
  if (severity === "minor") return "#16a34a";
  return "#64748b";
}
