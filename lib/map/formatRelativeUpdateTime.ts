import type { Locale } from "@/lib/i18n/config";

export function formatRelativeUpdateTime(
  updatedAt: string | null | undefined,
  locale: Locale | string,
  now: number = Date.now(),
): string | null {
  if (!updatedAt) return null;
  const parsed = Date.parse(updatedAt);
  if (!Number.isFinite(parsed)) return null;
  const deltaSeconds = Math.round((parsed - now) / 1000);
  const abs = Math.abs(deltaSeconds);

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;
  if (abs < 60) {
    value = deltaSeconds;
    unit = "second";
  } else if (abs < 3600) {
    value = Math.round(deltaSeconds / 60);
    unit = "minute";
  } else if (abs < 86_400) {
    value = Math.round(deltaSeconds / 3600);
    unit = "hour";
  } else {
    value = Math.round(deltaSeconds / 86_400);
    unit = "day";
  }

  if (value === 0) {
    value = unit === "second" ? (deltaSeconds < 0 ? -1 : 1) : value;
  }

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      value,
      unit,
    );
  } catch {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      value,
      unit,
    );
  }
}
