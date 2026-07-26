import type { WildfireSourceType } from "@/lib/incidents/wildfireOperational";

export type OfficialAuthorityLevel =
  | "prefecture"
  | "ministry"
  | "gendarmerie"
  | "civil_protection";

export type OfficialParserType =
  | "gironde_communique"
  | "interieur_article"
  | "gendarmerie_article";

export type OfficialGeographicScope = "incident" | "department" | "region";

export type FranceWildfireOfficialSource = {
  id: string;
  name: string;
  sourceType: Extract<
    WildfireSourceType,
    "authority" | "emergency_service"
  >;
  authorityLevel: OfficialAuthorityLevel;
  url: string;
  countryCode: "FR";
  regionName: string;
  trustedDomains: string[];
  incidentKeywords: string[];
  parserType: OfficialParserType;
  enabled: boolean;
  /** When set, this pilot source may only be attached to these GDACS ids. */
  allowedIncidentIds?: string[];
  /** French department codes that the incident coordinates must match. */
  departmentCodes?: string[];
  /** At least one of these place names must appear in the document. */
  requiredPlaceNames?: string[];
  /** Place names that indicate a different geography than this source. */
  excludedPlaceNames?: string[];
  geographicScope?: OfficialGeographicScope;
};

export const FRANCE_OFFICIAL_TRUSTED_DOMAINS = [
  "gironde.gouv.fr",
  "interieur.gouv.fr",
  "securite-civile.interieur.gouv.fr",
  "gendarmerie.interieur.gouv.fr",
] as const;

/** Strong geographic keywords for GDACS wildfire 1029628 (Gironde / Saumos). */
export const INCIDENT_1029628_KEYWORDS = [
  "Gironde",
  "Saumos",
  "Le Porge",
  "Lège-Cap-Ferret",
  "Lège Cap-Ferret",
  "Lège Cap Ferret",
  "Cap Ferret",
  "Cap-Ferret",
  "Le Temple",
  "Médoc",
  "Medoc",
  "bassin d’Arcachon",
  "bassin d'Arcachon",
  "Arcachon",
] as const;

const GIRONDE_REQUIRED_PLACES = [
  "Saumos",
  "Le Porge",
  "Lège-Cap-Ferret",
  "Cap-Ferret",
  "Le Temple",
  "Médoc",
  "Gironde",
] as const;

const GIRONDE_PILOT_BASE = {
  name: "Préfecture de la Gironde" as const,
  sourceType: "authority" as const,
  authorityLevel: "prefecture" as const,
  countryCode: "FR" as const,
  regionName: "Gironde",
  trustedDomains: ["gironde.gouv.fr"],
  incidentKeywords: [...INCIDENT_1029628_KEYWORDS],
  parserType: "gironde_communique" as const,
  enabled: true,
  allowedIncidentIds: ["1029628"],
  departmentCodes: ["33"],
  requiredPlaceNames: [...GIRONDE_REQUIRED_PLACES],
  excludedPlaceNames: ["Var", "Landes", "Bouches-du-Rhône", "Aude", "Hérault"],
  geographicScope: "incident" as const,
};

