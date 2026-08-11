/**
 * WiFi4EU hotspots — curated redistributable fixture.
 *
 * DATA ACCESS REALITY: there is NO officially redistributable pan-EU WiFi4EU
 * hotspot API published by the European Commission for third-party apps.
 * The only official discovery channels are the WiFi4EU mobile app and the
 * wifi4eu.ec.europa.eu portal (interactive map, not a public bulk API).
 *
 * What IS redistributable is *municipal* open data published by local
 * authorities that received a WiFi4EU grant and chose to publish their own
 * access-point inventory under an open licence. This fixture currently
 * contains the Dublin City Council WiFi4EU access points, as published on
 * the Smart Dublin / Dublinked open data portal (data.smartdublin.ie,
 * mirrored on data.gov.ie), under a Creative Commons Attribution licence.
 * Source dataset: "WiFi4EU Access Points DCC" (36 records, fetched via the
 * CKAN datastore_search API), https://data.smartdublin.ie/dataset/wifi4eu-access-points-dcc
 *
 * This is a genuine but LIMITED seed sample — it does not attempt to cover
 * every EUIM city with a WiFi4EU grant (~8,000+ municipalities were funded
 * EU-wide). Additional municipal open data feeds (Helsinki, Tallinn, other
 * Dublin-region councils, etc.) can be folded in as separate curated blocks
 * in a future commit once their redistribution terms are confirmed —
 * placeholder coordinates or invented hotspots are never added here.
 */

import type { WifiHotspot } from "./types";
import { WIFI4EU_HOTSPOT_SOURCE_IDS } from "./types";

function dublin(
  slug: string,
  name: string,
  address: string,
  longitude: number,
  latitude: number,
  indoorOutdoor: WifiHotspot["indoorOutdoor"],
  locationType: string,
): WifiHotspot {
  return {
    id: `wifi4eu-dublin-${slug}`,
    name,
    address,
    municipality: "Dublin",
    countryCode: "IE",
    longitude,
    latitude,
    indoorOutdoor,
    locationType,
    programme: "WiFi4EU",
    sourceIds: [...WIFI4EU_HOTSPOT_SOURCE_IDS],
  };
}

