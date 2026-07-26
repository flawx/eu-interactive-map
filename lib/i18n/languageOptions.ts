import type { Locale } from "@/lib/i18n/config";

export type LanguageOption = {
  code: Locale;
  nativeName: string;
  flagCode: string;
};

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "bg", nativeName: "Български", flagCode: "bg" },
  { code: "hr", nativeName: "Hrvatski", flagCode: "hr" },
  { code: "cs", nativeName: "Čeština", flagCode: "cz" },
  { code: "da", nativeName: "Dansk", flagCode: "dk" },
  { code: "nl", nativeName: "Nederlands", flagCode: "nl" },
  { code: "en", nativeName: "English", flagCode: "gb" },
  { code: "et", nativeName: "Eesti", flagCode: "ee" },
  { code: "fi", nativeName: "Suomi", flagCode: "fi" },
  { code: "fr", nativeName: "Français", flagCode: "fr" },
  { code: "de", nativeName: "Deutsch", flagCode: "de" },
  { code: "el", nativeName: "Ελληνικά", flagCode: "gr" },
  { code: "hu", nativeName: "Magyar", flagCode: "hu" },
  { code: "ga", nativeName: "Gaeilge", flagCode: "ie" },
  { code: "it", nativeName: "Italiano", flagCode: "it" },
  { code: "lv", nativeName: "Latviešu", flagCode: "lv" },
  { code: "lt", nativeName: "Lietuvių", flagCode: "lt" },
  { code: "mt", nativeName: "Malti", flagCode: "mt" },
  { code: "pl", nativeName: "Polski", flagCode: "pl" },
  { code: "pt", nativeName: "Português", flagCode: "pt" },
  { code: "ro", nativeName: "Română", flagCode: "ro" },
  { code: "sk", nativeName: "Slovenčina", flagCode: "sk" },
  { code: "sl", nativeName: "Slovenščina", flagCode: "si" },
  { code: "es", nativeName: "Español", flagCode: "es" },
  { code: "sv", nativeName: "Svenska", flagCode: "se" },
] as const;

export function getLanguageOption(code: Locale): LanguageOption {
  return (
    LANGUAGE_OPTIONS.find((option) => option.code === code) ??
    LANGUAGE_OPTIONS.find((option) => option.code === "en")!
  );
}
