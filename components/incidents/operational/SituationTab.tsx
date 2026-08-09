import {
  Activity,
  Info,
  Search,
  Truck,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { FirmsIncidentSnapshot } from "@/lib/incidents/firmsFootprints";
import type { WildfireIncident } from "@/lib/incidents/types";
import type { WildfireOperationalSummary } from "@/lib/incidents/wildfireOperational";
import { AreaMeasurementCard } from "@/components/incidents/operational/AreaMeasurementCard";
import {
  formatIncidentDate,
  type Messages,
} from "@/components/incidents/operational/format";
import {
  OperationalCard,
  OperationalSection,
} from "@/components/incidents/operational/OperationalPrimitives";

export function SituationTab({
  summary,
  incident,
  locale,
  t,
  firmsSnapshot,
  firmsHistorySnapshot,
  firmsStatusLabel,
}: {
  summary: WildfireOperationalSummary;
  incident: WildfireIncident;
  locale: Locale;
  t: Messages;
  firmsSnapshot?: FirmsIncidentSnapshot | null;
  firmsHistorySnapshot?: FirmsIncidentSnapshot | null;
  firmsStatusLabel?: string | null;
}) {
  const numberFormatter = new Intl.NumberFormat(locale);

  const situationText =
    summary.currentSituation?.body ||
    summary.currentSituation?.title ||
    null;

  const situationTone = situationText
    ? summary.currentSituation?.verificationStatus === "official" &&
      /critical|critique|urgente?/i.test(situationText)
      ? "bg-red-500/20 text-red-300"
      : "bg-amber-500/20 text-amber-300"
    : "bg-slate-500/20 text-[var(--map-ui-muted)]";

  const causeTone =
    summary.cause.status === "disputed"
      ? "bg-red-500/20 text-red-300"
      : summary.cause.status === "known" &&
          summary.cause.verificationStatus === "official"
        ? "bg-emerald-500/20 text-emerald-300"
        : summary.cause.status === "known"
          ? "bg-amber-500/20 text-amber-300"
          : "bg-slate-500/20 text-[var(--map-ui-muted)]";

  const exposedPopulation =
    incident.populationExposure !== null &&
    Number.isFinite(incident.populationExposure)
      ? numberFormatter.format(incident.populationExposure)
      : null;

  return (
    <div className="space-y-3">
      <OperationalCard
        title={t.incidents.opsCurrentState}
        icon={Activity}
        iconClassName={situationTone}
      >
        <p className="text-xs leading-snug text-[var(--map-ui-text)]">
          {situationText || t.incidents.opsSituationUnknown}
        </p>
        {!situationText && incident.description && (
          <p className="mt-1.5 text-[11px] leading-snug text-[var(--map-ui-muted)]">
            {incident.description}
          </p>
        )}
        {exposedPopulation && (
          <p className="mt-2 text-[10px] text-[var(--map-ui-muted)]">
            {t.incidents.exposedPopulation}: {exposedPopulation}
          </p>
        )}
      </OperationalCard>

      <OperationalCard
        title={t.incidents.opsCause}
        icon={Search}
        iconClassName={causeTone}
      >
        <p className="text-xs leading-snug text-[var(--map-ui-text)]">
          {summary.cause.status === "unknown" || !summary.cause.description
            ? t.incidents.opsCauseUnconfirmed
            : summary.cause.description}
        </p>
      </OperationalCard>

      <OperationalSection
        title={t.incidents.opsLastKnownAreas}
        icon={Info}
        iconClassName="bg-slate-500/20 text-[var(--map-ui-muted)]"
      >
        {summary.areaMeasurements.length === 0 && (
          <p className="text-[11px] text-[var(--map-ui-muted)]">
            {t.incidents.dataUnavailable}
          </p>
        )}
        <div className="space-y-2">
          {summary.areaMeasurements.map((measurement) => (
            <AreaMeasurementCard
              key={measurement.kind}
              measurement={measurement}
              locale={locale}
              t={t}
              firmsSnapshot={firmsSnapshot}
              firmsHistorySnapshot={firmsHistorySnapshot}
              firmsStatusLabel={firmsStatusLabel}
            />
          ))}
        </div>
        <p className="pt-1 text-[10px] leading-snug text-[var(--map-ui-muted)]">
          {t.incidents.opsAreaMethodsNote}
        </p>
      </OperationalSection>

      <OperationalCard
        title={t.incidents.opsDeployedResources}
        icon={Truck}
        iconClassName="bg-sky-500/20 text-sky-300"
      >
        <p className="text-xs leading-snug text-[var(--map-ui-text)]">
          {summary.deployedResources?.summary ||
            t.incidents.opsResourcesUnknown}
        </p>
      </OperationalCard>

      <p className="text-[10px] text-[var(--map-ui-muted)]">
        {t.incidents.opsLastUpdate}:{" "}
        {formatIncidentDate(summary.lastUpdatedAt, locale) ||
          t.incidents.dataUnavailable}
      </p>

      <p className="text-[10px] leading-snug text-[var(--map-ui-muted)]">
        {t.incidents.disclaimer}
      </p>
    </div>
  );
}
