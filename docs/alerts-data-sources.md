# Alert data sources

The alerts section separates official warnings, impact estimates, satellite
observations and forecast-model data. A successful HTTP response alone never
changes the nature of a datum.

| Source | Data | Refresh | Nature | Attribution | Potential delay and limits |
| --- | --- | ---: | --- | --- | --- |
| Meteoalarm / EUMETNET members | National severe-weather warnings and official vigilance geometries | 5 min | Official warning / forecast area | Meteoalarm, EUMETNET members, CC BY 4.0 | The protected EDR endpoint requires `METEOALARM_API_TOKEN`. Without it, the connector reports `misconfigured` and the layer remains empty. A vigilance polygon is not an observed impact area. |
| GDACS | Major floods and tropical cyclones, alert level and supplied event geometries | 10 min | Impact estimate | GDACS, European Commission JRC and United Nations | Events are filtered to the product's European scope. Track, forecast track and uncertainty cone are shown only when GDACS supplies them. |
| Copernicus EMS Global Flood Monitoring | Sentinel-1 observed flood extent, acquisition timestamp and WMS-T imagery | 15 min | Satellite observation | European Union, Copernicus Emergency Management Service | The connector reads the live WMS GetCapabilities document and only enables `mapserver:gfm_observed_flood_extent_group_layer` when present. Acquisition, processing and publication are not instantaneous. This is not a hydrological forecast. |
| Open-Meteo ECMWF API | 10 m wind speed, meteorological origin direction and gusts | 15 min | Forecast model | Open-Meteo and ECMWF IFS | Requests are server-side, validated and limited to 20 coordinates. Wind arrows show airflow, opposite to the meteorological origin direction. Wind does not predict wildfire spread. |
| GDACS / FIRMS / EFFIS | Existing wildfire events, satellite detections and burned-area products | Existing intervals | Impact estimate / satellite observation | Attribution remains as displayed in the existing wildfire panels | The multirisk layer adapts existing wildfire data without replacing its operational models, caches or official-source workflow. |

## Failure behaviour

Each connector reports `operational`, `delayed`, `unavailable` or
`misconfigured`. A provider failure does not clear the last successful payload
and does not disable other alert providers. Requests use bounded timeouts,
central polling and cache headers; no marker starts its own polling loop.

The Copernicus tile proxy accepts only validated tile coordinates and the
timestamp obtained from the fixed GetCapabilities source. It cannot proxy an
arbitrary URL.

## Public-information disclaimer

The application facilitates access to public information but does not replace
local authorities, emergency services or national meteorological services.
