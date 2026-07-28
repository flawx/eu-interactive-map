import type { Locale } from "@/lib/i18n/config";

type AlertTranslation = {
  group: string;
  warnings: string;
  floods: string;
  observed: string;
  storms: string;
  rain: string;
  flood: string;
  wind: string;
  thunderstorm: string;
  hail: string;
  snowIce: string;
  coastal: string;
  other: string;
  wildfireWind: string;
  modeledWind: string;
  spreadWarning: string;
  observationNotForecast: string;
};
const en: AlertTranslation = {
  group: "Floods and severe weather",
  warnings: "Official weather warnings",
  floods: "Major floods",
  observed: "Observed satellite flood extent",
  storms: "Major cyclones and storms",
  rain: "Heavy rain",
  flood: "Flooding",
  wind: "Strong wind",
  thunderstorm: "Thunderstorm",
  hail: "Hail",
  snowIce: "Snow and ice",
  coastal: "Coastal hazards",
  other: "Other phenomena",
  wildfireWind: "Wind around wildfires",
  modeledWind: "The displayed wind is modeled weather data.",
  spreadWarning: "It does not represent a certain forecast of wildfire spread.",
  observationNotForecast: "Satellite observation, not a hydrological forecast.",
};

function tr(values: Partial<AlertTranslation>): AlertTranslation {
  return { ...en, ...values };
}

