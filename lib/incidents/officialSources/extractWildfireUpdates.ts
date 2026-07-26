import { createHash } from "node:crypto";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { OfficialFetchedDocument } from "@/lib/incidents/officialSources/fetchOfficialDocument";
import type { FranceWildfireOfficialSource } from "@/lib/incidents/officialSources/franceWildfireSources";
import type {
  WildfireOperationalUpdate,
  WildfireUpdateCategory,
} from "@/lib/incidents/wildfireOperational";

export type WildfireOperationalUpdateDraft = Omit<
  WildfireOperationalUpdate,
  "id" | "createdAt" | "updatedAt"
>;

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function externalIdFor(input: {
  sourceId: string;
  url: string;
  category: WildfireUpdateCategory;
  contentKey: string;
}): string {
  return sha(
    `${input.sourceId}|${input.url}|${input.category}|${input.contentKey}`,
  );
}

function sentenceWindow(text: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, text.lastIndexOf(".", matchIndex - 1) + 1);
  const next = text.indexOf(".", matchIndex + matchLength);
  const end = next === -1 ? text.length : next + 1;
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function parseFrenchInt(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "").replace(/\./g, "");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function pushUnique(
  list: WildfireOperationalUpdateDraft[],
  draft: WildfireOperationalUpdateDraft,
): void {
  const key = `${draft.category}|${draft.externalId}|${draft.body}|${draft.title}`;
  if (list.some((item) => `${item.category}|${item.externalId}|${item.body}|${item.title}` === key)) {
    return;
  }
  list.push(draft);
}

function baseDraft(input: {
  incidentId: string;
  source: FranceWildfireOfficialSource;
  document: OfficialFetchedDocument;
  category: WildfireUpdateCategory;
  contentKey: string;
  title: string | null;
  body: string | null;
  status?: string | null;
  locationName?: string | null;
  structuredData?: Record<string, unknown>;
}): WildfireOperationalUpdateDraft {
  const now = new Date().toISOString();
  return {
    incidentId: input.incidentId,
    externalId: externalIdFor({
      sourceId: input.source.id,
      url: input.document.finalUrl,
      category: input.category,
      contentKey: input.contentKey,
    }),
    category: input.category,
    title: input.title,
    body: input.body,
    status: input.status ?? null,
    sourceType: input.source.sourceType,
    sourceName: input.source.name,
    sourceUrl: input.document.finalUrl,
    verificationStatus: "official",
    publishedAt: input.document.publishedAt,
    effectiveFrom: input.document.publishedAt,
    expiresAt: null,
    lastVerifiedAt: input.document.fetchedAt || now,
    locationName: input.locationName ?? null,
    geometry: null,
    structuredData: input.structuredData ?? {},
    contentHash: sha(
      `${input.category}|${input.title ?? ""}|${input.body ?? ""}|${JSON.stringify(input.structuredData ?? {})}`,
    ),
  };
}

const SITUATION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /feu toujours très actif/i, label: "feu toujours très actif" },
  { re: /feu\s+actif/i, label: "feu actif" },
  { re: /feu\s+fixé/i, label: "feu fixé" },
  { re: /feu\s+maîtrisé/i, label: "feu maîtrisé" },
  { re: /feu\s+contenu/i, label: "feu contenu" },
  { re: /propagation en cours/i, label: "propagation en cours" },
  { re: /conditions(?:\s+\w+){0,3}\s+défavorables/i, label: "conditions défavorables" },
  { re: /ligne d’appui franchie|ligne d'appui franchie/i, label: "ligne d’appui franchie" },
  { re: /surveillance maintenue/i, label: "surveillance maintenue" },
  { re: /maîtriser le feu/i, label: "maîtriser le feu" },
];

