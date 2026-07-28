import {
  parseOpenMeteoWind,
  validateWindCoordinates,
} from "@/lib/alerts/wind";
import { ALERT_SOURCES } from "@/lib/alerts/sourceRegistry";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const coordinates = validateWindCoordinates(
      body && typeof body === "object" && "coordinates" in body
        ? body.coordinates
        : null,
    );
    const params = new URLSearchParams({
      latitude: coordinates.map((item) => item.latitude).join(","),
      longitude: coordinates.map((item) => item.longitude).join(","),
      hourly: "wind_speed_10m,wind_direction_10m,wind_gusts_10m",
      forecast_hours: "6",
      wind_speed_unit: "kmh",
      timezone: "UTC",
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(`https://api.open-meteo.com/v1/ecmwf?${params}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        next: { revalidate: 900 },
      });
      if (!response.ok) throw new Error(`open_meteo_http_${response.status}`);
      const data: unknown = await response.json();
      const values = Array.isArray(data) ? data : [data];
      const fetchedAt = new Date().toISOString();
      return Response.json(
        {
          winds: values
            .map((value) => parseOpenMeteoWind(value, fetchedAt))
            .filter(Boolean),
          fetchedAt,
          source: ALERT_SOURCES.openMeteoEcmwf,
          connectorStatus: "operational",
          forecast: true,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=60, s-maxage=900, stale-while-revalidate=1800",
          },
        },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const invalid = error instanceof Error && error.message.startsWith("invalid_");
    return Response.json(
      {
        winds: [],
        fetchedAt: new Date().toISOString(),
        source: ALERT_SOURCES.openMeteoEcmwf,
        connectorStatus: invalid ? "misconfigured" : "unavailable",
        error: invalid ? error.message : "wind_data_unavailable",
        forecast: true,
      },
      { status: invalid ? 400 : 200 },
    );
  }
}