export const FRANCE_WILDFIRE_OFFICIAL_SOURCES: FranceWildfireOfficialSource[] = [
  {
    ...GIRONDE_PILOT_BASE,
    id: "fr-gironde-saumos-21h00-2026-07-22",
    url: "https://www.gironde.gouv.fr/index.php/Actualites/Communiques-de-presse/Communiques-de-presse-2026/Juillet-2026/Incendie-de-Saumos-point-de-situation-a-21h00",
  },
  {
    ...GIRONDE_PILOT_BASE,
    id: "fr-gironde-saumos-21h30-2026-07-23",
    url: "https://www.gironde.gouv.fr/index.php/Actualites/Communiques-de-presse/Communiques-de-presse-2026/Juillet-2026/Incendie-en-cours-point-de-situation-a-21h30",
  },
  {
    id: "fr-interieur-combattre-feu-tous-fronts",
    name: "Ministère de l’Intérieur",
    sourceType: "authority",
    authorityLevel: "ministry",
    url: "https://www.interieur.gouv.fr/actualites/actualites-du-ministere/sur-terre-et-dans-airs-combattre-feu-sur-tous-fronts",
    countryCode: "FR",
    regionName: "Gironde",
    trustedDomains: ["interieur.gouv.fr", "securite-civile.interieur.gouv.fr"],
    incidentKeywords: [...INCIDENT_1029628_KEYWORDS],
    parserType: "interieur_article",
    enabled: true,
    allowedIncidentIds: ["1029628"],
    departmentCodes: ["33"],
    requiredPlaceNames: [...GIRONDE_REQUIRED_PLACES],
    excludedPlaceNames: ["Var"],
    geographicScope: "incident",
  },
  {
    id: "fr-gendarmerie-gironde-landes-2026",
    name: "Gendarmerie nationale",
    sourceType: "emergency_service",
    authorityLevel: "gendarmerie",
    url: "https://www.gendarmerie.interieur.gouv.fr/gendinfo/actualites/2026/nouvelle-aquitaine-engagement-majeur-de-la-gendarmerie-nationale-sur-le-front-des-incendies-en-gironde-et-dans-les-landes",
    countryCode: "FR",
    regionName: "Gironde",
    trustedDomains: ["gendarmerie.interieur.gouv.fr"],
    incidentKeywords: [...INCIDENT_1029628_KEYWORDS],
    parserType: "gendarmerie_article",
    enabled: true,
    allowedIncidentIds: ["1029628"],
    departmentCodes: ["33"],
    requiredPlaceNames: [...GIRONDE_REQUIRED_PLACES],
    excludedPlaceNames: ["Var"],
    geographicScope: "incident",
  },
];

export const GIRONDE_PILOT_SOURCE_URLS = FRANCE_WILDFIRE_OFFICIAL_SOURCES.filter(
  (source) => source.authorityLevel === "prefecture",
).map((source) => source.url);

/** Approximate bounding boxes for French departments used by pilot matching. */
export const FRANCE_DEPARTMENT_BBOX: Record<
  string,
  { minLon: number; maxLon: number; minLat: number; maxLat: number }
> = {
  // Gironde
  "33": { minLon: -1.65, maxLon: -0.05, minLat: 44.15, maxLat: 45.65 },
  // Landes
  "40": { minLon: -1.55, maxLon: -0.05, minLat: 43.45, maxLat: 44.55 },
  // Var
  "83": { minLon: 5.65, maxLon: 6.95, minLat: 42.95, maxLat: 43.85 },
};

export function isPointInDepartment(
  longitude: number,
  latitude: number,
  departmentCode: string,
): boolean {
  const bbox = FRANCE_DEPARTMENT_BBOX[departmentCode];
  if (!bbox) return false;
  return (
    longitude >= bbox.minLon &&
    longitude <= bbox.maxLon &&
    latitude >= bbox.minLat &&
    latitude <= bbox.maxLat
  );
}

export function isTrustedOfficialHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return FRANCE_OFFICIAL_TRUSTED_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

export function sourcesForIncidentCountryRegion(input: {
  incidentId: string;
  countryCode: string | null;
  regionHint?: string | null;
  longitude?: number;
  latitude?: number;
}): FranceWildfireOfficialSource[] {
  const country = (input.countryCode ?? "").toUpperCase();
  if (country !== "FR") return [];

  return FRANCE_WILDFIRE_OFFICIAL_SOURCES.filter((source) => {
    if (!source.enabled) return false;

    if (
      source.allowedIncidentIds &&
      source.allowedIncidentIds.length > 0 &&
      !source.allowedIncidentIds.includes(input.incidentId)
    ) {
      return false;
    }

    if (
      source.departmentCodes &&
      source.departmentCodes.length > 0 &&
      typeof input.longitude === "number" &&
      typeof input.latitude === "number"
    ) {
      const inDept = source.departmentCodes.some((code) =>
        isPointInDepartment(input.longitude!, input.latitude!, code),
      );
      if (!inDept) return false;
    }

    if (!input.regionHint) return true;
    const hint = input.regionHint.toLowerCase();
    return (
      source.regionName.toLowerCase() === hint ||
      source.incidentKeywords.some((keyword) =>
        keyword.toLowerCase().includes(hint),
      ) ||
      hint.includes(source.regionName.toLowerCase())
    );
  });
}
