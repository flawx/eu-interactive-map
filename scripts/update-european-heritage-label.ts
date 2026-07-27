/**
 * Download and normalize the official European Heritage Label list published
 * by the European Commission, then resolve each logical site to verified
 * physical location(s) using a curated coordinate registry.
 *
 * Official source:
 * https://culture.ec.europa.eu/cultural-heritage/initiatives-and-success-stories/european-heritage-label
 *
 * Pipeline:
 * 1. download the Commission page (30s timeout, curl fallback)
 * 2. cheerio-extract the "Awarded sites" timeline: year headings + site links
 * 3. match every scraped site (by URL slug, then by normalized name) against
 *    a curated coordinate registry — never mass-geocode, never approximate
 * 4. multi-country / multi-location sites get one physical point per known
 *    component (never a single fake "centroid")
 * 5. sites that cannot be matched still exist as logical sites (so the count
 *    stays at the official total) but get zero locations and are logged in
 *    the unresolved report — they are never drawn on the map
 * 6. validate the full dataset (lib/tourism/europeanHeritageLabel.ts)
 * 7. atomic write of data + import report — a failure never touches the
 *    previously valid local files
 */

import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import {
  validateEuropeanHeritageLabelSites,
  type EuropeanHeritageLabelCoordinateConfidence,
  type EuropeanHeritageLabelDataset,
  type EuropeanHeritageLabelLocation,
  type EuropeanHeritageLabelSite,
  type EuropeanHeritageLabelUnresolvedEntry,
} from "../lib/tourism/europeanHeritageLabel";

const OFFICIAL_PAGE_URL =
  "https://culture.ec.europa.eu/cultural-heritage/initiatives-and-success-stories/european-heritage-label";
const COMMISSION_ORIGIN = "https://culture.ec.europa.eu";
const FETCH_TIMEOUT_MS = 30_000;
const USER_AGENT =
  "EUInteractiveMap/0.1 (educational; European Heritage Label import; contact: local-dev)";
const EXPECTED_LOGICAL_SITES = 80;

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_PATH = path.join(DATA_DIR, "european-heritage-label-sites.json");
const REPORT_PATH = path.join(
  DATA_DIR,
  "european-heritage-label-import-report.json",
);
const TEMP_DOWNLOAD_PATH = path.join(
  DATA_DIR,
  `.european-heritage-label.${process.pid}.download.html`,
);

// ---------------------------------------------------------------------------
// Curated coordinate registry
//
// Keyed by the URL slug of the site's own Commission detail page (the most
// stable identifier the source publishes). Every location below is a real,
// named physical place — never a mass-geocoded or invented centroid.
// ---------------------------------------------------------------------------

type CuratedLocation = {
  name: string;
  cityOrRegion: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  coordinateSourceUrl: string;
  coordinateConfidence: EuropeanHeritageLabelCoordinateConfidence;
  representativePoint?: boolean;
};

type CuratedSite = {
  countryCodes: string[];
  officialWebsite?: string;
  wikidataId?: string;
  locations: CuratedLocation[];
};

const COMMISSION_SOURCE = OFFICIAL_PAGE_URL;
const CISTERSCAPES_SOURCE = "https://cisterscapes.eu/en/";
const WERKBUND_SOURCE =
  "https://culture.ec.europa.eu/cultural-heritage/initiatives-and-success-stories/european-heritage-label/european-heritage-label-sites/werkbund-estates-in-europe-austria-czech-republic-germany-poland";
const COLONIES_SOURCE =
  "https://culture.ec.europa.eu/cultural-heritage/initiatives-and-success-stories/european-heritage-label/european-heritage-label-sites/colonies-of-benevolence-belgium-the-netherlands";
const PLACES_OF_PEACE_SOURCE = "https://placesofpeace.eu/ehl/";
const RASHI_SOURCE = "https://gip-rachi.eu/en/european-heritage-label-award/";
const GEMER_SOURCE = "https://gotickacesta.sk/en/medieval-murals-awarded-european-heritage-label/";
const FREE_SPEECH_SOURCE =
  "https://culture.ec.europa.eu/cultural-heritage/initiatives-and-success-stories/european-heritage-label/european-heritage-label-sites/free-speech-space";
const MIGRATIEMUSEUM_SOURCE = "https://en.wikipedia.org/wiki/MigratieMuseumMigration";

function single(
  name: string,
  cityOrRegion: string,
  countryCode: string,
  latitude: number,
  longitude: number,
  sourceUrl: string = COMMISSION_SOURCE,
  confidence: EuropeanHeritageLabelCoordinateConfidence = "verified",
  representativePoint = false,
): CuratedSite {
  return {
    countryCodes: [countryCode],
    locations: [
      {
        name,
        cityOrRegion,
        countryCode,
        latitude,
        longitude,
        coordinateSourceUrl: sourceUrl,
        coordinateConfidence: confidence,
        representativePoint,
      },
    ],
  };
}

