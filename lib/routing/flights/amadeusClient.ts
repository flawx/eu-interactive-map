/**
 * Low-level authenticated HTTP client for the Amadeus Self-Service APIs.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components. The bearer token is attached here and never returned to callers.
 */

import {
  AmadeusAuthError,
  getAmadeusAccessToken,
  getAmadeusBaseUrl,
} from "@/lib/routing/flights/amadeusAuth";
import { FlightError } from "@/lib/routing/flights/types";

const DEFAULT_TIMEOUT_MS = 10_000;

export type AmadeusFetchOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

function buildUrl(
  path: string,
  query: AmadeusFetchOptions["query"],
): string {
  const url = new URL(`${getAmadeusBaseUrl()}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function mapHttpStatusToFlightError(
  status: number,
  detail: string | null,
): FlightError {
  if (status === 401) {
    return new FlightError(
      "authentication_error",
      "Amadeus rejected the access token",
      401,
    );
  }
  if (status === 403) {
    return new FlightError(
      "provider_not_entitled",
      detail ?? "Amadeus product not entitled for this account",
      403,
    );
  }
  if (status === 429) {
    return new FlightError(
      "provider_rate_limited",
      "Amadeus rate limit reached",
      429,
    );
  }
  if (status === 400 || status === 422) {
    return new FlightError(
      "invalid_request",
      detail ?? "Amadeus rejected the request",
      400,
    );
  }
  return new FlightError(
    "provider_unavailable",
    detail ?? `Amadeus temporarily unavailable (HTTP ${status})`,
    503,
  );
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError")
  );
}

function extractErrorDetail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const errors = (payload as { errors?: unknown }).errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0] as {
      title?: string;
      detail?: string;
      code?: number;
    };
    return first.detail ?? first.title ?? null;
  }
  return null;
}

/**
 * Performs an authenticated call against an Amadeus REST path (e.g.
 * "/v2/shopping/flight-offers"), attaching the bearer token, an abort
 * timeout, and mapping non-2xx responses to a FlightError.
 */
export async function authenticatedFetch<T = unknown>(
  path: string,
  options: AmadeusFetchOptions = {},
): Promise<T> {
  let token: string;
  try {
    token = await getAmadeusAccessToken();
  } catch (error) {
    if (error instanceof AmadeusAuthError) {
      if (error.kind === "misconfigured") {
        throw new FlightError(
          "provider_misconfigured",
          error.message,
          503,
        );
      }
      if (error.kind === "authentication_error") {
        throw new FlightError("authentication_error", error.message, 401);
      }
      throw new FlightError("provider_unavailable", error.message, 503);
    }
    throw new FlightError(
      "provider_unavailable",
      "Amadeus authentication failed",
      503,
    );
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const onExternalAbort = () => timeoutController.abort();
  options.signal?.addEventListener("abort", onExternalAbort);

  try {
    const url = buildUrl(path, options.query);
    const method = options.method ?? "GET";
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: timeoutController.signal,
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw mapHttpStatusToFlightError(
        response.status,
        extractErrorDetail(payload),
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof FlightError) throw error;
    if (isAbortError(error)) {
      if (options.signal?.aborted) {
        throw new FlightError("aborted", "Flight search aborted", 499);
      }
      throw new FlightError("timeout", "Amadeus request timed out", 504);
    }
    throw new FlightError(
      "provider_unavailable",
      "Amadeus temporarily unavailable",
      503,
    );
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", onExternalAbort);
  }
}
