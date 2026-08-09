import "server-only";

import { amadeusFlightProvider } from "@/lib/routing/flights/providers/amadeusFlightProvider";
import { getEuropeanAirportByIata } from "@/lib/transport/europeanAirports";
import { bareFlightPlace } from "@/lib/routing/flights/normalizeAmadeusOffers";
import type { FlightPlace } from "@/lib/routing/flights/types";
import { FlightError } from "@/lib/routing/flights/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function resolvePlace(iataCode: string): FlightPlace {
  const airport = getEuropeanAirportByIata(iataCode);
  if (!airport) return bareFlightPlace(iataCode);
  return {
    iataCode: airport.iataCode ?? iataCode.toUpperCase(),
    name: airport.name,
    city: airport.city,
    countryCode: airport.countryCode,
    latitude: airport.latitude,
    longitude: airport.longitude,
  };
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

/**
 * Re-confirms price/availability for a previously returned flight offer
 * (Amadeus Flight Offers Price) just before a user would book. The client
 * must send back the exact `rawOffer` it received from POST /api/routing/flights.
 */
export async function POST(request: Request) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  request.signal.addEventListener("abort", onAbort);

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || !("rawOffer" in body)) {
      throw new FlightError("invalid_request", "rawOffer is required", 400);
    }
    const { rawOffer } = body as { rawOffer: unknown };

    const confirmed = await amadeusFlightProvider.confirmOffer(rawOffer, {
      resolvePlace,
      signal: controller.signal,
    });

    if (!confirmed) {
      return Response.json(
        {
          error: {
            code: "no_offers_found",
            message: "Amadeus could not re-confirm this offer (it may no longer be available)",
          },
        },
        { status: 404 },
      );
    }

    return Response.json(
      { provider: "amadeus", offer: confirmed },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      isAbortError(error) ||
      (error instanceof FlightError && error.code === "aborted")
    ) {
      return Response.json(
        { error: { code: "aborted", message: "Price confirmation aborted" } },
        { status: 499 },
      );
    }
    if (error instanceof FlightError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      {
        error: {
          code: "provider_unavailable",
          message: "Price confirmation temporarily unavailable",
        },
      },
      { status: 503 },
    );
  } finally {
    request.signal.removeEventListener("abort", onAbort);
  }
}
