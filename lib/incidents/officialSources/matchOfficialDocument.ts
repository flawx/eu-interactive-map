import type { WildfireIncident } from "@/lib/incidents/types";
import type { OfficialFetchedDocument } from "@/lib/incidents/officialSources/fetchOfficialDocument";

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
      // If Landais/Var mentioned in same paragraph as Gironde, keep only when
      // a strong local keyword (commune) is also present.
      const strongLocal = hits.some(
        (hit) => !/^france$/i.test(hit) && !/^gironde$/i.test(hit),
      );
      if (otherDept && !strongLocal && !hits.some((h) => /gironde/i.test(h))) {
        continue;
      }
      kept.push(paragraph);
      continue;
    }
    // Keep operational continuation sentences without place names only when
    // they clearly continue a previously kept Saumos/Gironde block and do not
    // introduce another department.
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
    // Fall back to whole body only if it has strong keyword hits overall.
    return findKeywordHits(bodyText, keywords).length > 0 ? bodyText : "";
  }

  return kept.join(" ");
}

export function matchOfficialDocumentToWildfireIncident(input: {
  document: OfficialFetchedDocument;
  incident: WildfireIncident;
  keywords: string[];
}): OfficialMatchResult {
  const { document, incident, keywords } = input;
  const titleHits = findKeywordHits(document.title, keywords);
  const bodyHits = findKeywordHits(document.bodyText, keywords);
  const matchedKeywords = Array.from(new Set([...titleHits, ...bodyHits]));

  if (!isWithinIncidentWindow(document.publishedAt, incident)) {
    return {
      matched: false,
      score: "insufficient",
      matchedKeywords,
      relevantText: "",
      reason: "Publication outside incident time window",
    };
  }

  // Country-only or region-only without a strong place keyword is insufficient.
  const strongKeywords = matchedKeywords.filter(
    (keyword) =>
      !/^france$/i.test(keyword) &&
      !/^nouvelle[- ]?aquitaine$/i.test(keyword),
  );

  if (strongKeywords.length === 0) {
    return {
      matched: false,
      score: "insufficient",
      matchedKeywords,
      relevantText: "",
      reason: "No strong geographic keyword for the incident",
    };
  }

  const hasExactPlaceInTitle = titleHits.some(
    (keyword) => !/^gironde$/i.test(keyword) && !/^france$/i.test(keyword),
  );
  const hasExactPlaceInBody = bodyHits.some(
    (keyword) => !/^gironde$/i.test(keyword) && !/^france$/i.test(keyword),
  );
  const hasDepartment =
    matchedKeywords.some((keyword) => /gironde/i.test(keyword)) ||
    /gironde/i.test(incident.title);

  let score: OfficialMatchResult["score"] = "insufficient";
  if (hasExactPlaceInTitle || hasExactPlaceInBody) {
    score = "strong";
  } else if (hasDepartment && document.publishedAt) {
    score = "medium";
  }

  if (score === "insufficient") {
    return {
      matched: false,
      score,
      matchedKeywords,
      relevantText: "",
      reason: "Geographic signal too weak",
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
    matchedKeywords: strongKeywords,
    relevantText,
    reason: "Matched by geographic keywords and time window",
  };
}