export const alertTranslations: Record<Locale, AlertTranslation> = {
  en,
  fr: tr({ group: "Inondations et météo sévère", warnings: "Alertes météorologiques officielles", floods: "Inondations majeures", observed: "Étendues inondées observées par satellite", storms: "Cyclones et tempêtes majeures", rain: "Pluie forte", flood: "Inondation", wind: "Vent fort", thunderstorm: "Orage", hail: "Grêle", snowIce: "Neige et verglas", coastal: "Risques côtiers", other: "Autres phénomènes", wildfireWind: "Vent autour des incendies", modeledWind: "Le vent affiché est une donnée météorologique modélisée.", spreadWarning: "Il ne représente pas une prévision certaine de propagation de l’incendie.", observationNotForecast: "Observation satellite, pas prévision hydrologique." }),
  de: tr({ group: "Überschwemmungen und Unwetter", warnings: "Amtliche Wetterwarnungen", floods: "Schwere Überschwemmungen", observed: "Satellitenbeobachtete Überschwemmungsflächen", storms: "Schwere Zyklone und Stürme", rain: "Starkregen", flood: "Überschwemmung", wind: "Starker Wind", thunderstorm: "Gewitter", hail: "Hagel", snowIce: "Schnee und Eis", coastal: "Küstengefahren", other: "Andere Phänomene", wildfireWind: "Wind bei Waldbränden" }),
  es: tr({ group: "Inundaciones y tiempo severo", warnings: "Avisos meteorológicos oficiales", floods: "Grandes inundaciones", observed: "Extensión inundada observada por satélite", storms: "Ciclones y tormentas importantes", rain: "Lluvia intensa", flood: "Inundación", wind: "Viento fuerte", thunderstorm: "Tormenta eléctrica", hail: "Granizo", snowIce: "Nieve y hielo", coastal: "Riesgos costeros", other: "Otros fenómenos", wildfireWind: "Viento alrededor de incendios" }),
  it: tr({ group: "Alluvioni e maltempo intenso", warnings: "Allerte meteorologiche ufficiali", floods: "Grandi alluvioni", observed: "Estensione allagata osservata da satellite", storms: "Cicloni e tempeste maggiori", rain: "Pioggia intensa", flood: "Alluvione", wind: "Vento forte", thunderstorm: "Temporale", hail: "Grandine", snowIce: "Neve e ghiaccio", coastal: "Rischi costieri", other: "Altri fenomeni", wildfireWind: "Vento attorno agli incendi" }),
  pt: tr({ group: "Inundações e tempo severo", warnings: "Avisos meteorológicos oficiais", floods: "Grandes inundações", observed: "Extensão inundada observada por satélite", storms: "Ciclones e tempestades importantes", rain: "Chuva forte", flood: "Inundação", wind: "Vento forte", thunderstorm: "Trovoada", hail: "Granizo", snowIce: "Neve e gelo", coastal: "Riscos costeiros", other: "Outros fenómenos", wildfireWind: "Vento junto aos incêndios" }),
  nl: tr({ group: "Overstromingen en zwaar weer", warnings: "Officiële weerwaarschuwingen", floods: "Grote overstromingen", observed: "Door satelliet waargenomen overstromingsgebied", storms: "Grote cyclonen en stormen", rain: "Zware regen", flood: "Overstroming", wind: "Harde wind", thunderstorm: "Onweer", hail: "Hagel", snowIce: "Sneeuw en ijs", coastal: "Kustgevaren", other: "Andere verschijnselen", wildfireWind: "Wind rond natuurbranden" }),
  bg: tr({ group: "Наводнения и опасно време", warnings: "Официални метеорологични предупреждения", floods: "Големи наводнения", observed: "Сателитно наблюдавани залети площи", storms: "Големи циклони и бури", rain: "Силен дъжд", flood: "Наводнение", wind: "Силен вятър", thunderstorm: "Гръмотевична буря", hail: "Градушка", snowIce: "Сняг и лед", coastal: "Крайбрежни рискове", other: "Други явления", wildfireWind: "Вятър около пожари" }),
  hr: tr({ group: "Poplave i opasno vrijeme", warnings: "Službena meteorološka upozorenja", floods: "Velike poplave", observed: "Satelitski opažena poplavljena područja", storms: "Veliki cikloni i oluje", rain: "Jaka kiša", flood: "Poplava", wind: "Jak vjetar", thunderstorm: "Grmljavinsko nevrijeme", hail: "Tuča", snowIce: "Snijeg i led", coastal: "Obalne opasnosti", other: "Druge pojave", wildfireWind: "Vjetar oko požara" }),
  cs: tr({ group: "Povodně a nebezpečné počasí", warnings: "Oficiální meteorologická varování", floods: "Velké povodně", observed: "Satelitem pozorovaný rozsah záplav", storms: "Významné cyklóny a bouře", rain: "Silný déšť", flood: "Povodeň", wind: "Silný vítr", thunderstorm: "Bouřka", hail: "Krupobití", snowIce: "Sníh a led", coastal: "Pobřežní rizika", other: "Jiné jevy", wildfireWind: "Vítr kolem požárů" }),
  da: tr({ group: "Oversvømmelser og voldsomt vejr", warnings: "Officielle vejrvarsler", floods: "Store oversvømmelser", observed: "Satellitobserveret oversvømmelsesområde", storms: "Større cykloner og storme", rain: "Kraftig regn", flood: "Oversvømmelse", wind: "Kraftig vind", thunderstorm: "Tordenvejr", hail: "Hagl", snowIce: "Sne og is", coastal: "Kystfarer", other: "Andre fænomener", wildfireWind: "Vind omkring naturbrande" }),
  et: tr({ group: "Üleujutused ja ohtlik ilm", warnings: "Ametlikud ilmahoiatused", floods: "Suured üleujutused", observed: "Satelliidiga vaadeldud üleujutusala", storms: "Suured tsüklonid ja tormid", rain: "Tugev vihm", flood: "Üleujutus", wind: "Tugev tuul", thunderstorm: "Äike", hail: "Rahe", snowIce: "Lumi ja jää", coastal: "Rannikuohud", other: "Muud nähtused", wildfireWind: "Tuul maastikupõlengute ümber" }),
  fi: tr({ group: "Tulvat ja vaarallinen sää", warnings: "Viralliset säävaroitukset", floods: "Suuret tulvat", observed: "Satelliitilla havaittu tulva-alue", storms: "Merkittävät syklonit ja myrskyt", rain: "Rankkasade", flood: "Tulva", wind: "Kova tuuli", thunderstorm: "Ukkonen", hail: "Rakeet", snowIce: "Lumi ja jää", coastal: "Rannikkovaarat", other: "Muut ilmiöt", wildfireWind: "Tuuli maastopalojen ympärillä" }),
  el: tr({ group: "Πλημμύρες και έντονα καιρικά φαινόμενα", warnings: "Επίσημες μετεωρολογικές προειδοποιήσεις", floods: "Μεγάλες πλημμύρες", observed: "Δορυφορικά παρατηρούμενη πλημμυρισμένη έκταση", storms: "Μεγάλοι κυκλώνες και καταιγίδες", rain: "Ισχυρή βροχή", flood: "Πλημμύρα", wind: "Ισχυρός άνεμος", thunderstorm: "Καταιγίδα", hail: "Χαλάζι", snowIce: "Χιόνι και πάγος", coastal: "Παράκτιοι κίνδυνοι", other: "Άλλα φαινόμενα", wildfireWind: "Άνεμος γύρω από πυρκαγιές" }),
  hu: tr({ group: "Árvizek és szélsőséges időjárás", warnings: "Hivatalos időjárási figyelmeztetések", floods: "Jelentős árvizek", observed: "Műholddal megfigyelt elöntött terület", storms: "Jelentős ciklonok és viharok", rain: "Heves eső", flood: "Árvíz", wind: "Erős szél", thunderstorm: "Zivatar", hail: "Jégeső", snowIce: "Hó és jég", coastal: "Parti veszélyek", other: "Egyéb jelenségek", wildfireWind: "Szél az erdőtüzek körül" }),
  ga: tr({ group: "Tuilte agus drochaimsir", warnings: "Rabhaidh oifigiúla aimsire", floods: "Mórthuilte", observed: "Limistéar tuilte breathnaithe le satailít", storms: "Cioclóin agus stoirmeacha móra", rain: "Báisteach throm", flood: "Tuile", wind: "Gaoth láidir", thunderstorm: "Stoirm thoirní", hail: "Clocha sneachta", snowIce: "Sneachta agus oighear", coastal: "Guaiseacha cósta", other: "Feiniméin eile", wildfireWind: "Gaoth timpeall dóiteán fiáin" }),
  lv: tr({ group: "Plūdi un bīstami laikapstākļi", warnings: "Oficiālie laikapstākļu brīdinājumi", floods: "Lieli plūdi", observed: "Satelītā novērota applūdusī teritorija", storms: "Lieli cikloni un vētras", rain: "Stiprs lietus", flood: "Plūdi", wind: "Stiprs vējš", thunderstorm: "Pērkona negaiss", hail: "Krusa", snowIce: "Sniegs un ledus", coastal: "Piekrastes apdraudējumi", other: "Citas parādības", wildfireWind: "Vējš ap savvaļas ugunsgrēkiem" }),
  lt: tr({ group: "Potvyniai ir pavojingi orai", warnings: "Oficialūs meteorologiniai perspėjimai", floods: "Dideli potvyniai", observed: "Palydovu stebėtas užlietas plotas", storms: "Dideli ciklonai ir audros", rain: "Smarkus lietus", flood: "Potvynis", wind: "Stiprus vėjas", thunderstorm: "Perkūnija", hail: "Kruša", snowIce: "Sniegas ir ledas", coastal: "Pakrančių pavojai", other: "Kiti reiškiniai", wildfireWind: "Vėjas aplink miškų gaisrus" }),
  mt: tr({ group: "Għargħar u temp qawwi", warnings: "Twissijiet uffiċjali tat-temp", floods: "Għargħar kbir", observed: "Firxa mgħarrqa osservata bis-satellita", storms: "Ċikluni u maltempati kbar", rain: "Xita qawwija", flood: "Għargħar", wind: "Riħ qawwi", thunderstorm: "Maltempata bir-ragħad", hail: "Silġ", snowIce: "Borra u silġ", coastal: "Perikli kostali", other: "Fenomeni oħra", wildfireWind: "Riħ madwar nirien selvaġġi" }),
  pl: tr({ group: "Powodzie i groźna pogoda", warnings: "Oficjalne ostrzeżenia pogodowe", floods: "Duże powodzie", observed: "Zasięg powodzi obserwowany satelitarnie", storms: "Duże cyklony i burze", rain: "Ulewny deszcz", flood: "Powódź", wind: "Silny wiatr", thunderstorm: "Burza", hail: "Grad", snowIce: "Śnieg i lód", coastal: "Zagrożenia przybrzeżne", other: "Inne zjawiska", wildfireWind: "Wiatr wokół pożarów" }),
  ro: tr({ group: "Inundații și vreme severă", warnings: "Avertizări meteorologice oficiale", floods: "Inundații majore", observed: "Suprafață inundată observată prin satelit", storms: "Cicloane și furtuni majore", rain: "Ploaie puternică", flood: "Inundație", wind: "Vânt puternic", thunderstorm: "Furtună", hail: "Grindină", snowIce: "Zăpadă și gheață", coastal: "Riscuri costiere", other: "Alte fenomene", wildfireWind: "Vânt în jurul incendiilor" }),
  sk: tr({ group: "Povodne a nebezpečné počasie", warnings: "Oficiálne meteorologické výstrahy", floods: "Veľké povodne", observed: "Satelitom pozorovaný rozsah záplav", storms: "Významné cyklóny a búrky", rain: "Silný dážď", flood: "Povodeň", wind: "Silný vietor", thunderstorm: "Búrka", hail: "Krupobitie", snowIce: "Sneh a ľad", coastal: "Pobrežné riziká", other: "Iné javy", wildfireWind: "Vietor okolo požiarov" }),
  sl: tr({ group: "Poplave in nevarno vreme", warnings: "Uradna vremenska opozorila", floods: "Velike poplave", observed: "Satelitsko opazovano poplavljeno območje", storms: "Večji cikloni in neurja", rain: "Močan dež", flood: "Poplava", wind: "Močan veter", thunderstorm: "Nevihta", hail: "Toča", snowIce: "Sneg in led", coastal: "Obalne nevarnosti", other: "Drugi pojavi", wildfireWind: "Veter okoli požarov" }),
  sv: tr({ group: "Översvämningar och allvarligt väder", warnings: "Officiella vädervarningar", floods: "Stora översvämningar", observed: "Satellitobserverad översvämningsutbredning", storms: "Stora cykloner och stormar", rain: "Kraftigt regn", flood: "Översvämning", wind: "Kraftig vind", thunderstorm: "Åskväder", hail: "Hagel", snowIce: "Snö och is", coastal: "Kustfaror", other: "Andra fenomen", wildfireWind: "Vind runt skogsbränder" }),
};
