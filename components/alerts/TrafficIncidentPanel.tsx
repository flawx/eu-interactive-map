"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CarFront,
  CircleSlash,
  Clock3,
  Construction,
  Gauge,
  MapPin,
  Wrench,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type {
  NormalizedAlert,
  TrafficIncidentMetadata,
} from "@/lib/alerts/types";

type Props = {
  alert: NormalizedAlert;
  locale: Locale;
  onClose: () => void;
};

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError")
  );
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatDuration(seconds: number, locale: Locale): string {
  const minutes = Math.round(seconds / 60);
  return new Intl.NumberFormat(locale).format(minutes) + " min";
}

function formatLength(meters: number, locale: Locale): string {
  return meters >= 1_000
    ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(
        meters / 1_000,
      )} km`
    : `${new Intl.NumberFormat(locale).format(Math.round(meters))} m`;
}

function iconFor(hazard: NormalizedAlert["hazard"]) {
  if (hazard === "road_accident") return CarFront;
  if (hazard === "traffic_jam") return Gauge;
  if (hazard === "road_closure") return CircleSlash;
  if (hazard === "roadworks" || hazard === "lane_closure") return Construction;
  if (hazard === "broken_down_vehicle") return Wrench;
  return AlertTriangle;
}

export default function TrafficIncidentPanel({
  alert,
  locale,
  onClose,
}: Props) {
  const [details, setDetails] = useState(alert);
  const [partial, setPartial] = useState(false);
  useEffect(() => {
    setDetails(alert);
    setPartial(false);
    const controller = new AbortController();
    const incidentId = encodeURIComponent(alert.sourceEventId);
    fetch(
      `/api/alerts/traffic/incidents/${incidentId}?locale=${encodeURIComponent(locale)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`traffic_details_http_${response.status}`);
        const payload = (await response.json()) as { alert?: NormalizedAlert | null };
        if (payload.alert) setDetails(payload.alert);
        else setPartial(true);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) setPartial(true);
      });
    return () => controller.abort();
  }, [alert, locale]);

  const metadata = details.metadata as Partial<TrafficIncidentMetadata>;
  const Icon = iconFor(details.hazard);
  const roadNumbers = Array.isArray(metadata.roadNumbers)
    ? metadata.roadNumbers.join(", ")
    : "";
  const delaySeconds = numberValue(metadata.delaySeconds);
  const lengthMeters = numberValue(metadata.lengthMeters);
  const currentSpeed = numberValue(metadata.currentSpeedKph);
  const freeFlowSpeed = numberValue(metadata.freeFlowSpeedKph);
  const currentTravelTime = numberValue(metadata.currentTravelTimeSeconds);
  const freeFlowTravelTime = numberValue(metadata.freeFlowTravelTimeSeconds);
  const endAt = stringValue(metadata.endAt);
  const estimatedClearanceAt = stringValue(metadata.estimatedClearanceAt);
  const emergencyServices = Array.isArray(metadata.emergencyServices)
    ? metadata.emergencyServices.filter(Boolean).join(", ")
    : null;
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const sections: Array<{
    title: string;
    rows: Array<[string, string | null]>;
  }> = [
    {
      title: "Location",
      rows: [
        ["Road", roadNumbers || null],
        ["From", stringValue(metadata.fromLocation)],
        ["To", stringValue(metadata.toLocation)],
        ["Direction", stringValue(metadata.direction)],
      ],
    },
    {
      title: "Affected section",
      rows: [
        [
          "Length",
          lengthMeters == null ? null : formatLength(lengthMeters, locale),
        ],
      ],
    },
    {
      title: "Traffic and delay",
      rows: [
        [
          "Estimated delay",
          delaySeconds == null ? null : formatDuration(delaySeconds, locale),
        ],
        [
          "Current speed",
          currentSpeed == null ? null : `${Math.round(currentSpeed)} km/h`,
        ],
        [
          "Free-flow speed",
          freeFlowSpeed == null ? null : `${Math.round(freeFlowSpeed)} km/h`,
        ],
        [
          "Current travel time",
          currentTravelTime == null
            ? null
            : formatDuration(currentTravelTime, locale),
        ],
        [
          "Free-flow travel time",
          freeFlowTravelTime == null
            ? null
            : formatDuration(freeFlowTravelTime, locale),
        ],
      ],
    },
    {
      title: "Closures and restrictions",
      rows: [
        [
          "Closed road",
          metadata.roadClosed == null
            ? null
            : metadata.roadClosed
              ? "Yes"
              : "No",
        ],
        [
          "Closed lanes",
          numberValue(metadata.lanesClosed) == null
            ? null
            : String(metadata.lanesClosed),
        ],
        [
          "Total lanes",
          numberValue(metadata.totalLanes) == null
            ? null
            : String(metadata.totalLanes),
        ],
      ],
    },
    {
      title: "Timeline",
      rows: [
        [
          "Start",
          stringValue(metadata.startAt)
            ? dateFormatter.format(new Date(String(metadata.startAt)))
            : null,
        ],
        [
          "Estimated end",
          endAt ? dateFormatter.format(new Date(endAt)) : null,
        ],
        [
          "Estimated clearance",
          estimatedClearanceAt
            ? dateFormatter.format(new Date(estimatedClearanceAt))
            : null,
        ],
        ["Last update", dateFormatter.format(new Date(details.updatedAt))],
      ],
    },
    {
      title: "Available details",
      rows: [
        ["Probability", stringValue(metadata.probabilityOfOccurrence)],
        [
          "Confidence",
          numberValue(metadata.confidence) == null
            ? null
            : String(metadata.confidence),
        ],
        [
          "User reports",
          numberValue(metadata.numberOfReports) == null
            ? null
            : String(metadata.numberOfReports),
        ],
        ["Emergency services", emergencyServices],
      ],
    },
  ];

  return (
    <aside className="absolute bottom-3 left-3 top-[4.5rem] z-40 flex w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 text-white shadow-2xl backdrop-blur">
      <header className="flex shrink-0 items-start gap-3 border-b border-white/10 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-200">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-orange-200">
            Road traffic
          </p>
          <h2 className="mt-1 text-lg font-semibold leading-tight">
            {details.title}
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            {[
              roadNumbers,
              metadata.status,
              metadata.magnitudeOfDelayLabel,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {Boolean(details.description) && (
          <section>
            <h3 className="text-sm font-semibold text-white">Overview</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {details.description}
            </p>
          </section>
        )}
        {partial && (
          <p className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs text-amber-100">
            Detailed provider data is temporarily unavailable. Reliable local
            information remains visible.
          </p>
        )}
        {sections.map((section) => {
          const visibleRows = section.rows.filter(([, value]) => value != null);
          if (!visibleRows.length) return null;
          return (
            <section key={section.title}>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4" aria-hidden />
                {section.title}
              </h3>
              <dl className="mt-3 space-y-2 text-sm">
                {visibleRows.map(([label, value]) => (
                  <div key={label} className="flex gap-4">
                    <dt className="min-w-0 flex-1 text-slate-400">{label}</dt>
                    <dd className="max-w-[60%] text-right text-slate-100">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
        <section className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">
          <p>
            Traffic conditions can change rapidly. Follow road signs and the
            instructions of road authorities.
          </p>
          {endAt && (
            <p>
              The end time is estimated by the provider and may be changed.
            </p>
          )}
        </section>
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="h-4 w-4" aria-hidden />
            Source and attribution
          </h3>
          <p className="mt-2 text-sm text-slate-300">{details.officialSourceName}</p>
          {details.sourceUrl && (
            <a
              href={details.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-sky-300 hover:text-sky-200"
            >
              TomTom Traffic
            </a>
          )}
        </section>
      </div>
    </aside>
  );
}
