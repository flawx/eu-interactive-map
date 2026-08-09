/**
 * Assembles a door-to-door MultimodalJourney from a priced flight offer
 * plus optional ground access/egress legs. Pure — no network calls; the
 * ground legs must already have been fetched by the caller (typically via
 * the Google Transit provider).
 */

import {
  RECOMMENDED_FLIGHT_BUFFERS,
  connectionMarginMinutes,
  isConnectionViable,
  isEgressViable,
  type FlightBufferMinutes,
} from "@/lib/routing/flights/airportBuffers";
import { greatCircleGeometry } from "@/lib/routing/flights/greatCircle";
import type {
  FlightArcGeometry,
  FlightJourney,
  FlightPrice,
  FlightWarning,
  MultimodalJourney,
  MultimodalSegment,
} from "@/lib/routing/flights/types";
import type { TransitJourney } from "@/lib/routing/transit/types";

export type AssembleMultimodalJourneyInput = {
  flight: FlightJourney;
  accessJourney?: TransitJourney | null;
  egressJourney?: TransitJourney | null;
  /** Set when ground access/egress was requested but could not be computed. */
  accessUnavailable?: boolean;
  egressUnavailable?: boolean;
  /** Top-ranked resolved airport for the origin/destination place, if different from the flight's actual airport. */
  primaryOriginIata?: string | null;
  primaryDestinationIata?: string | null;
  buffers?: FlightBufferMinutes;
};

function buildArcGeometry(flight: FlightJourney): FlightArcGeometry {
  const firstSegment = flight.segments[0];
  const lastSegment = flight.segments[flight.segments.length - 1];
  const originPlace = firstSegment?.departure.place;
  const destinationPlace = lastSegment?.arrival.place;

  if (
    !originPlace ||
    !destinationPlace ||
    originPlace.longitude == null ||
    originPlace.latitude == null ||
    destinationPlace.longitude == null ||
    destinationPlace.latitude == null
  ) {
    return { type: "LineString", coordinates: [] };
  }

  return greatCircleGeometry(
    originPlace.longitude,
    originPlace.latitude,
    destinationPlace.longitude,
    destinationPlace.latitude,
  );
}

function isDomesticFlight(flight: FlightJourney): boolean {
  const firstSegment = flight.segments[0];
  const lastSegment = flight.segments[flight.segments.length - 1];
  const originCountry = firstSegment?.departure.place.countryCode;
  const destinationCountry = lastSegment?.arrival.place.countryCode;
  return Boolean(
    originCountry && destinationCountry && originCountry === destinationCountry,
  );
}

function aggregatePrice(
  flightPrice: FlightPrice | null,
  accessFare: { amount: number; currency: string; status: string } | null | undefined,
  egressFare: { amount: number; currency: string; status: string } | null | undefined,
  hasAccess: boolean,
  hasEgress: boolean,
): { price: FlightPrice | null; partial: boolean } {
  if (!flightPrice) return { price: null, partial: hasAccess || hasEgress };

  const knownFares: Array<{ amount: number; currency: string }> = [
    { amount: flightPrice.amount, currency: flightPrice.currency },
  ];

  let partial = false;

  if (hasAccess) {
    if (accessFare && accessFare.status !== "unavailable") {
      knownFares.push({ amount: accessFare.amount, currency: accessFare.currency });
    } else {
      partial = true;
    }
  }
  if (hasEgress) {
    if (egressFare && egressFare.status !== "unavailable") {
      knownFares.push({ amount: egressFare.amount, currency: egressFare.currency });
    } else {
      partial = true;
    }
  }

  if (partial) return { price: null, partial: true };

  const currency = knownFares[0]!.currency;
  const sameCurrency = knownFares.every((fare) => fare.currency === currency);
  if (!sameCurrency) return { price: null, partial: true };

  const amount = knownFares.reduce((sum, fare) => sum + fare.amount, 0);
  return {
    price: { amount, currency, status: flightPrice.status, source: "amadeus" },
    partial: false,
  };
}

