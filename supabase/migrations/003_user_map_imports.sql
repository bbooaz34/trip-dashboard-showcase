-- Per-user GeoJSON import layers for the map page.
-- Each row is one uploaded file (a named layer) belonging to a single user × trip.
-- Other users never see these rows.

create table if not exists user_map_imports (
  id          uuid        primary key default gen_random_uuid(),
  trip_id     text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,           -- filename / layer name chosen at upload
  color       text        not null default '#7C3AED',  -- dot colour on the map
  emoji       text        not null default '📌',
  features    jsonb       not null default '[]'::jsonb, -- array of GeoJSON Feature objects
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (trip_id, user_id, name)
);

-- Only the owning user can read / write their own rows
alter table user_map_imports enable row level security;

create policy "owner_select" on user_map_imports
  for select using (auth.uid() = user_id);

create policy "owner_insert" on user_map_imports
  for insert with check (auth.uid() = user_id);

create policy "owner_update" on user_map_imports
  for update using (auth.uid() = user_id);

create policy "owner_delete" on user_map_imports
  for delete using (auth.uid() = user_id);
