export type EntityStatus =
  | "proposed"
  | "study"
  | "planned"
  | "approved"
  | "under_construction"
  | "ongoing"
  | "operational"
  | "completed"
  | "suspended"
  | "cancelled"
  | "abandoned"
  | "unknown";

export const ENTITY_STATUS_COLORS: Record<EntityStatus, string> = {
  proposed: "#a78bfa",
  study: "#8b5cf6",
  planned: "#3b82f6",
  approved: "#06b6d4",
  under_construction: "#f59e0b",
  ongoing: "#f97316",
  operational: "#22c55e",
  completed: "#16a34a",
  suspended: "#94a3b8",
  cancelled: "#ef4444",
  abandoned: "#991b1b",
  unknown: "#64748b",
};

const ENTITY_STATUSES = new Set<string>(Object.keys(ENTITY_STATUS_COLORS));

const EXACT_STATUS_ALIASES: Record<string, EntityStatus> = {
  proposed: "proposed",
  proposal: "proposed",
  draft: "proposed",
  study: "study",
  studies: "study",
  feasibility: "study",
  "feasibility study": "study",
  planned: "planned",
  planning: "planned",
  plan: "planned",
  approved: "approved",
  approval: "approved",
  authorized: "approved",
  authorised: "approved",
  under_construction: "under_construction",
  "under construction": "under_construction",
  construction: "under_construction",
  building: "under_construction",
  ongoing: "ongoing",
  "in progress": "ongoing",
  in_progress: "ongoing",
  progress: "ongoing",
  active: "ongoing",
  running: "ongoing",
  operational: "operational",
  operating: "operational",
  "in service": "operational",
  in_service: "operational",
  open: "operational",
  completed: "completed",
  complete: "completed",
  finished: "completed",
  suspended: "suspended",
  suspension: "suspended",
  "on hold": "suspended",
  on_hold: "suspended",
  paused: "suspended",
  halted: "suspended",
  cancelled: "cancelled",
  canceled: "cancelled",
  cancellation: "cancelled",
  abandoned: "abandoned",
  unknown: "unknown",
  unspecified: "unknown",
  other: "unknown",
};

/** Terms that must never alone imply terminal lifecycle states. */
const AMBIGUOUS_ALONE = new Set([
  "old",
  "inactive",
  "archived",
  "deprecated",
  "closed",
  "legacy",
  "dormant",
]);

function normalizeStatusInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function hasExplicitTerminalStatus(normalized: string): EntityStatus | null {
  if (/\babandoned\b/.test(normalized)) return "abandoned";
  if (/\b(cancelled|canceled|cancellation)\b/.test(normalized)) {
    return "cancelled";
  }
  if (/\b(completed|complete|finished)\b/.test(normalized)) {
    return "completed";
  }
  return null;
}

/** Normalize raw status strings. Never infer cancelled/abandoned/completed without explicit evidence. */
export function normalizeEntityStatus(
  raw: string | null | undefined,
): EntityStatus {
  if (raw == null) return "unknown";

  const normalized = normalizeStatusInput(raw);
  if (normalized.length === 0) return "unknown";

  if (ENTITY_STATUSES.has(normalized)) {
    return normalized as EntityStatus;
  }

  if (AMBIGUOUS_ALONE.has(normalized)) return "unknown";

  const exact = EXACT_STATUS_ALIASES[normalized];
  if (exact) return exact;

  const explicitTerminal = hasExplicitTerminalStatus(normalized);
  if (explicitTerminal) return explicitTerminal;

  if (/\bunder construction\b/.test(normalized) || normalized === "construction") {
    return "under_construction";
  }
  if (/\bin progress\b/.test(normalized)) return "ongoing";
  if (/\bin service\b/.test(normalized)) return "operational";
  if (/\b(feasibility|preliminary)\b/.test(normalized)) return "study";
  if (/\b(approved|authorization|authorisation)\b/.test(normalized)) {
    return "approved";
  }
  if (/\b(planned|planning)\b/.test(normalized)) return "planned";
  if (/\b(proposed|proposal)\b/.test(normalized)) return "proposed";
  if (/\b(operational|operating)\b/.test(normalized)) return "operational";
  if (/\b(ongoing|running)\b/.test(normalized)) return "ongoing";
  if (/\b(suspended|on hold|paused|halted)\b/.test(normalized)) {
    return "suspended";
  }
  if (/\b(building)\b/.test(normalized)) return "under_construction";

  if (/\b(old|inactive|archived|deprecated|closed|legacy|dormant)\b/.test(normalized)) {
    return "unknown";
  }

  return "unknown";
}
