import type {
  EuInstitutionId,
  EuInstitutionSiteType,
} from "@/lib/europe/euInstitutions";

export type EuInstitutionImage = {
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

export type EuInstitutionSource = {
  label: string;
  url: string;
};

export type EuInstitutionSiteDetails = {
  siteId: string;
  name: string;
  city: string;
  countryCode: string;
  siteType: EuInstitutionSiteType;
  address: string | null;
  officialUrl: string | null;
  sharedSite: boolean;
  institutionIds: EuInstitutionId[];
  longitude: number;
  latitude: number;
};

export type EuInstitutionDetails = {
  institutionId: EuInstitutionId;
  name: string;
  shortName: string;
  description: string | null;
  roleSummary: string | null;
  historySummary: string | null;
  establishedYear: number | null;
  officialWebsite: string;
  officialInformationUrl: string;
  sites: EuInstitutionSiteDetails[];
  images: EuInstitutionImage[];
  sources: EuInstitutionSource[];
  fetchedAt: string;
};
