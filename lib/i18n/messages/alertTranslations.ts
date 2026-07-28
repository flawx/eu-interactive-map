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
  geologicalGroup: string;
  earthquakes: string;
  earthquakeMinor: string;
  earthquakeModerate: string;
  earthquakeStrong: string;
  earthquakeMajor: string;
  volcanoes: string;
  volcanoUnrest: string;
  volcanoEruption: string;
  volcanoAsh: string;
  landslideLikelihood: string;
  landslideModerate: string;
  landslideHigh: string;
  mappedLandslides: string;
  industrialGroup: string;
  majorIndustrialIncidents: string;
  industrialAccidents: string;
  chemicalAccidents: string;
  industrialExplosions: string;
  otherTechnicalAccidents: string;
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
  geologicalGroup: "Geological hazards",
  earthquakes: "Recent earthquakes",
  earthquakeMinor: "Minor · M2.5–3.9",
  earthquakeModerate: "Moderate · M4.0–4.9",
  earthquakeStrong: "Strong · M5.0–5.9",
  earthquakeMajor: "Major · M6.0+",
  volcanoes: "Major volcanic activity",
  volcanoUnrest: "Unrest",
  volcanoEruption: "Eruption",
  volcanoAsh: "Ash emission",
  landslideLikelihood: "Landslide likelihood",
  landslideModerate: "Moderate likelihood",
  landslideHigh: "High likelihood",
  mappedLandslides: "Mapped landslide events",
  industrialGroup: "Industrial and technological incidents",
  majorIndustrialIncidents: "Major industrial and chemical accidents",
  industrialAccidents: "Industrial accidents",
  chemicalAccidents: "Chemical accidents",
  industrialExplosions: "Explosions",
  otherTechnicalAccidents: "Other technical accidents",
};

function tr(values: Partial<AlertTranslation>): AlertTranslation {
  return { ...en, ...values };
}

