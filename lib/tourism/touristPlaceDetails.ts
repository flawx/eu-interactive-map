export type TouristPlaceImage = {
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

export type TouristPlaceSource = {
  label: string;
  url: string;
};

export type TouristPlaceDetails = {
  placeId: string;
  name: string;
  cityOrRegion: string;
  countryCode: string;
  category: string;
  description: string | null;
  officialWebsite: string | null;
  tourismWebsite: string | null;
  unescoSiteId: string | null;
  unescoOfficialUrl: string | null;
  wikipediaUrl: string | null;
  images: TouristPlaceImage[];
  sources: TouristPlaceSource[];
  fetchedAt: string;
  partial: boolean;
  warnings: string[];
  verified: boolean;
  resolvedWikidataId: string | null;
  resolverVersion: string;
};
