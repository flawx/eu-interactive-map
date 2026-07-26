-- Durable cache of the last valid EFFIS burned-area perimeter per GDACS incident.
-- Access is intended only via Next.js server routes using the service role key.

create table if not exists public.effis_burned_area_snapshots (
  incident_id text primary key,
  country_code text,
  source_layer text not null,
  geometry_geojson jsonb not null,
  area_hectares double precision,
  fire_date timestamptz,
  final_date timestamptz,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  source_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint effis_burned_area_snapshots_geometry_object_check
    check (jsonb_typeof(geometry_geojson) = 'object'),
  constraint effis_burned_area_snapshots_area_hectares_check
    check (area_hectares is null or area_hectares >= 0),
  constraint effis_burned_area_snapshots_source_url_https_check
    check (source_url like 'https://%')
);

alter table public.effis_burned_area_snapshots enable row level security;

comment on table public.effis_burned_area_snapshots is
  'Last valid EFFIS burned-area geometry associated with a GDACS wildfire incident.';
