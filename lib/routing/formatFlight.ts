/**
 * Client-safe formatting helpers for flight / multimodal journey display.
 * No server-only imports — safe to use from RoutePlannerPanel and map hooks.
 */

import { journeyCoordinates } from "@/lib/routing/formatTransit";
import type {
  FlightJourney,
  FlightSegment,
  MultimodalJourney,
} from "@/lib/routing/flights/types";

export function formatFlightDuration(seconds: number, locale?: string): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const nf = new Intl.NumberFormat(locale);
  if (hours <= 0) return `${nf.format(minutes)} min`;
  if (minutes === 0) return `${nf.format(hours)} h`;
  return `${nf.format(hours)} h ${nf.format(minutes)} min`;
}

export function formatFlightClock(iso: string | null, timeZone?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

export function formatFlightDate(iso: string | null, locale?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Great-circle coordinates for a single flight offer's arc, in order. */
export function flightArcCoordinates(flight: FlightJourney | null): [number, number][] {
  if (!flight) return [];
  const first = flight.segments[0];
  const last = flight.segments[flight.segments.length - 1];
  const out: [number, number][] = [];
  if (
    first?.departure.place.longitude != null &&
    first.departure.place.latitude != null
  ) {
    out.push([first.departure.place.longitude, first.departure.place.latitude]);
  }
  if (
    last?.arrival.place.longitude != null &&
    last.arrival.place.latitude != null
  ) {
    out.push([last.arrival.place.longitude, last.arrival.place.latitude]);
  }
  return out;
}

/** All coordinates (ground access/egress + flight arc) for fitBounds on a multimodal journey. */
export function multimodalCoordinates(
  journey: MultimodalJourney | null,
): [number, number][] {
  if (!journey) return [];
  const out: [number, number][] = [];
  for (const segment of journey.segments) {
    if (segment.kind === "ground_transit") {
      out.push(...journeyCoordinates(segment.journey));
    } else if (segment.kind === "flight") {
      const geometry = segment.arcGeometry;
      if (geometry.type === "LineString") {
        out.push(...(geometry.coordinates as [number, number][]));
      } else {
        for (const part of geometry.coordinates as [number, number][][]) {
          out.push(...part);
        }
      }
    }
  }
  return out;
}

export type FlightSummary = {
  stops: number;
  stopsLabel: "direct" | "oneStop" | "nStops";
  carrierCodes: string[];
  firstFlightNumber: string | null;
};

/** Collapsed summary of a flight offer's segments, for compact badges/cards. */
export function summarizeFlightJourney(flight: FlightJourney): FlightSummary {
  const carrierCodes = Array.from(
    new Set(flight.segments.map((segment) => segment.carrierCode)),
  );
  const firstSegment: FlightSegment | undefined = flight.segments[0];
  return {
    stops: flight.stops,
    stopsLabel:
      flight.stops === 0 ? "direct" : flight.stops === 1 ? "oneStop" : "nStops",
    carrierCodes,
    firstFlightNumber: firstSegment
      ? `${firstSegment.carrierCode}${firstSegment.flightNumber}`
      : null,
  };
}

export function tomorrowDateInputValue(): string {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return now.toISOString().slice(0, 10);
}
