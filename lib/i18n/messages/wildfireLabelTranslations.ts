import type { Locale } from "@/lib/i18n/config";

export type WildfireLabelMessages = {
  majorWildfire: string;
  lastUpdated: string;
  area: string;
  updateUnknown: string;
};

const en: WildfireLabelMessages = {
  majorWildfire: "Major wildfire",
  lastUpdated: "Last updated",
  area: "Area",
  updateUnknown: "Update unknown",
};

function tr(
  partial: Partial<WildfireLabelMessages>,
): WildfireLabelMessages {
  return { ...en, ...partial };
}

export const wildfireLabelTranslations: Record<Locale, WildfireLabelMessages> = {
  en,
  fr: tr({
    majorWildfire: "Incendie majeur",
    lastUpdated: "Dernière mise à jour",
    area: "Superficie",
    updateUnknown: "Mise à jour inconnue",
  }),
  de: tr({
    majorWildfire: "Großer Waldbrand",
    lastUpdated: "Zuletzt aktualisiert",
    area: "Fläche",
    updateUnknown: "Aktualisierung unbekannt",
  }),
  es: tr({
    majorWildfire: "Incendio mayor",
    lastUpdated: "Última actualización",
    area: "Superficie",
    updateUnknown: "Actualización desconocida",
  }),
  it: tr({
    majorWildfire: "Incendio maggiore",
    lastUpdated: "Ultimo aggiornamento",
    area: "Superficie",
    updateUnknown: "Aggiornamento sconosciuto",
  }),
  pt: tr({
    majorWildfire: "Incêndio maior",
    lastUpdated: "Última atualização",
    area: "Área",
    updateUnknown: "Atualização desconhecida",
  }),
  nl: tr({
    majorWildfire: "Grote natuurbrand",
    lastUpdated: "Laatst bijgewerkt",
    area: "Oppervlakte",
    updateUnknown: "Update onbekend",
  }),
  bg: tr({
    majorWildfire: "Голям пожар",
    lastUpdated: "Последна актуализация",
    area: "Площ",
    updateUnknown: "Неизвестна актуализация",
  }),
  hr: tr({
    majorWildfire: "Veliki požar",
    lastUpdated: "Zadnje ažuriranje",
    area: "Površina",
    updateUnknown: "Ažuriranje nepoznato",
  }),
  cs: tr({
    majorWildfire: "Velký lesní požár",
    lastUpdated: "Poslední aktualizace",
    area: "Rozloha",
    updateUnknown: "Aktualizace neznámá",
  }),
  da: tr({
    majorWildfire: "Større naturbrand",
    lastUpdated: "Sidst opdateret",
    area: "Areal",
    updateUnknown: "Opdatering ukendt",
  }),
  et: tr({
    majorWildfire: "Suur maastikupõleng",
    lastUpdated: "Viimati uuendatud",
    area: "Pindala",
    updateUnknown: "Uuendus teadmata",
  }),
  fi: tr({
    majorWildfire: "Suuri maastopalo",
    lastUpdated: "Viimeksi päivitetty",
    area: "Pinta-ala",
    updateUnknown: "Päivitys tuntematon",
  }),
  el: tr({
    majorWildfire: "Μεγάλη πυρκαγιά",
    lastUpdated: "Τελευταία ενημέρωση",
    area: "Έκταση",
    updateUnknown: "Άγνωστη ενημέρωση",
  }),
  hu: tr({
    majorWildfire: "Nagy erdőtűz",
    lastUpdated: "Utolsó frissítés",
    area: "Terület",
    updateUnknown: "Ismeretlen frissítés",
  }),
  ga: tr({
    majorWildfire: "Dóiteán mór fiáin",
    lastUpdated: "Nuashonraithe lasta",
    area: "Achar",
    updateUnknown: "Nuashonrú anaithnid",
  }),
  lv: tr({
    majorWildfire: "Liels meža ugunsgrēks",
    lastUpdated: "Pēdējoreiz atjaunināts",
    area: "Platība",
    updateUnknown: "Atjauninājums nezināms",
  }),
  lt: tr({
    majorWildfire: "Didelis miško gaisras",
    lastUpdated: "Paskutinį kartą atnaujinta",
    area: "Plotas",
    updateUnknown: "Atnaujinimas nežinomas",
  }),
  mt: tr({
    majorWildfire: "Nar selvaġġ kbir",
    lastUpdated: "Aġġornat l-aħħar",
    area: "Erja",
    updateUnknown: "Aġġornament mhux magħruf",
  }),
  pl: tr({
    majorWildfire: "Duży pożar",
    lastUpdated: "Ostatnia aktualizacja",
    area: "Powierzchnia",
    updateUnknown: "Aktualizacja nieznana",
  }),
  ro: tr({
    majorWildfire: "Incendiu major",
    lastUpdated: "Ultima actualizare",
    area: "Suprafață",
    updateUnknown: "Actualizare necunoscută",
  }),
  sk: tr({
    majorWildfire: "Veľký lesný požiar",
    lastUpdated: "Posledná aktualizácia",
    area: "Rozloha",
    updateUnknown: "Aktualizácia neznáma",
  }),
  sl: tr({
    majorWildfire: "Večji gozdni požar",
    lastUpdated: "Zadnja posodobitev",
    area: "Površina",
    updateUnknown: "Posodobitev neznana",
  }),
  sv: tr({
    majorWildfire: "Större skogsbrand",
    lastUpdated: "Senast uppdaterad",
    area: "Area",
    updateUnknown: "Uppdatering okänd",
  }),
};
