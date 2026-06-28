-- 004_plan_items.sql
-- Day-by-day trip planner items

create table if not exists plan_items (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references trips(id) on delete cascade not null,
  date         date not null,
  time         text,               -- "09:00" or null
  title        text not null,
  notes        text not null default '',
  category     text not null default 'nature',
  done         boolean not null default false,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);

create index on plan_items(trip_id, date, position);

-- RLS
alter table plan_items enable row level security;

create policy "trip members can read plan_items"
  on plan_items for select
  using (is_trip_member(trip_id));

create policy "trip members can insert plan_items"
  on plan_items for insert
  with check (is_trip_member(trip_id));

create policy "trip members can update plan_items"
  on plan_items for update
  using (is_trip_member(trip_id));

create policy "trip members can delete plan_items"
  on plan_items for delete
  using (is_trip_member(trip_id));
