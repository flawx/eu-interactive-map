import type { Locale } from "@/lib/i18n/config";

type Translation = {
  layer: string;
  description: string;
  group: string;
  bridge: string;
  viaduct: string;
  tunnel: string;
  dam: string;
  canalLock: string;
};

const en: Translation = {
  layer: "Major civil engineering works",
  description: "Landmark bridges, viaducts, tunnels, dams and canal locks across Europe",
  group: "Major civil engineering works",
  bridge: "Bridge",
  viaduct: "Viaduct",
  tunnel: "Tunnel",
  dam: "Dam",
  canalLock: "Canal lock",
};

export const civilEngineeringTranslations: Record<Locale, Translation> = {
  en,
  fr: { layer: "Grands ouvrages de génie civil", description: "Ponts, viaducs, tunnels, barrages et écluses majeurs en Europe", group: "Grands ouvrages de génie civil", bridge: "Pont", viaduct: "Viaduc", tunnel: "Tunnel", dam: "Barrage", canalLock: "Écluse" },
  de: { layer: "Bedeutende Ingenieurbauwerke", description: "Bedeutende Brücken, Viadukte, Tunnel, Staudämme und Schleusen in Europa", group: "Bedeutende Ingenieurbauwerke", bridge: "Brücke", viaduct: "Viadukt", tunnel: "Tunnel", dam: "Staudamm", canalLock: "Schleuse" },
  es: { layer: "Grandes obras de ingeniería civil", description: "Puentes, viaductos, túneles, presas y esclusas destacados de Europa", group: "Grandes obras de ingeniería civil", bridge: "Puente", viaduct: "Viaducto", tunnel: "Túnel", dam: "Presa", canalLock: "Esclusa" },
  it: { layer: "Grandi opere di ingegneria civile", description: "Ponti, viadotti, gallerie, dighe e chiuse di rilievo in Europa", group: "Grandi opere di ingegneria civile", bridge: "Ponte", viaduct: "Viadotto", tunnel: "Galleria", dam: "Diga", canalLock: "Chiusa" },
  pt: { layer: "Grandes obras de engenharia civil", description: "Pontes, viadutos, túneis, barragens e eclusas marcantes da Europa", group: "Grandes obras de engenharia civil", bridge: "Ponte", viaduct: "Viaduto", tunnel: "Túnel", dam: "Barragem", canalLock: "Eclusa" },
  nl: { layer: "Grote civieltechnische werken", description: "Markante bruggen, viaducten, tunnels, dammen en sluizen in Europa", group: "Grote civieltechnische werken", bridge: "Brug", viaduct: "Viaduct", tunnel: "Tunnel", dam: "Dam", canalLock: "Sluis" },
  bg: { ...en, layer: "Големи строителни съоръжения", group: "Големи строителни съоръжения", bridge: "Мост", viaduct: "Виадукт", tunnel: "Тунел", dam: "Язовирна стена", canalLock: "Шлюз" },
  cs: { ...en, layer: "Významná inženýrská díla", group: "Významná inženýrská díla", bridge: "Most", viaduct: "Viadukt", tunnel: "Tunel", dam: "Přehrada", canalLock: "Plavební komora" },
  da: { ...en, layer: "Store anlægsarbejder", group: "Store anlægsarbejder", bridge: "Bro", viaduct: "Viadukt", tunnel: "Tunnel", dam: "Dæmning", canalLock: "Sluse" },
  el: { ...en, layer: "Μεγάλα έργα πολιτικού μηχανικού", group: "Μεγάλα έργα πολιτικού μηχανικού", bridge: "Γέφυρα", viaduct: "Κοιλαδογέφυρα", tunnel: "Σήραγγα", dam: "Φράγμα", canalLock: "Θυρόφραγμα" },
  et: { ...en, layer: "Suured tsiviilehitised", group: "Suured tsiviilehitised", bridge: "Sild", viaduct: "Viadukt", tunnel: "Tunnel", dam: "Tamm", canalLock: "Lüüs" },
  fi: { ...en, layer: "Merkittävät insinöörirakenteet", group: "Merkittävät insinöörirakenteet", bridge: "Silta", viaduct: "Maasilta", tunnel: "Tunneli", dam: "Pato", canalLock: "Sulku" },
  ga: { ...en, layer: "Móroibreacha innealtóireachta sibhialta", group: "Móroibreacha innealtóireachta sibhialta", bridge: "Droichead", viaduct: "Tarbhealach", tunnel: "Tollán", dam: "Damba", canalLock: "Loc canála" },
  hr: { ...en, layer: "Velika građevinska djela", group: "Velika građevinska djela", bridge: "Most", viaduct: "Vijadukt", tunnel: "Tunel", dam: "Brana", canalLock: "Ustava" },
  hu: { ...en, layer: "Jelentős mérnöki létesítmények", group: "Jelentős mérnöki létesítmények", bridge: "Híd", viaduct: "Völgyhíd", tunnel: "Alagút", dam: "Gát", canalLock: "Zsilip" },
  lt: { ...en, layer: "Didieji civilinės inžinerijos statiniai", group: "Didieji civilinės inžinerijos statiniai", bridge: "Tiltas", viaduct: "Viadukas", tunnel: "Tunelis", dam: "Užtvanka", canalLock: "Šliuzas" },
  lv: { ...en, layer: "Lielākās inženierbūves", group: "Lielākās inženierbūves", bridge: "Tilts", viaduct: "Viadukts", tunnel: "Tunelis", dam: "Aizsprosts", canalLock: "Slūžas" },
  mt: { ...en, layer: "Xogħlijiet ewlenin tal-inġinerija ċivili", group: "Xogħlijiet ewlenin tal-inġinerija ċivili", bridge: "Pont", viaduct: "Vjadott", tunnel: "Mina", dam: "Diga", canalLock: "Maqful tal-kanal" },
  pl: { ...en, layer: "Wielkie obiekty inżynierii lądowej", group: "Wielkie obiekty inżynierii lądowej", bridge: "Most", viaduct: "Wiadukt", tunnel: "Tunel", dam: "Zapora", canalLock: "Śluza" },
  ro: { ...en, layer: "Mari lucrări de inginerie civilă", group: "Mari lucrări de inginerie civilă", bridge: "Pod", viaduct: "Viaduct", tunnel: "Tunel", dam: "Baraj", canalLock: "Ecluză" },
  sk: { ...en, layer: "Významné inžinierske stavby", group: "Významné inžinierske stavby", bridge: "Most", viaduct: "Viadukt", tunnel: "Tunel", dam: "Priehrada", canalLock: "Plavebná komora" },
  sl: { ...en, layer: "Veliki gradbeni objekti", group: "Veliki gradbeni objekti", bridge: "Most", viaduct: "Viadukt", tunnel: "Predor", dam: "Jez", canalLock: "Zapornica" },
  sv: { ...en, layer: "Stora anläggningsverk", group: "Stora anläggningsverk", bridge: "Bro", viaduct: "Viadukt", tunnel: "Tunnel", dam: "Damm", canalLock: "Sluss" },
};
