import {
  EUIM_COUNTRY_CODES,
  isCoordinateInEUIMScope,
  isCountryInEUIMScope,
} from "@/lib/geography/euimCoverage";

export type CivilEngineeringWorkCategory =
  | "bridge"
  | "viaduct"
  | "tunnel"
  | "dam"
  | "canal_lock";

export type CivilEngineeringWorkStatus =
  | "planned"
  | "under_construction"
  | "open"
  | "closed";

export type CivilEngineeringWorkCarries =
  | "road"
  | "rail"
  | "road_rail"
  | "pedestrian"
  | "water";

export type MajorCivilEngineeringWork = {
  id: string;
  name: string;
  aliases: string[];
  countryCodes: string[];
  regionOrCity: string;
  latitude: number;
  longitude: number;
  category: CivilEngineeringWorkCategory;
  status: CivilEngineeringWorkStatus;
  openingYear: number | null;
  summary: string;
  officialUrl: string | null;
  wikipediaUrl: string;
  wikidataId: string | null;
  lengthMeters: number | null;
  heightMeters: number | null;
  mainSpanMeters: number | null;
  depthMeters: number | null;
  carries: CivilEngineeringWorkCarries;
};

const work = (
  value: MajorCivilEngineeringWork,
): MajorCivilEngineeringWork => value;

