/**
 * Main EU institutions and physical sites.
 *
 * Addresses validated against official domains only:
 * - commission.europa.eu
 * - consilium.europa.eu
 * - europarl.europa.eu
 * - ecb.europa.eu
 * - european-union.europa.eu
 * - curia.europa.eu
 * - eca.europa.eu
 * - eib.org
 * - ombudsman.europa.eu
 * - cor.europa.eu
 * - eesc.europa.eu
 *
 * The General Secretariat of the Council and the Secretariat-General of the
 * European Commission are administrative bodies of existing institutions —
 * they are documented as aliases on `council-of-the-eu` / `european-commission`
 * rather than as separate fake institutions.
 */

export type EuInstitutionId =
  | "european-commission"
  | "european-council"
  | "council-of-the-eu"
  | "european-parliament"
  | "european-central-bank"
  | "court-of-justice-of-the-eu"
  | "european-court-of-auditors"
  | "european-investment-bank"
  | "european-ombudsman"
  | "european-committee-of-the-regions"
  | "european-economic-and-social-committee";

export type EuInstitutionSiteType =
  | "headquarters"
  | "primary-seat"
  | "working-place"
  | "secretariat"
  | "meeting-place";

export type EuInstitutionSite = {
  id: string;
  institutionIds: EuInstitutionId[];
  name: string;
  city: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  siteType: EuInstitutionSiteType;
  address: string | null;
  officialUrl: string | null;
  sharedSite: boolean;
  aliases: string[];
};

export type EuInstitution = {
  id: EuInstitutionId;
  canonicalName: string;
  shortName: string;
  aliases: string[];
  institutionType: string;
  officialWebsite: string;
  officialInformationUrl: string;
  wikidataId: string;
  color: string;
  icon: string;
  sites: EuInstitutionSite[];
  establishedYear: number | null;
};

const ALLOWED_OFFICIAL_HOSTS = [
  "europa.eu",
  "european-union.europa.eu",
  "commission.europa.eu",
  "consilium.europa.eu",
  "europarl.europa.eu",
  "ecb.europa.eu",
  "visiting.europarl.europa.eu",
  "curia.europa.eu",
  "eca.europa.eu",
  "eib.org",
  "ombudsman.europa.eu",
  "cor.europa.eu",
  "eesc.europa.eu",
] as const;

/** Shared seat of the European Council and the Council of the EU. */
const EUROPA_BUILDING_BRUSSELS: EuInstitutionSite = {
  id: "europa-building-brussels",
  institutionIds: ["european-council", "council-of-the-eu"],
  name: "Europa building",
  city: "Brussels",
  countryCode: "BE",
  longitude: 4.3806,
  latitude: 50.8424,
  siteType: "meeting-place",
  address: "Rue de la Loi / Wetstraat 175, B-1048 Brussels, Belgium",
  officialUrl:
    "https://www.consilium.europa.eu/en/contact/address/council-buildings/europa-building/",
  sharedSite: true,
  aliases: [
    "Europa building",
    "Europa",
    "Justus Lipsius",
    "Consilium",
    "Schuman",
  ],
};

const BERLAYMONT_BRUSSELS: EuInstitutionSite = {
  id: "berlaymont-brussels",
  institutionIds: ["european-commission"],
  name: "Berlaymont",
  city: "Brussels",
  countryCode: "BE",
  longitude: 4.3826,
  latitude: 50.8439,
  siteType: "headquarters",
  address: "Rue de la Loi / Wetstraat 200, 1049 Brussels, Belgium",
  officialUrl: "https://commission.europa.eu/about/contact_en",
  sharedSite: false,
  aliases: ["Berlaymont", "Commission Brussels", "EC Brussels"],
};

