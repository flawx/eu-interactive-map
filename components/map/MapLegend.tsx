import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";

type MapLegendProps = {
  locale: Locale;
  showEurozone: boolean;
  onToggleEurozone: (value: boolean) => void;
  showNonEurozone: boolean;
  onToggleNonEurozone: (value: boolean) => void;
  showCandidates: boolean;
  onToggleCandidates: (value: boolean) => void;
  showSchengenNonEU: boolean;
  onToggleSchengenNonEU: (value: boolean) => void;
  showWildfires: boolean;
  onToggleWildfires: (value: boolean) => void;
  showSatelliteActiveFires: boolean;
  onToggleSatelliteActiveFires: (value: boolean) => void;
  showSatelliteBurnedAreas: boolean;
  onToggleSatelliteBurnedAreas: (value: boolean) => void;
};

export default function MapLegend({
  locale,
  showEurozone,
  onToggleEurozone,
  showNonEurozone,
  onToggleNonEurozone,
  showCandidates,
  onToggleCandidates,
  showSchengenNonEU,
  onToggleSchengenNonEU,
  showWildfires,
  onToggleWildfires,
  showSatelliteActiveFires,
  onToggleSatelliteActiveFires,
  showSatelliteBurnedAreas,
  onToggleSatelliteBurnedAreas,
}: MapLegendProps) {
  const t = getMessages(locale);

  return (
    <aside className="absolute right-4 top-4 z-10 w-72 max-w-[calc(100%-2rem)] rounded-xl border border-white/10 bg-slate-950/85 p-4 text-white shadow-xl backdrop-blur-md">
      <h2 className="mb-3 text-sm font-semibold">
        {t.legend.title}
      </h2>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showEurozone}
            onChange={(event) => onToggleEurozone(event.target.checked)}
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ accentColor: "#2563eb" }}
          />
          <span
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: "#2563eb" }}
          />
          <span className="text-xs text-slate-200">
            {t.legend.eurozone}
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showNonEurozone}
            onChange={(event) => onToggleNonEurozone(event.target.checked)}
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ accentColor: "#7c3aed" }}
          />
          <span
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: "#7c3aed" }}
          />
          <span className="text-xs text-slate-200">
            {t.legend.nonEurozone}
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showSchengenNonEU}
            onChange={(event) =>
              onToggleSchengenNonEU(event.target.checked)
            }
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ accentColor: "#14b8a6" }}
          />
          <span
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: "#14b8a6" }}
          />
          <span className="text-xs text-slate-200">
            {t.legend.schengenNonEU}
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showCandidates}
            onChange={(event) => onToggleCandidates(event.target.checked)}
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ accentColor: "#f59e0b" }}
          />
          <span
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: "#f59e0b" }}
          />
          <span className="text-xs text-slate-200">
            {t.legend.officialCandidate}
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showWildfires}
            onChange={(event) => onToggleWildfires(event.target.checked)}
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ accentColor: "#ef4444" }}
          />
          <span
            className="h-4 w-4 shrink-0 rounded-full border border-white/20"
            style={{
              background:
                "linear-gradient(135deg, #ef4444 0%, #ef4444 55%, #f59e0b 55%, #f59e0b 100%)",
            }}
          />
          <span className="text-xs text-slate-200">
            {t.legend.majorWildfires}
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showSatelliteActiveFires}
            onChange={(event) =>
              onToggleSatelliteActiveFires(event.target.checked)
            }
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ accentColor: "#f97316" }}
          />
          <span
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: "#f97316" }}
          />
          <span className="text-xs text-slate-200">
            {t.legend.satelliteActiveFires}
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showSatelliteBurnedAreas}
            onChange={(event) =>
              onToggleSatelliteBurnedAreas(event.target.checked)
            }
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ accentColor: "#7c2d12" }}
          />
          <span
            className="h-4 w-4 shrink-0 rounded-sm border border-white/20"
            style={{ backgroundColor: "#7c2d12" }}
          />
          <span className="text-xs text-slate-200">
            {t.legend.satelliteBurnedAreas}
          </span>
        </label>
        <p className="text-[10px] leading-snug text-slate-400">
          {t.legend.satelliteHistoryNote}
        </p>

        <p className="text-[10px] leading-snug text-slate-400">
          {t.incidents.gdacsScopeDisclaimer}
        </p>
        <p className="text-[10px] leading-snug text-slate-400">
          {t.incidents.satelliteDetectionDisclaimer}
        </p>
      </div>
    </aside>
  );
}
