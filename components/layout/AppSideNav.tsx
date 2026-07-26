"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Info, Layers, Map as MapIcon, Settings2, X } from "lucide-react";
import type { Messages } from "@/lib/i18n/messages/types";

type AppSideNavProps = {
  open: boolean;
  onClose: () => void;
  t: Messages;
  onGoEurope: () => void;
  onFocusLegend: () => void;
};

export default function AppSideNav({
  open,
  onClose,
  t,
  onGoEurope,
  onFocusLegend,
}: AppSideNavProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        aria-label={t.header.closeMenu}
        onClick={onClose}
      />
      <nav
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute bottom-0 left-0 top-0 flex w-[min(21rem,90vw)] flex-col border-r"
        style={{
          background: "var(--map-ui-surface)",
          borderColor: "var(--map-ui-border)",
          boxShadow: "var(--map-ui-shadow)",
          color: "var(--map-ui-text)",
        }}
      >
        <div
          className="flex h-14 items-center justify-between border-b px-4"
          style={{ borderColor: "var(--map-ui-border)" }}
        >
          <h2 id={titleId} className="text-sm font-semibold">
            {t.nav.menuTitle}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
            aria-label={t.header.closeMenu}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem
            icon={<MapIcon className="h-4 w-4 text-[#1a73e8]" aria-hidden="true" />}
            label={t.nav.europeOverview}
            onClick={() => {
              onGoEurope();
              onClose();
            }}
          />
          <NavItem
            icon={<Layers className="h-4 w-4 text-[#188038]" aria-hidden="true" />}
            label={t.nav.mapLegend}
            onClick={() => {
              onFocusLegend();
              onClose();
            }}
          />
          <NavItem
            icon={
              <Settings2 className="h-4 w-4 text-[#5f6368]" aria-hidden="true" />
            }
            label={t.nav.displaySettings}
            badge={t.nav.comingSoon}
            disabled
          />
          <NavItem
            icon={<Info className="h-4 w-4 text-[#5f6368]" aria-hidden="true" />}
            label={t.nav.aboutProject}
            badge={t.nav.comingSoon}
            disabled
          />
        </ul>
      </nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  badge,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {icon}
        <span className="flex-1">{label}</span>
        {badge ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
            style={{
              borderColor: "var(--map-ui-border)",
              color: "var(--map-ui-muted)",
            }}
          >
            {badge}
          </span>
        ) : null}
      </button>
    </li>
  );
}