export function assembleMultimodalJourney(
  input: AssembleMultimodalJourneyInput,
): MultimodalJourney {
  const buffers = input.buffers ?? RECOMMENDED_FLIGHT_BUFFERS;
  const { flight, accessJourney, egressJourney } = input;
  const warnings: FlightWarning[] = [];
  const segments: MultimodalSegment[] = [];

  const firstSegment = flight.segments[0];
  const lastSegment = flight.segments[flight.segments.length - 1];
  const departureIata = firstSegment?.departure.place.iataCode ?? null;
  const arrivalIata = lastSegment?.arrival.place.iataCode ?? null;

  if (
    input.primaryOriginIata &&
    departureIata &&
    input.primaryOriginIata.toUpperCase() !== departureIata.toUpperCase()
  ) {
    warnings.push({
      code: "airport_change",
      message: `Departure airport is ${departureIata}, not the closer ${input.primaryOriginIata}.`,
      severity: "info",
    });
  }
  if (
    input.primaryDestinationIata &&
    arrivalIata &&
    input.primaryDestinationIata.toUpperCase() !== arrivalIata.toUpperCase()
  ) {
    warnings.push({
      code: "airport_change",
      message: `Arrival airport is ${arrivalIata}, not the closer ${input.primaryDestinationIata}.`,
      severity: "info",
    });
  }

  if (input.accessUnavailable) {
    warnings.push({
      code: "ground_unavailable",
      message: "Ground access to the departure airport could not be calculated.",
      severity: "warning",
    });
  }
  if (input.egressUnavailable) {
    warnings.push({
      code: "ground_unavailable",
      message: "Ground egress from the arrival airport could not be calculated.",
      severity: "warning",
    });
  }

  const bufferMinutes = isDomesticFlight(flight)
    ? buffers.domesticMinutes
    : buffers.internationalMinutes;

  if (accessJourney) {
    segments.push({
      kind: "ground_transit",
      id: `access-${accessJourney.id}`,
      role: "access",
      journey: accessJourney,
    });

    const viable = isConnectionViable(
      accessJourney.arrivalAt,
      firstSegment?.departure.at ?? null,
      bufferMinutes,
    );
    if (!viable) {
      const marginMinutes = connectionMarginMinutes(
        accessJourney.arrivalAt,
        firstSegment?.departure.at ?? null,
      );
      warnings.push({
        code: "connection_too_tight",
        message:
          marginMinutes != null
            ? `Only ${Math.round(marginMinutes)} min between ground arrival and flight departure (recommended ${bufferMinutes} min).`
            : "Connection time between ground access and flight departure could not be verified.",
        severity: "critical",
      });
    }
  }

  segments.push({
    kind: "flight",
    id: `flight-${flight.id}`,
    journey: flight,
    arcGeometry: buildArcGeometry(flight),
  });

  if (egressJourney) {
    const viable = isEgressViable(
      lastSegment?.arrival.at ?? null,
      egressJourney.departureAt,
      buffers.egressMinutes,
    );
    if (!viable) {
      const marginMinutes = connectionMarginMinutes(
        lastSegment?.arrival.at ?? null,
        egressJourney.departureAt,
      );
      warnings.push({
        code: "egress_too_tight",
        message:
          marginMinutes != null
            ? `Only ${Math.round(marginMinutes)} min between flight arrival and ground departure (recommended ${buffers.egressMinutes} min).`
            : "Connection time between flight arrival and ground egress could not be verified.",
        severity: "critical",
      });
    }

    segments.push({
      kind: "ground_transit",
      id: `egress-${egressJourney.id}`,
      role: "egress",
      journey: egressJourney,
    });
  }

  const departureAt = accessJourney?.departureAt ?? firstSegment?.departure.at ?? null;
  const arrivalAt = egressJourney?.arrivalAt ?? lastSegment?.arrival.at ?? null;

  let totalDurationSeconds: number;
  const departureMs = departureAt ? new Date(departureAt).getTime() : NaN;
  const arrivalMs = arrivalAt ? new Date(arrivalAt).getTime() : NaN;
  if (Number.isFinite(departureMs) && Number.isFinite(arrivalMs)) {
    totalDurationSeconds = Math.max(0, Math.round((arrivalMs - departureMs) / 1000));
  } else {
    totalDurationSeconds =
      flight.durationSeconds +
      (accessJourney?.durationSeconds ?? 0) +
      (egressJourney?.durationSeconds ?? 0);
  }

  const { price: totalPrice, partial } = aggregatePrice(
    flight.price,
    accessJourney?.fare,
    egressJourney?.fare,
    Boolean(accessJourney),
    Boolean(egressJourney),
  );
  if (partial) {
    warnings.push({
      code: "partial_pricing",
      message: "Total price is not shown because not every leg has a known fare.",
      severity: "info",
    });
  }

  return {
    id: `multimodal-${flight.rawOfferId}`,
    segments,
    totalDurationSeconds,
    departureAt,
    arrivalAt,
    totalPrice,
    warnings,
    provider: "amadeus",
    environment: flight.sourceEnvironment,
  };
}
