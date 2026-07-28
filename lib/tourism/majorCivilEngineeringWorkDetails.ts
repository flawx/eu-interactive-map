import type {
  CivilEngineeringWorkCarries,
  CivilEngineeringWorkCategory,
  CivilEngineeringWorkStatus,
} from "@/lib/tourism/majorCivilEngineeringWorks";

export type CivilEngineeringWorkImage = {
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

export type CivilEngineeringWorkDetails = {
  workId: string;
  name: string;
  category: CivilEngineeringWorkCategory;
  status: CivilEngineeringWorkStatus;
  countryCodes: string[];
  regionOrCity: string;
  summary: string;
  description: string | null;
  openingYear: number | null;
  lengthMeters: number | null;
  heightMeters: number | null;
  mainSpanMeters: number | null;
  depthMeters: number | null;
  carries: CivilEngineeringWorkCarries;
  officialUrl: string | null;
  wikipediaUrl: string | null;
  images: CivilEngineeringWorkImage[];
  sources: Array<{ label: string; url: string }>;
  verified: boolean;
  resolvedWikidataId: string | null;
  partial: boolean;
  warnings: string[];
  fetchedAt: string;
  resolverVersion: string;
};
