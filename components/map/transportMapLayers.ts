import {
  EUROPEAN_AIRPORTS,
} from "@/lib/transport/europeanAirports";
import {
  EUROSTAR_ROUTES,
  EUROSTAR_STATIONS,
  getEurostarStationById,
} from "@/lib/transport/eurostarNetwork";

export function buildAirportCollection(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: EUROPEAN_AIRPORTS.map((airport) => ({
      type: "Feature",
      id: airport.id,
      properties: {
        airportId: airport.id,
        name: airport.name,
        city: airport.city,
        countryCode: airport.countryCode,
        iataCode: airport.iataCode,
        icaoCode: airport.icaoCode,
        rank2025: airport.rank2025,
        label: airport.iataCode
          ? `${airport.iataCode} — ${airport.city}`
          : airport.city,
      },
      geometry: {
        type: "Point",
        coordinates: [airport.longitude, airport.latitude],
      },
    })),
  };
}

export function buildEurostarNetworkCollection(): GeoJSON.FeatureCollection {
  const stationFeatures: GeoJSON.Feature[] = EUROSTAR_STATIONS.map(
    (station) => ({
      type: "Feature",
      id: station.id,
      properties: {
        featureKind: "station",
        stationId: station.id,
        name: station.name,
        city: station.city,
        countryCode: station.countryCode,
        serviceStatus: station.serviceStatus,
      },
      geometry: {
        type: "Point",
        coordinates: [station.longitude, station.latitude],
      },
    }),
  );

  const routeFeatures: GeoJSON.Feature[] = [];
  for (const route of EUROSTAR_ROUTES) {
    const from = getEurostarStationById(route.fromStationId);
    const to = getEurostarStationById(route.toStationId);
    if (!from || !to) continue;
    routeFeatures.push({
      type: "Feature",
      id: route.id,
      properties: {
        featureKind: "route",
        routeId: route.id,
        fromStationId: route.fromStationId,
        toStationId: route.toStationId,
        fromName: from.name,
        toName: to.name,
        serviceStatus: route.serviceStatus,
        geometryAccuracy: "schematic",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
      },
    });
  }

  return {
    type: "FeatureCollection",
    features: [...routeFeatures, ...stationFeatures],
  };
}

/** Cyan hex pin with white plane pictogram (~32 CSS px at pixelRatio 2). */
export function createMajorAirportIcon(): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }

  const cx = size / 2;
  const cy = size / 2 - 2;

  // soft shadow
  ctx.beginPath();
  ctx.moveTo(cx, cy + 22);
  ctx.lineTo(cx - 16, cy + 2);
  ctx.lineTo(cx - 10, cy - 14);
  ctx.lineTo(cx + 10, cy - 14);
  ctx.lineTo(cx + 16, cy + 2);
  ctx.closePath();
  ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
  ctx.fill();

  // hexagon body
  ctx.beginPath();
  const r = 16;
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = "#0e7490";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // plane pictogram
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx + 3, cy - 1);
  ctx.lineTo(cx + 11, cy + 1);
  ctx.lineTo(cx + 3, cy + 2);
  ctx.lineTo(cx + 1, cy + 9);
  ctx.lineTo(cx + 4, cy + 11);
  ctx.lineTo(cx, cy + 10);
  ctx.lineTo(cx - 4, cy + 11);
  ctx.lineTo(cx - 1, cy + 9);
  ctx.lineTo(cx - 3, cy + 2);
  ctx.lineTo(cx - 11, cy + 1);
  ctx.lineTo(cx - 3, cy - 1);
  ctx.closePath();
  ctx.fill();

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data.buffer),
  };
}

/** Gold/orange train medallion with dark-blue stroke. */
export function createEurostarStationIcon(): {
  width: number;
  height: number;
  data: Uint8Array;
} {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { width: size, height: size, data: new Uint8Array(size * size * 4) };
  }

  const cx = size / 2;
  const cy = size / 2;

  ctx.beginPath();
  ctx.arc(cx, cy + 2, 18, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 17, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#1e3a8a";
  ctx.stroke();

  // simple train body
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(cx - 9, cy - 6, 18, 12);
  ctx.fillRect(cx - 7, cy - 10, 10, 5);
  ctx.beginPath();
  ctx.arc(cx - 5, cy + 7, 2.5, 0, Math.PI * 2);
  ctx.arc(cx + 5, cy + 7, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(cx - 6, cy - 4, 5, 4);
  ctx.fillRect(cx + 1, cy - 4, 5, 4);

  const imageData = ctx.getImageData(0, 0, size, size);
  return {
    width: size,
    height: size,
    data: new Uint8Array(imageData.data.buffer),
  };
}

export function airportSelectionCaseExpression(
  selectedAirportId: string | null,
  selectedValue: number,
  defaultValue: number,
): ["case", ["==", ["get", "airportId"], string], number, number] {
  return [
    "case",
    ["==", ["get", "airportId"], selectedAirportId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

export function eurostarStationSelectionCaseExpression(
  selectedStationId: string | null,
  selectedValue: number,
  defaultValue: number,
): ["case", ["==", ["get", "stationId"], string], number, number] {
  return [
    "case",
    ["==", ["get", "stationId"], selectedStationId ?? ""],
    selectedValue,
    defaultValue,
  ];
}

export function eurostarRouteHighlightExpression(
  highlightedRouteIds: readonly string[],
  highlightedValue: number,
  defaultValue: number,
): number | ["case", ["in", ["get", "routeId"], ["literal", string[]]], number, number] {
  if (highlightedRouteIds.length === 0) return defaultValue;
  return [
    "case",
    ["in", ["get", "routeId"], ["literal", [...highlightedRouteIds]]],
    highlightedValue,
    defaultValue,
  ];
}
