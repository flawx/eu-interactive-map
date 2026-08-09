"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bus,
  CableCar,
  Footprints,
  Ship,
  Train,
  TrainFront,
  TramFront,
} from "lucide-react";
import type { TransitLeg, TransitMode } from "@/lib/routing/transit/types";
import { transitModeColor } from "@/lib/routing/formatTransit";

const MODE_ICONS: Record<TransitMode, LucideIcon> = {
  walk: Footprints,
  bus: Bus,
  trolleybus: Bus,
  coach: Bus,
  tram: TramFront,
  metro: TrainFront,
  subway: TrainFront,
  light_rail: TramFront,
  commuter_rail: Train,
  regional_rail: Train,
  rail: Train,
  train: Train,
  long_distance_rail: Train,
  high_speed_rail: TrainFront,
  ferry: Ship,
  funicular: CableCar,
  monorail: Train,
  cable_car: CableCar,
  flight: TrainFront,
  other: Train,
};

export function transitModeIcon(mode: TransitMode): LucideIcon {
  return MODE_ICONS[mode] ?? Train;
}

export function TransitModeIcon({
  mode,
  className,
  title,
}: {
  mode: TransitMode;
  className?: string;
  title?: string;
}) {
  const Icon = transitModeIcon(mode);
  return <Icon className={className} aria-hidden={title ? undefined : true} aria-label={title} />;
}

export function TransitLineBadge({
  leg,
  className = "",
}: {
  leg: TransitLeg;
  className?: string;
}) {
  const short =
    leg.line?.nameShort?.trim() ||
    leg.line?.name?.trim()?.slice(0, 8) ||
    null;
  if (!short && leg.mode === "walk") return null;
  const bg = transitModeColor(leg.mode, leg.line?.color);
  const fg =
    leg.line?.textColor && /^#?[0-9a-fA-F]{6}$/i.test(leg.line.textColor)
      ? leg.line.textColor.startsWith("#")
        ? leg.line.textColor
        : `#${leg.line.textColor}`
      : "#ffffff";
  const Icon = transitModeIcon(leg.mode);
  const label =
    leg.mode === "walk"
      ? "Walk"
      : `${leg.mode.replace(/_/g, " ")} ${short ?? ""}`.trim();

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold shadow-sm ${className}`}
      style={{ backgroundColor: bg, color: fg }}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {short ? <span>{short}</span> : null}
    </span>
  );
}

export function TransitModeChain({
  legs,
  className = "",
}: {
  legs: TransitLeg[];
  className?: string;
}) {
  const items = legs.filter((leg, index, arr) => {
    if (leg.mode === "walk") {
      // Keep walk only between transit legs or at ends if duration meaningful
      const prev = arr[index - 1];
      const next = arr[index + 1];
      if (prev && next && prev.mode !== "walk" && next.mode !== "walk") {
        return true;
      }
      return leg.durationSeconds >= 120;
    }
    return true;
  });

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {items.map((leg, index) => (
        <span key={`${leg.id}-chain`} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span aria-hidden className="text-slate-500">
              →
            </span>
          ) : null}
          {leg.mode === "walk" ? (
            <span
              className="inline-flex items-center gap-0.5 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300"
              aria-label={`Walk ${Math.max(1, Math.round(leg.durationSeconds / 60))} min`}
            >
              <Footprints className="h-3 w-3" aria-hidden />
              {Math.max(1, Math.round(leg.durationSeconds / 60))}’
            </span>
          ) : (
            <TransitLineBadge leg={leg} />
          )}
        </span>
      ))}
    </div>
  );
}
