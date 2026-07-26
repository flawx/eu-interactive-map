"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import LanguageFlag from "@/components/i18n/LanguageFlag";
import type { Locale } from "@/lib/i18n/config";
import {
  LANGUAGE_OPTIONS,
  getLanguageOption,
} from "@/lib/i18n/languageOptions";
import type { Messages } from "@/lib/i18n/messages/types";

type LanguageSelectorProps = {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  t: Messages;
  compact?: boolean;
};

export default function LanguageSelector({
  locale,
  onLocaleChange,
  t,
  compact = false,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const active = getLanguageOption(locale);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="map-ui-control inline-flex h-12 items-center gap-2 px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
        style={{ color: "var(--map-ui-text)" }}
        aria-label={t.header.chooseLanguage}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <LanguageFlag flagCode={active.flagCode} title={active.nativeName} />
        {!compact ? (
          <span className="hidden max-w-[8.5rem] truncate md:inline">
            {active.nativeName}
          </span>
        ) : null}
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          style={{ color: "var(--map-ui-muted)" }}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.header.chooseLanguage}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-[80] max-h-[min(22rem,60vh)] w-[min(16rem,calc(100vw-2rem))] overflow-y-auto rounded-[16px] border p-1.5"
          style={{
            background: "var(--map-ui-surface)",
            borderColor: "var(--map-ui-border)",
            boxShadow: "var(--map-ui-shadow)",
            color: "var(--map-ui-text)",
          }}
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = option.code === locale;
            return (
              <li key={option.code} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm outline-none hover:bg-[var(--map-ui-surface-hover)] focus-visible:ring-2 focus-visible:ring-[#1a73e8]/60"
                  onClick={() => {
                    onLocaleChange(option.code);
                    setOpen(false);
                  }}
                >
                  <LanguageFlag
                    flagCode={option.flagCode}
                    title={option.nativeName}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {option.nativeName}
                  </span>
                  {selected ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-[#1a73e8]"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="w-4 shrink-0" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
