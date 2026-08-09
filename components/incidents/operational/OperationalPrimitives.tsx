import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { WildfireVerificationStatus } from "@/lib/incidents/wildfireOperational";

const BADGE_STYLES: Record<WildfireVerificationStatus, string> = {
  official: "border-sky-400/35 bg-sky-500/15 text-sky-200",
  verified: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
  unverified: "border-amber-400/35 bg-amber-500/15 text-amber-200",
  disputed: "border-red-400/35 bg-red-500/15 text-red-200",
};

export function OperationalBadge({
  label,
  tone = "neutral",
  verification,
}: {
  label: string;
  tone?: "neutral" | "red" | "amber" | "brown" | "blue" | "green" | "violet";
  verification?: WildfireVerificationStatus | null;
}) {
  const toneClass =
    verification != null
      ? BADGE_STYLES[verification]
      : tone === "red"
        ? "border-red-400/35 bg-red-500/15 text-red-200"
        : tone === "amber"
          ? "border-amber-400/35 bg-amber-500/15 text-amber-200"
          : tone === "brown"
            ? "border-amber-700/40 bg-amber-900/30 text-amber-100"
            : tone === "blue"
              ? "border-sky-400/35 bg-sky-500/15 text-sky-200"
              : tone === "green"
                ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
                : tone === "violet"
                  ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
                  : "border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] text-[var(--map-ui-muted)]";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-medium ${toneClass}`}
    >
      {label}
    </span>
  );
}

export function OperationalIconBox({
  icon: Icon,
  className,
  size = "md",
}: {
  icon: LucideIcon;
  className: string;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-5 w-5 rounded-md" : "h-8 w-8 rounded-lg";
  const glyph = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${box} ${className}`}
    >
      <Icon className={glyph} aria-hidden />
    </span>
  );
}

export function OperationalCard({
  title,
  icon,
  iconClassName,
  children,
  emphasize,
}: {
  title?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        emphasize
          ? "border-red-400/40 bg-red-500/10"
          : "border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)]"
      }`}
    >
      {(title || icon) && (
        <div className="mb-2 flex items-center gap-2">
          {icon && iconClassName && (
            <OperationalIconBox icon={icon} className={iconClassName} />
          )}
          {title && (
            <h3 className="text-[11px] font-semibold text-[var(--map-ui-text)]">{title}</h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function OperationalSection({
  title,
  icon,
  iconClassName,
  count,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        {icon && iconClassName && (
          <OperationalIconBox icon={icon} className={iconClassName} />
        )}
        <h3 className="text-[11px] font-semibold text-[var(--map-ui-text)]">{title}</h3>
        {typeof count === "number" && (
          <span className="rounded-full border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-1.5 py-0.5 text-[9px] text-[var(--map-ui-muted)]">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export function OperationalEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-[var(--map-ui-border)] bg-[var(--map-ui-surface-muted)] px-3 py-3">
      <p className="text-[11px] leading-snug text-[var(--map-ui-muted)]">{message}</p>
    </div>
  );
}
