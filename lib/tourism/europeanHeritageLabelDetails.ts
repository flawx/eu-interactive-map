export type EuropeanHeritageLabelImage = {
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

export type EuropeanHeritageLabelSource = {
  label: string;
  url: string;
};

export type EuropeanHeritageLabelDetails = {
  siteId: string;
  name: string;
  awardYear: number;
  countryCodes: string[];
  transnational: boolean;
  serial: boolean;
  /**
   * Only populated when the Wikipedia extract genuinely discusses the site's
   * European significance / European Heritage Label rationale — never
   * fabricated from the site name alone.
   */
  europeanSignificance: string | null;
  description: string | null;
  wikipediaUrl: string | null;
  images: EuropeanHeritageLabelImage[];
  sources: EuropeanHeritageLabelSource[];
  fetchedAt: string;
};
