import "server-only";

import {
  calculateFlightJourneys,
  parseFlightRequestBody,
} from "@/lib/routing/flights/calculateFlights";
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

export async function POST(request: Request) {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  request.signal.addEventListener("abort", onAbort);

  try {
    const body = await request.json().catch(() => null);
    const flightRequest = parseFlightRequestBody(body);
    const result = await calculateFlightJourneys(flightRequest, controller.signal);

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      isAbortError(error) ||
      (error instanceof FlightError && error.code === "aborted")
    ) {
      return Response.json(
        { error: { code: "aborted", message: "Flight search aborted" } },
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
          message: "Flight search temporarily unavailable",
        },
      },
      { status: 503 },
    );
  } finally {
    request.signal.removeEventListener("abort", onAbort);
  }
}