const baseAlertTranslations: Record<Locale, AlertTranslation> = {
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

type GeologicalLabels = readonly [
  group: string,
  earthquakes: string,
  minor: string,
  moderate: string,
  strong: string,
  major: string,
  volcanoes: string,
  unrest: string,
  eruption: string,
  ash: string,
];

const geologicalLabels: Record<Locale, GeologicalLabels> = {
  en: ["Geological hazards", "Recent earthquakes", "Minor · M2.5–3.9", "Moderate · M4.0–4.9", "Strong · M5.0–5.9", "Major · M6.0+", "Major volcanic activity", "Unrest", "Eruption", "Ash emission"],
  fr: ["Risques géologiques", "Séismes récents", "Faibles · M2,5–3,9", "Modérés · M4,0–4,9", "Forts · M5,0–5,9", "Majeurs · M6,0+", "Activité volcanique majeure", "Agitation", "Éruption", "Émission de cendres"],
  de: ["Geologische Gefahren", "Aktuelle Erdbeben", "Schwach · M2,5–3,9", "Mäßig · M4,0–4,9", "Stark · M5,0–5,9", "Schwer · M6,0+", "Bedeutende vulkanische Aktivität", "Unruhe", "Ausbruch", "Ascheemission"],
  es: ["Riesgos geológicos", "Terremotos recientes", "Leves · M2,5–3,9", "Moderados · M4,0–4,9", "Fuertes · M5,0–5,9", "Mayores · M6,0+", "Actividad volcánica importante", "Inestabilidad", "Erupción", "Emisión de ceniza"],
  it: ["Rischi geologici", "Terremoti recenti", "Deboli · M2,5–3,9", "Moderati · M4,0–4,9", "Forti · M5,0–5,9", "Maggiori · M6,0+", "Attività vulcanica importante", "Agitazione", "Eruzione", "Emissione di cenere"],
  pt: ["Riscos geológicos", "Sismos recentes", "Fracos · M2,5–3,9", "Moderados · M4,0–4,9", "Fortes · M5,0–5,9", "Maiores · M6,0+", "Atividade vulcânica importante", "Agitação", "Erupção", "Emissão de cinzas"],
  nl: ["Geologische risico's", "Recente aardbevingen", "Licht · M2,5–3,9", "Matig · M4,0–4,9", "Sterk · M5,0–5,9", "Zwaar · M6,0+", "Belangrijke vulkanische activiteit", "Onrust", "Uitbarsting", "Asuitstoot"],
  bg: ["Геоложки рискове", "Скорошни земетресения", "Слаби · M2,5–3,9", "Умерени · M4,0–4,9", "Силни · M5,0–5,9", "Големи · M6,0+", "Значителна вулканична активност", "Активизация", "Изригване", "Пепелна емисия"],
  hr: ["Geološki rizici", "Nedavni potresi", "Slabi · M2,5–3,9", "Umjereni · M4,0–4,9", "Jaki · M5,0–5,9", "Veliki · M6,0+", "Velika vulkanska aktivnost", "Nemir", "Erupcija", "Emisija pepela"],
  cs: ["Geologická rizika", "Nedávná zemětřesení", "Slabá · M2,5–3,9", "Střední · M4,0–4,9", "Silná · M5,0–5,9", "Velká · M6,0+", "Významná sopečná aktivita", "Neklid", "Erupce", "Emise popela"],
  da: ["Geologiske risici", "Nylige jordskælv", "Svage · M2,5–3,9", "Moderate · M4,0–4,9", "Stærke · M5,0–5,9", "Store · M6,0+", "Betydelig vulkansk aktivitet", "Uro", "Udbrud", "Askeudledning"],
  et: ["Geoloogilised ohud", "Hiljutised maavärinad", "Nõrgad · M2,5–3,9", "Mõõdukad · M4,0–4,9", "Tugevad · M5,0–5,9", "Suured · M6,0+", "Oluline vulkaaniline aktiivsus", "Rahutus", "Purse", "Tuhaheide"],
  fi: ["Geologiset vaarat", "Viimeaikaiset maanjäristykset", "Heikot · M2,5–3,9", "Kohtalaiset · M4,0–4,9", "Voimakkaat · M5,0–5,9", "Suuret · M6,0+", "Merkittävä tulivuoritoiminta", "Levottomuus", "Purkaus", "Tuhkapäästö"],
  el: ["Γεωλογικοί κίνδυνοι", "Πρόσφατοι σεισμοί", "Ασθενείς · M2,5–3,9", "Μέτριοι · M4,0–4,9", "Ισχυροί · M5,0–5,9", "Μεγάλοι · M6,0+", "Σημαντική ηφαιστειακή δραστηριότητα", "Αναταραχή", "Έκρηξη", "Εκπομπή τέφρας"],
  hu: ["Földtani veszélyek", "Legutóbbi földrengések", "Gyenge · M2,5–3,9", "Mérsékelt · M4,0–4,9", "Erős · M5,0–5,9", "Nagy · M6,0+", "Jelentős vulkáni tevékenység", "Nyugtalanság", "Kitörés", "Hamu kibocsátása"],
  ga: ["Rioscaí geolaíochta", "Creathanna talún le déanaí", "Lag · M2.5–3.9", "Measartha · M4.0–4.9", "Láidir · M5.0–5.9", "Mór · M6.0+", "Mórghníomhaíocht bholcánach", "Corraíl", "Brúchtadh", "Astaíocht luaithrigh"],
  lv: ["Ģeoloģiskie riski", "Nesenās zemestrīces", "Vājas · M2,5–3,9", "Mērenas · M4,0–4,9", "Spēcīgas · M5,0–5,9", "Lielas · M6,0+", "Nozīmīga vulkāniskā aktivitāte", "Nemiers", "Izvirdums", "Pelnu emisija"],
  lt: ["Geologiniai pavojai", "Naujausi žemės drebėjimai", "Silpni · M2,5–3,9", "Vidutiniai · M4,0–4,9", "Stiprūs · M5,0–5,9", "Dideli · M6,0+", "Reikšmingas vulkaninis aktyvumas", "Neramumai", "Išsiveržimas", "Pelenų emisija"],
  mt: ["Riskji ġeoloġiċi", "Terremoti reċenti", "Dgħajfa · M2.5–3.9", "Moderati · M4.0–4.9", "Qawwija · M5.0–5.9", "Kbar · M6.0+", "Attività vulkanika kbira", "Inkwiet", "Eruzzjoni", "Emissjoni ta' rmied"],
  pl: ["Zagrożenia geologiczne", "Ostatnie trzęsienia ziemi", "Słabe · M2,5–3,9", "Umiarkowane · M4,0–4,9", "Silne · M5,0–5,9", "Duże · M6,0+", "Znacząca aktywność wulkaniczna", "Niepokój", "Erupcja", "Emisja popiołu"],
  ro: ["Riscuri geologice", "Cutremure recente", "Slabe · M2,5–3,9", "Moderate · M4,0–4,9", "Puternice · M5,0–5,9", "Majore · M6,0+", "Activitate vulcanică majoră", "Agitație", "Erupție", "Emisie de cenușă"],
  sk: ["Geologické riziká", "Nedávne zemetrasenia", "Slabé · M2,5–3,9", "Mierne · M4,0–4,9", "Silné · M5,0–5,9", "Veľké · M6,0+", "Významná sopečná aktivita", "Nepokoj", "Erupcia", "Emisia popola"],
  sl: ["Geološka tveganja", "Nedavni potresi", "Šibki · M2,5–3,9", "Zmerni · M4,0–4,9", "Močni · M5,0–5,9", "Veliki · M6,0+", "Pomembna vulkanska dejavnost", "Nemir", "Izbruh", "Izpust pepela"],
  sv: ["Geologiska risker", "Nyliga jordbävningar", "Svaga · M2,5–3,9", "Måttliga · M4,0–4,9", "Starka · M5,0–5,9", "Stora · M6,0+", "Betydande vulkanisk aktivitet", "Oro", "Utbrott", "Askutsläpp"],
};

type LandslideIndustrialLabels = readonly [
  likelihood: string,
  moderate: string,
  high: string,
  mapped: string,
  industrialGroup: string,
  industrialLayer: string,
  industrial: string,
  chemical: string,
  explosions: string,
  technical: string,
];

const landslideIndustrialLabels: Record<Locale, LandslideIndustrialLabels> = {
  en: ["Landslide likelihood", "Moderate likelihood", "High likelihood", "Mapped landslide events", "Industrial and technological incidents", "Major industrial and chemical accidents", "Industrial accidents", "Chemical accidents", "Explosions", "Other technical accidents"],
  fr: ["Probabilité de glissement de terrain", "Probabilité modérée", "Probabilité élevée", "Glissements de terrain cartographiés", "Incidents industriels et technologiques", "Accidents industriels et chimiques majeurs", "Accidents industriels", "Accidents chimiques", "Explosions", "Autres accidents techniques"],
  de: ["Erdrutschwahrscheinlichkeit", "Mäßige Wahrscheinlichkeit", "Hohe Wahrscheinlichkeit", "Kartierte Erdrutschereignisse", "Industrie- und Technologievorfälle", "Schwere Industrie- und Chemieunfälle", "Industrieunfälle", "Chemieunfälle", "Explosionen", "Andere technische Unfälle"],
  es: ["Probabilidad de deslizamiento", "Probabilidad moderada", "Probabilidad alta", "Deslizamientos cartografiados", "Incidentes industriales y tecnológicos", "Grandes accidentes industriales y químicos", "Accidentes industriales", "Accidentes químicos", "Explosiones", "Otros accidentes técnicos"],
  it: ["Probabilità di frana", "Probabilità moderata", "Probabilità elevata", "Frane cartografate", "Incidenti industriali e tecnologici", "Gravi incidenti industriali e chimici", "Incidenti industriali", "Incidenti chimici", "Esplosioni", "Altri incidenti tecnici"],
  pt: ["Probabilidade de deslizamento", "Probabilidade moderada", "Probabilidade elevada", "Deslizamentos cartografados", "Incidentes industriais e tecnológicos", "Grandes acidentes industriais e químicos", "Acidentes industriais", "Acidentes químicos", "Explosões", "Outros acidentes técnicos"],
  nl: ["Kans op aardverschuiving", "Matige kans", "Hoge kans", "In kaart gebrachte aardverschuivingen", "Industriële en technologische incidenten", "Grote industriële en chemische ongevallen", "Industriële ongevallen", "Chemische ongevallen", "Explosies", "Andere technische ongevallen"],
  bg: ["Вероятност за свлачище", "Умерена вероятност", "Висока вероятност", "Картирани свлачища", "Промишлени и технологични инциденти", "Големи промишлени и химически аварии", "Промишлени аварии", "Химически аварии", "Експлозии", "Други технически аварии"],
  hr: ["Vjerojatnost klizišta", "Umjerena vjerojatnost", "Visoka vjerojatnost", "Kartirana klizišta", "Industrijski i tehnološki incidenti", "Velike industrijske i kemijske nesreće", "Industrijske nesreće", "Kemijske nesreće", "Eksplozije", "Druge tehničke nesreće"],
  cs: ["Pravděpodobnost sesuvu", "Střední pravděpodobnost", "Vysoká pravděpodobnost", "Zmapované sesuvy", "Průmyslové a technologické události", "Závažné průmyslové a chemické havárie", "Průmyslové havárie", "Chemické havárie", "Výbuchy", "Jiné technické havárie"],
  da: ["Sandsynlighed for jordskred", "Moderat sandsynlighed", "Høj sandsynlighed", "Kortlagte jordskred", "Industrielle og teknologiske hændelser", "Større industri- og kemikalieulykker", "Industriulykker", "Kemikalieulykker", "Eksplosioner", "Andre tekniske ulykker"],
  et: ["Maalihke tõenäosus", "Mõõdukas tõenäosus", "Suur tõenäosus", "Kaardistatud maalihked", "Tööstus- ja tehnoloogiaintsidendid", "Suured tööstus- ja keemiaõnnetused", "Tööstusõnnetused", "Keemiaõnnetused", "Plahvatused", "Muud tehnilised õnnetused"],
  fi: ["Maanvyörymän todennäköisyys", "Kohtalainen todennäköisyys", "Suuri todennäköisyys", "Kartoitetut maanvyörymiä", "Teollisuus- ja teknologiavahingot", "Vakavat teollisuus- ja kemikaalionnettomuuksia", "Teollisuusonnettomuudet", "Kemikaalionnettomuudet", "Räjähdykset", "Muut tekniset onnettomuudet"],
  el: ["Πιθανότητα κατολίσθησης", "Μέτρια πιθανότητα", "Υψηλή πιθανότητα", "Χαρτογραφημένες κατολισθήσεις", "Βιομηχανικά και τεχνολογικά συμβάντα", "Μεγάλα βιομηχανικά και χημικά ατυχήματα", "Βιομηχανικά ατυχήματα", "Χημικά ατυχήματα", "Εκρήξεις", "Άλλα τεχνικά ατυχήματα"],
  hu: ["Földcsuszamlás valószínűsége", "Mérsékelt valószínűség", "Nagy valószínűség", "Feltérképezett földcsuszamlások", "Ipari és technológiai események", "Súlyos ipari és vegyi balesetek", "Ipari balesetek", "Vegyi balesetek", "Robbanások", "Egyéb műszaki balesetek"],
  ga: ["Dóchúlacht sciorrtha talún", "Dóchúlacht mheasartha", "Dóchúlacht ard", "Sciorrthaí talún mapáilte", "Teagmhais thionsclaíocha agus theicneolaíocha", "Mórthionóiscí tionsclaíocha agus ceimiceacha", "Tionóiscí tionsclaíocha", "Tionóiscí ceimiceacha", "Pléascanna", "Tionóiscí teicniúla eile"],
  lv: ["Nogruvuma varbūtība", "Mērena varbūtība", "Augsta varbūtība", "Kartēti nogruvumi", "Rūpnieciskie un tehnoloģiskie incidenti", "Lielas rūpnieciskas un ķīmiskas avārijas", "Rūpnieciskās avārijas", "Ķīmiskās avārijas", "Sprādzieni", "Citas tehniskas avārijas"],
  lt: ["Nuošliaužos tikimybė", "Vidutinė tikimybė", "Didelė tikimybė", "Kartografuotos nuošliaužos", "Pramoniniai ir technologiniai incidentai", "Didelės pramoninės ir cheminės avarijos", "Pramoninės avarijos", "Cheminės avarijos", "Sprogimai", "Kitos techninės avarijos"],
  mt: ["Probabbiltà ta' valanga tal-ħamrija", "Probabbiltà moderata", "Probabbiltà għolja", "Valangi tal-ħamrija mmappjati", "Inċidenti industrijali u teknoloġiċi", "Inċidenti industrijali u kimiċi kbar", "Inċidenti industrijali", "Inċidenti kimiċi", "Splużjonijiet", "Inċidenti tekniċi oħra"],
  pl: ["Prawdopodobieństwo osuwiska", "Umiarkowane prawdopodobieństwo", "Wysokie prawdopodobieństwo", "Zmapowane osuwiska", "Incydenty przemysłowe i technologiczne", "Poważne awarie przemysłowe i chemiczne", "Awarie przemysłowe", "Awarie chemiczne", "Eksplozje", "Inne awarie techniczne"],
  ro: ["Probabilitate de alunecare", "Probabilitate moderată", "Probabilitate ridicată", "Alunecări cartografiate", "Incidente industriale și tehnologice", "Accidente industriale și chimice majore", "Accidente industriale", "Accidente chimice", "Explozii", "Alte accidente tehnice"],
  sk: ["Pravdepodobnosť zosuvu", "Mierna pravdepodobnosť", "Vysoká pravdepodobnosť", "Zmapované zosuvy", "Priemyselné a technologické incidenty", "Závažné priemyselné a chemické havárie", "Priemyselné havárie", "Chemické havárie", "Výbuchy", "Iné technické havárie"],
  sl: ["Verjetnost plazu", "Zmerna verjetnost", "Visoka verjetnost", "Kartirani plazovi", "Industrijski in tehnološki incidenti", "Večje industrijske in kemične nesreče", "Industrijske nesreče", "Kemične nesreče", "Eksplozije", "Druge tehnične nesreče"],
  sv: ["Sannolikhet för jordskred", "Måttlig sannolikhet", "Hög sannolikhet", "Kartlagda jordskred", "Industriella och tekniska incidenter", "Stora industri- och kemikalieolyckor", "Industriolyckor", "Kemikalieolyckor", "Explosioner", "Andra tekniska olyckor"],
};

export const alertTranslations = Object.fromEntries(
  (Object.keys(baseAlertTranslations) as Locale[]).map((locale) => {
    const labels = geologicalLabels[locale];
    const newLabels = landslideIndustrialLabels[locale];
    return [
      locale,
      {
        ...baseAlertTranslations[locale],
        geologicalGroup: labels[0],
        earthquakes: labels[1],
        earthquakeMinor: labels[2],
        earthquakeModerate: labels[3],
        earthquakeStrong: labels[4],
        earthquakeMajor: labels[5],
        volcanoes: labels[6],
        volcanoUnrest: labels[7],
        volcanoEruption: labels[8],
        volcanoAsh: labels[9],
        landslideLikelihood: newLabels[0],
        landslideModerate: newLabels[1],
        landslideHigh: newLabels[2],
        mappedLandslides: newLabels[3],
        industrialGroup: newLabels[4],
        majorIndustrialIncidents: newLabels[5],
        industrialAccidents: newLabels[6],
        chemicalAccidents: newLabels[7],
        industrialExplosions: newLabels[8],
        otherTechnicalAccidents: newLabels[9],
      },
    ];
  }),
) as Record<Locale, AlertTranslation>;
