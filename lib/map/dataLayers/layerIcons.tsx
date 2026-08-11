"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Anchor,
  Award,
  BadgeCheck,
  Ban,
  Bike,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Construction,
  Flag,
  FlaskConical,
  Footprints,
  Globe2,
  HeartHandshake,
  Info,
  Landmark,
  Leaf,
  MapPin,
  MountainSnow,
  Plane,
  Route,
  ScanLine,
  Shield,
  ShieldPlus,
  Sparkles,
  Theater,
  TrainFront,
  TriangleAlert,
  Umbrella,
  Wifi,
  Waves,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/** Central icon keys shared by legend, registry, and panels. */
export type DataLayerIconKey = string;

const ICON_MAP: Record<string, LucideIcon> = {
  swatch: MapPin,
  wifi: Wifi,
  "wifi-municipality": Wifi,
  info: Info,
  landmark: Landmark,
  flag: Flag,
  safety: ShieldPlus,
  leaf: Leaf,
  waves: Waves,
  beach: Umbrella,
  hiking: Footprints,
  cycling: Bike,
  running: Footprints,
  mountain: MountainSnow,
  award: Award,
  construction: Construction,
  plane: Plane,
  train: TrainFront,
  rail: TrainFront,
  capital: MapPin,
  institution: Landmark,
  building: Building2,
  globe: Globe2,
  sparkles: Sparkles,
  coins: CircleDollarSign,
  scan: ScanLine,
  badge: BadgeCheck,
  briefcase: BriefcaseBusiness,
  anchor: Anchor,
  theater: Theater,
  shield: Shield,
  handshake: HeartHandshake,
  flask: FlaskConical,
  traffic: Activity,
  route: Route,
  alert: TriangleAlert,
  ban: Ban,
  culture: Sparkles,
  transport: TrainFront,
  sport: Theater,
  community: HeartHandshake,
  science: FlaskConical,
  environment: Leaf,
  economy: BriefcaseBusiness,
  port: Anchor,
  unesco: Landmark,
  control: Shield,
  wildfire: TriangleAlert,
  "weather-warning": TriangleAlert,
  eurostar: TrainFront,
  diplomatic: Landmark,
};

export function getDataLayerIcon(iconKey: DataLayerIconKey): LucideIcon {
  return ICON_MAP[iconKey] ?? MapPin;
}

export function isValidDataLayerIconKey(iconKey: string): boolean {
  return iconKey in ICON_MAP;
}

export function getAllDataLayerIconKeys(): string[] {
  return Object.keys(ICON_MAP);
}

type LegendLayerIconProps = {
  iconKey: string;
  color: string;
  className?: string;
  swatchClassName?: string;
  swatchStyle?: Record<string, string>;
};

/** Colored semantic icon for legend rows — replaces plain color swatches. */
export function LegendLayerIcon({
  iconKey,
  color,
  className,
  swatchClassName,
  swatchStyle,
}: LegendLayerIconProps): ReactNode {
  const Icon = getDataLayerIcon(iconKey);
  const isSwatch = iconKey === "swatch";

  if (isSwatch && (swatchStyle || swatchClassName)) {
    return (
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border border-white/70 shadow-sm ${swatchClassName ?? "rounded-[2px]"} ${className ?? ""}`}
        style={{
          backgroundColor: color,
          ...(swatchStyle as CSSProperties | undefined),
        }}
        aria-hidden="true"
      />
    );
  }

  if (isSwatch) {
    return (
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] ${className ?? ""}`}
        style={{ backgroundColor: `${color}22`, color }}
        aria-hidden="true"
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
    );
  }

  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] ${className ?? ""}`}
      style={{ backgroundColor: `${color}22`, color }}
      aria-hidden="true"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
    </span>
  );
}
