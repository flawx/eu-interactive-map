/**
 * MapLibre layer wiring for the "Data Layers V2" EU projects + economy
 * datasets: EU-funded projects (6 categories, single source), the European
 * Economic Area fill, major business districts and major freight ports.
 *
 * Kept simple (circle + text layers, no custom canvas icons) since these are
 * small curated datasets — mirrors the `international-organisations` pattern
 * from `europeInstitutionsLayers.ts` rather than the clustered
 * `eu-bodies-agencies` pattern. Extracted to keep `MapContainer.tsx` from
 * growing further.
 */

import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapLayerMouseEvent,
} from "maplibre-gl";

import { EUIM_EU_MEMBER_CODES } from "@/lib/geography/euimCoverage";
import { EEA_EFTA_MEMBER_CODES } from "@/lib/europe/europeanEconomicArea";
import { toFeatureCollection as buildBusinessDistrictsCollection } from "@/lib/europe/majorBusinessDistricts";
import { toFeatureCollection as buildFreightPortsCollection } from "@/lib/europe/majorFreightPorts";
import { toFeatureCollection as buildEuProjectsCollection } from "@/lib/europe/euProjects/entities";
import type { EuProjectCategory } from "@/lib/europe/euProjects/types";
import { ENTITY_STATUS_COLORS } from "@/lib/map/dataLayers/entityStatus";

export const EUROPEAN_ECONOMIC_AREA_SOURCE_ID = "europe-countries";
export const MAJOR_BUSINESS_DISTRICTS_SOURCE_ID = "major-business-districts";
export const MAJOR_FREIGHT_PORTS_SOURCE_ID = "major-freight-ports";
export const EU_PROJECTS_SOURCE_ID = "eu-projects";

export const EUROPEAN_ECONOMIC_AREA_LAYER_IDS = [
  "european-economic-area-fill",
  "european-economic-area-border",
] as const;

export const MAJOR_BUSINESS_DISTRICTS_LAYER_IDS = [
  "major-business-districts-halo",
  "major-business-districts-symbol",
  "major-business-districts-label",
] as const;

export const MAJOR_FREIGHT_PORTS_LAYER_IDS = [
  "major-freight-ports-halo",
  "major-freight-ports-symbol",
  "major-freight-ports-label",
] as const;

export const EU_PROJECTS_LAYER_IDS = [
  "eu-projects-halo",
  "eu-projects-symbol",
  "eu-projects-label",
] as const;

const EEA_MEMBER_IDS: readonly string[] = [
  ...EUIM_EU_MEMBER_CODES,
  ...EEA_EFTA_MEMBER_CODES,
];

export type EuProjectCategoryVisibility = Record<EuProjectCategory, boolean>;

function activeEuProjectCategories(
  visibility: EuProjectCategoryVisibility,
): EuProjectCategory[] {
  return (Object.keys(visibility) as EuProjectCategory[]).filter(
    (category) => visibility[category],
  );
}

function euProjectsFilterExpression(
  visibility: EuProjectCategoryVisibility,
): FilterSpecification {
  const active = activeEuProjectCategories(visibility);
  return [
    "match",
    ["get", "category"],
    active.length > 0 ? active : [""],
    true,
    false,
  ] as unknown as FilterSpecification;
}

function anyEuProjectCategoryActive(
  visibility: EuProjectCategoryVisibility,
): boolean {
  return activeEuProjectCategories(visibility).length > 0;
}

function entitySelectionRadiusExpression(
  selectedId: string | null,
  selectedRadius: number,
  defaultRadius: number,
): ["case", ["==", ["get", "id"], string], number, number] {
  return [
    "case",
    ["==", ["get", "id"], selectedId ?? ""],
    selectedRadius,
    defaultRadius,
  ];
}

export type EuropeProjectsEconomyLayerOptions = {
  showEuropeanEconomicArea: boolean;
  showMajorBusinessDistricts: boolean;
  showMajorFreightPorts: boolean;
  euProjectCategoryVisibility: EuProjectCategoryVisibility;
  selectedBusinessDistrictId: string | null;
  selectedFreightPortId: string | null;
  selectedEuProjectId: string | null;
};

/**
 * Adds sources/layers for EEA fill, business districts, freight ports and
 * EU projects if they don't already exist. Safe to call repeatedly.
 * Requires the `europe-countries` source (added earlier by MapContainer for
 * the eurozone/candidates fills) to already exist.
 */
