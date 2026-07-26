export type CapitalImage = {
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

export type EuCapitalDetails = {
  capitalId: string;
  name: string;
  nativeName: string;
  countryCode: string;
  description: string | null;
  population: {
    value: number;
    year: number | null;
    sourceUrl: string | null;
    label: "municipal";
  } | null;
  areaKm2: {
    value: number;
    sourceUrl: string | null;
  } | null;
  elevationMeters: number | null;
  officialWebsite: string | null;
  tourismWebsite: string | null;
  wikipediaUrl: string | null;
  images: CapitalImage[];
  fetchedAt: string;
};
