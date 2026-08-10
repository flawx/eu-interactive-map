/**
 * European Economic Area (EEA) membership.
 *
 * EEA = all 27 EU member states + Iceland (IS), Norway (NO), Liechtenstein (LI)
 * via the EEA Agreement (EFTA/EEA). Switzerland (CH) is a Schengen member but
 * is NOT part of the EEA (it has bilateral agreements with the EU instead) —
 * it must be excluded from this fill even though it stays in EUIM scope.
 * United Kingdom is out of EUIM scope entirely (`isCountryInEUIMScope`).
 *
 * Source: EFTA / EEA Agreement (`efta-eea` in dataSourcesRegistry.ts).
 */

import {
  EUIM_EU_MEMBER_CODES,
  isCountryInEUIMScope,
} from "@/lib/geography/euimCoverage";

/** EFTA states that are also EEA members (excludes Switzerland). */
export const EEA_EFTA_MEMBER_CODES = ["IS", "NO", "LI"] as const;

/** Explicitly excluded from the EEA despite being in EUIM / Schengen scope. */
export const EEA_EXCLUDED_COUNTRY_CODES = ["CH", "UK", "GB"] as const;

export const EUROPEAN_ECONOMIC_AREA_MEMBER_CODES: readonly string[] = [
  ...EUIM_EU_MEMBER_CODES,
  ...EEA_EFTA_MEMBER_CODES,
];

const EEA_MEMBER_SET = new Set<string>(EUROPEAN_ECONOMIC_AREA_MEMBER_CODES);
const EEA_EXCLUDED_SET = new Set<string>(EEA_EXCLUDED_COUNTRY_CODES);

/** True for EU members + IS/NO/LI. Always false for CH and UK. */
export function isEeaMember(countryCode: unknown): boolean {
  const code = String(countryCode ?? "").trim().toUpperCase();
  if (!code || EEA_EXCLUDED_SET.has(code)) return false;
  return EEA_MEMBER_SET.has(code);
}

export type EuropeanEconomicAreaAudit = {
  memberCount: number;
  members: readonly string[];
  includesIS: boolean;
  includesNO: boolean;
  includesLI: boolean;
  excludesCH: boolean;
  excludesUK: boolean;
  chStillInEUIMScope: boolean;
};

export function auditEuropeanEconomicArea(): EuropeanEconomicAreaAudit {
  return {
    memberCount: EUROPEAN_ECONOMIC_AREA_MEMBER_CODES.length,
    members: EUROPEAN_ECONOMIC_AREA_MEMBER_CODES,
    includesIS: isEeaMember("IS"),
    includesNO: isEeaMember("NO"),
    includesLI: isEeaMember("LI"),
    excludesCH: !isEeaMember("CH"),
    excludesUK: !isEeaMember("UK"),
    chStillInEUIMScope: isCountryInEUIMScope("CH"),
  };
}
