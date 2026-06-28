-- ============================================================
-- Per-user travel data: each member has their own trip dates and
-- flights. Map, car, notes and lists stay shared at the trip level
-- (those tables and policies are unchanged).
-- ============================================================

-- ── member_trip_dates ────────────────────────────────────────
-- One row per (trip, user). When absent, the app falls back to the
-- shared trips.start_date / trips.end_date.
create table if not exists member_trip_dates (
  trip_id     uuid not null references trips(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  updated_at  timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table member_trip_dates enable row level security;

-- ── flights ──────────────────────────────────────────────────
create table if not exists flights (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references trips(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  direction     text not null default 'outbound' check (direction in ('outbound', 'return')),
  airline       text not null default '',
  flight_no     text not null default '',
  from_iata     text not null default '',
  from_city     text not null default '',
  to_iata       text not null default '',
  to_city       text not null default '',
  dep_time      text not null default '',
  arr_time      text not null default '',
  duration      text not null default '',
  flight_date   date,
  confirmation  text not null default '',
  manage_url    text not null default '',
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table flights enable row level security;

-- ============================================================
-- RLS — strictly private. A user can only ever see or change
-- their OWN rows, and only within a trip they belong to.
-- ============================================================

-- member_trip_dates
create policy "own dates select" on member_trip_dates
  for select using (user_id = auth.uid() and is_trip_member(trip_id));
create policy "own dates insert" on member_trip_dates
  for insert with check (user_id = auth.uid() and is_trip_member(trip_id));
create policy "own dates update" on member_trip_dates
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own dates delete" on member_trip_dates
  for delete using (user_id = auth.uid());

-- flights
create policy "own flights select" on flights
  for select using (user_id = auth.uid() and is_trip_member(trip_id));
create policy "own flights insert" on flights
  for insert with check (user_id = auth.uid() and is_trip_member(trip_id));
create policy "own flights update" on flights
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own flights delete" on flights
  for delete using (user_id = auth.uid());

-- ── Realtime (same user across multiple devices) ─────────────
alter publication supabase_realtime add table member_trip_dates;
alter publication supabase_realtime add table flights;
