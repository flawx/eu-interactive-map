import { inspectGfmFloodObservation } from "@/lib/alerts/providers/copernicusGfmObservations";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const longitude = Number(url.searchParams.get("longitude"));
  const latitude = Number(url.searchParams.get("latitude"));
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return Response.json(
      { detected: false, observation: null, warning: "invalid_coordinates" },
      { status: 200 },
    );
  }
  try {
    const observation = await inspectGfmFloodObservation(
      longitude,
      latitude,
    );
    return Response.json(
      {
        detected: Boolean(observation),
        observation,
        warning: observation ? null : "no_observed_flood_pixel",
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "public, max-age=60, s-maxage=900, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        detected: false,
        observation: null,
        warning:
          error instanceof Error
            ? error.message
            : "gfm_observation_unavailable",
      },
      { status: 200 },
    );
  }
}
