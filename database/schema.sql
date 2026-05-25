-- ============================================================
-- GMaps Scraper — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor to initialise the DB
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── searches ────────────────────────────────────────────────────────────────

create table if not exists public.searches (
  id               uuid primary key default uuid_generate_v4(),
  search_key       text not null unique,          -- e.g. "hotels-ahmedabad"
  category         text not null,
  location         text not null,
  force_refresh    boolean not null default false,
  total_results    integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  cache_expiry_at  timestamptz not null
);

create index if not exists idx_searches_search_key   on public.searches (search_key);
create index if not exists idx_searches_category     on public.searches (category);
create index if not exists idx_searches_created_at   on public.searches (created_at desc);
create index if not exists idx_searches_cache_expiry on public.searches (cache_expiry_at);

comment on table  public.searches                  is 'One row per unique (category, location) search. Drives cache logic.';
comment on column public.searches.search_key       is 'Normalised lowercase key, e.g. hotels-ahmedabad';
comment on column public.searches.cache_expiry_at  is 'Rows older than this are treated as stale and re-scraped';

-- ─── businesses ──────────────────────────────────────────────────────────────

create table if not exists public.businesses (
  id                 uuid primary key default uuid_generate_v4(),
  search_id          uuid not null references public.searches (id) on delete cascade,
  business_name      text not null,
  business_category  text not null,
  rating             numeric(3, 1),
  total_reviews      integer,
  address            text,
  phone_number       text,
  website            text,
  google_maps_url    text,
  latitude           numeric(10, 7),
  longitude          numeric(10, 7),
  working_hours      jsonb,
  thumbnail_image    text,
  scraped_at         timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_businesses_search_id      on public.businesses (search_id);
create index if not exists idx_businesses_business_name  on public.businesses using gin (to_tsvector('english', business_name));
create index if not exists idx_businesses_rating         on public.businesses (rating desc nulls last);
create index if not exists idx_businesses_category       on public.businesses (business_category);
create index if not exists idx_businesses_phone          on public.businesses (phone_number) where phone_number is not null;

comment on table  public.businesses              is 'Individual business records linked to a search.';
comment on column public.businesses.working_hours is 'JSONB map of day -> hours string, e.g. {"Monday": "9am–6pm"}';

-- ─── exports ────────────────────────────────────────────────────────────────

create table if not exists public.exports (
  id          uuid primary key default uuid_generate_v4(),
  search_id   uuid not null references public.searches (id) on delete cascade,
  export_type text not null check (export_type in ('xlsx', 'csv')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_exports_search_id  on public.exports (search_id);
create index if not exists idx_exports_created_at on public.exports (created_at desc);

comment on table public.exports is 'Audit log of every export operation.';

-- ─── Row-Level Security ─────────────────────────────────────────────────────
-- The backend uses the service-role key, which bypasses RLS.
-- Enabling RLS still protects the anon/public key from reading data directly.

alter table public.searches   enable row level security;
alter table public.businesses enable row level security;
alter table public.exports    enable row level security;

-- Service-role policy (bypasses RLS automatically — no explicit policy needed)
-- Deny all access via anon key:
create policy "Deny anon access to searches"   on public.searches   for all using (false);
create policy "Deny anon access to businesses" on public.businesses for all using (false);
create policy "Deny anon access to exports"    on public.exports    for all using (false);

-- ─── Updated-at trigger ─────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_searches_updated_at
  before update on public.searches
  for each row execute procedure public.set_updated_at();

create trigger trg_businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();
