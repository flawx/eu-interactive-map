import type { MapMarkerThumbnail, PhotoMarkerCategory } from "@/lib/map/mapMarkerThumbnail";
import { markerThumbnailKey } from "@/lib/map/mapMarkerThumbnail";
import catalogJson from "@/data/map-marker-thumbnails.json";

/** Bump when the on-disk catalog schema or bulk contents change. */
export const MAP_MARKER_THUMBNAIL_CATALOG_VERSION = 1;

export type StoredMapThumbnailEntityType =
  | "capital"
  | "tourist_place"
  | "unesco"
  | "ehl"
  | "civil_engineering";

export type StoredMapThumbnail = {
  entityType: StoredMapThumbnailEntityType;
  entityId: string;
  /** EHL location id when present. */
  locationId?: string | null;
  wikidataId: string | null;
  originalUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  source:
    | "wikidata-p18"
    | "wikipedia"
    | "wikimedia-commons"
    | "missing"
    | null;
  credit: string | null;
  license: string | null;
  licenseUrl: string | null;
  resolvedAt: string;
};

export type MapMarkerThumbnailCatalogFile = {
  version: number;
  updatedAt: string;
  entries: Record<string, StoredMapThumbnail>;
};

const CATEGORY_TO_ENTITY_TYPE: Record<
  PhotoMarkerCategory,
  StoredMapThumbnailEntityType
> = {
  capital: "capital",
  tourist: "tourist_place",
  unesco: "unesco",
  ehl: "ehl",
  civil: "civil_engineering",
};

const ENTITY_TYPE_TO_CATEGORY: Record<
  StoredMapThumbnailEntityType,
  PhotoMarkerCategory
> = {
  capital: "capital",
  tourist_place: "tourist",
  unesco: "unesco",
  ehl: "ehl",
  civil_engineering: "civil",
};

export function categoryToEntityType(
  category: PhotoMarkerCategory,
): StoredMapThumbnailEntityType {
  return CATEGORY_TO_ENTITY_TYPE[category];
}

export function entityTypeToCategory(
  entityType: StoredMapThumbnailEntityType,
): PhotoMarkerCategory {
  return ENTITY_TYPE_TO_CATEGORY[entityType];
}

export function catalogEntryKey(
  category: PhotoMarkerCategory,
  id: string,
  locationId?: string | null,
): string {
  return markerThumbnailKey(category, id, locationId);
}

const file = catalogJson as MapMarkerThumbnailCatalogFile;

export function getMapMarkerThumbnailCatalog(): MapMarkerThumbnailCatalogFile {
  return file;
}

export function getCatalogVersion(): number {
  return file.version ?? MAP_MARKER_THUMBNAIL_CATALOG_VERSION;
}

export function lookupStoredThumbnail(
  category: PhotoMarkerCategory,
  id: string,
  locationId?: string | null,
): StoredMapThumbnail | null {
  const key = catalogEntryKey(category, id, locationId);
  return file.entries?.[key] ?? null;
}

export function storedToMapMarkerThumbnail(
  stored: StoredMapThumbnail | null,
): MapMarkerThumbnail {
  if (!stored?.thumbnailUrl && !stored?.originalUrl) {
    return { url: null, source: null, width: null, height: null };
  }
  return {
    url: stored.thumbnailUrl ?? stored.originalUrl,
    source: stored.credit ?? stored.source,
    width: stored.width,
    height: stored.height,
  };
}

export function summarizeCatalog(
  catalog: MapMarkerThumbnailCatalogFile = file,
): Record<StoredMapThumbnailEntityType | "total" | "withUrl", number> {
  const summary: Record<string, number> = {
    capital: 0,
    tourist_place: 0,
    unesco: 0,
    ehl: 0,
    civil_engineering: 0,
    total: 0,
    withUrl: 0,
  };
  for (const entry of Object.values(catalog.entries ?? {})) {
    summary.total += 1;
    summary[entry.entityType] = (summary[entry.entityType] ?? 0) + 1;
    if (entry.thumbnailUrl || entry.originalUrl) summary.withUrl += 1;
  }
  return summary as Record<
    StoredMapThumbnailEntityType | "total" | "withUrl",
    number
  >;
}
