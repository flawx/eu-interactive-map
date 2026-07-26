-- Durable cache of NASA FIRMS detections aged 24h–7d, associated with GDACS incidents.
-- Access is intended only via Next.js server routes using the service role key.

create table if not exists public.firms_recent_detection_snapshots (
  incident_id text primary key,
  incident_name text,
  geometry_geojson jsonb not null,
  bbox jsonb not null,
  detection_count integer not null,
  sensors text[] not null default '{}'::text[],
  approximate_area_hectares double precision,
  period_start timestamptz,
  period_end timestamptz,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  source text not null default 'NASA FIRMS',
  source_url text,
  metadata jsonb not null default '{}'::jsonb,
  constraint firms_recent_detection_snapshots_geometry_object_check
    check (jsonb_typeof(geometry_geojson) = 'object'),
  constraint firms_recent_detection_snapshots_bbox_array_check
    check (jsonb_typeof(bbox) = 'array'),
  constraint firms_recent_detection_snapshots_detection_count_check
    check (detection_count >= 1),
  constraint firms_recent_detection_snapshots_area_check
    check (
      approximate_area_hectares is null
      or approximate_area_hectares >= 0
    ),
  constraint firms_recent_detection_snapshots_source_url_https_check
    check (source_url is null or source_url like 'https://%')
);

alter table public.firms_recent_detection_snapshots enable row level security;

comment on table public.firms_recent_detection_snapshots is
  'NASA FIRMS detection footprints aged 24 hours to 7 days, associated with GDACS wildfire incidents. Not an official burned-area perimeter.';