const EVACUATION_LINE =
  /évacuation(?:\s+préventive)?\s+(?:du|de la|des|de l’|de l')\s*([^:]{3,80})\s*:\s*([^.•-]{5,160})/gi;

const EVACUATION_SUMMARY =
  /évacuations?\s+préventives?\s+décidées[^.]{0,120}concernent\s+près\s+de\s+([\d\s]+)\s+personnes/i;

const SAFETY_PATTERNS: RegExp[] = [
  /éviter tout déplacement dans le secteur sinistré[^.]{0,120}\./i,
  /suivre strictement les messages de prévention et de sécurité[^.]{0,80}\./i,
  /quitter la presqu[’']île[^.]{0,140}\./i,
  /ne pas entraver les opérations de secours[^.]{0,80}\./i,
  /emprunter la D[\dA-Z]+[^.]{0,120}\./i,
];

const CAUSE_PATTERNS: RegExp[] = [
  /origine confirmée/i,
  /cause déterminée/i,
  /enquête conclue/i,
  /origine accidentelle/i,
  /origine criminelle/i,
  /foudre confirmée/i,
];

const NATIONAL_INVENTORY =
  /flotte nationale|à l’échelle nationale|au niveau national|moyens nationaux disponibles|inventaire national/i;

const OTHER_FIRE_CONTEXT =
  /autres secteurs|nouveaux départs de feu|d’autres départements|des landes|\bvar\b/i;

function extractSituation(
  text: string,
  ctx: {
    incidentId: string;
    source: FranceWildfireOfficialSource;
    document: OfficialFetchedDocument;
  },
): WildfireOperationalUpdateDraft[] {
  const out: WildfireOperationalUpdateDraft[] = [];
  for (const pattern of SITUATION_PATTERNS) {
    const match = pattern.re.exec(text);
    if (!match) continue;
    const body = sentenceWindow(text, match.index, match[0].length);
    if (!body) continue;
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "situation",
        contentKey: pattern.label,
        title: "Point de situation",
        body,
        status: "active",
      }),
    );
  }
  return out;
}

function extractEvacuations(
  text: string,
  ctx: {
    incidentId: string;
    source: FranceWildfireOfficialSource;
    document: OfficialFetchedDocument;
  },
): WildfireOperationalUpdateDraft[] {
  const out: WildfireOperationalUpdateDraft[] = [];
  for (const match of text.matchAll(EVACUATION_LINE)) {
    const zone = match[1]?.trim();
    const detail = match[2]?.trim();
    if (!zone || !detail) continue;
    const peopleMatch = detail.match(/([\d\s]+)\s+personnes/i);
    const people = peopleMatch ? parseFrenchInt(peopleMatch[1]) : null;
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "evacuation_order",
        contentKey: `evac:${zone}:${detail.slice(0, 40)}`,
        title: `Évacuation — ${zone}`,
        body: `${zone} : ${detail}`,
        status: "active",
        locationName: zone,
        structuredData: {
          personCount: people,
          zones: [zone],
          detail,
        },
      }),
    );
  }

  const summary = text.match(EVACUATION_SUMMARY);
  if (summary) {
    const people = parseFrenchInt(summary[1]);
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "evacuation_order",
        contentKey: `evac-summary:${summary[1]}`,
        title: "Évacuations préventives",
        body: summary[0].replace(/\s+/g, " ").trim(),
        status: "active",
        structuredData: {
          personCount: people,
          zones: ["Le Porge", "Saumos", "Le Temple", "Lège-Cap-Ferret"].filter(
            (zone) => new RegExp(zone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text),
          ),
        },
      }),
    );
  }

  // Explicit EHPAD evacuation
  const ehpad = text.match(
    /résidents de l’EHPAD\s+([^,]+),\s*situé à\s+([^,]+),\s*ont été évacués[^.]{0,80}\./i,
  ) || text.match(
    /résidents de l'EHPAD\s+([^,]+),\s*situé à\s+([^,]+),\s*ont été évacués[^.]{0,80}\./i,
  );
  if (ehpad) {
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "evacuation_order",
        contentKey: `evac-ehpad:${ehpad[1]}`,
        title: `Évacuation — EHPAD ${ehpad[1].trim()}`,
        body: ehpad[0].replace(/\s+/g, " ").trim(),
        status: "active",
        locationName: `${ehpad[1].trim()}, ${ehpad[2].trim()}`,
        structuredData: {
          zones: [ehpad[2].trim()],
          facilityName: ehpad[1].trim(),
        },
      }),
    );
  }

  return out;
}

