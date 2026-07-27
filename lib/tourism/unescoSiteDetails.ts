import type {
  UnescoDangerStatus,
  UnescoSiteCategory,
} from "@/lib/tourism/unescoWorldHeritage";

export type UnescoSiteImage = {
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

export type UnescoSiteSource = {
  label: string;
  url: string;
};

export type UnescoSiteDetails = {
  siteId: string;
  unescoId: number;
  name: string;
  originalName: string;
  description: string | null;
  countryCodes: string[];
  category: UnescoSiteCategory;
  inscriptionYear: number;
  extensionYears: number[];
  criteria: string[];
  areaHectares: number | null;
  bufferZoneHectares: number | null;
  dangerStatus: UnescoDangerStatus;
  dangerYears: number[];
  transboundary: boolean;
  serial: boolean;
  officialUrl: string;
  wikipediaUrl: string | null;
  location: string | null;
  images: UnescoSiteImage[];
  sources: UnescoSiteSource[];
  fetchedAt: string;
  importedAt: string;
};