const PARLIAMENT_BRUSSELS: EuInstitutionSite = {
  id: "parliament-brussels",
  institutionIds: ["european-parliament"],
  name: "Paul-Henri Spaak",
  city: "Brussels",
  countryCode: "BE",
  longitude: 4.3754,
  latitude: 50.8385,
  siteType: "working-place",
  address: "Rue Wiertz / Wiertzstraat 60, B-1047 Brussels, Belgium",
  officialUrl:
    "https://visiting.europarl.europa.eu/en/visitor-offer/brussels/hemicycle",
  sharedSite: false,
  aliases: [
    "Spaak",
    "Paul-Henri Spaak",
    "Espace Léopold",
    "Parlement Bruxelles",
    "Parliament Brussels",
  ],
};

const PARLIAMENT_STRASBOURG: EuInstitutionSite = {
  id: "parliament-strasbourg",
  institutionIds: ["european-parliament"],
  name: "Louise Weiss",
  city: "Strasbourg",
  countryCode: "FR",
  longitude: 7.7689,
  latitude: 48.5976,
  siteType: "primary-seat",
  address:
    "1 Allée du Printemps / 1 Avenue du Président Robert Schuman, F-67070 Strasbourg, France",
  officialUrl:
    "https://visiting.europarl.europa.eu/en/visitor-offer/strasbourg/hemicycle",
  sharedSite: false,
  aliases: [
    "Louise Weiss",
    "Parlement Strasbourg",
    "Parliament Strasbourg",
    "hémicycle Strasbourg",
  ],
};

const PARLIAMENT_LUXEMBOURG: EuInstitutionSite = {
  id: "parliament-luxembourg",
  institutionIds: ["european-parliament"],
  name: "Konrad Adenauer",
  city: "Luxembourg",
  countryCode: "LU",
  longitude: 6.1457,
  latitude: 49.62,
  siteType: "secretariat",
  address: "2 Rue Alcide De Gasperi, L-1615 Luxembourg, Luxembourg",
  officialUrl:
    "https://www.europarl.europa.eu/about-parliament/en/organisation-and-rules/secretariat",
  sharedSite: false,
  aliases: [
    "Adenauer",
    "Konrad Adenauer",
    "Parlement Luxembourg",
    "Parliament Luxembourg",
    "Kirchberg",
  ],
};

const ECB_FRANKFURT: EuInstitutionSite = {
  id: "ecb-frankfurt",
  institutionIds: ["european-central-bank"],
  name: "ECB Main Building",
  city: "Frankfurt",
  countryCode: "DE",
  longitude: 8.7039,
  latitude: 50.1095,
  siteType: "headquarters",
  address: "Sonnemannstrasse 20, 60314 Frankfurt am Main, Germany",
  officialUrl: "https://www.ecb.europa.eu/ecb/contacts/address/html/index.en.html",
  sharedSite: false,
  aliases: [
    "ECB",
    "BCE",
    "Sonnemannstrasse",
    "Grossmarkthalle",
    "Frankfurt ECB",
  ],
};

const CJEU_LUXEMBOURG: EuInstitutionSite = {
  id: "cjeu-luxembourg",
  institutionIds: ["court-of-justice-of-the-eu"],
  name: "Palais de la Cour de Justice",
  city: "Luxembourg",
  countryCode: "LU",
  longitude: 6.1411,
  latitude: 49.6214,
  siteType: "headquarters",
  address: "Rue du Fort Niedergrünewald, L-2925 Luxembourg, Luxembourg",
  officialUrl: "https://curia.europa.eu/jcms/jcms/Jo2_7000/en/",
  sharedSite: false,
  aliases: ["Palais de la Cour de Justice", "CJEU", "Curia", "Kirchberg"],
};

const ECA_LUXEMBOURG: EuInstitutionSite = {
  id: "eca-luxembourg",
  institutionIds: ["european-court-of-auditors"],
  name: "European Court of Auditors",
  city: "Luxembourg",
  countryCode: "LU",
  longitude: 6.1428,
  latitude: 49.6275,
  siteType: "headquarters",
  address: "12 Rue Alcide De Gasperi, L-1615 Luxembourg, Luxembourg",
  officialUrl: "https://www.eca.europa.eu/en/Pages/Contact.aspx",
  sharedSite: false,
  aliases: ["Court of Auditors", "ECA", "Cour des comptes européenne"],
};