function extractSafety(
  text: string,
  ctx: {
    incidentId: string;
    source: FranceWildfireOfficialSource;
    document: OfficialFetchedDocument;
  },
): WildfireOperationalUpdateDraft[] {
  const out: WildfireOperationalUpdateDraft[] = [];
  for (const pattern of SAFETY_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    // Skip generic vigilance rouge department-wide prevention alone.
    if (/vigilance rouge/i.test(match[0]) && !/secteur|presqu|déplacement/i.test(match[0])) {
      continue;
    }
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "safety_instruction",
        contentKey: match[0].slice(0, 60),
        title: "Consigne officielle",
        body: match[0].replace(/\s+/g, " ").trim(),
        status: "active",
      }),
    );
  }
  return out;
}

function extractRoads(
  text: string,
  ctx: {
    incidentId: string;
    source: FranceWildfireOfficialSource;
    document: OfficialFetchedDocument;
  },
): WildfireOperationalUpdateDraft[] {
  const out: WildfireOperationalUpdateDraft[] = [];
  const roadMatches = [
    ...text.matchAll(
      /fermeture\s+de\s+la\s+(D[\dA-Za-z]+)\s*(entre\s+[^-•.]{3,60})?/gi,
    ),
  ];

  for (const match of roadMatches) {
    const road = match[1];
    const span = (match[2] || "").replace(/\s+/g, " ").trim();
    const detail = span ? `${road} ${span}` : road;
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "road_closure",
        contentKey: `road:${detail}`,
        title: `Fermeture — ${road}`,
        body: `Fermeture de la ${detail}`,
        status: "active",
        locationName: detail,
        structuredData: { roadId: road, detail },
      }),
    );
  }

  if (/circulation interdite|accès interdit|navigation interdite/i.test(text)) {
    const match = text.match(
      /[^.]{0,40}(circulation interdite|accès interdit|navigation interdite)[^.]{0,80}\./i,
    );
    if (match) {
      pushUnique(
        out,
        baseDraft({
          ...ctx,
          category: "road_closure",
          contentKey: match[1],
          title: "Restriction de circulation",
          body: match[0].replace(/\s+/g, " ").trim(),
          status: "active",
        }),
      );
    }
  }

  return out;
}

