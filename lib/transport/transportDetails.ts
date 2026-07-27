export type TransportImage = {
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  title: string | null;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
};

export type TransportSource = {
  label: string;
  url: string;
};

export type EuropeanAirportDetails = {
  airportId: string;
  name: string;
  city: string;
  countryCode: string;
  iataCode: string | null;
  icaoCode: string;
  rank2025: number | null;
  description: string | null;
  openedYear: number | null;
  officialWebsite: string | null;
  operatorName: string | null;
  terminals: string[] | null;
  groundTransportSummary: string | null;
  wikipediaUrl: string | null;
  images: TransportImage[];
  sources: TransportSource[];
  fetchedAt: string;
};

export type EurostarStationDetails = {
  stationId: string;
  name: string;
  city: string;
  countryCode: string;
  description: string | null;
  officialUrl: string;
  stationWebsite: string | null;
  serviceStatus: "regular" | "seasonal";
  wikipediaUrl: string | null;
  directDestinations: {
    stationId: string;
    name: string;
    city: string;
    serviceStatus: "regular" | "seasonal";
  }[];
  recommendedArrivalInfo: string | null;
  borderControlInfo: string | null;
  accessibilityInfo: string | null;
  images: TransportImage[];
  sources: TransportSource[];
  fetchedAt: string;
};