const EIB_LUXEMBOURG: EuInstitutionSite = {
  id: "eib-luxembourg",
  institutionIds: ["european-investment-bank"],
  name: "European Investment Bank",
  city: "Luxembourg",
  countryCode: "LU",
  longitude: 6.1439,
  latitude: 49.6203,
  siteType: "headquarters",
  address: "98-100 Boulevard Konrad Adenauer, L-2950 Luxembourg, Luxembourg",
  officialUrl: "https://www.eib.org/en/about/contact/index.htm",
  sharedSite: false,
  aliases: ["EIB", "Banque européenne d'investissement"],
};

const OMBUDSMAN_STRASBOURG: EuInstitutionSite = {
  id: "ombudsman-strasbourg",
  institutionIds: ["european-ombudsman"],
  name: "European Ombudsman",
  city: "Strasbourg",
  countryCode: "FR",
  longitude: 7.7469,
  latitude: 48.595,
  siteType: "headquarters",
  address: "1 Avenue du Président Robert Schuman, CS 30403, F-67001 Strasbourg, France",
  officialUrl: "https://www.ombudsman.europa.eu/en/contact",
  sharedSite: false,
  aliases: ["Médiateur européen", "EU Ombudsman"],
};

const COR_BRUSSELS: EuInstitutionSite = {
  id: "cor-brussels",
  institutionIds: ["european-committee-of-the-regions"],
  name: "Jacques Delors building",
  city: "Brussels",
  countryCode: "BE",
  longitude: 4.3768,
  latitude: 50.8408,
  siteType: "headquarters",
  address: "Rue Belliard/Belliardstraat 99-101, 1040 Brussels, Belgium",
  officialUrl: "https://cor.europa.eu/en/about/Pages/contacts.aspx",
  sharedSite: false,
  aliases: ["CoR", "Committee of the Regions", "Comité des régions"],
};

const EESC_BRUSSELS: EuInstitutionSite = {
  id: "eesc-brussels",
  institutionIds: ["european-economic-and-social-committee"],
  name: "Jacques Delors building",
  city: "Brussels",
  countryCode: "BE",
  longitude: 4.3765,
  latitude: 50.841,
  siteType: "headquarters",
  address: "Rue Belliard/Belliardstraat 99-101, 1040 Brussels, Belgium",
  officialUrl: "https://www.eesc.europa.eu/en/about/contact-us",
  sharedSite: false,
  aliases: ["EESC", "Comité économique et social européen"],
};

export const EU_INSTITUTION_SITES: readonly EuInstitutionSite[] = [
  BERLAYMONT_BRUSSELS,
  EUROPA_BUILDING_BRUSSELS,
  PARLIAMENT_BRUSSELS,
  PARLIAMENT_STRASBOURG,
  PARLIAMENT_LUXEMBOURG,
  ECB_FRANKFURT,
  CJEU_LUXEMBOURG,
  ECA_LUXEMBOURG,
  EIB_LUXEMBOURG,
  OMBUDSMAN_STRASBOURG,
  COR_BRUSSELS,
  EESC_BRUSSELS,
];