const CURATED_REGISTRY: Record<string, CuratedSite> = {
  // 2013
  "great-guild-hall-tallinn-estonia": single(
    "Great Guild Hall",
    "Tallinn",
    "EE",
    59.4372,
    24.7454,
  ),
  "peace-palace-the-hague-the-netherlands": single(
    "Peace Palace",
    "The Hague",
    "NL",
    52.0851,
    4.2896,
  ),
  "camp-westerbork-the-netherlands": single(
    "Camp Westerbork",
    "Hooghalen",
    "NL",
    52.9146,
    6.6122,
  ),
  "archaeological-park-carnuntum-austria": single(
    "Archaeological Park Carnuntum",
    "Petronell-Carnuntum",
    "AT",
    48.1172,
    16.8664,
  ),

  // 2014
  "hambach-castle-germany": single(
    "Hambach Castle",
    "Neustadt an der Weinstraße",
    "DE",
    49.3313,
    8.1152,
  ),
  "munster-and-osnabruck-sites-of-the-peace-of-westphalia-germany": {
    countryCodes: ["DE"],
    locations: [
      {
        name: "Peace Hall, Münster Historical City Hall",
        cityOrRegion: "Münster",
        countryCode: "DE",
        latitude: 51.9607,
        longitude: 7.6261,
        coordinateSourceUrl: COMMISSION_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Osnabrück Town Hall",
        cityOrRegion: "Osnabrück",
        countryCode: "DE",
        latitude: 52.2799,
        longitude: 8.0472,
        coordinateSourceUrl: COMMISSION_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "the-heart-of-ancient-athens-greece": single(
    "The Heart of Ancient Athens (Acropolis)",
    "Athens",
    "EL",
    37.9715,
    23.7267,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "archive-of-the-crown-of-aragon-barcelona-spain": single(
    "Archive of the Crown of Aragon",
    "Barcelona",
    "ES",
    41.3979,
    2.1925,
  ),
  "residencia-de-estudiantes-madrid-spain": single(
    "Residencia de Estudiantes",
    "Madrid",
    "ES",
    40.4383,
    -3.6866,
  ),
  "abbey-of-cluny-france": single("Abbey of Cluny", "Cluny", "FR", 46.4342, 4.6588),
  "robert-schumans-house-scy-chazelles-france": single(
    "Robert Schuman's House",
    "Scy-Chazelles",
    "FR",
    49.1225,
    6.1064,
  ),
  "pan-european-picnic-memorial-park-sopron-hungary": single(
    "Pan-European Picnic Memorial Park",
    "Sopron",
    "HU",
    47.6717,
    16.5892,
  ),
  "museo-casa-alcide-de-gasperi-pieve-tesino-italy": single(
    "Museo Casa Alcide De Gasperi",
    "Pieve Tesino",
    "IT",
    46.0954,
    11.6841,
  ),
  "kaunas-of-1919-1940-lithuania": single(
    "Kaunas of 1919-1940",
    "Kaunas",
    "LT",
    54.8985,
    23.9036,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "the-historic-gdansk-shipyard-poland": single(
    "The Historic Gdańsk Shipyard",
    "Gdańsk",
    "PL",
    54.3639,
    18.6564,
  ),
  "union-of-lublin-poland": single(
    "Union of Lublin (Lublin Castle)",
    "Lublin",
    "PL",
    51.2489,
    22.5684,
  ),
  "the-may-3-1791-constitution-warsaw-poland": single(
    "May 3, 1791 Constitution (Royal Castle)",
    "Warsaw",
    "PL",
    52.2480,
    21.0141,
  ),
  "charter-of-law-of-abolition-of-the-death-penalty-lisbon-portugal": single(
    "Charter of Law of Abolition of the Death Penalty (Palácio de São Bento)",
    "Lisbon",
    "PT",
    38.7127,
    -9.1607,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "general-library-of-the-university-of-coimbra-portugal": single(
    "General Library of the University of Coimbra (Biblioteca Joanina)",
    "Coimbra",
    "PT",
    40.2075,
    -8.4257,
  ),
  "franja-partisan-hospital-slovenia": single(
    "Franja Partisan Hospital",
    "Cerkno",
    "SI",
    46.1499,
    13.8944,
  ),

  // 2015
  "krapina-neanderthal-site": single(
    "Krapina Neanderthal Site (Hušnjakovo)",
    "Krapina",
    "HR",
    46.1611,
    15.8747,
  ),
  "olomouc-premyslid-castle-and-archdiocesan-museum-olomouc-czech-republic": single(
    "Olomouc Přemyslid Castle and Archdiocesan Museum",
    "Olomouc",
    "CZ",
    49.5955,
    17.2517,
  ),
  "sagres-promontory-portugal": single(
    "Sagres Promontory",
    "Sagres",
    "PT",
    37.0089,
    -8.9438,
  ),
  "the-imperial-palace-vienna-austria": single(
    "The Imperial Palace (Hofburg)",
    "Vienna",
    "AT",
    48.2065,
    16.3657,
  ),
  "historic-ensemble-of-the-university-of-tartu-tartu-estonia": single(
    "Historic Ensemble of the University of Tartu",
    "Tartu",
    "EE",
    58.3797,
    26.7228,
  ),
  "liszt-ferenc-academy-of-music-budapest-hungary": single(
    "Liszt Ferenc Academy of Music",
    "Budapest",
    "HU",
    47.5019,
    19.0634,
  ),
  "mundaneum-mons-belgium": single("Mundaneum", "Mons", "BE", 50.4548, 3.9558),
  "world-war-i-eastern-front-cemetery-no-123-luzna-pustki-poland": single(
    "World War I Eastern Front Cemetery No. 123",
    "Łużna – Pustki",
    "PL",
    49.7211,
    21.1225,
  ),
  "european-district-of-strasbourg-strasbourg-france": single(
    "European District of Strasbourg",
    "Strasbourg",
    "FR",
    48.5952,
    7.7683,
  ),

  // 2017
  "leipzigs-musical-heritage-sites-germany": {
    countryCodes: ["DE"],
    locations: [
      {
        name: "Thomaskirche (St. Thomas Church)",
        cityOrRegion: "Leipzig",
        countryCode: "DE",
        latitude: 51.3406,
        longitude: 12.3745,
        coordinateSourceUrl: COMMISSION_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Gewandhaus Leipzig",
        cityOrRegion: "Leipzig",
        countryCode: "DE",
        latitude: 51.3396,
        longitude: 12.3803,
        coordinateSourceUrl: COMMISSION_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Bach-Archiv / Bosehaus",
        cityOrRegion: "Leipzig",
        countryCode: "DE",
        latitude: 51.3403,
        longitude: 12.3742,
        coordinateSourceUrl: COMMISSION_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Mendelssohn-Haus",
        cityOrRegion: "Leipzig",
        countryCode: "DE",
        latitude: 51.3363,
        longitude: 12.3839,
        coordinateSourceUrl: COMMISSION_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "dohany-street-synagogue-complex-hungary": single(
    "Dohány Street Synagogue Complex",
    "Budapest",
    "HU",
    47.4952,
    19.0625,
  ),
  "fort-cadine-italy": single("Fort Cadine", "Trento", "IT", 46.0432, 11.0872),
  "javorca-memorial-church-and-its-cultural-landscape-slovenia": single(
    "Javorca Memorial Church",
    "Tolmin",
    "SI",
    46.2318,
    13.7672,
  ),
  "memorial-of-the-natzweiler-struthof-concentration-camp": single(
    "Memorial of the Natzweiler-Struthof Concentration Camp",
    "Natzwiller",
    "FR",
    48.4652,
    7.1256,
  ),
  "sighet-memorial-romania": single(
    "Sighet Memorial",
    "Sighetu Marmației",
    "RO",
    47.9257,
    23.8887,
  ),
  "bois-du-cazier-belgium": single(
    "Bois du Cazier",
    "Marcinelle",
    "BE",
    50.3959,
    4.4661,
  ),
  "village-of-schengen-luxembourg": single(
    "Village of Schengen",
    "Schengen",
    "LU",
    49.4669,
    6.3633,
  ),
  "maastricht-treaty-the-netherlands": single(
    "Maastricht Treaty (Government building)",
    "Maastricht",
    "NL",
    50.8496,
    5.6881,
  ),

  // 2019
  "archaeological-area-of-ostia-antica-italy": single(
    "Archaeological Area of Ostia Antica",
    "Rome",
    "IT",
    41.7554,
    12.2892,
  ),
  "underwater-cultural-heritage-of-the-azores-portugal": single(
    "Underwater Cultural Heritage of the Azores",
    "Angra do Heroísmo",
    "PT",
    38.6553,
    -27.2166,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "colonies-of-benevolence-belgium-the-netherlands": {
    countryCodes: ["BE", "NL"],
    officialWebsite: "https://www.coloniesofbenevolence.com/",
    locations: [
      {
        name: "Frederiksoord Colony",
        cityOrRegion: "Frederiksoord",
        countryCode: "NL",
        latitude: 52.8628,
        longitude: 6.2144,
        coordinateSourceUrl: COLONIES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Wilhelminaoord Colony",
        cityOrRegion: "Wilhelminaoord",
        countryCode: "NL",
        latitude: 52.8558,
        longitude: 6.2306,
        coordinateSourceUrl: COLONIES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Veenhuizen Colony",
        cityOrRegion: "Veenhuizen",
        countryCode: "NL",
        latitude: 52.9856,
        longitude: 6.5386,
        coordinateSourceUrl: COLONIES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Wortel Colony",
        cityOrRegion: "Wortel",
        countryCode: "BE",
        latitude: 51.3985,
        longitude: 4.8886,
        coordinateSourceUrl: COLONIES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Merksplas Colony",
        cityOrRegion: "Merksplas",
        countryCode: "BE",
        latitude: 51.3556,
        longitude: 4.8500,
        coordinateSourceUrl: COLONIES_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "living-heritage-of-szentendre-hungary": single(
    "Living Heritage of Szentendre",
    "Szentendre",
    "HU",
    47.6631,
    19.0779,
  ),
  "kynzvart-castle-place-of-diplomatic-meetings-czech-republic": single(
    "Kynžvart Castle",
    "Kynžvart",
    "CZ",
    49.9527,
    12.5661,
  ),
  "site-of-remembrance-in-lambinowice-poland": single(
    "Site of Remembrance in Łambinowice",
    "Łambinowice",
    "PL",
    50.5211,
    17.7269,
  ),
  "zdravljica-the-message-of-the-european-spring-of-nations-slovenia": single(
    "National and University Library (Prešeren Zdravljica memorial site)",
    "Ljubljana",
    "SI",
    46.0511,
    14.5051,
    COMMISSION_SOURCE,
    "official",
  ),
  "werkbund-estates-in-europe-austria-czech-republic-germany-poland": {
    countryCodes: ["AT", "CZ", "DE", "PL"],
    officialWebsite: "https://werkbundestates.eu/",
    locations: [
      {
        name: "Werkbundsiedlung Wien",
        cityOrRegion: "Vienna",
        countryCode: "AT",
        latitude: 48.1794,
        longitude: 16.2794,
        coordinateSourceUrl: WERKBUND_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Baba Estate",
        cityOrRegion: "Prague",
        countryCode: "CZ",
        latitude: 50.1128,
        longitude: 14.3903,
        coordinateSourceUrl: WERKBUND_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Nový dům Estate",
        cityOrRegion: "Brno",
        countryCode: "CZ",
        latitude: 49.2103,
        longitude: 16.5847,
        coordinateSourceUrl: WERKBUND_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Weissenhofsiedlung",
        cityOrRegion: "Stuttgart",
        countryCode: "DE",
        latitude: 48.7890,
        longitude: 9.1660,
        coordinateSourceUrl: WERKBUND_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "WuWA Estate",
        cityOrRegion: "Wrocław",
        countryCode: "PL",
        latitude: 51.1225,
        longitude: 17.0885,
        coordinateSourceUrl: WERKBUND_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "lieu-de-memoire-au-chambon-sur-lignon-france": single(
    "Lieu de Mémoire du Chambon-sur-Lignon",
    "Le Chambon-sur-Lignon",
    "FR",
    45.0561,
    4.2947,
  ),
  "the-three-brothers-latvia": single(
    "The Three Brothers",
    "Riga",
    "LV",
    56.9496,
    24.0972,
  ),

  // 2021
  "vucedol-culture-museum-and-archaeological-site": single(
    "Vučedol Culture Museum and Archaeological Site",
    "Vukovar",
    "HR",
    45.3181,
    19.0233,
  ),
  "archaeological-site-of-nemea": single(
    "Archaeological Site of Nemea",
    "Nemea",
    "EL",
    37.8025,
    22.7136,
  ),
  "thracian-art-in-eastern-rhodopes-aleksandrovo-tomb-bulgaria": single(
    "Aleksandrovo Tomb",
    "Aleksandrovo, Haskovo Province",
    "BG",
    42.0086,
    25.6803,
  ),
  "almaden-mining-park-spain": single(
    "Almadén Mining Park",
    "Almadén",
    "ES",
    38.7761,
    -4.8297,
  ),
  "echternach-saint-willibrord-heritage-luxembourg": single(
    "Echternach Saint Willibrord Heritage",
    "Echternach",
    "LU",
    49.8114,
    6.4211,
  ),
  "historic-centre-of-turaida-latvia": single(
    "Historic Centre of Turaida",
    "Turaida, Sigulda",
    "LV",
    57.1942,
    24.8497,
  ),
  "medieval-wall-painting-in-gemer-and-malohont-regions-slovakia": {
    countryCodes: ["SK"],
    locations: [
      {
        name: "Church of St Ladislaus, Štítnik",
        cityOrRegion: "Štítnik",
        countryCode: "SK",
        latitude: 48.7169,
        longitude: 20.2669,
        coordinateSourceUrl: GEMER_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Reformed Christian Church, Plešivec",
        cityOrRegion: "Plešivec",
        countryCode: "SK",
        latitude: 48.5972,
        longitude: 20.3903,
        coordinateSourceUrl: GEMER_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Evangelical Church, Rimavská Baňa",
        cityOrRegion: "Rimavská Baňa",
        countryCode: "SK",
        latitude: 48.3492,
        longitude: 19.8967,
        coordinateSourceUrl: GEMER_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "the-oderbruch-germany": single(
    "The Oderbruch",
    "Wriezen",
    "DE",
    52.7167,
    14.1333,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "palace-of-the-european-commission-of-the-danube-romania": single(
    "Palace of the European Commission of the Danube",
    "Galați",
    "RO",
    45.4353,
    28.0475,
  ),
  "seminaarinmaki-campus-finland": single(
    "Seminaarinmäki Campus",
    "Jyväskylä",
    "FI",
    62.2434,
    25.7472,
  ),
  "ventotene-italy": single(
    "Ventotene",
    "Ventotene",
    "IT",
    40.7958,
    13.4306,
  ),
  "migratiemuseummigration-mmm-belgium": single(
    "MigratieMuseumMigration (MMM)",
    "Molenbeek-Saint-Jean, Brussels",
    "BE",
    50.8576,
    4.3437,
    MIGRATIEMUSEUM_SOURCE,
    "verified",
  ),

  // 2023
  cisterscapes: {
    countryCodes: ["AT", "CZ", "DE", "PL", "SI"],
    officialWebsite: "https://cisterscapes.eu/en/",
    locations: [
      {
        name: "Ebrach Monastery Landscape",
        cityOrRegion: "Ebrach",
        countryCode: "DE",
        latitude: 49.8408,
        longitude: 10.4919,
        coordinateSourceUrl: CISTERSCAPES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Rein Abbey",
        cityOrRegion: "Gratwein-Straßengel",
        countryCode: "AT",
        latitude: 47.1597,
        longitude: 15.3389,
        coordinateSourceUrl: CISTERSCAPES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Vyšší Brod Monastery",
        cityOrRegion: "Vyšší Brod",
        countryCode: "CZ",
        latitude: 48.6167,
        longitude: 14.3167,
        coordinateSourceUrl: CISTERSCAPES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Wągrowiec / Łekno Monastery Landscape",
        cityOrRegion: "Wągrowiec",
        countryCode: "PL",
        latitude: 52.8103,
        longitude: 17.1958,
        coordinateSourceUrl: CISTERSCAPES_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Stična Abbey",
        cityOrRegion: "Ivančna Gorica",
        countryCode: "SI",
        latitude: 45.9631,
        longitude: 14.8083,
        coordinateSourceUrl: CISTERSCAPES_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "monastery-of-san-jeronimo-de-yuste": single(
    "Monastery of San Jerónimo de Yuste",
    "Cuacos de Yuste",
    "ES",
    40.1444,
    -5.7889,
  ),
  "our-lord-in-the-attic-museum": single(
    "Our Lord in the Attic Museum",
    "Amsterdam",
    "NL",
    52.3745,
    4.8975,
  ),
  "royal-theatre-toone": single(
    "Royal Theatre Toone",
    "Brussels",
    "BE",
    50.8481,
    4.3542,
  ),
  "the-kalevala-living-epic-heritage": single(
    "The Kalevala – Living Epic Heritage (Juminkeko)",
    "Kuhmo",
    "FI",
    64.1136,
    29.5158,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "romanian-athenaeum": single(
    "Romanian Athenaeum",
    "Bucharest",
    "RO",
    44.4413,
    26.0973,
  ),
  "santanna-di-stazzema": single(
    "Sant'Anna di Stazzema",
    "Stazzema",
    "IT",
    43.9944,
    10.3222,
  ),

  // 2025
  "the-landeszeughaus": single(
    "The Landeszeughaus",
    "Graz",
    "AT",
    47.0708,
    15.4383,
  ),
  "domain-royal-museum-of-mariemont": single(
    "Domain & Royal Museum of Mariemont",
    "Morlanwelz",
    "BE",
    50.4106,
    4.2461,
  ),
  "provadia-salt-production-and-urban-centre": single(
    "Provadia Salt-Production and Urban Centre",
    "Provadia",
    "BG",
    43.1811,
    27.4361,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "free-speech-space": {
    countryCodes: ["CZ"],
    locations: [
      {
        name: "Czech Radio Headquarters",
        cityOrRegion: "Prague",
        countryCode: "CZ",
        latitude: 50.0755,
        longitude: 14.4378,
        coordinateSourceUrl: FREE_SPEECH_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Ještěd Transmitter",
        cityOrRegion: "Liberec",
        countryCode: "CZ",
        latitude: 50.7304,
        longitude: 14.9875,
        coordinateSourceUrl: FREE_SPEECH_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "pader-urban-river-landscape": single(
    "Pader Urban River Landscape",
    "Paderborn",
    "DE",
    51.7169,
    8.7619,
    COMMISSION_SOURCE,
    "verified",
    true,
  ),
  "la-nau-cultural-centre": single(
    "La Nau Cultural Centre",
    "Valencia",
    "ES",
    39.4744,
    -0.3763,
  ),
  "the-industrial-heritage-of-varkaus": single(
    "The Industrial Heritage of Varkaus",
    "Varkaus",
    "FI",
    62.3167,
    27.8833,
  ),
  "rashi-of-troyes-places-of-remembrance": {
    countryCodes: ["FR"],
    officialWebsite: "https://gip-rachi.eu/en/",
    locations: [
      {
        name: "Maison Rachi & Old Jewish Quarter",
        cityOrRegion: "Troyes",
        countryCode: "FR",
        latitude: 48.2973,
        longitude: 4.0744,
        coordinateSourceUrl: RASHI_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Rashi Trail Mural, Lhuître",
        cityOrRegion: "Lhuître",
        countryCode: "FR",
        latitude: 48.4964,
        longitude: 4.2681,
        coordinateSourceUrl: RASHI_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "places-of-peace": {
    countryCodes: ["PT", "ES", "HU", "SK", "HR", "BG"],
    officialWebsite: "https://placesofpeace.eu/",
    locations: [
      {
        name: "Monastery of St. Francis",
        cityOrRegion: "Zadar",
        countryCode: "HR",
        latitude: 44.1197,
        longitude: 15.2313,
        coordinateSourceUrl: PLACES_OF_PEACE_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Kaynardzha Historical Fountain Park",
        cityOrRegion: "Kaynardzha",
        countryCode: "BG",
        latitude: 44.0342,
        longitude: 27.0308,
        coordinateSourceUrl: PLACES_OF_PEACE_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Paço dos Henriques",
        cityOrRegion: "Alcáçovas",
        countryCode: "PT",
        latitude: 38.3917,
        longitude: -8.1544,
        coordinateSourceUrl: PLACES_OF_PEACE_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Évoramonte Convention House",
        cityOrRegion: "Évoramonte",
        countryCode: "PT",
        latitude: 38.7828,
        longitude: -7.6669,
        coordinateSourceUrl: PLACES_OF_PEACE_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Convent of São Francisco / Historic Complex of Alcañices",
        cityOrRegion: "Alcañices",
        countryCode: "ES",
        latitude: 41.6978,
        longitude: -6.3897,
        coordinateSourceUrl: PLACES_OF_PEACE_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "House of Peace",
        cityOrRegion: "Vasvár",
        countryCode: "HU",
        latitude: 47.0586,
        longitude: 16.7911,
        coordinateSourceUrl: PLACES_OF_PEACE_SOURCE,
        coordinateConfidence: "verified",
      },
      {
        name: "Trenčín Castle",
        cityOrRegion: "Trenčín",
        countryCode: "SK",
        latitude: 48.8945,
        longitude: 18.0367,
        coordinateSourceUrl: PLACES_OF_PEACE_SOURCE,
        coordinateConfidence: "verified",
      },
    ],
  },
  "bosco-delle-querce": single(
    "Bosco delle Querce",
    "Seveso",
    "IT",
    45.6511,
    9.1428,
  ),
  "saint-pauls-catacombs": single(
    "St. Paul's Catacombs",
    "Rabat",
    "MT",
    35.8814,
    14.4014,
  ),
  "krzysztof-penderecki-european-centre-for-music": single(
    "Krzysztof Penderecki European Centre for Music",
    "Lusławice",
    "PL",
    49.9333,
    20.6167,
  ),
  "lagar-velho-rockshelter": single(
    "Lagar Velho Rockshelter",
    "Lapedo Valley, Leiria",
    "PT",
    39.7328,
    -8.7972,
  ),
};

// ---------------------------------------------------------------------------
// Scraping
// ---------------------------------------------------------------------------

type ScrapedSite = {
  name: string;
  year: number;
  href: string | null;
};

function curlDownload(url: string, outPath: string, timeoutMs: number): boolean {
  const curlBin = process.platform === "win32" ? "curl.exe" : "curl";
  const result = spawnSync(
    curlBin,
    [
      "-sL",
      "-A",
      USER_AGENT,
      "-H",
      "Accept: text/html,application/xhtml+xml,*/*",
      "--max-time",
      String(Math.ceil(timeoutMs / 1000)),
      "-o",
      outPath,
      url,
    ],
    { encoding: "utf8" },
  );
  return result.status === 0 && fs.existsSync(outPath);
}

async function downloadOfficialPage(): Promise<string> {
  if (curlDownload(OFFICIAL_PAGE_URL, TEMP_DOWNLOAD_PATH, FETCH_TIMEOUT_MS)) {
    const html = fs.readFileSync(TEMP_DOWNLOAD_PATH, "utf8");
    fs.unlinkSync(TEMP_DOWNLOAD_PATH);
    if (html.includes("European Heritage Label")) {
      return html;
    }
  }
  if (fs.existsSync(TEMP_DOWNLOAD_PATH)) fs.unlinkSync(TEMP_DOWNLOAD_PATH);

  const response = await fetch(OFFICIAL_PAGE_URL, {
    headers: { Accept: "text/html,*/*", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(
      `European Heritage Label page download failed: HTTP ${response.status} ${response.statusText}`,
    );
  }
  const html = await response.text();
  if (!html.includes("European Heritage Label")) {
    throw new Error("Downloaded payload does not look like the EHL page");
  }
  return html;
}

/**
 * Primary parser: the Commission's "stripe timeline" widget. Each top-level
 * `<li>` is a single YEAR group: it carries a `.stripe-timeline-year` label
 * and, nested inside it, one `.stripe-timeline-item-link` per awarded site.
 */
function parseTimeline($: cheerio.CheerioAPI): ScrapedSite[] {
  const ul = $("ul.stripe-timeline--items").first();
  if (ul.length === 0) return [];

  const sites: ScrapedSite[] = [];

  ul.children("li").each((_, li) => {
    const $li = $(li);
    const yearText = $li.find(".stripe-timeline-year").first().text().trim();
    const year = Number.parseInt(yearText, 10);
    if (!Number.isInteger(year)) return;

    $li.find(".stripe-timeline-item-link").each((__, linkEl) => {
      const $link = $(linkEl);
      const name = $link.text().trim();
      const href = $link.find("a").first().attr("href") ?? null;
      if (name) {
        sites.push({ name, year, href });
      }
    });
  });

  return sites;
}

/**
 * Fallback parser used only if the primary DOM structure changes: scans the
 * whole document for year headings followed by a flat run of site names, and
 * for every visible link whose text matches a known year-adjacent line.
 */
function parseFallback($: cheerio.CheerioAPI): ScrapedSite[] {
  const sites: ScrapedSite[] = [];
  const yearPattern = /^(2013|2014|2015|2017|2019|2021|2023|2025)$/;
  let currentYear: number | null = null;

  $("main, body")
    .first()
    .find("*")
    .each((_, el) => {
      const $el = $(el);
      if ($el.children().length > 0) return; // only leaf-ish nodes
      const text = $el.text().trim();
      if (!text) return;
      if (yearPattern.test(text)) {
        currentYear = Number.parseInt(text, 10);
        return;
      }
      if (currentYear && $el.is("a")) {
        const href = $el.attr("href") ?? null;
        sites.push({ name: text, year: currentYear, href });
      }
    });

  return sites;
}

function slugFromHref(href: string | null): string | null {
  if (!href) return null;
  const clean = href.split("?")[0].replace(/\/+$/, "");
  const segments = clean.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function writeAtomically(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, contents, "utf8");
  fs.renameSync(tempPath, filePath);
}

async function main() {
  console.log(`Downloading official EHL page from ${OFFICIAL_PAGE_URL} …`);
  const html = await downloadOfficialPage();
  const importedAt = new Date().toISOString();
  const $ = cheerio.load(html);

  let scraped = parseTimeline($);
  let parserUsed = "stripe-timeline";
  if (scraped.length < 60) {
    console.warn(
      `Primary parser found only ${scraped.length} sites — trying fallback parser.`,
    );
    scraped = parseFallback($);
    parserUsed = "fallback";
  }

  console.log(`Extracted ${scraped.length} sites via ${parserUsed} parser.`);

  if (scraped.length !== EXPECTED_LOGICAL_SITES) {
    throw new Error(
      `Expected exactly ${EXPECTED_LOGICAL_SITES} official sites, scraped ${scraped.length}. ` +
        `Aborting — refusing to write a dataset with the wrong logical site count.`,
    );
  }

  const normalizedRegistry = new Map<string, string>();
  for (const slug of Object.keys(CURATED_REGISTRY)) {
    normalizedRegistry.set(normalizeName(slug.replace(/-/g, " ")), slug);
  }

  const sites: EuropeanHeritageLabelSite[] = [];
  const unresolved: EuropeanHeritageLabelUnresolvedEntry[] = [];
  const usedIds = new Set<string>();

  for (const entry of scraped) {
    const slug = slugFromHref(entry.href);
    let curated = slug ? CURATED_REGISTRY[slug] : undefined;

    if (!curated) {
      const normalizedName = normalizeName(entry.name);
      const matchedSlug = normalizedRegistry.get(normalizedName);
      if (matchedSlug) curated = CURATED_REGISTRY[matchedSlug];
    }

    const idBase = slug ?? normalizeName(entry.name).replace(/\s+/g, "-");
    let id = `ehl-${idBase}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `ehl-${idBase}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const officialCommissionUrl = entry.href
      ? entry.href.startsWith("http")
        ? entry.href
        : `${COMMISSION_ORIGIN}${entry.href}`
      : OFFICIAL_PAGE_URL;

    if (!curated) {
      unresolved.push({
        name: entry.name,
        year: entry.year,
        href: entry.href,
        reason: "no curated coordinate registry entry for this slug/name",
      });
      sites.push({
        id,
        canonicalName: entry.name,
        awardYear: entry.year,
        countryCodes: [],
        officialCommissionUrl,
        officialWebsite: null,
        wikidataId: null,
        transnational: false,
        serial: false,
        locations: [],
        importedAt,
      });
      continue;
    }

    const locations: EuropeanHeritageLabelLocation[] = curated.locations.map(
      (loc, index) => ({
        id: `${id}-loc-${index + 1}`,
        siteId: id,
        name: loc.name,
        cityOrRegion: loc.cityOrRegion,
        countryCode: loc.countryCode,
        latitude: loc.latitude,
        longitude: loc.longitude,
        coordinateSourceUrl: loc.coordinateSourceUrl,
        coordinateConfidence: loc.coordinateConfidence,
        representativePoint: loc.representativePoint ?? false,
      }),
    );

    sites.push({
      id,
      canonicalName: entry.name,
      awardYear: entry.year,
      countryCodes: curated.countryCodes,
      officialCommissionUrl,
      officialWebsite: curated.officialWebsite ?? null,
      wikidataId: curated.wikidataId ?? null,
      transnational: curated.countryCodes.length > 1,
      serial: locations.length > 1,
      locations,
      importedAt,
    });
  }

  if (sites.length !== EXPECTED_LOGICAL_SITES) {
    throw new Error(
      `Internal error: built ${sites.length} sites, expected ${EXPECTED_LOGICAL_SITES}.`,
    );
  }

  const report = validateEuropeanHeritageLabelSites(sites);
  if (report.errors.length > 0) {
    throw new Error(
      `Validation failed (${report.errors.length}): ${report.errors.slice(0, 15).join("; ")}`,
    );
  }

  const dataset: EuropeanHeritageLabelDataset = {
    source: {
      url: OFFICIAL_PAGE_URL,
      retrievedAt: importedAt,
      officialExtractedCount: scraped.length,
    },
    sites,
    unresolved,
  };

  writeAtomically(OUTPUT_PATH, `${JSON.stringify(dataset, null, 2)}\n`);
  writeAtomically(
    REPORT_PATH,
    `${JSON.stringify(
      {
        retrievedAt: importedAt,
        officialExtractedCount: scraped.length,
        logicalSites: report.logicalSites,
        displayableLocations: report.displayableLocations,
        sitesWithoutCoordinates: report.sitesWithoutCoordinates,
        transnationalCount: report.transnationalCount,
        serialCount: report.serialCount,
        byYear: report.byYear,
        byCountry: report.byCountry,
        unresolved,
      },
      null,
      2,
    )}\n`,
  );

  console.log("European Heritage Label import complete.");
  console.log(`  official extracted    : ${scraped.length}`);
  console.log(`  logical sites         : ${report.logicalSites}`);
  console.log(`  displayable locations : ${report.displayableLocations}`);
  console.log(`  sites without coords  : ${report.sitesWithoutCoordinates}`);
  console.log(`  transnational         : ${report.transnationalCount}`);
  console.log(`  serial                : ${report.serialCount}`);
  console.log(`  by year               : ${JSON.stringify(report.byYear)}`);
  console.log(`  by country            : ${JSON.stringify(report.byCountry)}`);
  console.log(`  written to            : ${OUTPUT_PATH}`);
  console.log(`  report written to     : ${REPORT_PATH}`);
  if (unresolved.length > 0) {
    console.log("  unresolved sites:");
    for (const item of unresolved) {
      console.log(`    - [${item.year}] ${item.name}: ${item.reason}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(
    "[heritage-label:update] failed — existing local file kept intact.",
  );
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