function extractResources(
  text: string,
  ctx: {
    incidentId: string;
    source: FranceWildfireOfficialSource;
    document: OfficialFetchedDocument;
  },
): WildfireOperationalUpdateDraft[] {
  const out: WildfireOperationalUpdateDraft[] = [];

  const localBlocks = text
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => {
      if (!sentence) return false;
      if (NATIONAL_INVENTORY.test(sentence)) return false;
      if (
        OTHER_FIRE_CONTEXT.test(sentence) &&
        !/Saumos|Le Porge|Lège|Gironde/i.test(sentence)
      ) {
        return false;
      }
      // Keep only concrete deployment statements for this fire.
      return /(sapeurs-pompiers|canadair|dash|air tractor|hélicoptère|helicoptere|moyens de secours terrestres|moyens aériens|colonnes? de renfort|militaires de la gendarmerie|escadron de gendarmerie)/i.test(
        sentence,
      );
    })
    .filter(
      (sentence) =>
        !/cellule d’information|cellule d'information|centre opérationnel départemental|faciliter une circulation fluide/i.test(
          sentence,
        ),
    );

  if (localBlocks.length === 0) return out;

  const joined = localBlocks.join(" ");
  const personnel =
    parseFrenchInt(
      joined.match(/(?:plus de\s+)?([\d\s]+)\s+sapeurs-pompiers/i)?.[1] ?? "",
    ) ??
    (() => {
      const gendarmes =
        parseFrenchInt(
          joined.match(/([\d\s]+)\s+militaires de la gendarmerie/i)?.[1] ?? "",
        ) ?? 0;
      const mobile =
        parseFrenchInt(
          joined.match(/escadron de gendarmerie mobile de\s+([\d\s]+)/i)?.[1] ??
            "",
        ) ?? 0;
      const total = gendarmes + mobile;
      return total > 0 ? total : null;
    })();
  const vehicles = parseFrenchInt(
    joined.match(/([\d\s]+)\s+moyens de secours terrestres/i)?.[1] ?? "",
  );
  const aircraft =
    parseFrenchInt(joined.match(/([\d\s]+)\s+moyens aériens/i)?.[1] ?? "") ??
    (() => {
      const dash = parseFrenchInt(joined.match(/(\d+)\s+dash/i)?.[1] ?? "") ?? 0;
      const canadair =
        parseFrenchInt(joined.match(/(\d+)\s+canadair/i)?.[1] ?? "") ?? 0;
      const airTractor =
        parseFrenchInt(joined.match(/(\d+)\s+air tractor/i)?.[1] ?? "") ?? 0;
      const total = dash + canadair + airTractor;
      return total > 0 ? total : null;
    })();
  const helicopters =
    parseFrenchInt(joined.match(/(\d+)\s+hélicoptères?/i)?.[1] ?? "") ??
    (/hélicoptère charlie|helicoptere charlie/i.test(joined) ? 1 : null);
  const drones = parseFrenchInt(joined.match(/(\d+)\s+drones?/i)?.[1] ?? "");

  const descriptions = localBlocks.filter(
    (block) => block.length > 20 && block.length < 360,
  );

  if (
    personnel === null &&
    vehicles === null &&
    aircraft === null &&
    helicopters === null &&
    descriptions.length === 0
  ) {
    return out;
  }

  pushUnique(
    out,
    baseDraft({
      ...ctx,
      category: "resources",
      contentKey: `resources:${personnel ?? 0}:${vehicles ?? 0}:${aircraft ?? 0}:${helicopters ?? 0}`,
      title: "Moyens déployés",
      body: descriptions[0] ?? joined.slice(0, 280),
      status: "active",
      structuredData: {
        personnelCount: personnel,
        vehicleCount: vehicles,
        aircraftCount: aircraft,
        helicopterCount: helicopters,
        droneCount: drones,
        resourceDescriptions: descriptions.slice(0, 6),
      },
    }),
  );

  return out;
}

