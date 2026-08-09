"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Info, Map as MapIcon, Settings2, X } from "lucide-react";
import { EUStarLoader } from "@/components/ui/EUStarLoader";
import type { Messages } from "@/lib/i18n/messages/types";

type AppSideNavProps = {
  open: boolean;
  onClose: () => void;
  t: Messages;
  onGoEurope: () => void;
};

export default function AppSideNav({
  open,
  onClose,
  t,
  onGoEurope,
}: AppSideNavProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingHref(null);
      return;
    }

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

  useEffect(() => {
    router.prefetch("/about");
    router.prefetch("/sources");
    router.prefetch("/settings");
  }, [router]);

  if (!open) return null;

  const navigate = (href: string) => {
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0" style={{ zIndex: 1300 }} role="presentation">
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
          <NavLinkItem
            href="/about"
            icon={<Info className="h-4 w-4 text-[#5f6368]" aria-hidden="true" />}
            label={t.nav.aboutProject}
            pending={isPending && pendingHref === "/about"}
            onNavigate={() => navigate("/about")}
          />
          <NavLinkItem
            href="/sources"
            icon={
              <BookOpen className="h-4 w-4 text-[#5f6368]" aria-hidden="true" />
            }
            label={t.nav.sourcesCredits}
            pending={isPending && pendingHref === "/sources"}
            onNavigate={() => navigate("/sources")}
          />
          <NavLinkItem
            href="/settings"
            icon={
              <Settings2 className="h-4 w-4 text-[#5f6368]" aria-hidden="true" />
            }
            label={t.nav.displaySettings}
            pending={isPending && pendingHref === "/settings"}
            onNavigate={() => navigate("/settings")}
          />
        </ul>
      </nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  onClick,
  badge,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  badge?: string;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)]">
          {icon}
        </span>
        <span className="flex-1 font-medium">{label}</span>
        {badge ? (
          <span className="text-[10px] uppercase tracking-wide text-[var(--map-ui-muted)]">
            {badge}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function NavLinkItem({
  href,
  icon,
  label,
  pending,
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  pending?: boolean;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        onClick={(event) => {
          event.preventDefault();
          onNavigate();
        }}
        aria-busy={pending || undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 ${
          pending ? "opacity-80" : ""
        }`}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)]">
          {icon}
        </span>
        <span className="flex-1 font-medium">{label}</span>
        {pending ? <EUStarLoader size="sm" label="Loading" /> : null}
      </Link>
    </li>
  );
}
