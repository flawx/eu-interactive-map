-- Historical numeric observations for wildfire incidents (satellite, GDACS, EFFIS).
-- Access is intended only via Next.js server routes using the service role key.

create table if not exists public.wildfire_incident_observations (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null,
  source text not null,
  observation_type text not null,
  observed_at timestamptz not null,
  area_hectares double precision,
  area_is_approximate boolean not null default true,
  detection_count integer,
  alert_level text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wildfire_incident_observations_type_check
    check (
      observation_type in (
        'firms_active_detection',
        'firms_seven_day_history',
        'effis_burned_area',
        'gdacs_reported_area',
        'gdacs_alert_level'
      )
    ),
  constraint wildfire_incident_observations_area_check
    check (area_hectares is null or area_hectares >= 0),
  constraint wildfire_incident_observations_detection_count_check
    check (detection_count is null or detection_count >= 0),
  constraint wildfire_incident_observations_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index if not exists wildfire_incident_observations_incident_id_idx
  on public.wildfire_incident_observations (incident_id);

create index if not exists wildfire_incident_observations_observed_at_idx
  on public.wildfire_incident_observations (observed_at desc);

create unique index if not exists wildfire_incident_observations_dedupe_uidx
  on public.wildfire_incident_observations (
    incident_id,
    source,
    observation_type,
    observed_at
  );

alter table public.wildfire_incident_observations enable row level security;

comment on table public.wildfire_incident_observations is
  'Time-stamped numeric wildfire observations per source. No public writes; never invent empty observations.';