export const EU_INSTITUTIONS: readonly EuInstitution[] = [
  {
    id: "european-commission",
    canonicalName: "European Commission",
    shortName: "Commission",
    aliases: [
      "Commission européenne",
      "Commission UE",
      "EC",
      "European Commission",
      "Comisión Europea",
      "Europäische Kommission",
      "Secretariat-General of the European Commission",
      "Secrétariat général de la Commission européenne",
    ],
    institutionType: "executive",
    officialWebsite: "https://commission.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-commission_en",
    wikidataId: "Q8880",
    color: "#003399",
    icon: "landmark",
    sites: [BERLAYMONT_BRUSSELS],
    establishedYear: 1958,
  },
  {
    id: "european-council",
    canonicalName: "European Council",
    shortName: "European Council",
    aliases: [
      "Conseil européen",
      "European Council",
      "EUCO",
      "Consejo Europeo",
      "Europäischer Rat",
    ],
    institutionType: "political-direction",
    officialWebsite: "https://www.consilium.europa.eu/en/european-council/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-council_en",
    wikidataId: "Q8882",
    color: "#003399",
    icon: "landmark",
    sites: [EUROPA_BUILDING_BRUSSELS],
    establishedYear: 1975,
  },
  {
    id: "council-of-the-eu",
    canonicalName: "Council of the European Union",
    shortName: "Council of the EU",
    aliases: [
      "Conseil de l'Union européenne",
      "Conseil de l’UE",
      "Conseil de l'UE",
      "Council of the EU",
      "Council of Ministers",
      "Consejo de la UE",
      "Rat der EU",
      "General Secretariat of the Council",
      "Secrétariat général du Conseil",
    ],
    institutionType: "legislative-council",
    officialWebsite: "https://www.consilium.europa.eu/en/council-eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/council-european-union_en",
    wikidataId: "Q8896",
    color: "#003399",
    icon: "landmark",
    sites: [EUROPA_BUILDING_BRUSSELS],
    establishedYear: 1958,
  },
  {
    id: "european-parliament",
    canonicalName: "European Parliament",
    shortName: "Parliament",
    aliases: [
      "Parlement européen",
      "EP",
      "Europarlement",
      "European Parliament",
      "Parlamento Europeo",
      "Europäisches Parlament",
    ],
    institutionType: "legislative-assembly",
    officialWebsite: "https://www.europarl.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-parliament_en",
    wikidataId: "Q8889",
    color: "#003399",
    icon: "landmark",
    sites: [
      PARLIAMENT_BRUSSELS,
      PARLIAMENT_STRASBOURG,
      PARLIAMENT_LUXEMBOURG,
    ],
    establishedYear: 1952,
  },
  {
    id: "european-central-bank",
    canonicalName: "European Central Bank",
    shortName: "ECB",
    aliases: [
      "Banque centrale européenne",
      "BCE",
      "ECB",
      "European Central Bank",
      "Banco Central Europeo",
      "Europäische Zentralbank",
      "EZB",
    ],
    institutionType: "central-bank",
    officialWebsite: "https://www.ecb.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-central-bank_en",
    wikidataId: "Q8901",
    color: "#003399",
    icon: "landmark",
    sites: [ECB_FRANKFURT],
    establishedYear: 1998,
  },
  {
    id: "court-of-justice-of-the-eu",
    canonicalName: "Court of Justice of the European Union",
    shortName: "CJEU",
    aliases: [
      "Cour de justice de l'Union européenne",
      "CJUE",
      "CJEU",
      "Europäischer Gerichtshof",
      "EuGH",
      "Tribunal de Justicia de la UE",
    ],
    institutionType: "judicial",
    officialWebsite: "https://curia.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/court-justice-european-union-cjeu_en",
    wikidataId: "Q4951",
    color: "#003399",
    icon: "landmark",
    sites: [CJEU_LUXEMBOURG],
    establishedYear: 1952,
  },
  {
    id: "european-court-of-auditors",
    canonicalName: "European Court of Auditors",
    shortName: "Court of Auditors",
    aliases: [
      "Cour des comptes européenne",
      "ECA",
      "CCE",
      "Europäischer Rechnungshof",
      "Tribunal de Cuentas Europeo",
    ],
    institutionType: "audit",
    officialWebsite: "https://www.eca.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-court-auditors-eca_en",
    wikidataId: "Q8900",
    color: "#003399",
    icon: "landmark",
    sites: [ECA_LUXEMBOURG],
    establishedYear: 1977,
  },
  {
    id: "european-investment-bank",
    canonicalName: "European Investment Bank",
    shortName: "EIB",
    aliases: [
      "Banque européenne d'investissement",
      "BEI",
      "Europäische Investitionsbank",
      "Banco Europeo de Inversiones",
    ],
    institutionType: "investment-bank",
    officialWebsite: "https://www.eib.org/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-investment-bank-eib_en",
    wikidataId: "Q192247",
    color: "#003399",
    icon: "landmark",
    sites: [EIB_LUXEMBOURG],
    establishedYear: 1958,
  },
  {
    id: "european-ombudsman",
    canonicalName: "European Ombudsman",
    shortName: "Ombudsman",
    aliases: [
      "Médiateur européen",
      "EU Ombudsman",
      "Europäischer Bürgerbeauftragter",
      "Defensor del Pueblo Europeo",
    ],
    institutionType: "ombudsman",
    officialWebsite: "https://www.ombudsman.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-ombudsman_en",
    wikidataId: "Q220893",
    color: "#003399",
    icon: "landmark",
    sites: [OMBUDSMAN_STRASBOURG],
    establishedYear: 1995,
  },
  {
    id: "european-committee-of-the-regions",
    canonicalName: "European Committee of the Regions",
    shortName: "Committee of the Regions",
    aliases: [
      "Comité européen des régions",
      "CoR",
      "CdR",
      "Europäischer Ausschuss der Regionen",
      "Comité Europeo de las Regiones",
    ],
    institutionType: "advisory-regions",
    officialWebsite: "https://cor.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-committee-regions-cor_en",
    wikidataId: "Q205203",
    color: "#003399",
    icon: "landmark",
    sites: [COR_BRUSSELS],
    establishedYear: 1994,
  },
  {
    id: "european-economic-and-social-committee",
    canonicalName: "European Economic and Social Committee",
    shortName: "EESC",
    aliases: [
      "Comité économique et social européen",
      "CESE",
      "Europäischer Wirtschafts- und Sozialausschuss",
      "Comité Económico y Social Europeo",
    ],
    institutionType: "advisory-economic-social",
    officialWebsite: "https://www.eesc.europa.eu/",
    officialInformationUrl:
      "https://european-union.europa.eu/institutions-law-budget/institutions-and-bodies/institutions-and-bodies-profiles/european-economic-and-social-committee-eesc_en",
    wikidataId: "Q331024",
    color: "#003399",
    icon: "landmark",
    sites: [EESC_BRUSSELS],
    establishedYear: 1958,
  },
];

