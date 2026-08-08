# European route planner

## Architecture

The route planner is provider-based:

- UI components talk only to `/api/routing/*` and the normalized model in `lib/routing/types.ts`.
- `lib/routing/providers/tomTomRouting.ts` implements TomTom Routing API v1.
- `lib/routing/providers/providerRegistry.ts` returns the active provider and can later host HERE, OTP, rail or air providers.

```
RoutePlannerPanel
  → POST /api/routing/calculate
    → geofence validation
    → TomTomRoutingProvider
    → normalize + local fuel/energy costs
    → optional corridor traffic incidents
```

## TomTom V1

Endpoint: `https://api.tomtom.com/routing/1/calculateRoute/{locations}/json`

Server-only key: `TOMTOM_API_KEY` (never `NEXT_PUBLIC_TOMTOM_API_KEY`).

Modes:

| Product mode | TomTom `travelMode` | Traffic |
|---|---|---|
| car | car | true |
| bicycle | bicycle | false |
| pedestrian | pedestrian | false |

Important: TomTom `travelMode=bus` means a road bus vehicle. It is **not** public transit and must not be used as such.

Requested sections include traffic, tollRoad, ferry, tunnel, motorway, unpaved, lowEmissionZone, country.

Alternatives: up to 2 (`maxAlternatives=2`).

## Geographic scope

Allowed points and route geometries reuse existing project data:

- `UNESCO_MAP_COUNTRY_CODES`
- `isCountryAllowedInProject`
- `isPointInsideProjectEurope`

Routes whose geometry or country sections leave the supported area are rejected even if origin and destination alone are valid.

## Costs

- Fuel / energy estimates are computed locally from the vehicle profile (`eu-map-routing-vehicle-v1` in `localStorage`).
- Toll sections are detected from TomTom, but `estimatedCosts.tollExact` is always `null` in V1.
- UI copy: “exact price not available”.

## Traffic & incidents

Car routes use TomTom traffic timings when provided. Incidents along the route are loaded from the existing TomTom traffic provider using a corridor around the polyline (not a Europe-wide dump).

## Shareable URL

`?route=` encodes origin, destination, waypoints, mode, preference and avoid flags. Geometry and API keys are never put in the URL. Opening a shared link recalculates the route.

## Roadmap

### PHASE 2
Public transit / train (HERE Intermodal, OTP, railway APIs).

### PHASE 3
Long-distance air and ferry as first-class modes.

### PHASE 4
Exact toll pricing and cost comparison (e.g. HERE Toll Costs).

### PHASE 5
Active GPS navigation and automatic rerouting.
