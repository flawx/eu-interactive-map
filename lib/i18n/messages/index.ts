import type { Locale } from "@/lib/i18n/config";
import { bg } from "./bg";
import { cs } from "./cs";
import { da } from "./da";
import { de } from "./de";
import { el } from "./el";
import { en } from "./en";
import { es } from "./es";
import { et } from "./et";
import { fi } from "./fi";
import { fr } from "./fr";
import { ga } from "./ga";
import { hr } from "./hr";
import { hu } from "./hu";
import { it } from "./it";
import { lt } from "./lt";
import { lv } from "./lv";
import { mt } from "./mt";
import { nl } from "./nl";
import { pl } from "./pl";
import { pt } from "./pt";
import { ro } from "./ro";
import { sk } from "./sk";
import { sl } from "./sl";
import { sv } from "./sv";
import type { Messages } from "./types";

export function getMessages(locale: Locale): Messages {
  const localized = rawMessages[locale] as Partial<Messages> & typeof en;
  return {
    ...en,
    ...localized,
    legend: { ...en.legend, ...localized.legend },
    search: { ...en.search, ...localized.search },
    borderCrossingPanel:
      localized.borderCrossingPanel ?? en.borderCrossingPanel,
    temporaryBorderControlPanel:
      localized.temporaryBorderControlPanel ?? en.temporaryBorderControlPanel,
    ehlPanel: localized.ehlPanel ?? en.ehlPanel,
  };
}

const rawMessages = {
  bg,
  hr,
  cs,
  da,
  nl,
  en,
  et,
  fi,
  fr,
  de,
  el,
  hu,
  ga,
  it,
  lv,
  lt,
  mt,
  pl,
  pt,
  ro,
  sk,
  sl,
  es,
  sv,
};

export const messages: Record<Locale, Messages> = new Proxy(
  {} as Record<Locale, Messages>,
  {
    get(_target, locale: string) {
      return getMessages(locale as Locale);
    },
  },
);
