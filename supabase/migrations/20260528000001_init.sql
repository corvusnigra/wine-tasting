-- =================================================================
-- Sommelier Night — initial schema
-- =================================================================
-- Convention: snake_case, plural table names, uuid PKs.
-- Profiles bind 1:1 to auth.users (including anonymous sign-ins).
-- Guests use supabase.auth.signInAnonymously(); display_name is
-- set by the join-session form post-sign-in.

create extension if not exists "uuid-ossp";
create extension if not exists "unaccent";
create extension if not exists "pg_trgm";

-- -----------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Гость',
  avatar_url text,
  preferred_scale text not null default '5stars'
    check (preferred_scale in ('5stars','20pt')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- groups
-- -----------------------------------------------------------------
create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.group_invites (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  single_use boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index group_invites_code_idx on public.group_invites (code);

-- -----------------------------------------------------------------
-- Reference catalog
-- -----------------------------------------------------------------
create table public.grapes (
  id uuid primary key default uuid_generate_v4(),
  name_ru text not null,
  name_en text not null unique,
  name_native text[] not null default '{}',
  color text not null check (color in ('red','white','rose','gray')),
  search_aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.regions (
  id uuid primary key default uuid_generate_v4(),
  name_ru text not null,
  name_en text not null unique,
  country_code text not null,                       -- ISO 3166-1 alpha-2
  parent_id uuid references public.regions(id),
  classification text,                              -- DOCG, AOC, ЗГУ, ...
  search_aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.producers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  region_id uuid references public.regions(id),
  website text,
  founded_year int,
  search_aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (name, region_id)
);

create table public.descriptors (
  id uuid primary key default uuid_generate_v4(),
  label_en text not null unique,
  label_ru text not null,
  family text not null,                             -- 11 семейств Ноубл
  subfamily text,
  tier text not null check (tier in ('primary','secondary','tertiary')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------
-- wines
-- -----------------------------------------------------------------
create table public.wines (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  producer_id uuid references public.producers(id),
  region_id uuid references public.regions(id),
  country_code text,
  vintage int check (vintage between 1900 and 2100),
  grape_ids uuid[] not null default '{}',
  wine_type text not null check (wine_type in ('red','white','rose','sparkling')),
  abv numeric(4,2) check (abv between 0 and 25),
  price numeric,
  price_currency text default 'RUB',
  external_refs jsonb not null default '{}'::jsonb,
  created_by_group_id uuid references public.groups(id),
  search_aliases text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index wines_grape_ids_idx on public.wines using gin (grape_ids);

-- -----------------------------------------------------------------
-- tasting_sessions + wines_in_session
-- -----------------------------------------------------------------
create table public.tasting_sessions (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  theme text,
  session_date date not null default current_date,
  depth_mode text not null default 'standard'
    check (depth_mode in ('quick','standard','pro')),
  blind_mode boolean not null default false,
  status text not null default 'in_progress'
    check (status in ('draft','in_progress','completed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index tasting_sessions_group_idx on public.tasting_sessions (group_id, session_date desc);

create table public.wines_in_session (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.tasting_sessions(id) on delete cascade,
  wine_id uuid not null references public.wines(id),
  position int not null,
  revealed boolean not null default true,           -- MVP: blind_mode off by default
  unique (session_id, position),
  unique (session_id, wine_id)
);

create index wines_in_session_session_idx on public.wines_in_session (session_id);

-- -----------------------------------------------------------------
-- tasting_notes
-- -----------------------------------------------------------------
create table public.tasting_notes (
  id uuid primary key default uuid_generate_v4(),
  wine_in_session_id uuid not null references public.wines_in_session(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  appearance jsonb not null default '{}'::jsonb,
  nose       jsonb not null default '{}'::jsonb,
  palate     jsonb not null default '{}'::jsonb,
  conclusion jsonb not null default '{}'::jsonb,
  overall_score numeric(5,2),                       -- normalized 0-100
  overall_scale_raw jsonb,                          -- {scale: '5stars', value: 4.5}
  favorite_of_flight boolean not null default false,
  schema_version int not null default 1,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (wine_in_session_id, user_id)
);

create index tasting_notes_wis_idx on public.tasting_notes (wine_in_session_id);
create index tasting_notes_user_idx on public.tasting_notes (user_id);

-- -----------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_tasting_notes
  before update on public.tasting_notes
  for each row execute function public.tg_set_updated_at();

-- -----------------------------------------------------------------
-- Auto-profile on signup (covers magic-link AND anonymous)
-- -----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      nullif(split_part(coalesce(new.email,''), '@', 1), ''),
      'Гость'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =================================================================
-- Row Level Security
-- =================================================================
alter table public.profiles         enable row level security;
alter table public.groups           enable row level security;
alter table public.group_members    enable row level security;
alter table public.group_invites    enable row level security;
alter table public.grapes           enable row level security;
alter table public.regions          enable row level security;
alter table public.producers        enable row level security;
alter table public.descriptors      enable row level security;
alter table public.wines            enable row level security;
alter table public.tasting_sessions enable row level security;
alter table public.wines_in_session enable row level security;
alter table public.tasting_notes    enable row level security;

-- helper: is current user in a given group?
create or replace function public.is_group_member(_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = auth.uid()
  );
$$;

-- helper: is current user owner of a given group?
create or replace function public.is_group_owner(_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = _group_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- profiles: own row + groupmates' display_name+avatar
create policy "profiles_select_self_or_groupmate" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = profiles.id
    )
  );
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid());

-- groups
create policy "groups_select_member" on public.groups
  for select to authenticated using (public.is_group_member(id));
create policy "groups_insert_self" on public.groups
  for insert to authenticated with check (created_by = auth.uid());
create policy "groups_update_owner" on public.groups
  for update to authenticated using (public.is_group_owner(id));

-- group_members
create policy "group_members_select" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));
-- members may insert themselves only (used by invite-accept flow)
create policy "group_members_insert_self" on public.group_members
  for insert to authenticated with check (user_id = auth.uid());
create policy "group_members_delete_owner" on public.group_members
  for delete to authenticated using (public.is_group_owner(group_id));

-- group_invites: members may read all; only members may create
create policy "group_invites_select_member" on public.group_invites
  for select to authenticated using (public.is_group_member(group_id));
create policy "group_invites_insert_member" on public.group_invites
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_group_member(group_id)
  );

-- catalog (grapes/regions/producers/descriptors/wines): read all, insert auth'd
create policy "grapes_select"      on public.grapes      for select to authenticated using (true);
create policy "grapes_insert"      on public.grapes      for insert to authenticated with check (true);
create policy "regions_select"     on public.regions     for select to authenticated using (true);
create policy "regions_insert"     on public.regions     for insert to authenticated with check (true);
create policy "producers_select"   on public.producers   for select to authenticated using (true);
create policy "producers_insert"   on public.producers   for insert to authenticated with check (true);
create policy "descriptors_select" on public.descriptors for select to authenticated using (true);
create policy "wines_select"       on public.wines       for select to authenticated using (true);
create policy "wines_insert"       on public.wines       for insert to authenticated with check (true);

-- tasting_sessions
create policy "sessions_select_member" on public.tasting_sessions
  for select to authenticated using (public.is_group_member(group_id));
create policy "sessions_insert_member" on public.tasting_sessions
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_group_member(group_id)
  );
create policy "sessions_update_member" on public.tasting_sessions
  for update to authenticated using (public.is_group_member(group_id));

-- wines_in_session: inherits group via parent session
create policy "wis_select_member" on public.wines_in_session
  for select to authenticated using (
    public.is_group_member((select group_id from public.tasting_sessions where id = wines_in_session.session_id))
  );
create policy "wis_insert_member" on public.wines_in_session
  for insert to authenticated with check (
    public.is_group_member((select group_id from public.tasting_sessions where id = wines_in_session.session_id))
  );
create policy "wis_update_member" on public.wines_in_session
  for update to authenticated using (
    public.is_group_member((select group_id from public.tasting_sessions where id = wines_in_session.session_id))
  );

-- tasting_notes: own row R/W; group-mates can read only if revealed
create policy "notes_select_own_or_revealed" on public.tasting_notes
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.wines_in_session wis
      join public.tasting_sessions ts on ts.id = wis.session_id
      where wis.id = tasting_notes.wine_in_session_id
        and wis.revealed = true
        and public.is_group_member(ts.group_id)
    )
  );
create policy "notes_insert_own" on public.tasting_notes
  for insert to authenticated with check (user_id = auth.uid());
create policy "notes_update_own" on public.tasting_notes
  for update to authenticated using (user_id = auth.uid());
