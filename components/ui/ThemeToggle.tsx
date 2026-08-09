"use client";

import { Moon, Sun } from "lucide-react";
import { useThemePreferences } from "@/components/theme/ThemeProvider";
import {
  nextThemeFromResolved,
  themeToggleShowsSun,
} from "@/lib/theme/themeToggle";

export type ThemeToggleLabels = {
  switchToDark: string;
  switchToLight: string;
  lightMode: string;
  darkMode: string;
};

export { nextThemeFromResolved, themeToggleShowsSun };

type ThemeToggleProps = {
  variant?: "icon" | "menu";
  labels: ThemeToggleLabels;
  className?: string;
};

export default function ThemeToggle({
  variant = "icon",
  labels,
  className = "",
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useThemePreferences();
  const isLight = themeToggleShowsSun(resolvedTheme);
  const next = nextThemeFromResolved(resolvedTheme);
  const ariaLabel = isLight ? labels.switchToDark : labels.switchToLight;
  const modeLabel = isLight ? labels.lightMode : labels.darkMode;

  const onToggle = () => {
    setTheme(next);
  };

  if (variant === "menu") {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={ariaLabel}
        aria-pressed={isLight}
        title={ariaLabel}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm outline-none transition-[background-color,color] duration-200 motion-reduce:transition-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 ${className}`}
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "var(--map-ui-surface-muted)" }}
        >
          {isLight ? (
            <Sun
              className="h-4 w-4 text-[var(--accent)] transition-transform duration-200 motion-reduce:transition-none"
              aria-hidden="true"
            />
          ) : (
            <Moon
              className="h-4 w-4 text-[var(--accent)] transition-transform duration-200 motion-reduce:transition-none"
              aria-hidden="true"
            />
          )}
        </span>
        <span className="flex-1 font-medium" style={{ color: "var(--map-ui-text)" }}>
          {modeLabel}
        </span>
        <span
          className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2"
          style={{
            borderColor: "var(--map-ui-border)",
            background: "var(--map-ui-surface-elevated)",
            color: "var(--map-ui-muted)",
          }}
          aria-hidden="true"
        >
          {isLight ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={isLight}
      title={ariaLabel}
      className={`map-ui-control inline-flex h-12 w-12 shrink-0 items-center justify-center outline-none transition-[background-color,color,transform] duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60 ${className}`}
    >
      {isLight ? (
        <Sun
          className="h-5 w-5 transition-transform duration-200 motion-reduce:transition-none"
          aria-hidden="true"
        />
      ) : (
        <Moon
          className="h-5 w-5 transition-transform duration-200 motion-reduce:transition-none"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
