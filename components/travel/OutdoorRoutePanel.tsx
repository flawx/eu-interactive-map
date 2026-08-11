"use client";

import { ExternalLink, Footprints, Bike, PersonStanding, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import {
  OUTDOOR_ROUTE_COLORS,
  nearestPointOnRoute,
  type OutdoorRouteType,
} from "@/lib/travel/outdoorRoutes/types";
import { getOutdoorRouteById } from "@/lib/map/dataLayers/outdoorRoutesLayers";
import { DATA_SOURCES_REGISTRY } from "@/lib/map/dataSourcesRegistry";
import type { RoutePoint } from "@/lib/routing/types";
import DirectionsToButton from "@/components/routing/DirectionsToButton";
import type { Messages } from "@/lib/i18n/messages/types";

type OutdoorRoutePanelProps = {
  routeId: string;
  /** Point (e.g. the map click) used to derive the nearest on-line directions target. */
  referencePoint: [number, number] | null;
  locale: Locale;
  onClose: () => void;
  onRouteToPlace?: (point: RoutePoint) => void;
};

function routeTypeLabel(
  type: OutdoorRouteType,
  tp: Messages["outdoorRoutePanel"],
): string {
  if (type === "hiking") return tp.routeTypeHiking;
  if (type === "cycling") return tp.routeTypeCycling;
  return tp.routeTypeRunning;
}

function RouteTypeIcon({ type }: { type: OutdoorRouteType }) {
  if (type === "hiking") return <Footprints className="h-6 w-6" aria-hidden="true" />;
  if (type === "cycling") return <Bike className="h-6 w-6" aria-hidden="true" />;
  return <PersonStanding className="h-6 w-6" aria-hidden="true" />;
}

export default function OutdoorRoutePanel({
  routeId,
  referencePoint,
  locale,
  onClose,
  onRouteToPlace,
}: OutdoorRoutePanelProps) {
  const t = getMessages(locale);
  const tp = t.outdoorRoutePanel;
  const route = getOutdoorRouteById(routeId) ?? null;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  if (!route) return null;

  const color = OUTDOOR_ROUTE_COLORS[route.routeType];
  const countryLabels = route.countries
    .map((code) => regionNames?.of(code === "EL" ? "GR" : code) ?? code)
    .join(", ");
  const source = DATA_SOURCES_REGISTRY.find((entry) =>
    route.sourceIds.includes(entry.id),
  );
  const directionsTarget =
    referencePoint ??
    (route.coordinates.length > 0
      ? nearestPointOnRoute(route, route.coordinates[Math.floor(route.coordinates.length / 2)])
      : null);

  return (
    <aside
      className="absolute left-4 z-10 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl map-ui-panel backdrop-blur-md"
      style={{
        top: "var(--map-panel-top-offset)",
        maxHeight:
          "calc(100dvh - var(--map-panel-top-offset) - max(16px, env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <header className="sticky top-0 z-[5] shrink-0 border-b border-[var(--map-ui-border)] bg-[var(--map-ui-surface)] px-4 py-3 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/20 text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            <RouteTypeIcon type={route.routeType} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{route.name}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{route.routeCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tp.close}
            title={tp.close}
            className="inline-flex h-10 w-10 min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--map-ui-muted)] outline-none transition hover:bg-[var(--map-ui-surface-hover)] hover:text-[var(--map-ui-text)] focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            <X aria-hidden="true" size={22} strokeWidth={2} />
          </button>
        </div>
        <p
          className="mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium"
          style={{
            borderColor: `${color}66`,
            backgroundColor: `${color}26`,
            color,
          }}
        >
          {routeTypeLabel(route.routeType, tp)}
        </p>
        {onRouteToPlace && directionsTarget ? (
          <div className="mt-2">
            <DirectionsToButton
              locale={locale}
              name={route.name}
              latitude={directionsTarget[1]}
              longitude={directionsTarget[0]}
              countryCode={route.countries[0] ?? null}
              onDirectionsTo={onRouteToPlace}
            />
            <p className="mt-1 text-[10px] italic leading-snug text-[var(--map-ui-muted)]">
              {tp.directionsDisclaimer}
            </p>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-3">
        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.distance}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">
            {route.distanceKm !== null
              ? `${route.distanceKm.toLocaleString(locale)} km`
              : tp.distanceUnavailable}
          </p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.countries}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">{countryLabels}</p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.operator}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">{route.operator}</p>
        </section>

        <section className="mb-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.description}
          </h2>
          <p className="text-sm leading-relaxed text-[var(--map-ui-text)]">{route.description}</p>
        </section>

        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.officialWebsite}
          </h2>
          <a
            href={route.officialWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
          >
            {route.officialWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        {source ? (
          <section className="mb-2">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.source}
            </h2>
            <a
              href={source.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[var(--map-ui-muted)] hover:text-sky-300 hover:underline"
            >
              {source.name}
            </a>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
