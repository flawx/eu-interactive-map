import type { Locale } from "@/lib/i18n/config";
import type {
  WildfireOperationalUpdate,
  WildfireSafetyLocation,
} from "@/lib/incidents/wildfireOperational";
import {
  formatIncidentDate,
  verificationBadgeLabel,
  type Messages,
} from "@/components/incidents/operational/format";
import { OperationalBadge } from "@/components/incidents/operational/OperationalPrimitives";

export function SafetyUpdateCard({
  update,
  locale,
  t,
  emphasize,
  onFocusGeometry,
  communityNotice,
}: {
  update: WildfireOperationalUpdate | WildfireSafetyLocation;
  locale: Locale;
  t: Messages;
  emphasize?: boolean;
  onFocusGeometry?: (geometry: GeoJSON.Geometry) => void;
  communityNotice?: boolean;
}) {
  const published = formatIncidentDate(update.publishedAt, locale);
  const verified = formatIncidentDate(update.lastVerifiedAt, locale);
  const expires = formatIncidentDate(update.expiresAt, locale);
  const verification = verificationBadgeLabel(update.verificationStatus, t);

  return (
    <div
      className={`space-y-1.5 rounded-lg border px-2.5 py-2 ${
        emphasize
          ? "border-red-400/40 bg-red-500/10"
          : "border-white/10 bg-white/[0.06]"
      }`}
    >
      {communityNotice && (
        <p className="text-[10px] font-medium text-amber-200/90">
          {t.incidents.opsCommunityUnverified}
        </p>
      )}
      <p className="text-xs font-semibold text-slate-100">
        {update.title || t.incidents.dataUnavailable}
      </p>
      {update.body && (
        <p className="text-[11px] leading-snug text-slate-300">{update.body}</p>
      )}
      {"locationName" in update && update.locationName && (
        <p className="text-[11px] text-slate-300">{update.locationName}</p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {verification && update.verificationStatus && (
          <OperationalBadge
            label={verification}
            verification={update.verificationStatus}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
        <span>
          {t.incidents.source}: {update.sourceName}
        </span>
        {published && (
          <span>
            {t.incidents.updatedAt}: {published}
          </span>
        )}
        {verified && (
          <span>
            {t.incidents.opsLastVerification}: {verified}
          </span>
        )}
        {expires && (
          <span>
            {t.incidents.opsExpires}: {expires}
          </span>
        )}
        {"status" in update && update.status && (
          <span>
            {t.incidents.opsStatus}: {update.status}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-0.5">
        {update.geometry && onFocusGeometry && (
          <button
            type="button"
            onClick={() => onFocusGeometry(update.geometry!)}
            className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-sky-300 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            {t.incidents.opsFocusOnMap}
          </button>
        )}
        {update.sourceUrl && (
          <a
            href={update.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-sky-300 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-sky-400/70"
          >
            {t.incidents.opsOpenSource}
          </a>
        )}
      </div>
    </div>
  );
}

export function SourceCard({
  update,
  locale,
  t,
  communityNotice,
}: {
  update: WildfireOperationalUpdate;
  locale: Locale;
  t: Messages;
  communityNotice?: boolean;
}) {
  return (
    <SafetyUpdateCard
      update={update}
      locale={locale}
      t={t}
      communityNotice={communityNotice}
    />
  );
}
