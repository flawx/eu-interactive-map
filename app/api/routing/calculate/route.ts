import { calculateNormalizedRoutes, parseRoutingRequestBody } from "@/lib/routing/calculateRoute";
import { fetchIncidentsAlongRoute } from "@/lib/routing/routeIncidents";
import { RoutingError } from "@/lib/routing/types";

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
    const routingRequest = parseRoutingRequestBody(body);
    const result = await calculateNormalizedRoutes(
      routingRequest,
      controller.signal,
    );

    if (process.env.NODE_ENV !== "production" && result.routes[0]) {
      const first = result.routes[0];
      const coords = first.geometry.coordinates;
      console.info("[routing geometry]", {
        routes: result.routes.length,
        "route[0].points": coords.length,
        "route[0].geometryType": first.geometry.type,
        firstCoordinate: coords[0] ?? null,
        lastCoordinate: coords[coords.length - 1] ?? null,
      });
    }

    let incidents: unknown[] = [];
    if (routingRequest.mode === "car" && result.routes[0]) {
      try {
        incidents = await fetchIncidentsAlongRoute(
          result.routes[0].geometry.coordinates,
          routingRequest.locale ?? "en",
        );
      } catch {
        incidents = [];
      }
    }

    return Response.json(
      {
        ...result,
        incidents,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (isAbortError(error) || (error instanceof RoutingError && error.code === "aborted")) {
      return Response.json(
        { error: { code: "aborted", message: "Calcul annulé" } },
        { status: 499 },
      );
    }
    if (error instanceof RoutingError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      {
        error: {
          code: "provider_unavailable",
          message: "Service d'itinéraire temporairement indisponible",
        },
      },
      { status: 503 },
    );
  } finally {
    request.signal.removeEventListener("abort", onAbort);
  }
}
