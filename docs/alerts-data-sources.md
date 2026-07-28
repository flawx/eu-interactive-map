# Alert data sources

The alerts section separates official warnings, impact estimates, satellite
observations and forecast-model data. A successful HTTP response alone never
changes the nature of a datum.

| Source | Data | Refresh | Nature | Attribution | Potential delay and limits |
| --- | --- | ---: | --- | --- | --- |
| Meteoalarm / EUMETNET members | National severe-weather warnings and official vigilance geometries | 5 min | Official warning / forecast area | Meteoalarm, EUMETNET members, CC BY 4.0 | The protected EDR endpoint requires `METEOALARM_API_TOKEN`. Without it, the connector reports `misconfigured` and the layer remains empty. A vigilance polygon is not an observed impact area. |
| GDACS | Major floods and tropical cyclones, alert level and supplied event geometries | 10 min | Impact estimate | GDACS, European Commission JRC and United Nations | Events are filtered to the product's European scope. Track, forecast track and uncertainty cone are shown only when GDACS supplies them. |
| Copernicus EMS Global Flood Monitoring | Sentinel-1 observed flood extent, acquisition timestamp, WMS-T imagery and GFM STAC/COG point inspection | 15 min | Satellite observation | European Union, Copernicus Emergency Management Service | The connector reads live WMS capabilities and only enables `mapserver:gfm_observed_flood_extent_group_layer` when present. Acquisition, processing and publication are not instantaneous. This is not a hydrological forecast or confirmation of an incident. |
| Open-Meteo ECMWF API | 10 m wind speed, meteorological origin direction and gusts | 15 min | Forecast model | Open-Meteo and ECMWF IFS | Requests are server-side, validated and limited to 20 coordinates. Wind arrows show airflow, opposite to the meteorological origin direction. Wind does not predict wildfire spread. |
| GDACS / FIRMS / EFFIS | Existing wildfire events, satellite detections and burned-area products | Existing intervals | Impact estimate / satellite observation | Attribution remains as displayed in the existing wildfire panels | The multirisk layer adapts existing wildfire data without replacing its operational models, caches or official-source workflow. |

## Failure behaviour

Each connector reports `operational`, `delayed`, `unavailable` or
`misconfigured`. A provider failure does not clear the last successful payload
and does not disable other alert providers. Requests use bounded timeouts,
central polling and cache headers; no marker starts its own polling loop.

The Copernicus tile proxy accepts only validated tile coordinates and a
timestamp validated against the live GetCapabilities time dimension. It parses
the advertised values or interval and selects the latest actual step; it never
manufactures a midnight timestamp. The current interval is 12-hourly and the
exact acquisition hour is retained.

The public GFM WMS distinguishes these products:

- **Sentinel-1 Footprint**: image-scene boundaries, not flooding;
- **Sentinel-1 Schedule**: planned acquisitions, not flooding;
- **Observed Flood Extent**: automatically classified flood pixels;
- **Reference/Observed Water**: normal or total water, not equivalent to flood;
- **Advisory/Exclusion masks**: quality and classification limitations.

Only Observed Flood Extent is shown publicly. Footprint and schedule layers are
not present in the public legend. The provider's group-layer rendering can
contain green/red scene-outline colours; the proxy removes those colours and
keeps only the documented magenta/blue-teal flood-detection palette.

GFM is global, while the application is European. Vector events use the same
country scope as the rest of the map. Raster sources have European bounds. A
tile outside those bounds is never requested upstream and receives a valid
transparent 256 × 256 PNG with HTTP 200. Partially intersecting tiles are
masked to the project bounds.

The raster source has `maxzoom: 12`. MapLibre overscales that level at closer
zooms. Requests above the supported proxy zoom also return a transparent PNG,
so zooming cannot create repeated HTTP errors. Provider no-data, timeout and
known upstream errors have the same non-breaking tile response with an
`X-Alert-Tile-Status` diagnostic header; permanent configuration errors are
logged once.

The WMS Observed Flood Extent layer advertises `queryable=0`, so the
application does not invent details from screen colours. A click is checked
instead against the official EODC GFM STAC catalogue and the corresponding
Observed Flood Extent Cloud Optimized GeoTIFF through the official TiTiler
point endpoint. A panel opens only when the official pixel value is `1`
(flood). It shows acquisition, publication, satellite and likelihood when
available, and explicitly warns that detection is automated.

GDACS and GFM remain separate: GDACS supplies named major events and indicative
impact estimates; GFM supplies satellite observations. IDs and source claims
are never merged.

## Meteoalarm configuration

Set `METEOALARM_API_TOKEN` only on the server. If it is absent, the connector
reports `misconfigured`, the legend shows “Configuration required”, and the
public toggle cannot be enabled. The token is never included in client data.
The versioned preference migration gives all eight phenomenon filters their
documented default `true` value only when the corresponding legacy key is
absent; explicit stored choices are preserved.

## Activity windows and development demonstration

The alert status panel can show active events, the last 24 hours or the last
72 hours. Ended events are attenuated and are never counted as active.

For deterministic local UI testing, set `ALERTS_DEMO_MODE=true` while running a
development build. Fixtures cover an orange weather warning, a GDACS flood, an
associated satellite observation, a cyclone track and an ended alert. A
visible “Demonstration data” badge prevents confusion. Demo data is ignored
when `NODE_ENV=production`.

## Public-information disclaimer

The application facilitates access to public information but does not replace
local authorities, emergency services or national meteorological services.
