import type {
  MountainPlaceCategory,
  SeasonalOperation,
} from "@/lib/tourism/europeanMountainDestinations";

export type MountainPlaceImage = {
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

export type MountainPlaceSource = {
  label: string;
  url: string;
};

export type EuropeanMountainPlaceDetails = {
  placeId: string;
  name: string;
  nativeName: string | null;
  category: MountainPlaceCategory;
  countryCodes: string[];
  cityOrRegion: string;
  description: string | null;
  historySummary: string | null;
  mountainRange: string | null;
  seasonalOperation: SeasonalOperation;
  summitElevationMeters: number | null;
  resortBaseElevationMeters: number | null;
  resortTopElevationMeters: number | null;
  officialWebsite: string | null;
  tourismWebsite: string | null;
  snowReportUrl: string | null;
  liftStatusUrl: string | null;
  practicalInformation: {
    officialSeasonInformation: string | null;
    accessSummary: string | null;
    accessibilityInformation: string | null;
  };
  images: MountainPlaceImage[];
  sources: MountainPlaceSource[];
  fetchedAt: string;
  partial: boolean;
  warnings: string[];
};
