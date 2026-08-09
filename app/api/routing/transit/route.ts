import {
  calculateTransitJourneys,
  parseTransitRequestBody,
} from "@/lib/routing/transit/calculateTransit";
import { TransitError } from "@/lib/routing/transit/types";

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
    const transitRequest = parseTransitRequestBody(body);
    const result = await calculateTransitJourneys(
      transitRequest,
      controller.signal,
    );

    if (process.env.NODE_ENV !== "production") {
      const first = result.journeys[0];
      console.info("[transit geometry]", {
        journeys: result.journeys.length,
        legs: first?.legs.length ?? 0,
        transfers: first?.transfers ?? null,
        fare: first?.fare ? first.fare.status : "unavailable",
        firstMode: first?.legs[0]?.mode ?? null,
      });
      console.info("[transit architecture audit]", {
        routingProvider: result.provider,
        routeTypes: "TransitJourney/TransitLeg",
        existingModes: "car,bicycle,pedestrian,transit",
        mapGeometryPipeline: "syncTransitRouteLayers",
        envGoogleRoutes: process.env.GOOGLE_ROUTES_API_KEY ? "present" : "missing",
        envNavitia: process.env.NAVITIA_API_KEY ? "present" : "missing",
        envSerpApi: process.env.SERPAPI_API_KEY ? "present" : "missing",
      });
    }

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      isAbortError(error) ||
      (error instanceof TransitError && error.code === "aborted")
    ) {
      return Response.json(
        { error: { code: "aborted", message: "Calcul annulé" } },
        { status: 499 },
      );
    }
    if (error instanceof TransitError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      {
        error: {
          code: "provider_unavailable",
          message: "Transit service temporarily unavailable",
        },
      },
      { status: 503 },
    );
  } finally {
    request.signal.removeEventListener("abort", onAbort);
  }
}
