-- Durable cache of NASA FIRMS detection footprints associated with GDACS incidents.
-- Access is intended only via Next.js server routes using the service role key.

create table if not exists public.firms_incident_snapshots (
  incident_id text primary key,
  incident_name text not null,
  geometry_geojson jsonb not null,
  bbox jsonb not null,
  detection_count integer not null,
  sensors text[] not null default '{}'::text[],
  approximate_area_hectares double precision,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  source text not null,
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  constraint firms_incident_snapshots_geometry_object_check
    check (jsonb_typeof(geometry_geojson) = 'object'),
  constraint firms_incident_snapshots_bbox_array_check
    check (jsonb_typeof(bbox) = 'array'),
  constraint firms_incident_snapshots_detection_count_check
    check (detection_count >= 1),
  constraint firms_incident_snapshots_area_check
    check (
      approximate_area_hectares is null
      or approximate_area_hectares >= 0
    ),
  constraint firms_incident_snapshots_source_url_https_check
    check (source_url is null or source_url like 'https://%')
);

alter table public.firms_incident_snapshots enable row level security;

comment on table public.firms_incident_snapshots is
  'Last valid NASA FIRMS detection footprints associated with a GDACS wildfire incident.';
