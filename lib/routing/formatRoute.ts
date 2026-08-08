import type { Locale } from "@/lib/i18n/config";

export function formatRouteDistance(
  meters: number,
  locale: Locale,
): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters < 1000) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(Math.round(meters)) + " m";
  }
  const km = meters / 1000;
  return (
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: km >= 100 ? 0 : 1,
    }).format(km) + " km"
  );
}

export function formatRouteDuration(
  seconds: number,
  locale: Locale,
): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${new Intl.NumberFormat(locale).format(minutes)} min`;
  }
  if (minutes === 0) {
    return `${new Intl.NumberFormat(locale).format(hours)} h`;
  }
  return `${new Intl.NumberFormat(locale).format(hours)} h ${new Intl.NumberFormat(locale).format(minutes)} min`;
}

export function formatTrafficDelay(
  seconds: number,
  locale: Locale,
): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `+${new Intl.NumberFormat(locale).format(minutes)} min`;
}

export function trafficSectionColor(
  magnitudeOfDelay: number | null,
  simpleCategory: string | null,
): string {
  const category = (simpleCategory ?? "").toUpperCase();
  if (category.includes("CLOSURE")) return "#7f1d1d";
  if (magnitudeOfDelay == null) return "#2563eb";
  if (magnitudeOfDelay >= 4) return "#7f1d1d";
  if (magnitudeOfDelay >= 3) return "#dc2626";
  if (magnitudeOfDelay >= 2) return "#ea580c";
  if (magnitudeOfDelay >= 1) return "#ca8a04";
  return "#2563eb";
}
