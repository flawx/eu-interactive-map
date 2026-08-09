import {
  Flame,
  Globe2,
  Layers,
  Satellite,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type { WildfireAreaMeasurement } from "@/lib/incidents/wildfireOperational";
import {
  formatIncidentDate,
  type Messages,
} from "@/components/incidents/operational/format";
import {
  OperationalBadge,
  OperationalIconBox,
} from "@/components/incidents/operational/OperationalPrimitives";

function measurementTitle(
  kind: WildfireAreaMeasurement["kind"],
  t: Messages,
): string {
  if (kind === "firms_24h") return t.incidents.opsDetections24h;
  if (kind === "firms_7d") return t.incidents.opsDetections7d;
  if (kind === "effis") return t.incidents.opsAreaEffis;
  return t.incidents.opsAreaGdacs;
}

function badgeFor(
  measurement: WildfireAreaMeasurement,
  t: Messages,
): { label: string; tone: "red" | "brown" | "blue" | "amber" } {
  if (measurement.kind === "firms_24h") {
    return { label: t.incidents.opsSatelliteEstimate, tone: "red" };
  }
  if (measurement.kind === "firms_7d") {
    return { label: t.incidents.opsSatelliteEstimate, tone: "brown" };
  }
  if (measurement.kind === "effis") {
    return { label: t.incidents.opsEffisEstimate, tone: "amber" };
  }
  return { label: t.incidents.opsGdacsDeclared, tone: "blue" };
}

function iconFor(kind: WildfireAreaMeasurement["kind"]) {
  if (kind === "firms_24h") {
    return {
      icon: Satellite,
      className: "bg-red-500/20 text-red-300",
    };
  }
  if (kind === "firms_7d") {
    return {
      icon: Layers,
      className: "bg-amber-900/40 text-amber-200",
    };
  }
  if (kind === "effis") {
    return {
      icon: Flame,
      className: "bg-orange-500/20 text-orange-300",
    };
  }
  return {
    icon: Globe2,
    className: "bg-sky-500/20 text-sky-300",
  };
}

export function AreaMeasurementCard({
  measurement,
  locale,
  t,
  firmsSnapshot,
  firmsHistorySnapshot,
  firmsStatusLabel,
}: {
  measurement: WildfireAreaMeasurement;
  locale: Locale;
  t: Messages;
  firmsSnapshot?: FirmsIncidentSnapshot | null;
  firmsHistorySnapshot?: FirmsIncidentSnapshot | null;
  firmsStatusLabel?: string | null;
}) {
  const numberFormatter = new Intl.NumberFormat(locale);
  const { icon, className } = iconFor(measurement.kind);
  const badge = badgeFor(measurement, t);
  const observed = formatIncidentDate(measurement.observedAt, locale);

  const firmsExtra =
    measurement.kind === "firms_24h" && firmsSnapshot
      ? firmsSnapshot
      : measurement.kind === "firms_7d" && firmsHistorySnapshot
        ? firmsHistorySnapshot
        : null;

  const periodLabel =
    measurement.kind === "firms_7d" && firmsHistorySnapshot
      ? (() => {
          const start = formatIncidentDate(
            firmsHistorySnapshot.periodStart ?? null,
            locale,
          );
          const end = formatIncidentDate(
            firmsHistorySnapshot.periodEnd ?? null,
            locale,
          );
          if (start && end) return `${start} – ${end}`;
          return start || end;
        })()
      : null;

  return (
    <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2.5">
      <div className="flex items-start gap-2.5">
        <OperationalIconBox icon={icon} className={className} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-medium leading-snug text-[var(--map-ui-text)]">
              {measurementTitle(measurement.kind, t)}
            </p>
            <OperationalBadge label={badge.label} tone={badge.tone} />
          </div>
          <p className="text-base font-semibold tabular-nums text-white">
            {measurement.valueHectares !== null
              ? `${numberFormatter.format(measurement.valueHectares)} ha`
              : t.incidents.dataUnavailable}
          </p>
          <div className="space-y-0.5 text-[10px] text-[var(--map-ui-muted)]">
            {measurement.kind === "firms_24h" && observed && (
              <p>
                {t.incidents.firmsLastObservation}: {observed}
              </p>
            )}
            {measurement.kind === "firms_7d" && periodLabel && (
              <p>
                {t.incidents.firmsHistoryPeriod}: {periodLabel}
              </p>
            )}
            {measurement.kind !== "firms_24h" &&
              measurement.kind !== "firms_7d" &&
              observed && <p>{observed}</p>}
            {firmsExtra && (
              <>
                <p>
                  {t.incidents.firmsDetectionCount}:{" "}
                  {numberFormatter.format(firmsExtra.detectionCount)}
                </p>
                {firmsExtra.sensors.length > 0 && (
                  <p>
                    {t.incidents.firmsSensors}: {firmsExtra.sensors.join(", ")}
                  </p>
                )}
                {measurement.kind === "firms_24h" && firmsStatusLabel && (
                  <p>{firmsStatusLabel}</p>
                )}
                {measurement.kind === "firms_7d" &&
                  firmsHistorySnapshot?.fetchedAt && (
                    <p>
                      {t.incidents.firmsHistoryRefreshedAt}:{" "}
                      {formatIncidentDate(
                        firmsHistorySnapshot.fetchedAt,
                        locale,
                      )}
                    </p>
                  )}
              </>
            )}
            <p>{measurement.source}</p>
          </div>
          {measurement.kind === "firms_24h" && (
            <p className="text-[10px] leading-snug text-[var(--map-ui-muted)]">
              {t.incidents.firmsAreaDisclaimer}
            </p>
          )}
          {measurement.kind === "firms_7d" && (
            <p className="text-[10px] leading-snug text-[var(--map-ui-muted)]">
              {t.incidents.firmsHistoryDisclaimer}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
