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
import { mountainTranslations } from "./mountainTranslations";
import { civilEngineeringTranslations } from "./civilEngineeringTranslations";
import { alertTranslations } from "./alertTranslations";

export function getMessages(locale: Locale): Messages {
  const localized = rawMessages[locale] as Partial<Messages> & typeof en;
  const mountain = mountainTranslations[locale];
  const civil = civilEngineeringTranslations[locale];
  const alerts = alertTranslations[locale];
  return {
    ...en,
    ...localized,
    legend: {
      ...en.legend,
      ...localized.legend,
      europeanMountainPlaces: mountain.layer,
      europeanMountainPlacesDescription: mountain.group,
      mountainSkiResort: mountain.ski,
      mountainDestination: mountain.destination,
      mountainIconicPeak: mountain.peak,
      mountainRange: mountain.range,
      majorCivilEngineeringWorks: civil.layer,
      majorCivilEngineeringWorksDescription: civil.description,
      civilEngineeringBridge: civil.bridge,
      civilEngineeringViaduct: civil.viaduct,
      civilEngineeringTunnel: civil.tunnel,
      civilEngineeringDam: civil.dam,
      civilEngineeringCanalLock: civil.canalLock,
      groupFloodsSevereWeather: alerts.group,
      officialWeatherWarnings: alerts.warnings,
      majorFloodAlerts: alerts.floods,
      observedFloodExtent: alerts.observed,
      majorStorms: alerts.storms,
      weatherHeavyRain: alerts.rain,
      weatherFlood: alerts.flood,
      weatherStrongWind: alerts.wind,
      weatherThunderstorm: alerts.thunderstorm,
      weatherHail: alerts.hail,
      weatherSnowIce: alerts.snowIce,
      weatherCoastal: alerts.coastal,
      weatherOther: alerts.other,
      wildfireWind: alerts.wildfireWind,
      groupGeologicalRisks: alerts.geologicalGroup,
      recentEarthquakes: alerts.earthquakes,
      earthquakeMinor: alerts.earthquakeMinor,
      earthquakeModerate: alerts.earthquakeModerate,
      earthquakeStrong: alerts.earthquakeStrong,
      earthquakeMajor: alerts.earthquakeMajor,
      majorVolcanicActivity: alerts.volcanoes,
      volcanoUnrest: alerts.volcanoUnrest,
      volcanoEruption: alerts.volcanoEruption,
      volcanoAshEmission: alerts.volcanoAsh,
      landslideLikelihood: alerts.landslideLikelihood,
      landslideLikelihoodModerate: alerts.landslideModerate,
      landslideLikelihoodHigh: alerts.landslideHigh,
      mappedLandslideEvents: alerts.mappedLandslides,
      groupIndustrialTechnologicalIncidents: alerts.industrialGroup,
      majorIndustrialIncidents: alerts.majorIndustrialIncidents,
      industrialAccidents: alerts.industrialAccidents,
      chemicalAccidents: alerts.chemicalAccidents,
      industrialExplosions: alerts.industrialExplosions,
      otherTechnicalAccidents: alerts.otherTechnicalAccidents,
    },
    search: {
      ...en.search,
      ...localized.search,
      groupMountainPlaces: mountain.group,
      groupCivilEngineeringWorks: civil.group,
    },
    mountainPanel: {
      ...en.mountainPanel,
      categories: {
        ski_resort: mountain.ski,
        mountain_destination: mountain.destination,
        iconic_peak: mountain.peak,
        mountain_range: mountain.range,
      },
      summitElevation: mountain.summitElevation,
      baseElevation: mountain.baseElevation,
      topElevation: mountain.topElevation,
      seasonal: {
        ...en.mountainPanel.seasonal,
        winter: mountain.winter,
        summer: mountain.summer,
        year_round: mountain.yearRound,
      },
      liftStatus: mountain.liftStatus,
      snowReport: mountain.snowReport,
      officialWarning: mountain.warning,
      detailsUnavailable: mountain.unavailable,
    },
    civilEngineeringPanel: {
      ...en.civilEngineeringPanel,
      categories: {
        bridge: civil.bridge,
        viaduct: civil.viaduct,
        tunnel: civil.tunnel,
        dam: civil.dam,
        canal_lock: civil.canalLock,
      },
    },
    alertPanel: {
      ...en.alertPanel,
      ...localized.alertPanel,
      windModeledWarning: alerts.modeledWind,
      wildfireSpreadWarning: alerts.spreadWarning,
      observationNotForecast: alerts.observationNotForecast,
      ...(locale === "fr"
        ? {
            cardinalNorth: "nord",
            cardinalNorthEast: "nord-est",
            cardinalEast: "est",
            cardinalSouthEast: "sud-est",
            cardinalSouth: "sud",
            cardinalSouthWest: "sud-ouest",
            cardinalWest: "ouest",
            cardinalNorthWest: "nord-ouest",
            satelliteFloodTitle:
              "Étendue inondée observée par satellite",
            location: "Lieu",
            observedArea: "Superficie observée",
            areaUnavailable: "Superficie observée non disponible",
            potentiallyAffectedPopulation:
              "Population potentiellement affectée",
            satellite: "Satellite",
            confidence: "Niveau de confiance",
            automaticDetection:
              "Cette zone a été détectée automatiquement à partir d’une image satellite.",
            notOfficialConfirmation:
              "Elle ne constitue pas à elle seule la confirmation officielle d’un incident en cours.",
            falsePositivesPossible:
              "Des faux positifs et des zones non détectées sont possibles.",
            gdacsIndicative:
              "Les informations GDACS sont indicatives et ne remplacent pas les consignes des autorités locales.",
            configurationRequired: "Configuration requise",
            noActiveEventsEurope: "Aucun événement actif en Europe",
            noRecentData: "Aucune donnée récente",
            activeMode: "Actifs",
            last24Hours: "Dernières 24 heures",
            last72Hours: "Dernières 72 heures",
            demoData: "Données de démonstration",
            demoUnavailableProvider:
              "Fournisseur de démonstration indisponible",
          }
        : {}),
    },
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