export const INSTITUTION_IDS: readonly EuInstitutionId[] = [
  "european-commission",
  "european-council",
  "council-of-the-eu",
  "european-parliament",
  "european-central-bank",
  "court-of-justice-of-the-eu",
  "european-court-of-auditors",
  "european-investment-bank",
  "european-ombudsman",
  "european-committee-of-the-regions",
  "european-economic-and-social-committee",
];

const FORBIDDEN_ALIASES = [
  "council of europe",
  "conseil de l'europe",
  "conseil de l’europe",
  "consejo de europa",
  "europarat",
] as const;

function isAllowedOfficialUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_OFFICIAL_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

export function getEuInstitutionById(
  id: string,
): EuInstitution | undefined {
  return EU_INSTITUTIONS.find((institution) => institution.id === id);
}

export function getEuInstitutionSiteById(
  siteId: string,
): EuInstitutionSite | undefined {
  return EU_INSTITUTION_SITES.find((site) => site.id === siteId);
}

export function getSitesForInstitution(
  institutionId: EuInstitutionId,
): EuInstitutionSite[] {
  return EU_INSTITUTION_SITES.filter((site) =>
    site.institutionIds.includes(institutionId),
  );
}

export function isEuInstitutionId(value: string): value is EuInstitutionId {
  return (INSTITUTION_IDS as readonly string[]).includes(value);
}

export function uniquePhysicalSites(): EuInstitutionSite[] {
  const byId = new Map<string, EuInstitutionSite>();
  for (const site of EU_INSTITUTION_SITES) {
    byId.set(site.id, site);
  }
  return [...byId.values()];
}

