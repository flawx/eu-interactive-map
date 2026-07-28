import { fetchMeteoalarmWarnings } from "@/lib/alerts/providers/meteoalarm";

const LOCALES = new Set([
  "bg", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "de", "el", "hu",
  "ga", "it", "lv", "lt", "mt", "pl", "pt", "ro", "sk", "sl", "es", "sv",
]);

export async function GET(request: Request) {
  const localeValue = new URL(request.url).searchParams.get("locale") ?? "en";
  const locale = LOCALES.has(localeValue) ? localeValue : "en";
  const result = await fetchMeteoalarmWarnings(locale);
  return Response.json(result, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
