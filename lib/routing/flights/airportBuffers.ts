/**
 * Recommended (not official) connection-time buffers used to flag tight
 * multimodal transfers. These are heuristics for UX warnings only — they are
 * not IATA MCT (Minimum Connecting Time) data and must not be presented as
 * authoritative or official guidance.
 */

export const RECOMMENDED_FLIGHT_BUFFERS = {
  /** Ground → domestic flight (same country departure/arrival airport pair). */
  domesticMinutes: 90,
  /** Ground → international flight. */
  internationalMinutes: 120,
  /** Flight arrival → ground egress departure. */
  egressMinutes: 45,
} as const;

export type FlightBufferMinutes = typeof RECOMMENDED_FLIGHT_BUFFERS;

function parseIsoToMs(iso: string): number | null {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * True when a ground-transit arrival leaves at least `bufferMinutes` before
 * the flight's scheduled departure. Returns false (not viable) when either
 * timestamp cannot be parsed, so callers should treat parse failures as a
 * hard warning rather than silently accepting the connection.
 */
export function isConnectionViable(
  groundArrivalIso: string | null,
  flightDepartureIso: string | null,
  bufferMinutes: number,
): boolean {
  if (!groundArrivalIso || !flightDepartureIso) return false;
  const arrival = parseIsoToMs(groundArrivalIso);
  const departure = parseIsoToMs(flightDepartureIso);
  if (arrival === null || departure === null) return false;
  const marginMinutes = (departure - arrival) / 60_000;
  return marginMinutes >= bufferMinutes;
}

/**
 * True when a flight arrival leaves at least `bufferMinutes` before the
 * ground-egress departure (customs/baggage/walk to platform, etc.).
 */
export function isEgressViable(
  flightArrivalIso: string | null,
  groundDepartureIso: string | null,
  bufferMinutes: number,
): boolean {
  if (!flightArrivalIso || !groundDepartureIso) return false;
  const arrival = parseIsoToMs(flightArrivalIso);
  const departure = parseIsoToMs(groundDepartureIso);
  if (arrival === null || departure === null) return false;
  const marginMinutes = (departure - arrival) / 60_000;
  return marginMinutes >= bufferMinutes;
}

export function connectionMarginMinutes(
  fromIso: string | null,
  toIso: string | null,
): number | null {
  if (!fromIso || !toIso) return null;
  const from = parseIsoToMs(fromIso);
  const to = parseIsoToMs(toIso);
  if (from === null || to === null) return null;
  return (to - from) / 60_000;
}
