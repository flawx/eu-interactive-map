import type { getMessages } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/config";
import type { WildfireVerificationStatus } from "@/lib/incidents/wildfireOperational";

export type Messages = ReturnType<typeof getMessages>;

export function formatIncidentDate(
  value: string | null | undefined,
  locale: Locale,
): string | null {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) return null;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(fallback);
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export function formatDayHeading(value: string, locale: Locale): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function dayKey(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

export function verificationBadgeLabel(
  status: WildfireVerificationStatus | null | undefined,
  t: Messages,
): string | null {
  if (!status) return null;
  if (status === "official") return t.incidents.opsBadgeOfficial;
  if (status === "verified") return t.incidents.opsBadgeVerified;
  if (status === "disputed") return t.incidents.opsBadgeDisputed;
  return t.incidents.opsBadgeUnverified;
}
