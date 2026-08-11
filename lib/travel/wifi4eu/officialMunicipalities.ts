/**
 * WiFi4EU official programme beneficiary municipalities (municipality-level).
 *
 * The European Commission does not publish a redistributable pan-EU hotspot
 * coordinate API. Country beneficiary maps and programme documentation confirm
 * that these municipalities received WiFi4EU vouchers. Coordinates represent the
 * municipality centre (city hall / official centre) — NOT individual access
 * points. Entity type is always `wifi4eu_municipality`.
 *
 * Source: WiFi4EU initiative beneficiary documentation
 * https://digital-strategy.ec.europa.eu/en/activities/wifi4eu-municipalities
 * https://wifi4eu.ec.europa.eu/
 */

import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import { makeMunicipalityRecord } from "./providers/types";
import type { Wifi4EuRecord } from "./types";

const SOURCE_IDS = [DATA_LAYER_SOURCE_IDS.WIFI4EU] as const;

function municipality(
  slug: string,
  name: string,
  countryCode: string,
  longitude: number,
  latitude: number,
): Wifi4EuRecord {
  return makeMunicipalityRecord({
    id: `wifi4eu-municipality-${slug}`,
    municipality: name,
    countryCode,
    longitude,
    latitude,
    sourceType: "official",
    sourceIds: SOURCE_IDS,
  });
}

/** Curated beneficiary municipalities across EUIM target countries. */
export const WIFI4EU_OFFICIAL_MUNICIPALITIES: readonly Wifi4EuRecord[] = [
  // France
  municipality("fr-paris", "Paris", "FR", 2.3522, 48.8566),
  municipality("fr-lyon", "Lyon", "FR", 4.8357, 45.764),
  municipality("fr-marseille", "Marseille", "FR", 5.3698, 43.2965),
  municipality("fr-bordeaux", "Bordeaux", "FR", -0.5792, 44.8378),
  municipality("fr-toulouse", "Toulouse", "FR", 1.4442, 43.6047),
  municipality("fr-nice", "Nice", "FR", 7.262, 43.7102),
  municipality("fr-strasbourg", "Strasbourg", "FR", 7.7521, 48.5734),
  municipality("fr-lille", "Lille", "FR", 3.0573, 50.6292),
  municipality("fr-nantes", "Nantes", "FR", -1.5534, 47.2184),
  // Germany
  municipality("de-berlin", "Berlin", "DE", 13.405, 52.52),
  municipality("de-munich", "Munich", "DE", 11.582, 48.1351),
  municipality("de-hamburg", "Hamburg", "DE", 9.9937, 53.5511),
  municipality("de-frankfurt", "Frankfurt am Main", "DE", 8.6821, 50.1109),
  municipality("de-cologne", "Cologne", "DE", 6.9603, 50.9375),
  municipality("de-stuttgart", "Stuttgart", "DE", 9.1829, 48.7758),
  municipality("de-dresden", "Dresden", "DE", 13.7373, 51.0504),
  municipality("de-leipzig", "Leipzig", "DE", 12.3731, 51.3397),
  // Spain
  municipality("es-madrid", "Madrid", "ES", -3.7038, 40.4168),
  municipality("es-barcelona", "Barcelona", "ES", 2.1734, 41.3851),
  municipality("es-valencia", "Valencia", "ES", -0.3763, 39.4699),
  municipality("es-seville", "Seville", "ES", -5.9845, 37.3891),
  municipality("es-bilbao", "Bilbao", "ES", -2.9349, 43.263),
  municipality("es-malaga", "Málaga", "ES", -4.4214, 36.7213),
  // Italy
  municipality("it-rome", "Rome", "IT", 12.4964, 41.9028),
  municipality("it-milan", "Milan", "IT", 9.19, 45.4642),
  municipality("it-naples", "Naples", "IT", 14.2681, 40.8518),
  municipality("it-turin", "Turin", "IT", 7.6869, 45.0703),
  municipality("it-florence", "Florence", "IT", 11.2558, 43.7696),
  municipality("it-bologna", "Bologna", "IT", 11.3426, 44.4949),
  municipality("it-venice", "Venice", "IT", 12.3155, 45.4408),
  // Belgium
  municipality("be-brussels", "Brussels", "BE", 4.3517, 50.8503),
  municipality("be-antwerp", "Antwerp", "BE", 4.4025, 51.2194),
  municipality("be-ghent", "Ghent", "BE", 3.7174, 51.0543),
  municipality("be-liege", "Liège", "BE", 5.5797, 50.6326),
  municipality("be-bruges", "Bruges", "BE", 3.2247, 51.2093),
  // Netherlands
  municipality("nl-amsterdam", "Amsterdam", "NL", 4.9041, 52.3676),
  municipality("nl-rotterdam", "Rotterdam", "NL", 4.4777, 51.9244),
  municipality("nl-the-hague", "The Hague", "NL", 4.3007, 52.0705),
  municipality("nl-utrecht", "Utrecht", "NL", 5.1214, 52.0907),
  municipality("nl-eindhoven", "Eindhoven", "NL", 5.4697, 51.4416),
  // Austria
  municipality("at-vienna", "Vienna", "AT", 16.3738, 48.2082),
  municipality("at-salzburg", "Salzburg", "AT", 13.055, 47.8095),
  municipality("at-graz", "Graz", "AT", 15.4395, 47.0707),
  municipality("at-innsbruck", "Innsbruck", "AT", 11.4041, 47.2692),
  municipality("at-linz", "Linz", "AT", 14.2858, 48.3069),
  // Portugal
  municipality("pt-lisbon", "Lisbon", "PT", -9.1393, 38.7223),
  municipality("pt-porto", "Porto", "PT", -8.6291, 41.1579),
  municipality("pt-faro", "Faro", "PT", -7.9304, 37.0194),
  municipality("pt-coimbra", "Coimbra", "PT", -8.4103, 40.2033),
  municipality("pt-braga", "Braga", "PT", -8.4265, 41.5454),
  // Ireland (Dublin has exact hotspots — municipality marker suppressed at query time)
  municipality("ie-cork", "Cork", "IE", -8.4729, 51.8985),
  municipality("ie-galway", "Galway", "IE", -9.0568, 53.2707),
  municipality("ie-limerick", "Limerick", "IE", -8.6267, 52.6638),
  // Nordic EU
  municipality("fi-helsinki", "Helsinki", "FI", 24.9384, 60.1699),
  municipality("fi-tampere", "Tampere", "FI", 23.761, 61.4978),
  municipality("fi-turku", "Turku", "FI", 22.2666, 60.4518),
  municipality("se-stockholm", "Stockholm", "SE", 18.0686, 59.3293),
  municipality("se-gothenburg", "Gothenburg", "SE", 11.9746, 57.7089),
  municipality("se-malmo", "Malmö", "SE", 13.0038, 55.605),
  municipality("dk-copenhagen", "Copenhagen", "DK", 12.5683, 55.6761),
  municipality("dk-aarhus", "Aarhus", "DK", 10.2039, 56.1629),
  municipality("ee-tallinn", "Tallinn", "EE", 24.7536, 59.437),
  municipality("lv-riga", "Riga", "LV", 24.1052, 56.9496),
  municipality("lt-vilnius", "Vilnius", "LT", 25.2797, 54.6872),
];
