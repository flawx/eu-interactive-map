"use client";

import { Clock, ExternalLink, ShieldAlert, X } from "lucide-react";
import { useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import type { TemporaryInternalBorderControl } from "@/lib/security/schengenBorders";

type TemporaryBorderControlPanelProps = {
  control: TemporaryInternalBorderControl;
  locale: Locale;
  cached?: boolean;
  staleOver24h?: boolean;
  onClose: () => void;
};

function flagCode(code: string): string {
  return code === "EL" ? "GR" : code;
}

export default function TemporaryBorderControlPanel({
  control,
  locale,
  cached = false,
  staleOver24h = false,
  onClose,
}: TemporaryBorderControlPanelProps) {
  const t = getMessages(locale);
  const tp = t.temporaryBorderControlPanel;

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      return null;
    }
  }, [locale]);

  const implementing =
    regionNames?.of(flagCode(control.implementingCountryCode)) ??
    control.implementingCountryCode;
  const affected = control.affectedCountryCodes
    .map((code) => regionNames?.of(flagCode(code)) ?? code)
    .join(" · ");

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
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-orange-400/40 bg-orange-950/60 text-orange-200">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{implementing}</p>
            <p className="text-[11px] text-[var(--map-ui-muted)]">{tp.badge}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.countryPanel.close}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-[var(--map-ui-muted)] hover:bg-[var(--map-ui-surface-hover)] hover:text-[var(--map-ui-text)]"
          >
            <X size={22} />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-100">
            <Clock className="h-3 w-3" />
            {tp.active}
          </span>
          {cached ? (
            <span className="rounded-full border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-2 py-0.5 text-[10px] text-[var(--map-ui-text)]">
              {tp.cachedData}
            </span>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
        <p className="rounded-lg border border-orange-400/20 bg-orange-500/10 px-3 py-2 text-[11px] leading-snug text-orange-50">
          {tp.notClosedWarning}
        </p>
        <p className="text-[11px] leading-snug text-[var(--map-ui-muted)]">
          {tp.notifiedScopeNote}
        </p>
        {staleOver24h ? (
          <p className="text-[11px] text-amber-200">{tp.staleData}</p>
        ) : null}

        <section className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
            <p className="text-[var(--map-ui-muted)]">{tp.startDate}</p>
            <p className="font-medium">{control.startAt}</p>
          </div>
          <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-2">
            <p className="text-[var(--map-ui-muted)]">{tp.plannedEnd}</p>
            <p className="font-medium">{control.endAt}</p>
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.affectedBorders}
          </h2>
          <p className="text-[var(--map-ui-text)]">{affected || "—"}</p>
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.modes}
          </h2>
          <p className="text-[var(--map-ui-text)]">
            {control.modes
              .map((mode) => t.borderCrossingPanel.modes[mode])
              .join(" · ")}
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.notifiedScope}
          </h2>
          <p className="leading-relaxed text-[var(--map-ui-text)]">{control.scope}</p>
        </section>

        <section>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
            {tp.officialReason}
          </h2>
          <p className="leading-relaxed text-[var(--map-ui-text)]">
            {control.officialReason}
          </p>
        </section>

        {control.authorisedCrossingNames.length > 0 ? (
          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--map-ui-muted)]">
              {tp.authorisedCrossings}
            </h2>
            <ul className="list-disc space-y-1 pl-4 text-[var(--map-ui-text)]">
              {control.authorisedCrossingNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <a
            href={control.officialSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
          >
            {tp.commissionLink}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="mt-2 text-[11px] text-[var(--map-ui-muted)]">
            {tp.lastFetched}: {control.fetchedAt.slice(0, 10)}
          </p>
        </section>
      </div>
    </aside>
  );
}
