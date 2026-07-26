"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Clock3,
  Flame,
  Layers,
  Shield,
  Truck,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { WildfireTimelineItem } from "@/lib/incidents/wildfireOperational";
import {
  dayKey,
  formatDayHeading,
  formatIncidentDate,
  verificationBadgeLabel,
  type Messages,
} from "@/components/incidents/operational/format";
import {
  OperationalBadge,
  OperationalEmptyState,
  OperationalIconBox,
} from "@/components/incidents/operational/OperationalPrimitives";

type TimelineFilter =
  | "all"
  | "situation"
  | "area"
  | "safety"
  | "resources"
  | "authorities";

function itemFilter(item: WildfireTimelineItem): TimelineFilter {
  if (item.kind === "situation") return "situation";
  if (item.kind === "observation") return "area";
  if (
    item.kind === "evacuation_order" ||
    item.kind === "safety_instruction" ||
    item.category === "road_closure" ||
    item.category === "gathering_point" ||
    item.category === "shelter" ||
    item.category === "reception_center"
  ) {
    return "safety";
  }
  if (item.kind === "resources") return "resources";
  if (item.kind === "authority_message") return "authorities";
  return "situation";
}

function iconFor(item: WildfireTimelineItem) {
  if (item.kind === "evacuation_order") {
    return {
      icon: AlertTriangle,
      className: "bg-red-500/20 text-red-300",
    };
  }
  if (item.kind === "authority_message") {
    return {
      icon: Building2,
      className: "bg-sky-500/20 text-sky-300",
    };
  }
  if (item.kind === "resources") {
    return {
      icon: Truck,
      className: "bg-violet-500/20 text-violet-300",
    };
  }
  if (item.kind === "situation") {
    return {
      icon: Flame,
      className: "bg-amber-500/20 text-amber-300",
    };
  }
  if (item.kind === "observation") {
    if (item.observationType === "firms_seven_day_history") {
      return {
        icon: Layers,
        className: "bg-amber-900/40 text-amber-200",
      };
    }
    return {
      icon: Flame,
      className: "bg-red-500/20 text-red-300",
    };
  }
  if (item.kind === "safety_instruction") {
    return {
      icon: Shield,
      className: "bg-orange-500/20 text-orange-300",
    };
  }
  return {
    icon: Clock3,
    className: "bg-slate-500/20 text-slate-300",
  };
}

function dedupeTimeline(items: WildfireTimelineItem[]): WildfireTimelineItem[] {
  const seen = new Set<string>();
  const result: WildfireTimelineItem[] = [];
  for (const item of items) {
    const key = [
      item.sourceName,
      item.occurredAt.slice(0, 16),
      item.title,
      item.body ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function TimelineEvent({
  item,
  locale,
  t,
}: {
  item: WildfireTimelineItem;
  locale: Locale;
  t: Messages;
}) {
  const when = formatIncidentDate(item.occurredAt, locale);
  const { icon, className } = iconFor(item);
  const verification = verificationBadgeLabel(item.verificationStatus, t);

  return (
    <div className="relative flex gap-2.5 border-l border-white/10 pl-3">
      <span className="absolute -left-[9px] top-1">
        <OperationalIconBox icon={icon} className={className} size="sm" />
      </span>
      <div className="min-w-0 flex-1 space-y-1 pb-3">
        <p className="text-[10px] text-slate-400">
          {when || t.incidents.dataUnavailable}
        </p>
        <p className="text-xs font-medium text-slate-100">{item.title}</p>
        {item.body && (
          <p className="text-[11px] leading-snug text-slate-300">{item.body}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-400">{item.sourceName}</span>
          {verification && (
            <OperationalBadge
              label={verification}
              verification={item.verificationStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function TimelinePanel({
  items,
  locale,
  t,
}: {
  items: WildfireTimelineItem[];
  locale: Locale;
  t: Messages;
}) {
  const [filter, setFilter] = useState<TimelineFilter>("all");

  const filters: Array<{ id: TimelineFilter; label: string }> = [
    { id: "all", label: t.incidents.opsFilterAll },
    { id: "situation", label: t.incidents.opsFilterSituation },
    { id: "area", label: t.incidents.opsFilterArea },
    { id: "safety", label: t.incidents.opsFilterSafety },
    { id: "resources", label: t.incidents.opsFilterResources },
    { id: "authorities", label: t.incidents.opsFilterAuthorities },
  ];

  const filtered = useMemo(() => {
    const unique = dedupeTimeline(items);
    if (filter === "all") return unique;
    return unique.filter((item) => itemFilter(item) === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, WildfireTimelineItem[]>();
    for (const item of filtered) {
      const key = dayKey(item.occurredAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {filters.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={`shrink-0 rounded-full border px-2 py-1 text-[9px] outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
              filter === entry.id
                ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <OperationalEmptyState message={t.incidents.opsEmptyTimeline} />
      )}

      {grouped.map(([key, dayItems]) => (
        <div key={key} className="space-y-1">
          <p className="text-[10px] font-medium text-slate-400">
            {formatDayHeading(dayItems[0]?.occurredAt ?? key, locale)}
          </p>
          <div className="pl-1">
            {dayItems.map((item) => (
              <TimelineEvent
                key={item.id}
                item={item}
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
