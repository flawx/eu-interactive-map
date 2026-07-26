import type { WildfireIncident } from "@/lib/incidents/types";
import type { OfficialFetchedDocument } from "@/lib/incidents/officialSources/fetchOfficialDocument";
import type { FranceWildfireOfficialSource } from "@/lib/incidents/officialSources/franceWildfireSources";
import {
  FRANCE_DEPARTMENT_BBOX,
  isPointInDepartment,
} from "@/lib/incidents/officialSources/franceWildfireSources";

export type OfficialMatchResult = {
  matched: boolean;
  score: "strong" | "medium" | "insufficient";
  matchedKeywords: string[];
  relevantText: string;
  reason: string;
};

const OTHER_DEPARTMENT_MARKERS = [
  /\bLandes\b/i,
  /\bVar\b/i,
  /\bBouches-du-Rhône\b/i,
  /\bAude\b/i,
  /\bHérault\b/i,
  /\bCors(?:e|ica)\b/i,
];

const WEAK_ONLY_TERMS = [
  /^france$/i,
  /^nouvelle[- ]?aquitaine$/i,
  /^feu de forêt$/i,
  /^incendie$/i,
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findKeywordHits(text: string, keywords: string[]): string[] {
  const normalizedText = normalize(text);
  const hits: string[] = [];
  for (const keyword of keywords) {
    const needle = normalize(keyword);
    if (!needle) continue;
    if (normalizedText.includes(needle)) {
      hits.push(keyword);
    }
  }
  return hits;
}

function isWeakOnlyKeyword(keyword: string): boolean {
  return WEAK_ONLY_TERMS.some((re) => re.test(keyword.trim()));
}

function isWithinIncidentWindow(
  publishedAt: string | null,
  incident: WildfireIncident,
): boolean {
  if (!publishedAt) return false;
  const published = Date.parse(publishedAt);
  if (Number.isNaN(published)) return false;

  const start = incident.startedAt
    ? Date.parse(incident.startedAt.replace(" ", "T") + "Z")
    : Number.NaN;
  const updated = incident.updatedAt
    ? Date.parse(incident.updatedAt.replace(" ", "T") + "Z")
    : start;

  if (Number.isNaN(start) || Number.isNaN(updated)) return false;

  const earliest = start - 48 * 60 * 60 * 1000;
  const latest = updated + 14 * 24 * 60 * 60 * 1000;
  return published >= earliest && published <= latest;
}

function incidentCompatibleWithDepartments(
  incident: WildfireIncident,
  departmentCodes: string[] | undefined,
): boolean {
  if (!departmentCodes || departmentCodes.length === 0) return true;
  return departmentCodes.some((code) =>
    isPointInDepartment(incident.longitude, incident.latitude, code),
  );
}

function inferIncidentDepartments(incident: WildfireIncident): string[] {
  return Object.entries(FRANCE_DEPARTMENT_BBOX)
    .filter(([, bbox]) =>
      incident.longitude >= bbox.minLon &&
      incident.longitude <= bbox.maxLon &&
      incident.latitude >= bbox.minLat &&
      incident.latitude <= bbox.maxLat,
    )
    .map(([code]) => code);
}

function documentMentionsGirondePlaces(text: string): boolean {
  return /(gironde|saumos|le porge|l[eè]ge[- ]?cap[- ]?ferret|cap[- ]?ferret|m[eé]doc|le temple)/i.test(
    text,
  );
}

/**
 * Keeps paragraphs that mention a strong incident keyword.
 * Drops blocks that only discuss other departments when Gironde/Saumos is absent.
 */
export function isolateIncidentRelevantText(
  bodyText: string,
  keywords: string[],
): string {
  const paragraphs = bodyText
    .split(/(?<=\.)\s+|(?<=:)\s+|•|\u2022|\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 40);

  const kept: string[] = [];
  for (const paragraph of paragraphs) {
    const hits = findKeywordHits(paragraph, keywords);
    const otherDept = OTHER_DEPARTMENT_MARKERS.some((re) => re.test(paragraph));
    if (hits.length > 0) {
      const strongLocal = hits.some(
        (hit) => !/^france$/i.test(hit) && !isWeakOnlyKeyword(hit),
      );
      if (otherDept && !strongLocal && !hits.some((h) => /gironde/i.test(h))) {
        continue;
      }
      // Drop paragraphs that only discuss another department.
      if (otherDept && !strongLocal) continue;
      kept.push(paragraph);
      continue;
    }
    if (
      kept.length > 0 &&
      !otherDept &&
      /(évacuation|fermeture|sapeurs-pompiers|canadair|dash|air tractor|centre[s]? d’accueil|centre[s]? d'accueil|feu\b|incendie)/i.test(
        paragraph,
      )
    ) {
      kept.push(paragraph);
    }
  }

  if (kept.length === 0) {
    return findKeywordHits(bodyText, keywords).length > 0 ? bodyText : "";
  }

  return kept.join(" ");
}

export function matchOfficialDocumentToWildfireIncident(input: {
  document: OfficialFetchedDocument;
  incident: WildfireIncident;
  source: FranceWildfireOfficialSource;
}): OfficialMatchResult {
  const { document, incident, source } = input;
  const keywords = source.incidentKeywords;
  const titleHits = findKeywordHits(document.title, keywords);
  const bodyHits = findKeywordHits(document.bodyText, keywords);
  const matchedKeywords = Array.from(new Set([...titleHits, ...bodyHits]));

  // 1. Explicit incident allow-list
  if (
    source.allowedIncidentIds &&
    source.allowedIncidentIds.length > 0 &&
    !source.allowedIncidentIds.includes(incident.id)
  ) {
    return {
      matched: false,
      score: "insufficient",
      matchedKeywords,
      relevantText: "",
      reason: "Source restricted to other incident ids",
    };
  }

  // 2. Department constraint: country alone is never enough
  if (source.departmentCodes && source.departmentCodes.length > 0) {
    if (!incidentCompatibleWithDepartments(incident, source.departmentCodes)) {
      return {
        matched: false,
        score: "insufficient",
        matchedKeywords,
        relevantText: "",
        reason: "Incident coordinates outside source department scope",
      };
    }
  }

  // 5. Reject Gironde/Saumos publications for incidents in Var / other depts
  const incidentDepartments = inferIncidentDepartments(incident);
  if (
    documentMentionsGirondePlaces(`${document.title} ${document.bodyText}`) &&
    incidentDepartments.some((code) => code !== "33") &&
    !incidentDepartments.includes("33")
  ) {
    return {
      matched: false,
      score: "insufficient",
      matchedKeywords,
      relevantText: "",
      reason: "Gironde publication incompatible with incident location",
    };
  }

  if (source.excludedPlaceNames && source.excludedPlaceNames.length > 0) {
    // If the incident sits in an excluded department geography, reject.
    const excludedDeptHints: Record<string, string> = {
      Var: "83",
      Landes: "40",
    };
    for (const place of source.excludedPlaceNames) {
      const dept = excludedDeptHints[place];
      if (dept && incidentDepartments.includes(dept) && !incidentDepartments.includes("33")) {
        return {
          matched: false,
          score: "insufficient",
          matchedKeywords,
          relevantText: "",
          reason: `Incident located in excluded geography (${place})`,
        };
      }
    }
  }

  if (!isWithinIncidentWindow(document.publishedAt, incident)) {
    return {
      matched: false,
      score: "insufficient",
      matchedKeywords,
      relevantText: "",
      reason: "Publication outside incident time window",
    };
  }

  // Required place names in document
  if (source.requiredPlaceNames && source.requiredPlaceNames.length > 0) {
    const requiredHits = findKeywordHits(
      `${document.title} ${document.bodyText}`,
      source.requiredPlaceNames,
    );
    if (requiredHits.length === 0) {
      return {
        matched: false,
        score: "insufficient",
        matchedKeywords,
        relevantText: "",
        reason: "Required place names absent from document",
      };
    }
  }

  // Precise place in document (not only France / region / wildfire wording)
  const preciseHits = matchedKeywords.filter((keyword) => !isWeakOnlyKeyword(keyword));
  if (preciseHits.length === 0) {
    return {
      matched: false,
      score: "insufficient",
      matchedKeywords,
      relevantText: "",
      reason: "No precise place keyword in document",
    };
  }

  // 3. Without explicit incident id, require place + geographic compatibility
  if (!source.allowedIncidentIds || source.allowedIncidentIds.length === 0) {
    const geoOk =
      !source.departmentCodes ||
      source.departmentCodes.length === 0 ||
      incidentCompatibleWithDepartments(incident, source.departmentCodes);
    if (!geoOk) {
      return {
        matched: false,
        score: "insufficient",
        matchedKeywords,
        relevantText: "",
        reason: "No geographic compatibility with incident coordinates",
      };
    }
  }

  const hasExactPlaceInTitle = titleHits.some(
    (keyword) => !isWeakOnlyKeyword(keyword) && !/^gironde$/i.test(keyword),
  );
  const hasExactPlaceInBody = bodyHits.some(
    (keyword) => !isWeakOnlyKeyword(keyword) && !/^gironde$/i.test(keyword),
  );
  const hasDepartment = preciseHits.some((keyword) => /gironde/i.test(keyword));

  let score: OfficialMatchResult["score"] = "insufficient";
  if (hasExactPlaceInTitle || hasExactPlaceInBody) {
    score = "strong";
  } else if (
    hasDepartment &&
    document.publishedAt &&
    incidentCompatibleWithDepartments(incident, source.departmentCodes ?? ["33"])
  ) {
    score = "medium";
  }

  // 4. Country / date / similar area alone are never enough
  if (score === "insufficient") {
    return {
      matched: false,
      score,
      matchedKeywords,
      relevantText: "",
      reason: "Geographic signal too weak (country/date insufficient)",
    };
  }

  const relevantText = isolateIncidentRelevantText(document.bodyText, keywords);
  if (!relevantText) {
    return {
      matched: false,
      score: "insufficient",
      matchedKeywords,
      relevantText: "",
      reason: "No incident-relevant text block",
    };
  }

  return {
    matched: true,
    score,
    matchedKeywords: preciseHits,
    relevantText,
    reason: "Matched by allow-list/department/place and time window",
  };
}
