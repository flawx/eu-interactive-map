"use client";

import { X } from "lucide-react";
import type { Messages } from "@/lib/i18n/messages/types";
import type { MapSearchResult } from "@/lib/search/mapSearch";

type TemporaryPlaceCardProps = {
  place: MapSearchResult;
  t: Messages;
  onClose: () => void;
};

export default function TemporaryPlaceCard({
  place,
  t,
  onClose,
}: TemporaryPlaceCardProps) {
  return (
    <aside className="absolute bottom-4 left-4 z-20 w-80 max-w-[calc(100%-2rem)] rounded-xl border border-amber-400/30 bg-slate-950/90 p-4 text-white shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{place.title}</h2>
          <p className="mt-1 text-xs text-slate-300">
            {t.search.placeType}: {String(place.metadata.placeType ?? place.subtitle)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-300 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
          aria-label={t.search.closePlace}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs leading-relaxed text-slate-200">
        <span className="text-slate-400">{t.search.address}: </span>
        {String(place.metadata.address ?? place.subtitle)}
      </p>
      <p className="mt-3 text-[10px] text-slate-400">
        {t.search.source}: OpenStreetMap — {t.search.osmAttribution}
      </p>
    </aside>
  );
}
