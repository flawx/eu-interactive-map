/**
 * Amadeus OAuth2 client-credentials token manager.
 *
 * Server-only — import from API routes / Node scripts, never from client
 * components. AMADEUS_API_KEY / AMADEUS_API_SECRET / the bearer token itself
 * must never be returned to a client or logged.
 */

import type { FlightEnvironment } from "@/lib/routing/flights/types";

const TEST_BASE_URL = "https://test.api.amadeus.com";
const PRODUCTION_BASE_URL = "https://api.amadeus.com";
const TOKEN_PATH = "/v1/security/oauth2/token";

/** Refresh this many seconds before the token's real expiry to avoid races. */
const EXPIRY_SKEW_SECONDS = 60;

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;
let inFlightRequest: Promise<string> | null = null;

export function getAmadeusEnvironment(): FlightEnvironment {
  const raw = process.env.AMADEUS_ENV?.trim().toLowerCase();
  return raw === "production" ? "production" : "test";
}

export function getAmadeusBaseUrl(): string {
  return getAmadeusEnvironment() === "production"
    ? PRODUCTION_BASE_URL
    : TEST_BASE_URL;
}

function getCredentials(): { key: string; secret: string } | null {
  const key = process.env.AMADEUS_API_KEY?.trim();
  const secret = process.env.AMADEUS_API_SECRET?.trim();
  if (!key || !secret) return null;
  return { key, secret };
}

export function hasAmadeusCredentials(): boolean {
  return getCredentials() !== null;
}

/** Test-only: force a re-fetch on the next call to getAmadeusAccessToken(). */
export function resetAmadeusAuthForTests(): void {
  cachedToken = null;
  inFlightRequest = null;
}

class AmadeusAuthError extends Error {
  readonly kind: "misconfigured" | "authentication_error" | "unavailable";
  readonly status: number;

  constructor(
    kind: "misconfigured" | "authentication_error" | "unavailable",
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "AmadeusAuthError";
    this.kind = kind;
    this.status = status;
  }
}

export { AmadeusAuthError };

async function requestNewToken(): Promise<string> {
  const credentials = getCredentials();
  if (!credentials) {
    throw new AmadeusAuthError(
      "misconfigured",
      "AMADEUS_API_KEY / AMADEUS_API_SECRET are not configured",
      503,
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: credentials.key,
    client_secret: credentials.secret,
  });

  let response: Response;
  try {
    response = await fetch(`${getAmadeusBaseUrl()}${TOKEN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
  } catch {
    throw new AmadeusAuthError(
      "unavailable",
      "Amadeus authentication endpoint unreachable",
      503,
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new AmadeusAuthError(
      "authentication_error",
      "Amadeus rejected the API key/secret",
      response.status,
    );
  }
  if (!response.ok) {
    throw new AmadeusAuthError(
      "unavailable",
      `Amadeus authentication failed (HTTP ${response.status})`,
      503,
    );
  }

  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;

  const accessToken = payload?.access_token;
  const expiresIn = payload?.expires_in;
  if (!accessToken || typeof expiresIn !== "number") {
    throw new AmadeusAuthError(
      "unavailable",
      "Amadeus authentication response missing access_token/expires_in",
      503,
    );
  }

  const safeTtlSeconds = Math.max(expiresIn - EXPIRY_SKEW_SECONDS, 5);
  cachedToken = {
    accessToken,
    expiresAtMs: Date.now() + safeTtlSeconds * 1000,
  };
  return accessToken;
}

/**
 * Returns a valid access token, reusing the cache while it has headroom and
 * de-duplicating concurrent refreshes into a single in-flight request.
 */
export async function getAmadeusAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now()) {
    return cachedToken.accessToken;
  }
  if (inFlightRequest) {
    return inFlightRequest;
  }
  inFlightRequest = requestNewToken().finally(() => {
    inFlightRequest = null;
  });
  return inFlightRequest;
}
