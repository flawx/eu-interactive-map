import { Landmark, Newspaper, Users } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { WildfireOperationalSummary } from "@/lib/incidents/wildfireOperational";
import type { Messages } from "@/components/incidents/operational/format";
import {
  OperationalEmptyState,
  OperationalSection,
} from "@/components/incidents/operational/OperationalPrimitives";
import { SourceCard } from "@/components/incidents/operational/SafetyUpdateCard";

export function SourcesTab({
  summary,
  locale,
  t,
}: {
  summary: WildfireOperationalSummary;
  locale: Locale;
  t: Messages;
}) {
  const official = [
    ...summary.authorityMessages,
    ...summary.evacuationOrders,
    ...summary.safetyInstructions,
  ];

  return (
    <div className="space-y-4">
      <OperationalSection
        title={t.incidents.opsOfficialSources}
        icon={Landmark}
        iconClassName="bg-sky-500/20 text-sky-300"
        count={official.length}
      >
        {official.length === 0 ? (
          <OperationalEmptyState
            message={t.incidents.opsNoOfficialInstructions}
          />
        ) : (
          <div className="space-y-2">
            {official.map((update) => (
              <SourceCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        )}
      </OperationalSection>

      <OperationalSection
        title={t.incidents.opsMedia}
        icon={Newspaper}
        iconClassName="bg-violet-500/20 text-violet-300"
        count={summary.mediaUpdates.length}
      >
        {summary.mediaUpdates.length === 0 ? (
          <OperationalEmptyState message={t.incidents.dataUnavailable} />
        ) : (
          <div className="space-y-2">
            {summary.mediaUpdates.map((update) => (
              <SourceCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        )}
      </OperationalSection>

      <OperationalSection
        title={t.incidents.opsCommunity}
        icon={Users}
        iconClassName="bg-amber-500/20 text-amber-200"
        count={summary.communityUpdates.length}
      >
        {summary.communityUpdates.length === 0 ? (
          <OperationalEmptyState message={t.incidents.dataUnavailable} />
        ) : (
          <div className="space-y-2">
            {summary.communityUpdates.map((update) => (
              <SourceCard
                key={update.id}
                update={update}
                locale={locale}
                t={t}
                communityNotice
              />
            ))}
          </div>
        )}
      </OperationalSection>
    </div>
  );
}
