"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Clock3, Files, Shield } from "lucide-react";

export type OpsTabId = "situation" | "safety" | "timeline" | "sources";

type TabDef = {
  id: OpsTabId;
  label: string;
  icon: LucideIcon;
};

export function OperationalTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: OpsTabId; label: string }>;
  active: OpsTabId;
  onChange: (id: OpsTabId) => void;
}) {
  const icons: Record<OpsTabId, LucideIcon> = {
    situation: Activity,
    safety: Shield,
    timeline: Clock3,
    sources: Files,
  };

  const items: TabDef[] = tabs.map((tab) => ({
    ...tab,
    icon: icons[tab.id],
  }));

  return (
    <nav
      className="sticky top-0 z-10 -mx-4 border-b border-white/10 bg-slate-950/95 px-4 py-2 backdrop-blur-md"
      aria-label="Operational sections"
    >
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-2">
        <div className="col-span-2 flex gap-1.5 overflow-x-auto pb-0.5 sm:contents">
          {items.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`inline-flex min-w-[7.5rem] flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[10px] outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400/70 sm:min-w-0 ${
                  isActive
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
