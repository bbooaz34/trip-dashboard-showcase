-- ============================================================
-- Black Forest Trip Dashboard — v4 initial schema
-- Run: supabase db push  (or paste into Supabase SQL editor)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── trips ────────────────────────────────────────────────────
create table if not exists trips (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  base_camp_address text,
  base_camp_lat    numeric(9,6),
  base_camp_lng    numeric(9,6),
  created_at       timestamptz not null default now()
);

alter table trips enable row level security;

-- ── trip_members ─────────────────────────────────────────────
create table if not exists trip_members (
  trip_id  uuid not null references trips(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null default 'member' check (role in ('owner', 'member')),
  primary key (trip_id, user_id)
);

alter table trip_members enable row level security;

-- ── groceries ────────────────────────────────────────────────
create table if not exists groceries (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  text        text not null,
  market      text not null default 'Other',
  done        boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid not null references auth.users(id)
);

alter table groceries enable row level security;

-- ── frankfurt_items ──────────────────────────────────────────
create table if not exists frankfurt_items (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  text        text not null,
  done        boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid not null references auth.users(id)
);

alter table frankfurt_items enable row level security;

-- ── notes ────────────────────────────────────────────────────
create table if not exists notes (
  trip_id     uuid primary key references trips(id) on delete cascade,
  body        text not null default '',
  updated_at  timestamptz not null default now(),
  updated_by  uuid not null references auth.users(id)
);

alter table notes enable row level security;

-- ── car_state ────────────────────────────────────────────────
create table if not exists car_state (
  trip_id         uuid primary key references trips(id) on delete cascade,
  tank_capacity_l numeric(5,1) not null default 60,
  fuel_liters     numeric(5,1) not null default 45,
  start_odo_km    integer not null default 0,
  current_odo_km  integer not null default 0,
  updated_at      timestamptz not null default now()
);

alter table car_state enable row level security;

-- ── refuels ──────────────────────────────────────────────────
create table if not exists refuels (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips(id) on delete cascade,
  liters      numeric(5,1) not null,
  odo_km      integer not null,
  refueled_at timestamptz not null default now(),
  created_by  uuid not null references auth.users(id)
);

alter table refuels enable row level security;

-- ── stops ────────────────────────────────────────────────────
create table if not exists stops (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references trips(id) on delete cascade,
  name             text not null,
  category         text not null,
  lat              numeric(9,6) not null,
  lng              numeric(9,6) not null,
  description_html text not null default '',
  position         integer not null default 0
);

alter table stops enable row level security;

-- ============================================================
-- Row-Level Security Policies
-- All tables: trip members can read/write their own trip data
-- ============================================================

-- Helper function: is the current user a member of a trip?
create or replace function is_trip_member(p_trip_id uuid)
returns boolean
language sql security definer
as $$
  select exists (
    select 1 from trip_members
    where trip_id = p_trip_id
      and user_id = auth.uid()
  );
$$;

-- trips
create policy "trip members can view their trip"
  on trips for select
  using (is_trip_member(id));

create policy "trip members can update their trip"
  on trips for update
  using (is_trip_member(id));

-- trip_members
create policy "members can view membership"
  on trip_members for select
  using (user_id = auth.uid() or is_trip_member(trip_id));

-- groceries
create policy "trip members can select groceries"
  on groceries for select using (is_trip_member(trip_id));

create policy "trip members can insert groceries"
  on groceries for insert with check (is_trip_member(trip_id) and created_by = auth.uid());

create policy "trip members can update groceries"
  on groceries for update using (is_trip_member(trip_id));

create policy "trip members can delete groceries"
  on groceries for delete using (is_trip_member(trip_id));

-- frankfurt_items (same pattern)
create policy "trip members can select frankfurt_items"
  on frankfurt_items for select using (is_trip_member(trip_id));

create policy "trip members can insert frankfurt_items"
  on frankfurt_items for insert with check (is_trip_member(trip_id) and created_by = auth.uid());

create policy "trip members can update frankfurt_items"
  on frankfurt_items for update using (is_trip_member(trip_id));

create policy "trip members can delete frankfurt_items"
  on frankfurt_items for delete using (is_trip_member(trip_id));

-- notes
create policy "trip members can select notes"
  on notes for select using (is_trip_member(trip_id));

create policy "trip members can upsert notes"
  on notes for insert with check (is_trip_member(trip_id) and updated_by = auth.uid());

create policy "trip members can update notes"
  on notes for update using (is_trip_member(trip_id));

-- car_state
create policy "trip members can select car_state"
  on car_state for select using (is_trip_member(trip_id));

create policy "trip members can upsert car_state"
  on car_state for insert with check (is_trip_member(trip_id));

create policy "trip members can update car_state"
  on car_state for update using (is_trip_member(trip_id));

-- refuels
create policy "trip members can select refuels"
  on refuels for select using (is_trip_member(trip_id));

create policy "trip members can insert refuels"
  on refuels for insert with check (is_trip_member(trip_id) and created_by = auth.uid());

-- stops (read-only for members; inserted only via seed)
create policy "trip members can select stops"
  on stops for select using (is_trip_member(trip_id));

-- ── Realtime ─────────────────────────────────────────────────
-- Enable realtime on tables that need live sync between phones
alter publication supabase_realtime add table groceries;
alter publication supabase_realtime add table frankfurt_items;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table car_state;
alter publication supabase_realtime add table refuels;