function extractReceptionAndShelters(
  text: string,
  ctx: {
    incidentId: string;
    source: FranceWildfireOfficialSource;
    document: OfficialFetchedDocument;
  },
): WildfireOperationalUpdateDraft[] {
  const out: WildfireOperationalUpdateDraft[] = [];

  const salle = text.match(
    /quartier du Porge Nord-Est\s*:\s*une centaine de personnes mises à l’abri dans une salle communale/i,
  ) || text.match(
    /quartier du Porge Nord-Est\s*:\s*une centaine de personnes mises à l'abri dans une salle communale/i,
  );
  if (salle) {
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "shelter",
        contentKey: "shelter:porge-salle-communale",
        title: "Salle communale — Le Porge Nord-Est",
        body: salle[0].replace(/\s+/g, " ").trim(),
        status: "open",
        locationName: "Salle communale, quartier du Porge Nord-Est",
        structuredData: { personCount: 100 },
      }),
    );
  }

  const centres = text.match(
    /centres d’accueil demeurent ouverts[^.]{0,160}communes de\s+([^.]+)\./i,
  ) || text.match(
    /centres d'accueil demeurent ouverts[^.]{0,160}communes de\s+([^.]+)\./i,
  );
  if (centres) {
    const communes = centres[1]
      .split(/,| et /i)
      .map((part) => part.trim())
      .filter((part) => part.length > 2);
    for (const commune of communes) {
      pushUnique(
        out,
        baseDraft({
          ...ctx,
          category: "reception_center",
          contentKey: `reception:${commune}`,
          title: `Centre d’accueil — ${commune}`,
          body: `Centre d’accueil ouvert pour les personnes évacuées sur la commune de ${commune}.`,
          status: "open",
          locationName: commune,
          structuredData: { commune, open: true },
        }),
      );
    }
  }

  if (/centre d’accueil de Lège-Cap-Ferret n’est désormais plus en mesure|centre d'accueil de Lège-Cap-Ferret n'est désormais plus en mesure/i.test(text)) {
    pushUnique(
      out,
      baseDraft({
        ...ctx,
        category: "reception_center",
        contentKey: "reception:lege-full",
        title: "Centre d’accueil — Lège-Cap-Ferret",
        body: "Le centre d’accueil de Lège-Cap-Ferret n’est plus en mesure d’accueillir de nouvelles personnes.",
        status: "full",
        locationName: "Lège-Cap-Ferret",
        structuredData: { commune: "Lège-Cap-Ferret", open: false },
      }),
    );
  }

  return out;
}

function extractCause(
  text: string,
  ctx: {
    incidentId: string;
    source: FranceWildfireOfficialSource;
    document: OfficialFetchedDocument;
  },
): WildfireOperationalUpdateDraft[] {
  // Reject generic drought / malice statements.
  if (/peuvent résulter|peuvent être|sécheresse ou d’actes|sécheresse ou d'actes/i.test(text)) {
    const onlyGeneric = CAUSE_PATTERNS.every((re) => !re.test(text));
    if (onlyGeneric) return [];
  }

  for (const pattern of CAUSE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    const body = sentenceWindow(text, text.search(pattern), match[0].length);
    return [
      baseDraft({
        ...ctx,
        category: "cause",
        contentKey: match[0],
        title: "Cause",
        body,
        status: "known",
      }),
    ];
  }
  return [];
}

/**
 * Conservatively extracts operational updates from an official document.
 * Only returns facts explicitly tied to the incident geography.
 */
export function extractWildfireUpdates(input: {
  document: OfficialFetchedDocument;
  incident: WildfireIncident;
  source: FranceWildfireOfficialSource;
  relevantText: string;
}): WildfireOperationalUpdateDraft[] {
  const { document, incident, source, relevantText } = input;
  if (!relevantText.trim()) return [];

  const ctx = {
    incidentId: incident.id,
    source,
    document,
  };

  const updates: WildfireOperationalUpdateDraft[] = [];

  // Always create one authority message summary for a matched publication.
  const summaryBody = relevantText.slice(0, 420).trim();
  updates.push(
    baseDraft({
      ...ctx,
      category: "authority_message",
      contentKey: `authority:${document.contentHash.slice(0, 16)}`,
      title: document.title.split(" - ")[0]?.trim() || document.title,
      body: summaryBody,
      status: "published",
    }),
  );

  updates.push(...extractSituation(relevantText, ctx));
  updates.push(...extractEvacuations(relevantText, ctx));
  updates.push(...extractSafety(relevantText, ctx));
  updates.push(...extractRoads(relevantText, ctx));
  updates.push(...extractResources(relevantText, ctx));
  updates.push(...extractReceptionAndShelters(relevantText, ctx));
  updates.push(...extractCause(relevantText, ctx));

  // Drop safety locations without usable location names.
  return updates.filter((update) => {
    if (
      update.category === "shelter" ||
      update.category === "reception_center" ||
      update.category === "gathering_point"
    ) {
      return Boolean(update.locationName && update.locationName.trim());
    }
    return true;
  });
}
