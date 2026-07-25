/**
 * Initial static dataset for national days (MM-DD).
 * Some states have multiple celebrations or special constitutional cases;
 * this table can be enriched later without changing the UI contract.
 */
export const nationalDaysByCountry: Partial<
  Record<string, readonly string[]>
> = {
  AT: ["10-26"],
  BE: ["07-21"],
  BG: ["03-03"],
  HR: ["05-30"],
  CY: ["10-01"],
  CZ: ["10-28"],
  DK: ["06-05"],
  EE: ["02-24"],
  FI: ["12-06"],
  FR: ["07-14"],
  DE: ["10-03"],
  EL: ["03-25"],
  HU: ["08-20"],
  IE: ["03-17"],
  IT: ["06-02"],
  LV: ["11-18"],
  LT: ["02-16"],
  LU: ["06-23"],
  MT: ["09-21"],
  NL: ["04-27"],
  PL: ["11-11"],
  PT: ["06-10"],
  RO: ["12-01"],
  SK: ["09-01"],
  SI: ["06-25"],
  ES: ["10-12"],
  SE: ["06-06"],

  IS: ["06-17"],
  LI: ["08-15"],
  NO: ["05-17"],
  CH: ["08-01"],

  AL: ["11-28"],
  BA: ["03-01"],
  GE: ["05-26"],
  MD: ["08-27"],
  ME: ["07-13"],
  MK: ["09-08"],
  RS: ["02-15"],
  TR: ["10-29"],
  UA: ["08-24"],
};

export type EuInstitutionId =
  | "european-parliament"
  | "european-council"
  | "council-of-the-eu"
  | "european-commission"
  | "court-of-justice"
  | "european-central-bank"
  | "court-of-auditors";

/**
 * Only the seven bodies officially qualified as EU institutions are counted.
 * Decentralised agencies, representations, liaison offices and other bodies
 * are excluded. The same institution may be hosted in several countries.
 */
export const euInstitutionsByCountry: Partial<
  Record<string, readonly EuInstitutionId[]>
> = {
  BE: [
    "european-parliament",
    "european-council",
    "council-of-the-eu",
    "european-commission",
  ],

  FR: ["european-parliament"],

  DE: ["european-central-bank"],

  LU: [
    "european-parliament",
    "council-of-the-eu",
    "european-commission",
    "court-of-justice",
    "court-of-auditors",
  ],
};