export function ensureEuropeProjectsEconomyLayers(
  map: MapLibreMap,
  options: EuropeProjectsEconomyLayerOptions,
): void {
  // --- European Economic Area fill (reuses the shared country polygons source) ---
  if (map.getSource(EUROPEAN_ECONOMIC_AREA_SOURCE_ID)) {
    if (!map.getLayer("european-economic-area-fill")) {
      map.addLayer({
        id: "european-economic-area-fill",
        type: "fill",
        source: EUROPEAN_ECONOMIC_AREA_SOURCE_ID,
        filter: ["match", ["get", "CNTR_ID"], [...EEA_MEMBER_IDS], true, false],
        layout: {
          visibility: options.showEuropeanEconomicArea ? "visible" : "none",
        },
        paint: {
          "fill-color": "#0d9488",
          "fill-opacity": 0.18,
        },
      });
    }

    if (!map.getLayer("european-economic-area-border")) {
      map.addLayer({
        id: "european-economic-area-border",
        type: "line",
        source: EUROPEAN_ECONOMIC_AREA_SOURCE_ID,
        filter: ["match", ["get", "CNTR_ID"], [...EEA_MEMBER_IDS], true, false],
        layout: {
          visibility: options.showEuropeanEconomicArea ? "visible" : "none",
        },
        paint: {
          "line-color": "#2dd4bf",
          "line-width": 0.8,
          "line-opacity": 0.5,
        },
      });
    }
  }

  // --- Major business districts (small curated dataset, not clustered) ---
  if (!map.getSource(MAJOR_BUSINESS_DISTRICTS_SOURCE_ID)) {
    map.addSource(MAJOR_BUSINESS_DISTRICTS_SOURCE_ID, {
      type: "geojson",
      data: buildBusinessDistrictsCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("major-business-districts-halo")) {
    map.addLayer({
      id: "major-business-districts-halo",
      type: "circle",
      source: MAJOR_BUSINESS_DISTRICTS_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showMajorBusinessDistricts ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedBusinessDistrictId,
          18,
          14,
        ),
        "circle-color": "#fbbf24",
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("major-business-districts-symbol")) {
    map.addLayer({
      id: "major-business-districts-symbol",
      type: "circle",
      source: MAJOR_BUSINESS_DISTRICTS_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showMajorBusinessDistricts ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedBusinessDistrictId,
          8,
          6,
        ),
        "circle-color": "#b45309",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer("major-business-districts-label")) {
    map.addLayer({
      id: "major-business-districts-label",
      type: "symbol",
      source: MAJOR_BUSINESS_DISTRICTS_SOURCE_ID,
      minzoom: 5,
      layout: {
        visibility: options.showMajorBusinessDistricts ? "visible" : "none",
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-optional": true,
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#b45309",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }

  // --- Major freight ports (small curated dataset, not clustered) ---
  if (!map.getSource(MAJOR_FREIGHT_PORTS_SOURCE_ID)) {
    map.addSource(MAJOR_FREIGHT_PORTS_SOURCE_ID, {
      type: "geojson",
      data: buildFreightPortsCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("major-freight-ports-halo")) {
    map.addLayer({
      id: "major-freight-ports-halo",
      type: "circle",
      source: MAJOR_FREIGHT_PORTS_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showMajorFreightPorts ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedFreightPortId,
          18,
          14,
        ),
        "circle-color": ["get", "color"],
        "circle-opacity": 0.28,
      },
    });
  }

  if (!map.getLayer("major-freight-ports-symbol")) {
    map.addLayer({
      id: "major-freight-ports-symbol",
      type: "circle",
      source: MAJOR_FREIGHT_PORTS_SOURCE_ID,
      minzoom: 3,
      layout: {
        visibility: options.showMajorFreightPorts ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedFreightPortId,
          8,
          6,
        ),
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer("major-freight-ports-label")) {
    map.addLayer({
      id: "major-freight-ports-label",
      type: "symbol",
      source: MAJOR_FREIGHT_PORTS_SOURCE_ID,
      minzoom: 5,
      layout: {
        visibility: options.showMajorFreightPorts ? "visible" : "none",
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-optional": true,
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#1d4ed8",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }

  // --- EU-funded projects (single source, 6 categories filtered by prefs) ---
  const projectsVisible = anyEuProjectCategoryActive(
    options.euProjectCategoryVisibility,
  );
  const projectsFilter = euProjectsFilterExpression(
    options.euProjectCategoryVisibility,
  );

  if (!map.getSource(EU_PROJECTS_SOURCE_ID)) {
    map.addSource(EU_PROJECTS_SOURCE_ID, {
      type: "geojson",
      data: buildEuProjectsCollection(),
      promoteId: "id",
    });
  }

  if (!map.getLayer("eu-projects-halo")) {
    map.addLayer({
      id: "eu-projects-halo",
      type: "circle",
      source: EU_PROJECTS_SOURCE_ID,
      minzoom: 3,
      filter: projectsFilter,
      layout: {
        visibility: projectsVisible ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedEuProjectId,
          18,
          13,
        ),
        "circle-color": ["get", "color"],
        "circle-opacity": 0.25,
      },
    });
  }

  if (!map.getLayer("eu-projects-symbol")) {
    map.addLayer({
      id: "eu-projects-symbol",
      type: "circle",
      source: EU_PROJECTS_SOURCE_ID,
      minzoom: 3,
      filter: projectsFilter,
      layout: {
        visibility: projectsVisible ? "visible" : "none",
      },
      paint: {
        "circle-radius": entitySelectionRadiusExpression(
          options.selectedEuProjectId,
          8,
          6,
        ),
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  if (!map.getLayer("eu-projects-label")) {
    map.addLayer({
      id: "eu-projects-label",
      type: "symbol",
      source: EU_PROJECTS_SOURCE_ID,
      minzoom: 6,
      filter: projectsFilter,
      layout: {
        visibility: projectsVisible ? "visible" : "none",
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-optional": true,
        "text-pitch-alignment": "viewport",
        "text-rotation-alignment": "viewport",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#1e3a8a",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });
  }
}

export function setEuropeProjectsEconomyVisibility(
  map: MapLibreMap,
  options: {
    showEuropeanEconomicArea: boolean;
    showMajorBusinessDistricts: boolean;
    showMajorFreightPorts: boolean;
    euProjectCategoryVisibility: EuProjectCategoryVisibility;
  },
): void {
  const groups: Array<[readonly string[], boolean]> = [
    [EUROPEAN_ECONOMIC_AREA_LAYER_IDS, options.showEuropeanEconomicArea],
    [MAJOR_BUSINESS_DISTRICTS_LAYER_IDS, options.showMajorBusinessDistricts],
    [MAJOR_FREIGHT_PORTS_LAYER_IDS, options.showMajorFreightPorts],
  ];
  for (const [layerIds, visible] of groups) {
    for (const layerId of layerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(
          layerId,
          "visibility",
          visible ? "visible" : "none",
        );
      }
    }
  }

  const projectsVisible = anyEuProjectCategoryActive(
    options.euProjectCategoryVisibility,
  );
  const projectsFilter = euProjectsFilterExpression(
    options.euProjectCategoryVisibility,
  );
  for (const layerId of EU_PROJECTS_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(
        layerId,
        "visibility",
        projectsVisible ? "visible" : "none",
      );
      map.setFilter(layerId, projectsFilter);
    }
  }
}

export function updateEuropeProjectsEconomySelection(
  map: MapLibreMap,
  options: {
    selectedBusinessDistrictId: string | null;
    selectedFreightPortId: string | null;
    selectedEuProjectId: string | null;
  },
): void {
  if (map.getLayer("major-business-districts-halo")) {
    map.setPaintProperty(
      "major-business-districts-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedBusinessDistrictId, 18, 14),
    );
  }
  if (map.getLayer("major-business-districts-symbol")) {
    map.setPaintProperty(
      "major-business-districts-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedBusinessDistrictId, 8, 6),
    );
  }
  if (map.getLayer("major-freight-ports-halo")) {
    map.setPaintProperty(
      "major-freight-ports-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedFreightPortId, 18, 14),
    );
  }
  if (map.getLayer("major-freight-ports-symbol")) {
    map.setPaintProperty(
      "major-freight-ports-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedFreightPortId, 8, 6),
    );
  }
  if (map.getLayer("eu-projects-halo")) {
    map.setPaintProperty(
      "eu-projects-halo",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedEuProjectId, 18, 13),
    );
  }
  if (map.getLayer("eu-projects-symbol")) {
    map.setPaintProperty(
      "eu-projects-symbol",
      "circle-radius",
      entitySelectionRadiusExpression(options.selectedEuProjectId, 8, 6),
    );
  }
}

export type EuropeProjectsEconomyClickHandlers = {
  onBusinessDistrictClick: (event: MapLayerMouseEvent) => void;
  onFreightPortClick: (event: MapLayerMouseEvent) => void;
  onEuProjectClick: (event: MapLayerMouseEvent) => void;
};

/** Attaches click / hover listeners; returns a cleanup function. */
export function attachEuropeProjectsEconomyHandlers(
  map: MapLibreMap,
  handlers: EuropeProjectsEconomyClickHandlers,
  setPointerCursor: () => void,
  resetCursor: () => void,
): () => void {
  const interactiveLayers: Array<
    [string, (event: MapLayerMouseEvent) => void]
  > = [
    ["major-business-districts-symbol", handlers.onBusinessDistrictClick],
    ["major-freight-ports-symbol", handlers.onFreightPortClick],
    ["eu-projects-symbol", handlers.onEuProjectClick],
  ];

  for (const [layerId, handler] of interactiveLayers) {
    map.on("click", layerId, handler);
    map.on("mouseenter", layerId, setPointerCursor);
    map.on("mouseleave", layerId, resetCursor);
  }

  return () => {
    for (const [layerId, handler] of interactiveLayers) {
      map.off("click", layerId, handler);
      map.off("mouseenter", layerId, setPointerCursor);
      map.off("mouseleave", layerId, resetCursor);
    }
  };
}

/** Unused export retained for API symmetry / potential source refresh hooks. */
export function refreshEuropeProjectsEconomySources(map: MapLibreMap): void {
  const districtsSource = map.getSource(
    MAJOR_BUSINESS_DISTRICTS_SOURCE_ID,
  ) as GeoJSONSource | undefined;
  districtsSource?.setData(buildBusinessDistrictsCollection());

  const portsSource = map.getSource(
    MAJOR_FREIGHT_PORTS_SOURCE_ID,
  ) as GeoJSONSource | undefined;
  portsSource?.setData(buildFreightPortsCollection());

  const projectsSource = map.getSource(
    EU_PROJECTS_SOURCE_ID,
  ) as GeoJSONSource | undefined;
  projectsSource?.setData(buildEuProjectsCollection());
}

export { ENTITY_STATUS_COLORS };
