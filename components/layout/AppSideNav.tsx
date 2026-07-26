"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  AlertTriangle,
  Flame,
  Landmark,
  Map as MapIcon,
  Plane,
  Shield,
  X,
  Zap,
} from "lucide-react";
import type { Messages } from "@/lib/i18n/messages/types";

type AppSideNavProps = {
  open: boolean;
  onClose: () => void;
  t: Messages;
  onGoEurope: () => void;
  onOpenWildfires: () => void;
  onFocusLegend: () => void;
};

export default function AppSideNav({
  open,
  onClose,
  t,
  onGoEurope,
  onOpenWildfires,
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
        className="absolute inset-0 bg-black/50"
        aria-label={t.header.closeMenu}
        onClick={onClose}
      />
      <nav
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute bottom-0 left-0 top-0 flex w-[min(20rem,88vw)] flex-col border-r border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-md"
      >
        <div className="flex h-[var(--app-header-height)] items-center justify-between border-b border-white/10 px-4">
          <h2 id={titleId} className="text-sm font-semibold text-white">
            {t.nav.menuTitle}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-200 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
            aria-label={t.header.closeMenu}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem
            icon={<MapIcon className="h-4 w-4 text-sky-400" aria-hidden="true" />}
            label={t.nav.europe}
            onClick={() => {
              onGoEurope();
              onClose();
            }}
          />
          <NavItem
            icon={<Plane className="h-4 w-4 text-emerald-400" aria-hidden="true" />}
            label={t.nav.tourism}
            badge={t.nav.comingSoon}
            disabled
          />
          <NavItem
            icon={<Shield className="h-4 w-4 text-amber-400" aria-hidden="true" />}
            label={t.nav.security}
            badge={t.nav.comingSoon}
            disabled
          />
          <li>
            <button
              type="button"
              onClick={() => {
                onOpenWildfires();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <AlertTriangle className="h-4 w-4 text-orange-400" aria-hidden="true" />
              <span className="flex-1">{t.nav.alerts}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenWildfires();
                onClose();
              }}
              className="ml-9 mt-1 flex w-[calc(100%-2.25rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-slate-300 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
              {t.nav.currentWildfires}
            </button>
          </li>
          <NavItem
            icon={<Zap className="h-4 w-4 text-yellow-300" aria-hidden="true" />}
            label={t.nav.energy}
            badge={t.nav.comingSoon}
            disabled
          />
          <li className="border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => {
                onFocusLegend();
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70"
            >
              <Landmark className="h-4 w-4 text-slate-300" aria-hidden="true" />
              <span>{t.nav.mapLegend}</span>
            </button>
          </li>
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
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {icon}
        <span className="flex-1">{label}</span>
        {badge ? (
          <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
            {badge}
          </span>
        ) : null}
      </button>
    </li>
  );
}
