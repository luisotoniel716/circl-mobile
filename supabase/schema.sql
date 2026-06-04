-- ============================================================
-- CIRCL — Full Database Schema
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- Multi-league ready from day 1
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── LEAGUES ────────────────────────────────────────────────
create table public.leagues (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,       -- 'liga_mx', 'premier_league'
  country     text not null,
  logo_url    text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── SEASONS ────────────────────────────────────────────────
create table public.seasons (
  id          uuid primary key default gen_random_uuid(),
  league_id   uuid not null references public.leagues(id) on delete cascade,
  name        text not null,             -- 'Apertura 2026'
  slug        text not null,             -- 'apertura-2026'
  start_date  date not null,
  end_date    date not null,
  active      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(league_id, slug)
);

-- ─── TEAMS ──────────────────────────────────────────────────
create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  league_id       uuid not null references public.leagues(id) on delete cascade,
  name            text not null,
  short_name      text not null,
  code            text not null,          -- 'AME', 'CHI'
  logo_url        text,
  primary_color   text not null default '#000000',
  secondary_color text not null default '#ffffff',
  created_at      timestamptz not null default now(),
  unique(league_id, code)
);

-- ─── MATCHES ────────────────────────────────────────────────
create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons(id) on delete cascade,
  league_id     uuid not null references public.leagues(id),
  home_team_id  uuid not null references public.teams(id),
  away_team_id  uuid not null references public.teams(id),
  kickoff_at    timestamptz not null,
  status        text not null default 'scheduled'
                  check (status in ('scheduled','live','finished','postponed','cancelled')),
  home_score    integer,
  away_score    integer,
  matchday      integer not null,         -- jornada number
  external_id   text,                     -- API-Football match ID
  created_at    timestamptz not null default now()
);

create index on public.matches(season_id, matchday);
create index on public.matches(kickoff_at);
create index on public.matches(status);

-- ─── PROFILES ───────────────────────────────────────────────
-- Extends auth.users. Created automatically via trigger on signup.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  name        text not null,
  avatar_url  text,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ─── GROUPS ─────────────────────────────────────────────────
create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text not null default '⚽',
  accent      text not null default '#4F6BFF',
  league_id   uuid not null references public.leagues(id),
  invite_code text unique not null
                default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ─── GROUP MEMBERS ──────────────────────────────────────────
create table public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin','member')),
  joined_at  timestamptz not null default now(),
  unique(group_id, user_id)
);

-- Creator is automatically an admin member
create or replace function public.handle_new_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'admin');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute procedure public.handle_new_group();

-- ─── PICKS ──────────────────────────────────────────────────
create table public.picks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  match_id    uuid not null references public.matches(id) on delete cascade,
  group_id    uuid not null references public.groups(id) on delete cascade,
  prediction  text not null check (prediction in ('home','draw','away')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, match_id, group_id)
);

create trigger picks_updated_at
  before update on public.picks
  for each row execute procedure public.set_updated_at();

create index on public.picks(user_id, group_id);
create index on public.picks(match_id);

-- ─── PICK RESULTS ───────────────────────────────────────────
-- Populated by an Edge Function after match finishes
create table public.pick_results (
  id              uuid primary key default gen_random_uuid(),
  pick_id         uuid not null references public.picks(id) on delete cascade,
  correct         boolean not null,
  points          integer not null default 0,
  calculated_at   timestamptz not null default now(),
  unique(pick_id)
);

-- ─── FRIENDSHIPS ────────────────────────────────────────────
create table public.friendships (
  id          uuid primary key default gen_random_uuid(),
  requester   uuid not null references public.profiles(id) on delete cascade,
  addressee   uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at  timestamptz not null default now(),
  unique(requester, addressee),
  check (requester <> addressee)
);

-- ─── SEED DATA — Liga MX ────────────────────────────────────
insert into public.leagues (name, slug, country) values
  ('Liga MX', 'liga_mx', 'México');

-- Get the Liga MX id for seeding
do $$
declare
  liga_id uuid;
  season_id uuid;