/** Dublin City Council WiFi4EU access points (CC-BY, data.smartdublin.ie). */
export const WIFI4EU_FIXTURE_HOTSPOTS: readonly WifiHotspot[] = [
  dublin("artane-coolock-frc", "Artane Coolock Family Resource Centre", "55 Gracefield Road, Artane, D05 V1Y2", -6.1975778, 53.3821231, "indoor", "Other"),
  dublin("arts-office-the-lab", "Arts Office, The Lab", "The Lab, Liberty Corner, Foley Street, Dublin, D01 N5H6", -6.2530722, 53.3513895, "indoor", "Museum/Culture Centre"),
  dublin("ballygall-community-centre", "Ballygall Community Centre", "Drapier Rd, Ballygall, D11 PX81", -6.2739057, 53.3848589, "indoor", "Other"),
  dublin("ballymun-axis-centre", "Ballymun Axis Centre", "Main Street, Ballymun, D09 Y9W0", -6.2628023, 53.3961068, "indoor", "Museum/Culture Centre"),
  dublin("ballymun-civic-centre", "Ballymun Civic Centre", "Main Street, Ballymun, D09 C8P5", -6.2634118, 53.3954236, "indoor_outdoor", "Other"),
  dublin("barnardo-square", "Barnardo Square", "Square adjacent to No 3 Palace St, Dublin 2, D02 T277", -6.2667095, 53.3439955, "outdoor", "Square"),
  dublin("belcamp-village-centre", "Belcamp Village Centre", "The Bell Building, Belcamp Village Centre, Belcamp, D17 E027", -6.1950483, 53.4014465, "indoor", "Other"),
  dublin("bradog-youth-services", "Bradóg Youth Services", "34 Dominick Place, Dublin, D01 H6Y1", -6.2660755, 53.3528338, "indoor", "Other"),
  dublin("cabbage-patch-garden", "Cabbage Patch Garden", "Cathedral Lane, Dublin, D08 XH51", -6.2708493, 53.3371136, "outdoor", "Park"),
  dublin("casadh", "Casadh", "45 Crumlin Road, Crumlin, D12 YK28", -6.2952013, 53.3311497, "indoor", "Other"),
  dublin("cherry-orchard-community-centre", "Cherry Orchard Community Centre", "The Orchard Community Development Centre, Cherry Orchard Grove, Cherry Orchard, D10 HO24", -6.3730454, 53.3366351, "indoor", "Other"),
  dublin("cherry-orchard-equine-centre", "Cherry Orchard Equine Centre", "Cherry Orchard Green, Dublin, D10 XW08", -6.3796384, 53.3381895, "indoor", "School / Education or Research Centre / University"),
  dublin("cherry-orchard-frc", "Cherry Orchard Family Resource Centre", "The Bungalow, 28 Elmdale Drive, Cherry Orchard, D10 K763", -6.3744093, 53.3393486, "indoor", "Other"),
  dublin("crumlin-united-fc", "Crumlin United FC", "Willie Pearse Park, Windmill Road, Crumlin, D12 FH60", -6.3130448, 53.3241791, "indoor", "Sports Hall / Stadium"),
  dublin("f2-centre", "F2 Centre", "3 Reuben Plaza, Rialto, D08 PV0H", -6.2933195, 53.3372079, "indoor_outdoor", "Other"),
  dublin("familibase-frc", "Familibase Family Resource Centre", "Blackditch Road, Ballyfermot, D10 F439", -6.3586905, 53.3415907, "indoor", "School / Education or Research Centre / University"),
  dublin("friends-of-the-elderly", "Friends of the Elderly", "25 Bolton Street, Dublin, D01 V6H9", -6.2684582, 53.3525479, "indoor", "Other"),
  dublin("harolds-cross-park", "Harold's Cross Park", "Noshington Café, Harold's Cross Road, Harold's Cross, D6W PF59", -6.2795224, 53.3241915, "outdoor", "Park"),
  dublin("hugh-lane-gallery", "Hugh Lane Gallery", "Charlemont House, Parnell Square N, Rotunda, Dublin 1, D01 F2X9", -6.258832298, 53.35249859, "indoor", "Other"),
  dublin("irishtown-stadium", "Irishtown Stadium", "Seapoint Terrace, Strand Street, Dublin, D04 KN77", -6.2199322, 53.3404264, "indoor", "Sports Hall / Stadium"),
  dublin("national-drug-treatment-centre", "National Drug Treatment Centre", "McCarthy Centre, 30-31 Pearse St, Dublin, D02 NY26", -6.2530417, 53.3450253, "indoor", "Health Centre / Hospital"),
  dublin("north-wall-cdp", "North Wall Community Development Project", "Lower Sheriff Street, Dublin, D01 K6V0", -6.2429478, 53.3506166, "indoor", "School / Education or Research Centre / University"),
  dublin("oblate-basketball-club", "Oblate Basketball Club", "Tyrconnell Road, Inchicore, D08 C6TW", -6.3260525, 53.3375567, "indoor_outdoor", "Sports Hall / Stadium"),
  dublin("our-ladys-hall", "Our Lady's Hall", "212/218 Mourne Road, Drimnagh, D12 DW68", -6.3203402, 53.3309089, "indoor", "Other"),
  dublin("ozanam-house-rc", "Ozanam House Resource Centre", "53 Mountjoy Square West, Dublin, D01 T6W6", -6.2580019, 53.3555023, "indoor", "Other"),
  dublin("robert-emmet-cdp", "Robert Emmet Community Developments Project", "Usher Street, Dublin, D08 T202", -6.2791935, 53.3453936, "indoor", "Other"),
  dublin("solas-project", "Solas Project", "80 & 82 The Coombe, Dublin 8, D08 NN93", -6.2776971, 53.3396959, "indoor", "Other"),
  dublin("st-andrews-community-centre", "St Andrew's Community Centre", "468 South Circular Road, Dublin 8, D08 H51F", -6.2941541, 53.3353343, "indoor", "Other"),
  dublin("st-john-bosco-community-centre", "St John Bosco Community Centre", "Davitt Road, Drimnagh, Dublin 12, D12 EDN2", -6.3181798, 53.3352346, "indoor", "Other"),
  dublin("st-marys-youth-club", "St Mary's Youth Club", "Strangford Road, East Wall, D03 YY17", -6.2363131, 53.3559837, "indoor", "Other"),
  dublin("the-mansion-house", "The Mansion House", "Dawson Street, Dublin 2, D02 AF30", -6.2580286, 53.3403041, "indoor", "Other"),
  dublin("turas-training", "Turas Training", "Unit 1C, Bluebell Business Centre, Dublin 12, D12 KP22", -6.3403586, 53.3292966, "indoor", "School / Education or Research Centre / University"),
  dublin("whitehall-scout-group", "Whitehall Scout Group", "134A Larkhill Road, Whitehall, D09 WV66", -6.2495883, 53.3880643, "indoor", "Sports Hall / Stadium"),
  dublin("wood-quay-amphitheatre", "Wood Quay Amphitheatre", "Civic Offices, Wood Quay, Dublin, D08 RF3F", -6.2709885, 53.3444103, "indoor", "Square"),
  dublin("wood-quay-atrium", "Wood Quay Atrium & CEO Office", "Civic Offices, Wood Quay, Dublin, D08 RF3F", -6.2712031, 53.3448627, "indoor", "Town Hall / Administrative Building"),
  dublin("ymca", "YMCA", "1 Whitefriars, Aungier Street, Dublin 2, D02 AE40", -6.2664638, 53.3393582, "indoor", "Sports Hall / Stadium"),
];

export function getWifi4EuHotspotById(id: string): WifiHotspot | undefined {
  return WIFI4EU_FIXTURE_HOTSPOTS.find((hotspot) => hotspot.id === id);
}
