/**
 * Major European freight ports — curated from TEN-T (Trans-European Transport
 * Network) core / comprehensive network knowledge (DG MOVE). UK ports are
 * intentionally excluded (out of EUIM scope). `tenTStatus` is left `null`
 * when not confidently known rather than guessed.
 */

import { isCountryInEUIMScope } from "@/lib/geography/euimCoverage";
import { DATA_LAYER_SOURCE_IDS } from "@/lib/map/dataLayers/sourceIds";
import {
  entitiesToFeatureCollection,
  type EUIMMapEntity,
} from "@/lib/map/dataLayers/mapEntity";

export type TenTStatus = "core" | "comprehensive" | null;
export type PortType = "maritime" | "inland";

export type MajorFreightPort = {
  id: string;
  name: string;
  city: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  tenTStatus: TenTStatus;
  portType: PortType;
  officialUrl: string | null;
  sourceIds: string[];
};

const PORT_SOURCE_IDS: readonly string[] = [
  DATA_LAYER_SOURCE_IDS.TEN_T_PORTS,
  DATA_LAYER_SOURCE_IDS.TEN_T,
];

export const MAJOR_FREIGHT_PORTS: readonly MajorFreightPort[] = [
  {
    id: "freight-port-rotterdam",
    name: "Port of Rotterdam",
    city: "Rotterdam",
    countryCode: "NL",
    longitude: 4.13,
    latitude: 51.95,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.portofrotterdam.com/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-antwerp-bruges",
    name: "Port of Antwerp-Bruges",
    city: "Antwerp",
    countryCode: "BE",
    longitude: 4.4,
    latitude: 51.29,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.portofantwerpbruges.com/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-hamburg",
    name: "Port of Hamburg",
    city: "Hamburg",
    countryCode: "DE",
    longitude: 9.94,
    latitude: 53.54,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.hafen-hamburg.de/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-bremerhaven",
    name: "Port of Bremerhaven",
    city: "Bremerhaven",
    countryCode: "DE",
    longitude: 8.58,
    latitude: 53.55,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.bremenports.de/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-marseille-fos",
    name: "Port of Marseille-Fos",
    city: "Marseille",
    countryCode: "FR",
    longitude: 4.98,
    latitude: 43.37,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.marseille-port.fr/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-le-havre",
    name: "Port of Le Havre",
    city: "Le Havre",
    countryCode: "FR",
    longitude: 0.1,
    latitude: 49.48,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.havre-port.fr/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-valencia",
    name: "Port of Valencia",
    city: "Valencia",
    countryCode: "ES",
    longitude: -0.31,
    latitude: 39.44,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.valenciaport.com/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-barcelona",
    name: "Port of Barcelona",
    city: "Barcelona",
    countryCode: "ES",
    longitude: 2.15,
    latitude: 41.35,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.portdebarcelona.cat/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-algeciras",
    name: "Port of Algeciras",
    city: "Algeciras",
    countryCode: "ES",
    longitude: -5.42,
    latitude: 36.13,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.apba.es/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-genova",
    name: "Port of Genoa",
    city: "Genoa",
    countryCode: "IT",
    longitude: 8.91,
    latitude: 44.41,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.portsofgenoa.com/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-trieste",
    name: "Port of Trieste",
    city: "Trieste",
    countryCode: "IT",
    longitude: 13.77,
    latitude: 45.65,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.porto.trieste.it/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-gdansk",
    name: "Port of Gdańsk",
    city: "Gdańsk",
    countryCode: "PL",
    longitude: 18.68,
    latitude: 54.4,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.portgdansk.pl/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-constanta",
    name: "Port of Constanța",
    city: "Constanța",
    countryCode: "RO",
    longitude: 28.65,
    latitude: 44.17,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.portofconstantza.com/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-piraeus",
    name: "Port of Piraeus",
    city: "Piraeus",
    countryCode: "EL",
    longitude: 23.63,
    latitude: 37.94,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.olp.gr/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-lisbon",
    name: "Port of Lisbon",
    city: "Lisbon",
    countryCode: "PT",
    longitude: -9.12,
    latitude: 38.7,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.portodelisboa.pt/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-dublin",
    name: "Port of Dublin",
    city: "Dublin",
    countryCode: "IE",
    longitude: -6.21,
    latitude: 53.345,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.dublinport.ie/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-tallinn",
    name: "Port of Tallinn",
    city: "Tallinn",
    countryCode: "EE",
    longitude: 24.77,
    latitude: 59.45,
    tenTStatus: "core",
    portType: "maritime",
    officialUrl: "https://www.ts.ee/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-duisburg",
    name: "Port of Duisburg (duisport)",
    city: "Duisburg",
    countryCode: "DE",
    longitude: 6.75,
    latitude: 51.44,
    tenTStatus: "core",
    portType: "inland",
    officialUrl: "https://www.duisport.de/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
  {
    id: "freight-port-vienna",
    name: "Port of Vienna",
    city: "Vienna",
    countryCode: "AT",
    longitude: 16.44,
    latitude: 48.15,
    tenTStatus: null,
    portType: "inland",
    officialUrl: "https://www.hafen-wien.com/",
    sourceIds: [...PORT_SOURCE_IDS],
  },
];

export function getMajorFreightPortById(
  id: string,
): MajorFreightPort | undefined {
  return MAJOR_FREIGHT_PORTS.find((port) => port.id === id);
}

function toEntity(port: MajorFreightPort): EUIMMapEntity {
  return {
    id: port.id,
    category: "economy",
    subcategory: port.portType,
    layerId: "major-freight-ports",
    name: port.name,
    countryCode: port.countryCode,
    geometry: {
      type: "Point",
      coordinates: [port.longitude, port.latitude],
    },
    icon: "port",
    color: port.portType === "inland" ? "#0e7490" : "#1d4ed8",
    sourceIds: port.sourceIds,
    properties: {
      city: port.city,
      tenTStatus: port.tenTStatus,
      portType: port.portType,
      officialUrl: port.officialUrl,
    },
  };
}

export function toFeatureCollection(): GeoJSON.FeatureCollection {
  return entitiesToFeatureCollection(
    MAJOR_FREIGHT_PORTS.filter((port) => isCountryInEUIMScope(port.countryCode)).map(
      toEntity,
    ),
  );
}

export function getById(id: string): MajorFreightPort | undefined {
  return getMajorFreightPortById(id);
}

export const ALL: readonly MajorFreightPort[] = MAJOR_FREIGHT_PORTS;

export type MajorFreightPortsAudit = {
  total: number;
  inScope: number;
  outsideScope: string[];
  missingCoordinates: string[];
  duplicateIds: string[];
  ukEntries: string[];
};

export function auditMajorFreightPorts(): MajorFreightPortsAudit {
  const ids = new Set<string>();
  const duplicateIds: string[] = [];
  const outsideScope: string[] = [];
  const missingCoordinates: string[] = [];
  const ukEntries: string[] = [];

  for (const port of MAJOR_FREIGHT_PORTS) {
    if (ids.has(port.id)) duplicateIds.push(port.id);
    ids.add(port.id);

    if (!Number.isFinite(port.longitude) || !Number.isFinite(port.latitude)) {
      missingCoordinates.push(port.id);
    }

    if (!isCountryInEUIMScope(port.countryCode)) {
      outsideScope.push(port.id);
    }

    if (port.countryCode === "UK" || port.countryCode === "GB") {
      ukEntries.push(port.id);
    }
  }

  return {
    total: MAJOR_FREIGHT_PORTS.length,
    inScope: MAJOR_FREIGHT_PORTS.length - outsideScope.length,
    outsideScope,
    missingCoordinates,
    duplicateIds,
    ukEntries,
  };
}