begin
  select id into liga_id from public.leagues where slug = 'liga_mx';

  -- Active season
  insert into public.seasons (league_id, name, slug, start_date, end_date, active)
  values (liga_id, 'Apertura 2026', 'apertura-2026', '2026-07-01', '2026-12-31', true)
  returning id into season_id;

  -- Teams
  insert into public.teams (league_id, name, short_name, code, primary_color, secondary_color) values
    (liga_id, 'Club América',            'América',   'AME', '#FFD700', '#1A3D6E'),
    (liga_id, 'Chivas Guadalajara',      'Chivas',    'GDL', '#BD2026', '#FFFFFF'),
    (liga_id, 'Cruz Azul',               'Cruz Azul', 'CAZ', '#1E4DB7', '#FFFFFF'),
    (liga_id, 'Pumas UNAM',              'Pumas',     'PUM', '#FFD700', '#1A1A1A'),
    (liga_id, 'Rayados Monterrey',       'Rayados',   'MTY', '#003087', '#FFFFFF'),
    (liga_id, 'Tigres UANL',             'Tigres',    'TIG', '#FFD700', '#1A1A1A'),
    (liga_id, 'Deportivo Toluca',        'Toluca',    'TOL', '#C41E3A', '#FFFFFF'),
    (liga_id, 'Club León',               'León',      'LEO', '#1A5C38', '#FFD700'),
    (liga_id, 'Club Pachuca',            'Pachuca',   'PAC', '#1A3D6E', '#FFFFFF'),
    (liga_id, 'Santos Laguna',           'Santos',    'SAN', '#007A33', '#FFFFFF'),
    (liga_id, 'Necaxa',                  'Necaxa',    'NEC', '#C41E3A', '#FFFFFF'),
    (liga_id, 'Atlas FC',                'Atlas',     'ATL', '#9B1B30', '#FFD700'),
    (liga_id, 'Club Puebla',             'Puebla',    'PUE', '#1A1A1A', '#FFFFFF'),
    (liga_id, 'FC Juárez',               'Juárez',    'JUA', '#C41E3A', '#000000');
end $$;

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────
alter table public.leagues       enable row level security;
alter table public.seasons       enable row level security;
alter table public.teams         enable row level security;
alter table public.matches       enable row level security;
alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
alter table public.picks         enable row level security;
alter table public.pick_results  enable row level security;
alter table public.friendships   enable row level security;

-- Public read for reference data
create policy "leagues public read"  on public.leagues       for select using (true);
create policy "seasons public read"  on public.seasons       for select using (true);
create policy "teams public read"    on public.teams         for select using (true);
create policy "matches public read"  on public.matches       for select using (true);
create policy "results public read"  on public.pick_results  for select using (true);

-- Profiles: public read, own write
create policy "profiles public read" on public.profiles
  for select using (true);
create policy "profiles own update"  on public.profiles
  for update using (auth.uid() = id);

-- Groups: members can read, authenticated can create
create policy "groups: members read" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = id and user_id = auth.uid()
    )
  );
create policy "groups: auth create" on public.groups
  for insert with check (auth.uid() = created_by);
create policy "groups: admin update" on public.groups
  for update using (
    exists (
      select 1 from public.group_members
      where group_id = id and user_id = auth.uid() and role = 'admin'
    )
  );

-- Group members
create policy "group_members: members read" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_id and gm2.user_id = auth.uid()
    )
  );
create policy "group_members: auth join" on public.group_members
  for insert with check (auth.uid() = user_id);
create policy "group_members: own leave" on public.group_members
  for delete using (auth.uid() = user_id);

-- Picks: own CRUD, group members can read after kickoff
create policy "picks: own crud" on public.picks
  for all using (auth.uid() = user_id);
create policy "picks: group members read after kickoff" on public.picks
  for select using (
    exists (
      select 1 from public.group_members gm
      join public.matches m on m.id = match_id
      where gm.group_id = picks.group_id
        and gm.user_id = auth.uid()
        and (m.status <> 'scheduled' or m.kickoff_at <= now())
    )
  );

-- Friendships
create policy "friendships: own read" on public.friendships
  for select using (auth.uid() = requester or auth.uid() = addressee);
create policy "friendships: auth create" on public.friendships
  for insert with check (auth.uid() = requester);
create policy "friendships: own update" on public.friendships
  for update using (auth.uid() = addressee);
