import { EU_CAPITALS } from "../lib/europe/euCapitals";
import { EU_INSTITUTIONS } from "../lib/europe/euInstitutions";
import {
  auditExpectedEntities,
  type ExpectedEntity,
} from "../lib/enrichment/wikimediaEntityResolver";
import { EUROPEAN_AIRPORTS } from "../lib/transport/europeanAirports";
import { EUROSTAR_STATIONS } from "../lib/transport/eurostarNetwork";
import { EUROPEAN_HERITAGE_LABEL_SITES } from "../lib/tourism/europeanHeritageLabel";
import { EUROPEAN_MOUNTAIN_PLACES } from "../lib/tourism/europeanMountainDestinations";
import { MAJOR_TOURIST_PLACES } from "../lib/tourism/majorTouristPlaces";

type AuditedItem = {
  dataset: string;
  id: string;
  expected: ExpectedEntity;
};

const items: AuditedItem[] = [
  ...MAJOR_TOURIST_PLACES.map((place) => ({
    dataset: "majorTouristPlaces",
    id: place.id,
    expected: {
      wikidataId: place.wikidataId,
      canonicalName: place.canonicalName,
      aliases: place.aliases,
      countryCode: place.countryCode,
      latitude: place.latitude,
      longitude: place.longitude,
      expectedTypes: [place.category],
      distanceThresholdKm: place.category === "natural_landscape" ? 150 : 60,
    },
  })),
  ...EUROPEAN_MOUNTAIN_PLACES.map((place) => ({
    dataset: "europeanMountainDestinations",
    id: place.id,
    expected: {
      wikidataId: place.wikidataId,
      canonicalName: place.canonicalName,
      aliases: place.aliases,
      countryCode: place.countryCodes[0] ?? null,
      latitude: place.latitude,
      longitude: place.longitude,
      expectedTypes: [place.category],
      distanceThresholdKm: place.category === "mountain_range" ? 150 : 60,
    },
  })),
  ...EU_CAPITALS.map((capital) => ({
    dataset: "capitals",
    id: capital.id,
    expected: {
      wikidataId: capital.wikidataId,
      canonicalName: capital.canonicalName,
      aliases: capital.aliases,
      countryCode: capital.countryCode,
      latitude: capital.latitude,
      longitude: capital.longitude,
      expectedTypes: ["city"],
      distanceThresholdKm: 25,
    },
  })),
  ...EU_INSTITUTIONS.map((institution) => ({
    dataset: "institutions",
    id: institution.id,
    expected: {
      wikidataId: institution.wikidataId,
      canonicalName: institution.canonicalName,
      aliases: [institution.shortName, ...institution.aliases],
      expectedTypes: ["institution"],
      distanceThresholdKm: 150,
    },
  })),
  ...EUROPEAN_AIRPORTS.map((airport) => ({
    dataset: "airports",
    id: airport.id,
    expected: {
      wikidataId: airport.wikidataId,
      canonicalName: airport.name,
      aliases: [airport.iataCode ?? "", airport.icaoCode],
      countryCode: airport.countryCode,
      latitude: airport.latitude,
      longitude: airport.longitude,
      expectedTypes: ["airport"],
      distanceThresholdKm: 25,
    },
  })),
  ...EUROSTAR_STATIONS.map((station) => ({
    dataset: "eurostar",
    id: station.id,
    expected: {
      wikidataId: station.wikidataId,
      canonicalName: station.name,
      aliases: [station.city],
      countryCode: station.countryCode,
      latitude: station.latitude,
      longitude: station.longitude,
      expectedTypes: ["railway_station"],
      distanceThresholdKm: 25,
    },
  })),
  ...EUROPEAN_HERITAGE_LABEL_SITES.map((site) => {
    const representative =
      site.locations.find((location) => location.representativePoint) ??
      site.locations[0] ??
      null;
    return {
      dataset: "europeanHeritageLabel",
      id: site.id,
      expected: {
        wikidataId: site.wikidataId,
        canonicalName: site.canonicalName,
        aliases: site.locations.map((location) => location.name),
        countryCode: site.countryCodes.length === 1 ? site.countryCodes[0] : null,
        latitude: representative?.latitude ?? null,
        longitude: representative?.longitude ?? null,
        distanceThresholdKm: site.serial || site.transnational ? 150 : 60,
      },
    };
  }),
];

async function main(): Promise<void> {
  const results = await auditExpectedEntities(items.map((item) => item.expected));

  const anomalies = items.flatMap((item, index) => {
    const result = results[index];
    const reasons: string[] = [];
    if (!item.expected.wikidataId) reasons.push("missing_qid");
    else if (!result.validQid) reasons.push("invalid_qid");
    if (result.validQid && !result.nameMatches) reasons.push("name_mismatch");
    if (result.validQid && !result.countryMatches) reasons.push("country_mismatch");
    if (
      result.distanceKm != null &&
      result.distanceKm > (item.expected.distanceThresholdKm ?? 60)
    ) {
      reasons.push(`coordinate_mismatch_${Math.round(result.distanceKm)}km`);
    }
    if (result.validQid && !result.hasSitelink) reasons.push("missing_sitelink");
    return reasons.length
      ? [{ dataset: item.dataset, id: item.id, qid: item.expected.wikidataId, reasons }]
      : [];
  });

  const anomaliesByDataset = Object.fromEntries(
    [...new Set(anomalies.map((item) => item.dataset))]
      .sort()
      .map((dataset) => [
        dataset,
        anomalies.filter((item) => item.dataset === dataset).length,
      ]),
  );
  const entriesWithoutQid = anomalies
    .filter((item) => item.reasons.includes("missing_qid"))
    .map((item) => `${item.dataset}:${item.id}`);

  const report = {
    resolverVersion: "entity-resolver-v2",
    totalEntities: items.length,
    entitiesWithQid: items.filter((item) => item.expected.wikidataId).length,
    qidsVerified: results.filter(
      (result) => result.validQid && result.nameMatches && result.countryMatches,
    ).length,
    invalidQids: results.filter((result) => !result.validQid).length,
    wikipediaPagesMatched: results.filter((result) => result.hasSitelink).length,
    pagesRejected: anomalies.filter((item) =>
      item.reasons.some((reason) => reason !== "missing_sitelink"),
    ).length,
    entitiesWithoutSitelink: results.filter(
      (result) => result.validQid && !result.hasSitelink,
    ).length,
    entitiesWithoutDescription: results.filter((result) => !result.hasSitelink).length,
    imagesRejected: results.filter((result) => result.imageRejected).length,
    anomalyCount: anomalies.length,
    anomaliesByDataset,
    entriesWithoutQid,
    examplesOfAnomalies: anomalies.slice(0, 25),
  };

  console.log(JSON.stringify(report, null, 2));
}

void main();
