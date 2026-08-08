"use client";

import DirectionsToButton from "@/components/routing/DirectionsToButton";
import type { Locale } from "@/lib/i18n/config";
import type { RoutePoint } from "@/lib/routing/types";

/** @deprecated Prefer DirectionsToButton — kept as a thin alias. */
export default function RouteToPlaceButton({
  locale,
  point,
  onRouteToPlace,
}: {
  locale: Locale;
  point: RoutePoint;
  onRouteToPlace: (point: RoutePoint) => void;
}) {
  return (
    <DirectionsToButton
      locale={locale}
      name={point.name ?? ""}
      latitude={point.latitude}
      longitude={point.longitude}
      countryCode={point.countryCode}
      onDirectionsTo={onRouteToPlace}
    />
  );
}
