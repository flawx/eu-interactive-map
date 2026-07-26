import {
  AlertTriangle,
  HeartHandshake,
  Home,
  OctagonX,
  Shield,
  Users,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { WildfireOperationalSummary } from "@/lib/incidents/wildfireOperational";
import { isActiveOfficialEvacuation } from "@/lib/incidents/wildfireOperational";
import type { Messages } from "@/components/incidents/operational/format";
import {
  OperationalEmptyState,
  OperationalSection,
} from "@/components/incidents/operational/OperationalPrimitives";
import { SafetyUpdateCard } from "@/components/incidents/operational/SafetyUpdateCard";

export function SafetyTab({
  summary,
  locale,
  t,
  onFocusGeometry,
}: {
  summary: WildfireOperationalSummary;
  locale: Locale;
  t: Messages;
  onFocusGeometry?: (geometry: GeoJSON.Geometry) => void;
}) {
  const activeEvacuations = summary.evacuationOrders.filter((item) =>
    isActiveOfficialEvacuation(item),
  );
  const otherEvacuations = summary.evacuationOrders.filter(
    (item) => !isActiveOfficialEvacuation(item),
  );
  const evacuations = [...activeEvacuations, ...otherEvacuations];

  const hasSafetyContent =
    evacuations.length > 0 ||
    summary.safetyInstructions.length > 0 ||
    summary.gatheringPoints.length > 0 ||
    summary.shelters.length > 0 ||
    summary.receptionCenters.length > 0 ||
    summary.roadClosures.length > 0;

  if (!hasSafetyContent) {
    return (
      <OperationalEmptyState message={t.incidents.opsNoOfficialInstructions} />
    );
  }

  return (
    <div className="space-y-4">
      {evacuations.length > 0 && (
        <OperationalSection
          title={t.incidents.opsEvacuations}
          icon={AlertTriangle}
          iconClassName="bg-red-500/20 text-red-300"
          count={evacuations.length}
        >
          <div className="space-y-2">
            {evacuations.map((update) => (
              <SafetyUpdateCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
                emphasize={isActiveOfficialEvacuation(update)}
                onFocusGeometry={onFocusGeometry}
              />
            ))}
          </div>
        </OperationalSection>
      )}

      {summary.safetyInstructions.length > 0 && (
        <OperationalSection
          title={t.incidents.opsSafetyInstructions}
          icon={Shield}
          iconClassName="bg-orange-500/20 text-orange-300"
          count={summary.safetyInstructions.length}
        >
          <div className="space-y-2">
            {summary.safetyInstructions.map((update) => (
              <SafetyUpdateCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
                onFocusGeometry={onFocusGeometry}
              />
            ))}
          </div>
        </OperationalSection>
      )}

      {summary.gatheringPoints.length > 0 && (
        <OperationalSection
          title={t.incidents.opsGatheringPoints}
          icon={Users}
          iconClassName="bg-sky-500/20 text-sky-300"
          count={summary.gatheringPoints.length}
        >
          <div className="space-y-2">
            {summary.gatheringPoints.map((update) => (
              <SafetyUpdateCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
                onFocusGeometry={onFocusGeometry}
              />
            ))}
          </div>
        </OperationalSection>
      )}

      {summary.shelters.length > 0 && (
        <OperationalSection
          title={t.incidents.opsShelters}
          icon={Home}
          iconClassName="bg-emerald-500/20 text-emerald-300"
          count={summary.shelters.length}
        >
          <div className="space-y-2">
            {summary.shelters.map((update) => (
              <SafetyUpdateCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
                onFocusGeometry={onFocusGeometry}
              />
            ))}
          </div>
        </OperationalSection>
      )}

      {summary.receptionCenters.length > 0 && (
        <OperationalSection
          title={t.incidents.opsReceptionCenters}
          icon={HeartHandshake}
          iconClassName="bg-violet-500/20 text-violet-300"
          count={summary.receptionCenters.length}
        >
          <div className="space-y-2">
            {summary.receptionCenters.map((update) => (
              <SafetyUpdateCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
                onFocusGeometry={onFocusGeometry}
              />
            ))}
          </div>
        </OperationalSection>
      )}

      {summary.roadClosures.length > 0 && (
        <OperationalSection
          title={t.incidents.opsRoadClosures}
          icon={OctagonX}
          iconClassName="bg-red-900/40 text-red-200"
          count={summary.roadClosures.length}
        >
          <div className="space-y-2">
            {summary.roadClosures.map((update) => (
              <SafetyUpdateCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
                onFocusGeometry={onFocusGeometry}
              />
            ))}
          </div>
        </OperationalSection>
      )}
    </div>
  );
}
