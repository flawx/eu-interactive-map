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
| USGS Earthquake Hazards Program | Global real-time earthquake GeoJSON summary and event details | 2 min | Instrumental observation | USGS | European epicentres are selected from the global feeds. Automatic solutions, magnitudes, depths and intensities can be revised. |
| EMSC / SeismicPortal | European FDSN event catalogue and contributor solutions | 2 min | Instrumental observation / corroboration | European-Mediterranean Seismological Centre | Used to enrich or corroborate European events without requiring a permanent WebSocket. Provider values remain separately attributed. |
| GDACS geological hazards | Significant earthquakes and major volcanic events with indicative impact levels | 10 min | Impact estimate | GDACS, European Commission JRC and United Nations | Only events with a European epicentre or explicit European impact are kept. Population exposure and severity are estimates, not confirmed impact reports. |

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

## Earthquakes and volcanic activity

The earthquake layer uses the USGS real-time GeoJSON feeds as its primary
instrumental source. For the last 24 hours it normally displays magnitude 2.5
and above; felt events can also remain visible when a reliable provider reports
them. The seven-day view displays magnitude 4 and above, felt events, and all
European GDACS orange or red impact events. These display thresholds reduce
map saturation and do not classify an earthquake as dangerous.

EMSC FDSN data provides a European comparison for time, epicentre, magnitude,
depth and source attribution. A USGS, EMSC or GDACS record is merged only when
there is one unambiguous counterpart within all initial thresholds:

- event time difference no greater than 120 seconds;
- epicentre distance no greater than 40 kilometres;
- magnitude difference no greater than 0.5;
- depth must not be manifestly incompatible.

If several candidates pass, none is merged automatically. The primary value is
shown with its source, and other provider magnitudes, update times, identifiers
and links remain separate. Magnitude measures released seismic energy;
reported or instrumental intensity describes shaking at a location; GDACS
severity is an indicative impact estimate. They are not interchangeable.

USGS `status=automatic` is displayed as an automatic solution and
`status=reviewed` as a reviewed solution. Initial coordinates, magnitude,
depth, intensity and tsunami indicators can change after review. The map does
not predict earthquakes, aftershocks, damage, evacuation areas or safety
perimeters.

The volcanic layer is not a static inventory of European volcanoes. It shows
only current or recently updated GDACS `VO` events that have a European
location or explicit European impact. Eruption, unrest and ash emission are
kept distinct when the source supplies enough information. The application
does not infer plume direction, national alert levels, evacuation zones,
eruption end dates or explosivity indices.

USGS, EMSC and GDACS calls are server-side, time-bounded, deduplicated and
cached. A stale successful payload can remain visible with a delayed status
when a provider is temporarily unavailable. Empty European results are shown
as “no event”, not as a provider failure.

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
associated satellite observation, a cyclone track, an ended alert, three
earthquake magnitudes with automatic/reviewed and multi-provider variants, an
active volcano and an ash emission. A
visible “Demonstration data” badge prevents confusion. Demo data is ignored
when `NODE_ENV=production`.

## Public-information disclaimer

The application facilitates access to public information but does not replace
local authorities, emergency services or national meteorological services.

## Landslide likelihood and emergency-mapping activations

NASA LHASA is displayed as a modelled landslide likelihood, never as an
observed or confirmed incident. The current NASA Earthdata
`LHASA_Hazard_Today` image service is refreshed by the connector every 30
minutes. Moderate and high thresholds stay separate, and imagery is requested
only for tiles intersecting the projectâ€™s European perimeter. The public
service currently exposes no reliable acquisition timestamp in its metadata;
the interface reports that limitation instead of inventing a validity time,
affected place, impact area or casualty count.

Copernicus EMS Rapid Mapping activations are a different product. An activation
is an emergency-mapping request, not an exhaustive incident register or, by
itself, official confirmation that an incident is ongoing. Categories are
matched explicitly, European scope is applied centrally, and open activations
remain distinct from recently closed ones. Products can arrive several hours
after an event.

An AOI is shown as an analysis area and is never presented as the observed
event extent. Delineation, grading, monitoring and reference products remain
separate; only their latest feasible public versions are retained. Official
GeoJSON, vector-tile and COG links can be shown, but archives are not
downloaded automatically. Areas and impacts appear only when the official
product supplies a known meaning and unit, or an official event geometry
supports the calculation.

eMARS is documentary only and is not polled as a real-time feed. A report link
may be attached only after a verified match of country, date, establishment and
incident type; similarity of a city name is insufficient.

Both connectors degrade safely: LHASA layers disappear while provider state
remains visible, and reliable local Copernicus activation data is rendered
immediately without an endless loading state. Attributions are NASA LHASA and
European Union, Copernicus Emergency Management Service.

## Live road traffic

The first road-traffic provider is TomTom Traffic Orbis v2. Traffic flow and
incident overview use official vector tiles; the detail endpoint supplies
individual incidents and their exact Point, LineString or MultiLineString
geometry when available. The application does not manufacture an affected
radius or extend a point incident along a road.

TomTom updates its traffic model approximately every minute. The server reuses
the provider traffic-model identifier for a short lifetime so that flow and
incident tiles remain temporally coherent. Browser requests target only local
application routes. `TOMTOM_API_KEY` is read on the server and sent in the
`TomTom-Api-Key` header; it is never placed in a public tile URL or client
payload. When the key is absent the legend reports configuration required and
the layers cannot be enabled.

The public map separates four concepts:

- live observed traffic flow, coloured from fluid to stationary traffic;
- current incidents such as accidents, congestion, hazards and broken-down
  vehicles;
- closures and restrictions;
- current or provider-announced planned roadworks.

Delay, incident length, current speed, free-flow speed, travel time, lane
counts, emergency-service presence and estimated clearance are shown only when
the provider supplies those exact fields. An incident end time is a provider
estimate, not a guarantee that normal traffic has resumed. Weather-related
road conditions are descriptive observations and do not replace official road
authority or weather warnings.

Viewport detail requests are debounced, cancelled when superseded, restricted
to the central project Europe perimeter, and capped to the provider's maximum
detail area. Vector tile requests outside Europe return an empty successful
tile without contacting TomTom. Provider throttling and outages are represented
as a connector state instead of triggering per-tile error storms.

The provider interface is intentionally independent from TomTom so national
DATEX II feeds can be integrated later without changing the normalized alert
model. Their identifiers and claims must remain separately attributed.

In development, `ALERTS_DEMO_MODE=true` enables deterministic flow, accident,
major congestion, closure, lane closure, current and planned roadworks,
broken-down vehicle, ended incident and unavailable-provider scenarios. A
visible demonstration badge prevents these fixtures from being confused with
production data.
