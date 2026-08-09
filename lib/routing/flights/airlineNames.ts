/**
 * Optional display helper: IATA airline code → common name, for a handful
 * of carriers frequently seen on European routes. Purely cosmetic — when a
 * code is not in this map (or in the Amadeus response's own `carriers`
 * dictionary), callers must fall back to showing the raw code. Never invent
 * a name for an unknown code.
 */
export const EU_AIRLINE_NAMES: Readonly<Record<string, string>> = {
  AF: "Air France",
  KL: "KLM",
  LH: "Lufthansa",
  LX: "Swiss",
  OS: "Austrian Airlines",
  SN: "Brussels Airlines",
  IB: "Iberia",
  UX: "Air Europa",
  VY: "Vueling",
  TP: "TAP Air Portugal",
  AZ: "ITA Airways",
  LO: "LOT Polish Airlines",
  SK: "SAS",
  DY: "Norwegian",
  AY: "Finnair",
  FI: "Icelandair",
  BA: "British Airways",
  EI: "Aer Lingus",
  FR: "Ryanair",
  U2: "easyJet",
  W6: "Wizz Air",
  VLM: "VLM Airlines",
  TK: "Turkish Airlines",
  A3: "Aegean Airlines",
  RO: "TAROM",
  OA: "Olympic Air",
  JU: "Air Serbia",
  OU: "Croatia Airlines",
  BT: "airBaltic",
};

export function lookupAirlineName(code: string | null | undefined): string | null {
  if (!code) return null;
  return EU_AIRLINE_NAMES[code.trim().toUpperCase()] ?? null;
}
