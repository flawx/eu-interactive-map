"use client";

import { Route } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { RoutePoint } from "@/lib/routing/types";

type DirectionsToButtonProps = {
  locale: Locale;
  name: string;
  latitude: number;
  longitude: number;
  countryCode?: string | null;
  onDirectionsTo: (point: RoutePoint) => void;
};

export default function DirectionsToButton({
  locale,
  name,
  latitude,
  longitude,
  countryCode = null,
  onDirectionsTo,
}: DirectionsToButtonProps) {
  const t = getMessages(locale).routePlanner;
  return (
    <button
      type="button"
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-100 hover:bg-white/10"
      onClick={() =>
        onDirectionsTo({
          latitude,
          longitude,
          name,
          countryCode: countryCode ?? null,
        })
      }
    >
      <Route className="h-4 w-4" aria-hidden />
      {t.routeToPlace}
    </button>
  );
}
