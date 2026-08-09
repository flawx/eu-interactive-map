export type DataSourceCategory =
  | "basemap"
  | "map_data"
  | "eu_data"
  | "tourism"
  | "security"
  | "alerts"
  | "traffic"
  | "routing"
  | "transit"
  | "flights"
  | "media"
  | "elevation"
  | "other";

export type DataSourceDefinition = {
  id: string;
  name: string;
  category: DataSourceCategory;
  purpose: string;
  officialUrl: string;
  attribution: string;
  licenseUrl?: string;
  provider: string;
  usedFor: string[];
  notes?: string;
};

export const DATA_SOURCES_REGISTRY: readonly DataSourceDefinition[] = [
  {
    id: "carto-voyager",
    name: "CARTO Voyager",
    category: "basemap",
    purpose: "Default raster basemap tiles",
    officialUrl: "https://carto.com/basemaps/",
    attribution: "© OpenStreetMap contributors © CARTO",
    provider: "CARTO",
    usedFor: ["Standard basemap"],
  },
  {
    id: "carto-positron",
    name: "CARTO Positron",
    category: "basemap",
    purpose: "Light basemap tiles",
    officialUrl: "https://carto.com/basemaps/",
    attribution: "© OpenStreetMap contributors © CARTO",
    provider: "CARTO",
    usedFor: ["Light basemap"],
  },
  {
    id: "carto-dark-matter",
    name: "CARTO Dark Matter",
    category: "basemap",
    purpose: "Dark basemap tiles",
    officialUrl: "https://carto.com/basemaps/",
    attribution: "© OpenStreetMap contributors © CARTO",
    provider: "CARTO",
    usedFor: ["Dark basemap"],
  },
  {
    id: "openstreetmap",
    name: "OpenStreetMap",
    category: "map_data",
    purpose: "Underlying geographic data for basemaps and search context",
    officialUrl: "https://www.openstreetmap.org/copyright",
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    provider: "OpenStreetMap",
    usedFor: ["Basemap attribution", "Nominatim fallback search"],
  },
  {
    id: "gisco-countries",
    name: "GISCO / Eurostat countries",
    category: "eu_data",
    purpose: "EU country polygons for membership fills and territory resolution",
    officialUrl: "https://gisco-services.ec.europa.eu/distribution/v2/countries/",
    attribution: "© EuroGeographics / GISCO",
    provider: "Eurostat GISCO",
    usedFor: ["Country fills", "UNESCO territory resolution"],
  },
  {
    id: "unesco-whc",
    name: "UNESCO World Heritage Centre",
    category: "tourism",
    purpose: "World Heritage site inventory",
    officialUrl: "https://whc.unesco.org/",
    attribution: "UNESCO World Heritage Centre",
    provider: "UNESCO",
    usedFor: ["UNESCO layer"],
  },
  {
    id: "european-heritage-label",
    name: "European Heritage Label",
    category: "tourism",
    purpose: "EU-recognised heritage sites",
    officialUrl: "https://culture.ec.europa.eu/cultural-heritage/initiatives-and-success-stories/european-heritage-label",
    attribution: "European Commission — European Heritage Label",
    provider: "European Commission",
    usedFor: ["EHL layer"],
  },
  {
    id: "eurocontrol-airports",
    name: "EUROCONTROL Data Snapshot #58",
    category: "tourism",
    purpose: "Major European airport ranking and identifiers",
    officialUrl: "https://www.eurocontrol.int/publication/eurocontrol-data-snapshot-58-top-40-european-airports-historic-peak-days",
    attribution: "EUROCONTROL",
    provider: "EUROCONTROL",
    usedFor: ["Airport layer"],
  },
  {
    id: "eurostar",
    name: "Eurostar",
    category: "tourism",
    purpose: "Station list and schematic network",
    officialUrl: "https://www.eurostar.com/",
    attribution: "Eurostar",
    provider: "Eurostar",
    usedFor: ["Eurostar stations/routes"],
  },
  {
    id: "tomtom-routing",
    name: "TomTom Routing",
    category: "routing",
    purpose: "Car / bicycle / walk routes and traffic sections",
    officialUrl: "https://developer.tomtom.com/routing-api",
    attribution: "TomTom",
    provider: "TomTom",
    usedFor: ["Road directions"],
  },
  {
    id: "tomtom-traffic",
    name: "TomTom Traffic",
    category: "traffic",
    purpose: "Live traffic flow tiles and incident feeds",
    officialUrl: "https://developer.tomtom.com/traffic-api",
    attribution: "TomTom",
    provider: "TomTom",
    usedFor: ["Live road traffic", "Traffic incidents"],
  },
  {
    id: "tomtom-search",
    name: "TomTom Search",
    category: "other",
    purpose: "Geocoding / place search in EUIM coverage",
    officialUrl: "https://developer.tomtom.com/search-api",
    attribution: "TomTom",
    provider: "TomTom",
    usedFor: ["Map search"],
  },
  {
    id: "google-routes",
    name: "Google Routes API",
    category: "transit",
    purpose: "Public-transport itineraries",
    officialUrl: "https://developers.google.com/maps/documentation/routes",
    attribution: "Google",
    provider: "Google",
    usedFor: ["Transit directions"],
  },
  {
    id: "serpapi-google-flights",
    name: "SerpApi Google Flights",
    category: "flights",
    purpose: "Flight offer search and booking option links",
    officialUrl: "https://serpapi.com/google-flights-api",
    attribution: "SerpApi / Google Flights",
    provider: "SerpApi",
    usedFor: ["Flight search", "Booking options"],
  },
  {
    id: "effis",
    name: "EFFIS (Copernicus EMS)",
    category: "alerts",
    purpose: "Burned area / wildfire perimeter products",
    officialUrl: "https://effis.jrc.ec.europa.eu/",
    attribution: "EFFIS / Copernicus EMS",
    provider: "European Commission JRC",
    usedFor: ["Wildfire overlays"],
  },
  {
    id: "firms",
    name: "NASA FIRMS",
    category: "alerts",
    purpose: "Active fire detections",
    officialUrl: "https://firms.modaps.eosdis.nasa.gov/",
    attribution: "NASA FIRMS",
    provider: "NASA",
    usedFor: ["Satellite active fires"],
  },
  {
    id: "meteoalarm",
    name: "Meteoalarm",
    category: "alerts",
    purpose: "Official weather warnings",
    officialUrl: "https://www.meteoalarm.org/",
    attribution: "Meteoalarm / EUMETNET",
    provider: "EUMETNET",
    usedFor: ["Weather warnings"],
  },
  {
    id: "gdacs",
    name: "GDACS",
    category: "alerts",
    purpose: "Flood / storm / geological hazard alerts",
    officialUrl: "https://www.gdacs.org/",
    attribution: "GDACS",
    provider: "GDACS",
    usedFor: ["Floods", "Storms", "Geological alerts"],
  },
  {
    id: "copernicus-gfm",
    name: "Copernicus Emergency / GFM",
    category: "alerts",
    purpose: "Observed flood extent and EMS mapping products",
    officialUrl: "https://emergency.copernicus.eu/",
    attribution: "Copernicus Emergency Management Service",
    provider: "Copernicus",
    usedFor: ["Flood extent", "CEMS activations"],
  },
  {
    id: "usgs-emsc",
    name: "USGS / EMSC",
    category: "alerts",
    purpose: "Earthquake catalogues",
    officialUrl: "https://earthquake.usgs.gov/",
    attribution: "USGS / EMSC",
    provider: "USGS / EMSC",
    usedFor: ["Earthquakes"],
  },
  {
    id: "nasa-lhasa",
    name: "NASA LHASA",
    category: "alerts",
    purpose: "Landslide likelihood nowcast",
    officialUrl: "https://gpm.nasa.gov/landslides/projects.html",
    attribution: "NASA LHASA",
    provider: "NASA",
    usedFor: ["Landslide likelihood"],
  },
  {
    id: "aws-terrarium",
    name: "AWS Terrain Tiles (Terrarium)",
    category: "elevation",
    purpose: "DEM for hillshade / 3D terrain",
    officialUrl: "https://github.com/tilezen/joerd/blob/master/docs/formats.md",
    attribution: "Mapzen / AWS Terrain Tiles",
    provider: "AWS / Mapzen",
    usedFor: ["Relief", "3D terrain"],
  },
  {
    id: "wikimedia",
    name: "Wikimedia Commons / Wikidata",
    category: "media",
    purpose: "Entity enrichment images and identifiers",
    officialUrl: "https://www.wikidata.org/",
    attribution: "Wikimedia contributors",
    provider: "Wikimedia",
    usedFor: ["Photo markers", "Entity panels"],
  },
  {
    id: "maplibre",
    name: "MapLibre GL JS",
    category: "other",
    purpose: "Interactive map rendering engine",
    officialUrl: "https://maplibre.org/",
    attribution: "MapLibre",
    licenseUrl: "https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt",
    provider: "MapLibre",
    usedFor: ["Map client"],
  },
] as const;

export function getDataSourcesByCategory(): Record<
  DataSourceCategory,
  DataSourceDefinition[]
> {
  const out = {} as Record<DataSourceCategory, DataSourceDefinition[]>;
  for (const source of DATA_SOURCES_REGISTRY) {
    if (!out[source.category]) out[source.category] = [];
    out[source.category].push(source);
  }
  return out;
}