const ALL_MAJOR_CIVIL_ENGINEERING_WORKS: readonly MajorCivilEngineeringWork[] = [
  work({ id: "oresund-bridge", name: "Øresund Bridge", aliases: ["Öresund Bridge", "Oresundsbron"], countryCodes: ["DK", "SE"], regionOrCity: "Copenhagen–Malmö", latitude: 55.5753, longitude: 12.8302, category: "bridge", status: "open", openingYear: 2000, summary: "A combined road and railway crossing linking Denmark and Sweden across the Øresund strait.", officialUrl: "https://www.oresundsbron.com/", wikipediaUrl: "https://en.wikipedia.org/wiki/%C3%98resund_Bridge", wikidataId: null, lengthMeters: 7845, heightMeters: 204, mainSpanMeters: 490, depthMeters: null, carries: "road_rail" }),
  work({ id: "great-belt-east-bridge", name: "Great Belt East Bridge", aliases: ["Storebælt Bridge", "Great Belt Fixed Link"], countryCodes: ["DK"], regionOrCity: "Zealand–Funen", latitude: 55.3419, longitude: 11.0362, category: "bridge", status: "open", openingYear: 1998, summary: "The suspension bridge carrying the road section of Denmark’s Great Belt Fixed Link.", officialUrl: "https://storebaelt.dk/en/", wikipediaUrl: "https://en.wikipedia.org/wiki/Great_Belt_Bridge", wikidataId: null, lengthMeters: 6790, heightMeters: 254, mainSpanMeters: 1624, depthMeters: null, carries: "road" }),
  work({ id: "vasco-da-gama-bridge", name: "Vasco da Gama Bridge", aliases: ["Ponte Vasco da Gama"], countryCodes: ["PT"], regionOrCity: "Lisbon", latitude: 38.7571, longitude: -9.0384, category: "bridge", status: "open", openingYear: 1998, summary: "A long road crossing of the Tagus estuary that relieves traffic pressure on central Lisbon.", officialUrl: "https://www.lusoponte.pt/", wikipediaUrl: "https://en.wikipedia.org/wiki/Vasco_da_Gama_Bridge", wikidataId: null, lengthMeters: 12345, heightMeters: 155, mainSpanMeters: 420, depthMeters: null, carries: "road" }),
  work({ id: "25-de-abril-bridge", name: "25 de Abril Bridge", aliases: ["Ponte 25 de Abril"], countryCodes: ["PT"], regionOrCity: "Lisbon–Almada", latitude: 38.6897, longitude: -9.1771, category: "bridge", status: "open", openingYear: 1966, summary: "A landmark suspension bridge carrying road and rail traffic across the Tagus at Lisbon.", officialUrl: "https://www.lusoponte.pt/", wikipediaUrl: "https://en.wikipedia.org/wiki/25_de_Abril_Bridge", wikidataId: null, lengthMeters: 2277, heightMeters: 190, mainSpanMeters: 1013, depthMeters: null, carries: "road_rail" }),
  work({ id: "pont-de-normandie", name: "Pont de Normandie", aliases: ["Normandy Bridge"], countryCodes: ["FR"], regionOrCity: "Le Havre–Honfleur", latitude: 49.4369, longitude: 0.2746, category: "bridge", status: "open", openingYear: 1995, summary: "A cable-stayed road bridge spanning the Seine estuary between Le Havre and Honfleur.", officialUrl: "https://www.pontsnormandietancarville.fr/", wikipediaUrl: "https://en.wikipedia.org/wiki/Pont_de_Normandie", wikidataId: null, lengthMeters: 2141, heightMeters: 214, mainSpanMeters: 856, depthMeters: null, carries: "road" }),
  work({ id: "rio-antirrio-bridge", name: "Rio–Antirrio Bridge", aliases: ["Charilaos Trikoupis Bridge"], countryCodes: ["EL"], regionOrCity: "Rio–Antirrio", latitude: 38.3216, longitude: 21.7734, category: "bridge", status: "open", openingYear: 2004, summary: "A multi-span cable-stayed bridge crossing the Gulf of Corinth in a seismically demanding setting.", officialUrl: "https://www.gefyra.gr/en/", wikipediaUrl: "https://en.wikipedia.org/wiki/Rio%E2%80%93Antirrio_Bridge", wikidataId: null, lengthMeters: 2880, heightMeters: 230, mainSpanMeters: 560, depthMeters: null, carries: "road" }),
  work({ id: "forth-bridge", name: "Forth Bridge", aliases: ["Forth Rail Bridge"], countryCodes: ["UK"], regionOrCity: "Edinburgh–Fife", latitude: 56.0004, longitude: -3.3886, category: "bridge", status: "open", openingYear: 1890, summary: "A monumental steel cantilever railway bridge across the Firth of Forth.", officialUrl: "https://www.networkrail.co.uk/who-we-are/our-history/iconic-infrastructure/the-forth-bridge/", wikipediaUrl: "https://en.wikipedia.org/wiki/Forth_Bridge", wikidataId: null, lengthMeters: 2467, heightMeters: 110, mainSpanMeters: 521, depthMeters: null, carries: "rail" }),
  work({ id: "queensferry-crossing", name: "Queensferry Crossing", aliases: [], countryCodes: ["UK"], regionOrCity: "Edinburgh–Fife", latitude: 56.0068, longitude: -3.4129, category: "bridge", status: "open", openingYear: 2017, summary: "A three-tower cable-stayed motorway bridge forming the newest Forth crossing.", officialUrl: "https://www.theforthbridges.org/queensferry-crossing/", wikipediaUrl: "https://en.wikipedia.org/wiki/Queensferry_Crossing", wikidataId: null, lengthMeters: 2700, heightMeters: 210, mainSpanMeters: 650, depthMeters: null, carries: "road" }),
  work({ id: "tower-bridge", name: "Tower Bridge", aliases: [], countryCodes: ["UK"], regionOrCity: "London", latitude: 51.5055, longitude: -0.0754, category: "bridge", status: "open", openingYear: 1894, summary: "A combined bascule and suspension bridge built to preserve river navigation through central London.", officialUrl: "https://www.towerbridge.org.uk/", wikipediaUrl: "https://en.wikipedia.org/wiki/Tower_Bridge", wikidataId: null, lengthMeters: 244, heightMeters: 65, mainSpanMeters: 61, depthMeters: null, carries: "road" }),
  work({ id: "erasmus-bridge", name: "Erasmus Bridge", aliases: ["Erasmusbrug"], countryCodes: ["NL"], regionOrCity: "Rotterdam", latitude: 51.909, longitude: 4.4869, category: "bridge", status: "open", openingYear: 1996, summary: "An asymmetrical cable-stayed bridge and bascule crossing over the Nieuwe Maas in Rotterdam.", officialUrl: "https://www.rotterdam.nl/erasmusbrug", wikipediaUrl: "https://en.wikipedia.org/wiki/Erasmusbrug", wikidataId: null, lengthMeters: 802, heightMeters: 139, mainSpanMeters: 284, depthMeters: null, carries: "road" }),
  work({ id: "szechenyi-chain-bridge", name: "Széchenyi Chain Bridge", aliases: ["Chain Bridge", "Lánchíd"], countryCodes: ["HU"], regionOrCity: "Budapest", latitude: 47.4989, longitude: 19.0437, category: "bridge", status: "open", openingYear: 1849, summary: "Budapest’s historic suspension bridge joining Buda and Pest across the Danube.", officialUrl: "https://budapest.hu/", wikipediaUrl: "https://en.wikipedia.org/wiki/Sz%C3%A9chenyi_Chain_Bridge", wikidataId: null, lengthMeters: 375, heightMeters: 48, mainSpanMeters: 203, depthMeters: null, carries: "road" }),
  work({ id: "vizcaya-bridge", name: "Vizcaya Bridge", aliases: ["Puente de Vizcaya", "Puente Colgante"], countryCodes: ["ES"], regionOrCity: "Portugalete–Getxo", latitude: 43.323, longitude: -3.0168, category: "bridge", status: "open", openingYear: 1893, summary: "The world’s oldest operating transporter bridge, carrying a suspended gondola across the Nervión.", officialUrl: "https://puente-colgante.com/", wikipediaUrl: "https://en.wikipedia.org/wiki/Vizcaya_Bridge", wikidataId: null, lengthMeters: 164, heightMeters: 61, mainSpanMeters: 160, depthMeters: null, carries: "road" }),
  work({ id: "ada-bridge", name: "Ada Bridge", aliases: ["Most na Adi"], countryCodes: ["RS"], regionOrCity: "Belgrade", latitude: 44.7884, longitude: 20.4252, category: "bridge", status: "open", openingYear: 2012, summary: "A single-pylon cable-stayed crossing of the Sava built as part of Belgrade’s inner ring road.", officialUrl: null, wikipediaUrl: "https://en.wikipedia.org/wiki/Ada_Bridge", wikidataId: null, lengthMeters: 996, heightMeters: 200, mainSpanMeters: 376, depthMeters: null, carries: "road" }),

  work({ id: "millau-viaduct", name: "Millau Viaduct", aliases: ["Viaduc de Millau"], countryCodes: ["FR"], regionOrCity: "Millau, Occitanie", latitude: 44.0775, longitude: 3.0225, category: "viaduct", status: "open", openingYear: 2004, summary: "A multi-span cable-stayed motorway viaduct crossing the Tarn valley on the A75.", officialUrl: "https://www.leviaducdemillau.com/", wikipediaUrl: "https://en.wikipedia.org/wiki/Millau_Viaduct", wikidataId: null, lengthMeters: 2460, heightMeters: 343, mainSpanMeters: 342, depthMeters: null, carries: "road" }),
  work({ id: "landwasser-viaduct", name: "Landwasser Viaduct", aliases: ["Landwasserviadukt"], countryCodes: ["CH"], regionOrCity: "Graubünden", latitude: 46.6807, longitude: 9.6751, category: "viaduct", status: "open", openingYear: 1902, summary: "A curved six-arch masonry railway viaduct on the Rhaetian Railway’s Albula line.", officialUrl: "https://www.rhb.ch/en/world-of-railway-experiences/unesco-world-heritage", wikipediaUrl: "https://en.wikipedia.org/wiki/Landwasser_Viaduct", wikidataId: null, lengthMeters: 142, heightMeters: 65, mainSpanMeters: 20, depthMeters: null, carries: "rail" }),
  work({ id: "glenfinnan-viaduct", name: "Glenfinnan Viaduct", aliases: [], countryCodes: ["UK"], regionOrCity: "Lochaber, Scotland", latitude: 56.8763, longitude: -5.4319, category: "viaduct", status: "open", openingYear: 1901, summary: "A mass-concrete railway viaduct carrying the West Highland Line across the Glenfinnan valley.", officialUrl: "https://www.networkrail.co.uk/who-we-are/our-history/iconic-infrastructure/the-glenfinnan-viaduct/", wikipediaUrl: "https://en.wikipedia.org/wiki/Glenfinnan_Viaduct", wikidataId: null, lengthMeters: 380, heightMeters: 30, mainSpanMeters: 15, depthMeters: null, carries: "rail" }),
  work({ id: "mala-rijeka-viaduct", name: "Mala Rijeka Viaduct", aliases: [], countryCodes: ["ME"], regionOrCity: "Bioče–Kolašin", latitude: 42.6268, longitude: 19.3892, category: "viaduct", status: "open", openingYear: 1973, summary: "A high steel railway viaduct on the Belgrade–Bar line above the Mala Rijeka canyon.", officialUrl: null, wikipediaUrl: "https://en.wikipedia.org/wiki/Mala_Rijeka_Viaduct", wikidataId: null, lengthMeters: 499, heightMeters: 200, mainSpanMeters: 150, depthMeters: null, carries: "rail" }),
  work({ id: "goltzsch-viaduct", name: "Göltzsch Viaduct", aliases: ["Göltzschtalbrücke"], countryCodes: ["DE"], regionOrCity: "Saxony", latitude: 50.6229, longitude: 12.2432, category: "viaduct", status: "open", openingYear: 1851, summary: "A vast four-level brick railway viaduct crossing the Göltzsch valley in Saxony.", officialUrl: "https://www.sachsen-tourismus.de/poi/goeltzschtalbruecke-netzschkau", wikipediaUrl: "https://en.wikipedia.org/wiki/G%C3%B6ltzsch_Viaduct", wikidataId: null, lengthMeters: 574, heightMeters: 78, mainSpanMeters: 30, depthMeters: null, carries: "rail" }),
  work({ id: "ribblehead-viaduct", name: "Ribblehead Viaduct", aliases: ["Batty Moss Viaduct"], countryCodes: ["UK"], regionOrCity: "North Yorkshire", latitude: 54.2107, longitude: -2.3701, category: "viaduct", status: "open", openingYear: 1875, summary: "A 24-arch masonry railway viaduct on the Settle–Carlisle line across Batty Moss.", officialUrl: "https://www.networkrail.co.uk/who-we-are/our-history/iconic-infrastructure/ribblehead-viaduct/", wikipediaUrl: "https://en.wikipedia.org/wiki/Ribblehead_Viaduct", wikidataId: null, lengthMeters: 400, heightMeters: 32, mainSpanMeters: 14, depthMeters: null, carries: "rail" }),
  work({ id: "garabit-viaduct", name: "Garabit Viaduct", aliases: ["Viaduc de Garabit"], countryCodes: ["FR"], regionOrCity: "Cantal", latitude: 44.9766, longitude: 3.1772, category: "viaduct", status: "open", openingYear: 1885, summary: "A wrought-iron railway arch designed by Gustave Eiffel’s company above the Truyère valley.", officialUrl: null, wikipediaUrl: "https://en.wikipedia.org/wiki/Garabit_viaduct", wikidataId: null, lengthMeters: 565, heightMeters: 124, mainSpanMeters: 165, depthMeters: null, carries: "rail" }),

  work({ id: "channel-tunnel", name: "Channel Tunnel", aliases: ["Eurotunnel", "Tunnel sous la Manche"], countryCodes: ["FR", "UK"], regionOrCity: "Coquelles–Folkestone", latitude: 50.951, longitude: 1.782, category: "tunnel", status: "open", openingYear: 1994, summary: "A twin-bore railway tunnel beneath the English Channel linking France and the United Kingdom.", officialUrl: "https://www.getlinkgroup.com/", wikipediaUrl: "https://en.wikipedia.org/wiki/Channel_Tunnel", wikidataId: null, lengthMeters: 50450, heightMeters: null, mainSpanMeters: null, depthMeters: 75, carries: "rail" }),
  work({ id: "gotthard-base-tunnel", name: "Gotthard Base Tunnel", aliases: ["Gotthard-Basistunnel"], countryCodes: ["CH"], regionOrCity: "Uri–Ticino", latitude: 46.601, longitude: 8.765, category: "tunnel", status: "open", openingYear: 2016, summary: "A low-gradient Alpine railway tunnel forming the core of Switzerland’s north–south base route.", officialUrl: "https://www.alptransit-portal.ch/en/gotthard/", wikipediaUrl: "https://en.wikipedia.org/wiki/Gotthard_Base_Tunnel", wikidataId: null, lengthMeters: 57104, heightMeters: null, mainSpanMeters: null, depthMeters: null, carries: "rail" }),
  work({ id: "laerdal-tunnel", name: "Lærdal Tunnel", aliases: ["Lærdalstunnelen"], countryCodes: ["NO"], regionOrCity: "Aurland–Lærdal", latitude: 60.9718, longitude: 7.3684, category: "tunnel", status: "open", openingYear: 2000, summary: "A long road tunnel providing an all-weather route between Oslo and Bergen.", officialUrl: "https://www.vegvesen.no/en/roads/road-lists/national-tourist-routes/laerdalstunnelen/", wikipediaUrl: "https://en.wikipedia.org/wiki/L%C3%A6rdal_Tunnel", wikidataId: null, lengthMeters: 24510, heightMeters: null, mainSpanMeters: null, depthMeters: null, carries: "road" }),
  work({ id: "mont-blanc-tunnel", name: "Mont Blanc Tunnel", aliases: ["Tunnel du Mont-Blanc", "Traforo del Monte Bianco"], countryCodes: ["FR", "IT"], regionOrCity: "Chamonix–Courmayeur", latitude: 45.9012, longitude: 6.8874, category: "tunnel", status: "open", openingYear: 1965, summary: "A trans-Alpine road tunnel linking the Chamonix and Aosta valleys beneath Mont Blanc.", officialUrl: "https://www.tunnelmb.net/en-US", wikipediaUrl: "https://en.wikipedia.org/wiki/Mont_Blanc_Tunnel", wikidataId: null, lengthMeters: 11611, heightMeters: null, mainSpanMeters: null, depthMeters: null, carries: "road" }),
  work({ id: "brenner-base-tunnel", name: "Brenner Base Tunnel", aliases: ["Brenner Basistunnel", "Galleria di base del Brennero"], countryCodes: ["AT", "IT"], regionOrCity: "Innsbruck–Fortezza", latitude: 47.116, longitude: 11.49, category: "tunnel", status: "under_construction", openingYear: null, summary: "A railway base tunnel under construction beneath the Brenner Pass between Austria and Italy.", officialUrl: "https://www.bbt-se.com/en/", wikipediaUrl: "https://en.wikipedia.org/wiki/Brenner_Base_Tunnel", wikidataId: null, lengthMeters: 55000, heightMeters: null, mainSpanMeters: null, depthMeters: null, carries: "rail" }),
  work({ id: "fehmarn-belt-tunnel", name: "Fehmarnbelt Tunnel", aliases: ["Fehmarn Belt Fixed Link"], countryCodes: ["DK", "DE"], regionOrCity: "Rødbyhavn–Puttgarden", latitude: 54.596, longitude: 11.263, category: "tunnel", status: "under_construction", openingYear: null, summary: "An immersed road and rail tunnel under construction between Denmark and Germany.", officialUrl: "https://femern.com/", wikipediaUrl: "https://en.wikipedia.org/wiki/Fehmarn_Belt_fixed_link", wikidataId: null, lengthMeters: 18100, heightMeters: null, mainSpanMeters: null, depthMeters: 40, carries: "road_rail" }),
  work({ id: "simplon-tunnel", name: "Simplon Tunnel", aliases: ["Simplontunnel"], countryCodes: ["CH", "IT"], regionOrCity: "Brig–Domodossola", latitude: 46.326, longitude: 8.032, category: "tunnel", status: "open", openingYear: 1906, summary: "A two-bore railway tunnel crossing the Alps between Switzerland and Italy.", officialUrl: null, wikipediaUrl: "https://en.wikipedia.org/wiki/Simplon_Tunnel", wikidataId: null, lengthMeters: 19803, heightMeters: null, mainSpanMeters: null, depthMeters: null, carries: "rail" }),
  work({ id: "lotschberg-base-tunnel", name: "Lötschberg Base Tunnel", aliases: ["Lötschberg-Basistunnel"], countryCodes: ["CH"], regionOrCity: "Bernese Alps", latitude: 46.456, longitude: 7.708, category: "tunnel", status: "open", openingYear: 2007, summary: "A railway base tunnel carrying the Lötschberg route beneath the Bernese Alps.", officialUrl: "https://www.bls.ch/en/unternehmen/ueber-uns/unternehmen/loetschberg-basistunnel", wikipediaUrl: "https://en.wikipedia.org/wiki/L%C3%B6tschberg_Base_Tunnel", wikidataId: null, lengthMeters: 34600, heightMeters: null, mainSpanMeters: null, depthMeters: null, carries: "rail" }),
  work({ id: "guadarrama-tunnel", name: "Guadarrama Tunnel", aliases: ["Túnel de Guadarrama"], countryCodes: ["ES"], regionOrCity: "Madrid–Segovia", latitude: 40.778, longitude: -3.91, category: "tunnel", status: "open", openingYear: 2007, summary: "Twin high-speed railway bores crossing the Sierra de Guadarrama northwest of Madrid.", officialUrl: "https://www.adifaltavelocidad.es/", wikipediaUrl: "https://en.wikipedia.org/wiki/Guadarrama_Tunnel", wikidataId: null, lengthMeters: 28418, heightMeters: null, mainSpanMeters: null, depthMeters: null, carries: "rail" }),
  work({ id: "ryfylke-tunnel", name: "Ryfylke Tunnel", aliases: ["Ryfylketunnelen"], countryCodes: ["NO"], regionOrCity: "Stavanger–Ryfylke", latitude: 59.012, longitude: 5.863, category: "tunnel", status: "open", openingYear: 2019, summary: "A subsea road tunnel forming part of the Ryfast fixed-link system near Stavanger.", officialUrl: "https://www.vegvesen.no/vegprosjekter/riksveg/ryfast/", wikipediaUrl: "https://en.wikipedia.org/wiki/Ryfylke_Tunnel", wikidataId: null, lengthMeters: 14300, heightMeters: null, mainSpanMeters: null, depthMeters: 292, carries: "road" }),

  work({ id: "grande-dixence-dam", name: "Grande Dixence Dam", aliases: ["Barrage de la Grande-Dixence"], countryCodes: ["CH"], regionOrCity: "Valais", latitude: 46.0805, longitude: 7.403, category: "dam", status: "open", openingYear: 1961, summary: "A very high concrete gravity dam forming the Lac des Dix hydroelectric reservoir.", officialUrl: "https://www.grande-dixence.ch/en", wikipediaUrl: "https://en.wikipedia.org/wiki/Grande_Dixence_Dam", wikidataId: null, lengthMeters: 695, heightMeters: 285, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "contra-dam", name: "Contra Dam", aliases: ["Verzasca Dam", "Diga della Verzasca"], countryCodes: ["CH"], regionOrCity: "Ticino", latitude: 46.1969, longitude: 8.8489, category: "dam", status: "open", openingYear: 1965, summary: "A concrete arch dam closing the Verzasca valley above Lake Maggiore.", officialUrl: "https://www.ticino.ch/en/commons/details/Verzasca-Dam/3044.html", wikipediaUrl: "https://en.wikipedia.org/wiki/Contra_Dam", wikidataId: null, lengthMeters: 380, heightMeters: 220, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "vajont-dam", name: "Vajont Dam", aliases: ["Diga del Vajont"], countryCodes: ["IT"], regionOrCity: "Friuli-Venezia Giulia", latitude: 46.267, longitude: 12.329, category: "dam", status: "closed", openingYear: 1960, summary: "A high arch dam preserved at the site of the catastrophic 1963 Vajont reservoir landslide.", officialUrl: "https://www.parcovajont.it/", wikipediaUrl: "https://en.wikipedia.org/wiki/Vajont_Dam", wikidataId: null, lengthMeters: 190, heightMeters: 262, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "almendra-dam", name: "Almendra Dam", aliases: ["Presa de Almendra"], countryCodes: ["ES"], regionOrCity: "Salamanca–Zamora", latitude: 41.2667, longitude: -6.3167, category: "dam", status: "open", openingYear: 1970, summary: "A high concrete arch dam on the Tormes forming one of Spain’s largest reservoirs.", officialUrl: "https://www.iberdrola.com/about-us/what-we-do/hydroelectric-power", wikipediaUrl: "https://en.wikipedia.org/wiki/Almendra_Dam", wikidataId: null, lengthMeters: 567, heightMeters: 202, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "aldeadavila-dam", name: "Aldeadávila Dam", aliases: ["Presa de Aldeadávila"], countryCodes: ["ES"], regionOrCity: "Salamanca", latitude: 41.2115, longitude: -6.6858, category: "dam", status: "open", openingYear: 1962, summary: "A concrete arch-gravity dam and major hydroelectric complex in the deep Duero canyon.", officialUrl: "https://www.iberdrola.com/about-us/what-we-do/hydroelectric-power", wikipediaUrl: "https://en.wikipedia.org/wiki/Aldead%C3%A1vila_Dam", wikidataId: null, lengthMeters: 250, heightMeters: 140, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "karahnjukar-dam", name: "Kárahnjúkar Dam", aliases: ["Kárahnjúkastífla"], countryCodes: ["IS"], regionOrCity: "Eastern Highlands", latitude: 64.936, longitude: -15.778, category: "dam", status: "open", openingYear: 2009, summary: "A concrete-faced rockfill dam forming the Hálslón reservoir for the Kárahnjúkar hydropower project.", officialUrl: "https://www.landsvirkjun.com/powerstations/karahnjukar", wikipediaUrl: "https://en.wikipedia.org/wiki/K%C3%A1rahnj%C3%BAkar_Hydropower_Plant", wikidataId: null, lengthMeters: 730, heightMeters: 193, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "vidraru-dam", name: "Vidraru Dam", aliases: ["Barajul Vidraru"], countryCodes: ["RO"], regionOrCity: "Argeș County", latitude: 45.3664, longitude: 24.6305, category: "dam", status: "open", openingYear: 1966, summary: "A double-curvature arch dam on the Argeș River supplying a hydroelectric power station.", officialUrl: "https://www.hidroelectrica.ro/", wikipediaUrl: "https://en.wikipedia.org/wiki/Vidraru_Dam", wikidataId: null, lengthMeters: 305, heightMeters: 166, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "mratinje-dam", name: "Mratinje Dam", aliases: ["Piva Dam"], countryCodes: ["ME"], regionOrCity: "Plužine", latitude: 43.1968, longitude: 18.8405, category: "dam", status: "open", openingYear: 1976, summary: "A high concrete arch dam in the Piva canyon forming Lake Piva.", officialUrl: "https://www.epcg.com/", wikipediaUrl: "https://en.wikipedia.org/wiki/Mratinje_Dam", wikidataId: null, lengthMeters: 268, heightMeters: 220, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "kolnbrein-dam", name: "Kölnbrein Dam", aliases: ["Kölnbreinsperre"], countryCodes: ["AT"], regionOrCity: "Carinthia", latitude: 47.0808, longitude: 13.3394, category: "dam", status: "open", openingYear: 1979, summary: "Austria’s highest dam, a double-curvature arch structure in the Malta valley hydropower system.", officialUrl: "https://www.verbund.com/en-at/about-verbund/power-plants/our-power-plants/malta", wikipediaUrl: "https://en.wikipedia.org/wiki/K%C3%B6lnbrein_Dam", wikidataId: null, lengthMeters: 626, heightMeters: 200, mainSpanMeters: null, depthMeters: null, carries: "water" }),
  work({ id: "iron-gate-i-dam", name: "Iron Gate I Dam", aliases: ["Đerdap I", "Porțile de Fier I"], countryCodes: ["RO", "RS"], regionOrCity: "Danube, Iron Gates", latitude: 44.671, longitude: 22.529, category: "dam", status: "open", openingYear: 1972, summary: "A joint Romanian–Serbian navigation and hydroelectric complex across the Danube.", officialUrl: "https://www.hidroelectrica.ro/", wikipediaUrl: "https://en.wikipedia.org/wiki/Iron_Gate_I_Hydroelectric_Power_Station", wikidataId: null, lengthMeters: 1278, heightMeters: 60, mainSpanMeters: null, depthMeters: null, carries: "water" }),

  work({ id: "kieldrecht-lock", name: "Kieldrecht Lock", aliases: ["Kieldrechtsluis"], countryCodes: ["BE"], regionOrCity: "Port of Antwerp-Bruges", latitude: 51.2795, longitude: 4.2153, category: "canal_lock", status: "open", openingYear: 2016, summary: "A large sea lock connecting the Scheldt with the left-bank dock system at Antwerp.", officialUrl: "https://www.portofantwerpbruges.com/en/shipping/locks", wikipediaUrl: "https://en.wikipedia.org/wiki/Kieldrecht_Lock", wikidataId: null, lengthMeters: 500, heightMeters: null, mainSpanMeters: null, depthMeters: 17.8, carries: "water" }),
  work({ id: "berendrecht-lock", name: "Berendrecht Lock", aliases: ["Berendrechtsluis"], countryCodes: ["BE"], regionOrCity: "Port of Antwerp-Bruges", latitude: 51.344, longitude: 4.286, category: "canal_lock", status: "open", openingYear: 1989, summary: "A major sea lock giving large vessels access to Antwerp’s right-bank docks.", officialUrl: "https://www.portofantwerpbruges.com/en/shipping/locks", wikipediaUrl: "https://en.wikipedia.org/wiki/Berendrecht_Lock", wikidataId: null, lengthMeters: 500, heightMeters: null, mainSpanMeters: null, depthMeters: 13.5, carries: "water" }),
  work({ id: "ijmuiden-sea-lock", name: "IJmuiden Sea Lock", aliases: ["Zeesluis IJmuiden"], countryCodes: ["NL"], regionOrCity: "North Sea Canal, IJmuiden", latitude: 52.4688, longitude: 4.6207, category: "canal_lock", status: "open", openingYear: 2022, summary: "A very large maritime lock providing access between the North Sea and the Amsterdam port region.", officialUrl: "https://www.portofamsterdam.com/en/shipping/nautical-information/sea-lock-ijmuiden", wikipediaUrl: "https://en.wikipedia.org/wiki/IJmuiden_Sea_Lock", wikidataId: null, lengthMeters: 500, heightMeters: null, mainSpanMeters: null, depthMeters: 18, carries: "water" }),
  work({ id: "caen-hill-locks", name: "Caen Hill Locks", aliases: [], countryCodes: ["UK"], regionOrCity: "Devizes, Wiltshire", latitude: 51.3508, longitude: -2.0198, category: "canal_lock", status: "open", openingYear: 1810, summary: "A landmark flight of 29 locks lifting the Kennet and Avon Canal over Caen Hill.", officialUrl: "https://canalrivertrust.org.uk/things-to-do/places-to-visit/caen-hill-locks", wikipediaUrl: "https://en.wikipedia.org/wiki/Caen_Hill_Locks", wikidataId: null, lengthMeters: 3200, heightMeters: 72, mainSpanMeters: null, depthMeters: null, carries: "water" }),
] as const;

