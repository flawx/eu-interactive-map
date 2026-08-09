import "server-only";

import { serpapiFlightProvider } from "@/lib/routing/flights/providers/serpapiFlightProvider";
import { FlightError } from "@/lib/routing/flights/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
 * Looks up booking options (airline-direct / OTA fare links) for a
 * previously returned itinerary via its SerpApi `booking_token`. Never
 * logs the token, post_data, or API key.
 */
export async function POST(request: Request) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  request.signal.addEventListener("abort", onAbort);

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      throw new FlightError("invalid_request", "Invalid JSON body", 400);
    }
    const {
      bookingToken,
      departureId,
      arrivalId,
      outboundDate,
      currency,
    } = body as {
      bookingToken?: unknown;
      departureId?: unknown;
      arrivalId?: unknown;
      outboundDate?: unknown;
      currency?: unknown;
    };

    if (typeof bookingToken !== "string" || !bookingToken.trim()) {
      throw new FlightError("invalid_request", "bookingToken is required", 400);
    }
    if (
      typeof departureId !== "string" ||
      !departureId.trim() ||
      typeof arrivalId !== "string" ||
      !arrivalId.trim() ||
      typeof outboundDate !== "string" ||
      !outboundDate.trim()
    ) {
      throw new FlightError(
        "invalid_request",
        "departureId, arrivalId and outboundDate are required",
        400,
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.info("[booking api]", {
        provider: "serpapi_google_flights",
        bookingTokenPresent: true,
        bookingTokenLength: bookingToken.trim().length,
        departureId: departureId.trim().toUpperCase(),
        arrivalId: arrivalId.trim().toUpperCase(),
        outboundDate: outboundDate.trim(),
      });
    }

    const options = await serpapiFlightProvider.getBookingOptions(bookingToken, {
      departureId,
      arrivalId,
      outboundDate,
      currency: typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : undefined,
      signal: controller.signal,
    });

    if (process.env.NODE_ENV === "development") {
      console.info("[booking response]", {
        status: 200,
        optionsCount: options.length,
        normalizedOptionsCount: options.length,
        postActions: options.filter((o) => o.bookingAction?.type === "post").length,
        getActions: options.filter((o) => o.bookingAction?.type === "get").length,
      });
    }

    if (options.length === 0) {
      return Response.json(
        {
          provider: "serpapi_google_flights",
          options: [],
          error: {
            code: "no_offers_found",
            message: "No booking options are available for this itinerary",
          },
        },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json(
      { provider: "serpapi_google_flights", options },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      isAbortError(error) ||
      (error instanceof FlightError && error.code === "aborted")
    ) {
      return Response.json(
        { error: { code: "aborted", message: "Booking options lookup aborted" } },
        { status: 499 },
      );
    }
    if (error instanceof FlightError) {
      if (process.env.NODE_ENV === "development") {
        console.info("[booking api error]", { code: error.code, status: error.status });
      }
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      {
        error: {
          code: "provider_unavailable",
          message: "Booking options temporarily unavailable",
        },
      },
      { status: 503 },
    );
  } finally {
    request.signal.removeEventListener("abort", onAbort);
  }
}
