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
  "Médoc",
  "Medoc",
  "bassin d’Arcachon",
  "bassin d'Arcachon",
  "Arcachon",
] as const;

export const FRANCE_WILDFIRE_OFFICIAL_SOURCES: FranceWildfireOfficialSource[] = [
  {
    id: "fr-gironde-saumos-21h00-2026-07-22",
    name: "Préfecture de la Gironde",
    sourceType: "authority",
    authorityLevel: "prefecture",
    url: "https://www.gironde.gouv.fr/index.php/Actualites/Communiques-de-presse/Communiques-de-presse-2026/Juillet-2026/Incendie-de-Saumos-point-de-situation-a-21h00",
    countryCode: "FR",
    regionName: "Gironde",
    trustedDomains: ["gironde.gouv.fr"],
    incidentKeywords: [...INCIDENT_1029628_KEYWORDS],
    parserType: "gironde_communique",
    enabled: true,
  },
  {
    id: "fr-gironde-saumos-21h30-2026-07-23",
    name: "Préfecture de la Gironde",
    sourceType: "authority",
    authorityLevel: "prefecture",
    url: "https://www.gironde.gouv.fr/index.php/Actualites/Communiques-de-presse/Communiques-de-presse-2026/Juillet-2026/Incendie-en-cours-point-de-situation-a-21h30",
    countryCode: "FR",
    regionName: "Gironde",
    trustedDomains: ["gironde.gouv.fr"],
    incidentKeywords: [...INCIDENT_1029628_KEYWORDS],
    parserType: "gironde_communique",
    enabled: true,
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
  },
];

export function isTrustedOfficialHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return FRANCE_OFFICIAL_TRUSTED_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

export function sourcesForIncidentCountryRegion(input: {
  countryCode: string | null;
  regionHint?: string | null;
}): FranceWildfireOfficialSource[] {
  const country = (input.countryCode ?? "").toUpperCase();
  if (country !== "FR") return [];

  return FRANCE_WILDFIRE_OFFICIAL_SOURCES.filter((source) => {
    if (!source.enabled) return false;
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