export function validateEuInstitutions(): string[] {
  const errors: string[] = [];

  if (EU_INSTITUTIONS.length !== 11) {
    errors.push(`Expected 11 institutions, found ${EU_INSTITUTIONS.length}`);
  }

  const institutionIds = new Set<string>();
  for (const institution of EU_INSTITUTIONS) {
    if (institutionIds.has(institution.id)) {
      errors.push(`Duplicate institution id: ${institution.id}`);
    }
    institutionIds.add(institution.id);

    if (institution.sites.length < 1) {
      errors.push(`Institution ${institution.id} has no sites`);
    }

    if (!/^Q\d+$/.test(institution.wikidataId)) {
      errors.push(`Invalid Wikidata id for ${institution.id}`);
    }

    if (!isAllowedOfficialUrl(institution.officialWebsite)) {
      errors.push(`Invalid officialWebsite for ${institution.id}`);
    }
    if (!isAllowedOfficialUrl(institution.officialInformationUrl)) {
      errors.push(`Invalid officialInformationUrl for ${institution.id}`);
    }

    const haystack = [
      institution.canonicalName,
      institution.shortName,
      ...institution.aliases,
    ]
      .join(" ")
      .toLowerCase();
    for (const forbidden of FORBIDDEN_ALIASES) {
      if (haystack.includes(forbidden)) {
        errors.push(
          `Council of Europe reference found on institution ${institution.id}`,
        );
      }
    }
  }

  for (const expected of INSTITUTION_IDS) {
    if (!institutionIds.has(expected)) {
      errors.push(`Missing institution: ${expected}`);
    }
  }

  const siteIds = new Set<string>();
  const coordinateKeys = new Map<string, string>();

  for (const site of EU_INSTITUTION_SITES) {
    if (siteIds.has(site.id)) {
      errors.push(`Duplicate site id: ${site.id}`);
    }
    siteIds.add(site.id);

    if (
      !Number.isFinite(site.longitude) ||
      !Number.isFinite(site.latitude) ||
      site.longitude < -25 ||
      site.longitude > 45 ||
      site.latitude < 30 ||
      site.latitude > 72
    ) {
      errors.push(`Implausible coordinates for site ${site.id}`);
    }

    const coordKey = `${site.longitude.toFixed(5)},${site.latitude.toFixed(5)}`;
    const existing = coordinateKeys.get(coordKey);
    if (existing && existing !== site.id) {
      errors.push(
        `Duplicate coordinates for sites ${existing} and ${site.id} — use a shared site`,
      );
    }
    coordinateKeys.set(coordKey, site.id);

    if (site.institutionIds.length === 0) {
      errors.push(`Site ${site.id} references no institutions`);
    }

    for (const institutionId of site.institutionIds) {
      if (!institutionIds.has(institutionId)) {
        errors.push(
          `Site ${site.id} references unknown institution ${institutionId}`,
        );
      }
    }

    if (site.sharedSite !== site.institutionIds.length > 1) {
      errors.push(`sharedSite flag inconsistent for ${site.id}`);
    }

    if (site.officialUrl && !isAllowedOfficialUrl(site.officialUrl)) {
      errors.push(`Invalid officialUrl for site ${site.id}`);
    }

    const siteHaystack = [site.name, ...site.aliases].join(" ").toLowerCase();
    for (const forbidden of FORBIDDEN_ALIASES) {
      if (siteHaystack.includes(forbidden)) {
        errors.push(`Council of Europe reference found on site ${site.id}`);
      }
    }
  }

  const sharedCouncils = getEuInstitutionSiteById("europa-building-brussels");
  if (
    !sharedCouncils ||
    !sharedCouncils.sharedSite ||
    !sharedCouncils.institutionIds.includes("european-council") ||
    !sharedCouncils.institutionIds.includes("council-of-the-eu")
  ) {
    errors.push("Shared Councils Europa building site is missing or invalid");
  }

  const parliamentSites = getSitesForInstitution("european-parliament");
  if (parliamentSites.length !== 3) {
    errors.push(
      `Expected 3 Parliament sites, found ${parliamentSites.length}`,
    );
  }

  return errors;
}

if (process.env.NODE_ENV !== "production") {
  const validationErrors = validateEuInstitutions();
  if (validationErrors.length > 0) {
    console.error("[euInstitutions]", validationErrors.join("; "));
  }
}