/** Operational civil-engineering POIs limited to EUIM scope. */
export const MAJOR_CIVIL_ENGINEERING_WORKS: readonly MajorCivilEngineeringWork[] =
  ALL_MAJOR_CIVIL_ENGINEERING_WORKS.filter(
    (item) =>
      item.countryCodes.some((code) => isCountryInEUIMScope(code)) &&
      isCoordinateInEUIMScope(item.longitude, item.latitude),
  );

const ALLOWED_COUNTRY_CODES = new Set<string>([...EUIM_COUNTRY_CODES]);

export type CivilEngineeringWorksValidationReport = {
  total: number;
  byCategory: Record<CivilEngineeringWorkCategory, number>;
  countryCodes: string[];
  errors: string[];
};

export function validateMajorCivilEngineeringWorks(
  works: readonly MajorCivilEngineeringWork[] = MAJOR_CIVIL_ENGINEERING_WORKS,
): CivilEngineeringWorksValidationReport {
  const errors: string[] = [];
  const ids = new Set<string>();
  const byCategory: Record<CivilEngineeringWorkCategory, number> = {
    bridge: 0,
    viaduct: 0,
    tunnel: 0,
    dam: 0,
    canal_lock: 0,
  };
  const countries = new Set<string>();

  for (const item of works) {
    if (ids.has(item.id)) errors.push(`duplicate_id:${item.id}`);
    ids.add(item.id);
    byCategory[item.category] += 1;
    if (!Number.isFinite(item.latitude) || item.latitude < -90 || item.latitude > 90) errors.push(`invalid_latitude:${item.id}`);
    if (!Number.isFinite(item.longitude) || item.longitude < -180 || item.longitude > 180) errors.push(`invalid_longitude:${item.id}`);
    if (!item.countryCodes.length) errors.push(`missing_country:${item.id}`);
    for (const code of item.countryCodes) {
      countries.add(code);
      if (
        !ALLOWED_COUNTRY_CODES.has(code) &&
        !item.countryCodes.some((c) => ALLOWED_COUNTRY_CODES.has(c))
      ) {
        errors.push(`country_out_of_scope:${item.id}:${code}`);
      }
    }
    for (const url of [item.officialUrl, item.wikipediaUrl]) {
      if (url && !url.startsWith("https://")) errors.push(`non_https_url:${item.id}`);
    }
    if (item.wikidataId && !/^Q[1-9]\d*$/.test(item.wikidataId)) errors.push(`invalid_qid:${item.id}`);
    if (item.openingYear != null && (item.openingYear < 1600 || item.openingYear > 2100)) errors.push(`implausible_opening_year:${item.id}`);
    for (const [field, value] of [
      ["length", item.lengthMeters],
      ["height", item.heightMeters],
      ["main_span", item.mainSpanMeters],
      ["depth", item.depthMeters],
    ] as const) {
      if (value != null && (!Number.isFinite(value) || value <= 0 || value > 100_000)) errors.push(`implausible_${field}:${item.id}`);
    }
  }

  return {
    total: works.length,
    byCategory,
    countryCodes: [...countries].sort(),
    errors,
  };
}

export function getMajorCivilEngineeringWorkById(
  id: string,
): MajorCivilEngineeringWork | null {
  return MAJOR_CIVIL_ENGINEERING_WORKS.find((item) => item.id === id) ?? null;
}
