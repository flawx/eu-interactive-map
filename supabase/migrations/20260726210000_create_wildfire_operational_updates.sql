-- Operational intelligence updates for GDACS wildfire incidents.
-- Access is intended only via Next.js server routes using the service role key.
-- Never invent operational facts; store only sourced records.

create table if not exists public.wildfire_operational_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null,
  external_id text,
  category text not null,
  title text,
  body text,
  status text,
  source_type text not null,
  source_name text not null,
  source_url text,
  verification_status text not null,
  published_at timestamptz,
  effective_from timestamptz,
  expires_at timestamptz,
  last_verified_at timestamptz,
  location_name text,
  geometry_geojson jsonb,
  structured_data jsonb not null default '{}'::jsonb,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wildfire_operational_updates_category_check
    check (
      category in (
        'cause',
        'situation',
        'resources',
        'authority_message',
        'evacuation_order',
        'safety_instruction',
        'gathering_point',
        'shelter',
        'reception_center',
        'road_closure',
        'media',
        'community'
      )
    ),
  constraint wildfire_operational_updates_source_type_check
    check (
      source_type in (
        'authority',
        'emergency_service',
        'satellite',
        'gdacs',
        'media',
        'community',
        'manual'
      )
    ),
  constraint wildfire_operational_updates_verification_status_check
    check (
      verification_status in (
        'official',
        'verified',
        'unverified',
        'disputed'
      )
    ),
  constraint wildfire_operational_updates_source_url_https_check
    check (source_url is null or source_url like 'https://%'),
  constraint wildfire_operational_updates_geometry_object_check
    check (
      geometry_geojson is null
      or jsonb_typeof(geometry_geojson) = 'object'
    ),
  constraint wildfire_operational_updates_structured_data_object_check
    check (jsonb_typeof(structured_data) = 'object')
);

create index if not exists wildfire_operational_updates_incident_id_idx
  on public.wildfire_operational_updates (incident_id);

create index if not exists wildfire_operational_updates_published_at_idx
  on public.wildfire_operational_updates (published_at desc);

create index if not exists wildfire_operational_updates_category_idx
  on public.wildfire_operational_updates (category);

create unique index if not exists wildfire_operational_updates_incident_external_uidx
  on public.wildfire_operational_updates (incident_id, external_id)
  where external_id is not null;

alter table public.wildfire_operational_updates enable row level security;

comment on table public.wildfire_operational_updates is
  'Sourced operational updates for wildfire incidents (evacuations, shelters, media, community). No public writes.';
