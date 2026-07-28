export const ALERT_EUROPE_COUNTRY_CODES = new Set([
  "AD", "AL", "AT", "BA", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE",
  "EL", "ES", "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IS", "IT", "LI",
  "LT", "LU", "LV", "MC", "MD", "ME", "MK", "MT", "NL", "NO", "PL", "PT",
  "RO", "RS", "SE", "SI", "SK", "SM", "UA", "UK", "VA",
]);

export const ISO3_TO_ALERT_COUNTRY: Record<string, string> = {
  ALB: "AL", AND: "AD", AUT: "AT", BEL: "BE", BGR: "BG", BIH: "BA",
  CHE: "CH", CYP: "CY", CZE: "CZ", DEU: "DE", DNK: "DK", ESP: "ES",
  EST: "EE", FIN: "FI", FRA: "FR", GBR: "GB", GRC: "GR", HRV: "HR",
  HUN: "HU", IRL: "IE", ISL: "IS", ITA: "IT", LIE: "LI", LTU: "LT",
  LUX: "LU", LVA: "LV", MCO: "MC", MDA: "MD", MKD: "MK", MLT: "MT",
  MNE: "ME", NLD: "NL", NOR: "NO", POL: "PL", PRT: "PT", ROU: "RO",
  SMR: "SM", SRB: "RS", SVK: "SK", SVN: "SI", SWE: "SE", UKR: "UA",
  VAT: "VA",
};

export function normalizeAlertCountryCode(value: unknown): string | null {
  const code = String(value ?? "").trim().toUpperCase();
  const normalized = ISO3_TO_ALERT_COUNTRY[code] ?? (code === "UK" ? "GB" : code);
  return ALERT_EUROPE_COUNTRY_CODES.has(normalized) ? normalized : null;
}
export function isEuropeanAlertCentroid(
  centroid: { longitude: number; latitude: number } | null,
): boolean {
  return Boolean(
    centroid &&
      centroid.longitude >= -35 &&
      centroid.longitude <= 45 &&
      centroid.latitude >= 27 &&
      centroid.latitude <= 72,
  );
}
