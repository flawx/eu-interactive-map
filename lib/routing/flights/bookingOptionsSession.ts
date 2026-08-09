/**
 * Session helpers for Flight booking-options UX: per-offer cache decisions,
 * race/stale guards, and CTA label formatting. Pure — safe for unit tests.
 */

import type { FlightBookingOption } from "@/lib/routing/flights/types";

export type BookingOptionsStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error";

export type BookingOptionsCacheEntry = {
  status: BookingOptionsStatus;
  options: FlightBookingOption[];
  error: string | null;
};

export type BookingOptionsCache = Record<string, BookingOptionsCacheEntry>;

/** True when a fetch should start for this offer (no valid cache / not already loading). */
export function shouldFetchBookingOptions(
  cache: BookingOptionsCache,
  offerId: string,
  options: { retry?: boolean } = {},
): boolean {
  const entry = cache[offerId];
  if (!entry || entry.status === "idle") return true;
  if (entry.status === "loading") return false;
  if (entry.status === "success" || entry.status === "empty") return false;
  if (entry.status === "error") return options.retry === true;
  return true;
}

export function bookingOptionsLoadingEntry(): BookingOptionsCacheEntry {
  return { status: "loading", options: [], error: null };
}

export function bookingOptionsSuccessEntry(
  options: FlightBookingOption[],
): BookingOptionsCacheEntry {
  if (options.length === 0) {
    return { status: "empty", options: [], error: null };
  }
  return { status: "success", options, error: null };
}

export function bookingOptionsEmptyEntry(
  message: string,
): BookingOptionsCacheEntry {
  return { status: "empty", options: [], error: message };
}

export function bookingOptionsErrorEntry(
  message: string,
): BookingOptionsCacheEntry {
  return { status: "error", options: [], error: message };
}

/**
 * Stale-response guard: a completed request may only update UI-facing state
 * when it still matches the currently selected offer. Cache storage by offerId
 * is always allowed; this gates selected-offer side effects only.
 */
export function isBookingResultCurrent(
  requestOfferId: string,
  selectedOfferId: string | null,
): boolean {
  return Boolean(selectedOfferId && requestOfferId === selectedOfferId);
}

/** Formats "Book with {seller}" style templates. */
export function formatBookWithSeller(
  template: string,
  seller: string,
): string {
  return template.replace(/\{seller\}/g, seller);
}

export function compactSellerLabel(seller: string, maxLength = 28): string {
  const trimmed = seller.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLength - 1))}…`;
}
