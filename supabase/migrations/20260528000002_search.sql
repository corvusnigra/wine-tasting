-- =================================================================
-- Search infrastructure
-- =================================================================
-- Three layers:
--   1. search_aliases text[] on each entity, populated by seed
--   2. tsvector search_text column with unaccent
--   3. pg_trgm GIN for fuzzy/typo-tolerant fallback
-- search_entities() RPC unions the four catalog tables.

-- Note: we intentionally do NOT use `unaccent` in index expressions
-- (it is STABLE and Supabase places it in the `extensions` schema
-- which complicates qualification). Triggers below still use it for
-- the tsvector layer where IMMUTABLE is not required.

-- -----------------------------------------------------------------
-- search_text columns
-- -----------------------------------------------------------------
alter table public.grapes    add column search_text tsvector;
alter table public.regions   add column search_text tsvector;
alter table public.producers add column search_text tsvector;
alter table public.wines     add column search_text tsvector;

-- -----------------------------------------------------------------
-- per-entity tsvector update triggers
-- -----------------------------------------------------------------
create or replace function public.compute_grape_search()
returns trigger language plpgsql as $$
begin
  new.search_text := to_tsvector('simple', unaccent(
    coalesce(new.name_ru,'') || ' ' ||
    coalesce(new.name_en,'') || ' ' ||
    coalesce(array_to_string(new.name_native, ' '),'') || ' ' ||
    coalesce(array_to_string(new.search_aliases, ' '),'')
  ));
  return new;
end;
$$;

create or replace function public.compute_region_search()
returns trigger language plpgsql as $$
begin
  new.search_text := to_tsvector('simple', unaccent(
    coalesce(new.name_ru,'') || ' ' ||
    coalesce(new.name_en,'') || ' ' ||
    coalesce(array_to_string(new.search_aliases, ' '),'')
  ));
  return new;
end;
$$;

create or replace function public.compute_producer_search()
returns trigger language plpgsql as $$
begin
  new.search_text := to_tsvector('simple', unaccent(
    coalesce(new.name,'') || ' ' ||
    coalesce(array_to_string(new.search_aliases, ' '),'')
  ));
  return new;
end;
$$;

create or replace function public.compute_wine_search()
returns trigger language plpgsql as $$
begin
  new.search_text := to_tsvector('simple', unaccent(
    coalesce(new.name,'') || ' ' ||
    coalesce(new.vintage::text,'') || ' ' ||
    coalesce(array_to_string(new.search_aliases, ' '),'')
  ));
  return new;
end;
$$;

create trigger trg_grape_search    before insert or update on public.grapes
  for each row execute function public.compute_grape_search();
create trigger trg_region_search   before insert or update on public.regions
  for each row execute function public.compute_region_search();
create trigger trg_producer_search before insert or update on public.producers
  for each row execute function public.compute_producer_search();
create trigger trg_wine_search     before insert or update on public.wines
  for each row execute function public.compute_wine_search();

-- -----------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------
create index grapes_search_idx    on public.grapes    using gin (search_text);
create index regions_search_idx   on public.regions   using gin (search_text);
create index producers_search_idx on public.producers using gin (search_text);
create index wines_search_idx     on public.wines     using gin (search_text);

-- pg_trgm для fuzzy-fallback (опечатки). lower() — IMMUTABLE.
create index grapes_name_trgm_idx    on public.grapes    using gin (lower(name_ru || ' ' || name_en) gin_trgm_ops);
create index regions_name_trgm_idx   on public.regions   using gin (lower(name_ru || ' ' || name_en) gin_trgm_ops);
create index producers_name_trgm_idx on public.producers using gin (lower(name) gin_trgm_ops);
create index wines_name_trgm_idx     on public.wines     using gin (lower(name) gin_trgm_ops);

-- -----------------------------------------------------------------
-- RPC: search_entities
-- -----------------------------------------------------------------
-- Возвращает топ-N результатов по 4 каталогам сразу.
-- `etype` = 'grape' | 'region' | 'producer' | 'wine' | NULL (все).
-- Объединяет ts_rank и trigram similarity → берёт максимум.
create or replace function public.search_entities(
  q text,
  etype text default null,
  lim int default 10
)
returns table (
  id uuid,
  entity_type text,
  name text,
  meta jsonb,
  rank real
)
language sql stable as $$
  with norm as (
    select
      lower(q) as nq,
      plainto_tsquery('simple', unaccent(q)) as ts
  )
  select * from (
    select g.id, 'grape'::text as entity_type, g.name_ru as name,
      jsonb_build_object('name_en', g.name_en, 'color', g.color) as meta,
      greatest(
        ts_rank(g.search_text, n.ts),
        similarity(lower(g.name_ru || ' ' || g.name_en), n.nq)
      ) as rank
    from public.grapes g, norm n
    where (etype is null or etype = 'grape')
      and (g.search_text @@ n.ts
           or lower(g.name_ru || ' ' || g.name_en) % n.nq)

    union all
    select r.id, 'region', r.name_ru,
      jsonb_build_object('name_en', r.name_en, 'country_code', r.country_code, 'classification', r.classification),
      greatest(
        ts_rank(r.search_text, n.ts),
        similarity(lower(r.name_ru || ' ' || r.name_en), n.nq)
      )
    from public.regions r, norm n
    where (etype is null or etype = 'region')
      and (r.search_text @@ n.ts
           or lower(r.name_ru || ' ' || r.name_en) % n.nq)

    union all
    select p.id, 'producer', p.name,
      jsonb_build_object('region_id', p.region_id),
      greatest(
        ts_rank(p.search_text, n.ts),
        similarity(lower(p.name), n.nq)
      )
    from public.producers p, norm n
    where (etype is null or etype = 'producer')
      and (p.search_text @@ n.ts
           or lower(p.name) % n.nq)

    union all
    select w.id, 'wine', w.name,
      jsonb_build_object(
        'vintage', w.vintage,
        'producer_id', w.producer_id,
        'region_id', w.region_id,
        'wine_type', w.wine_type
      ),
      greatest(
        ts_rank(w.search_text, n.ts),
        similarity(lower(w.name), n.nq)
      )
    from public.wines w, norm n
    where (etype is null or etype = 'wine')
      and (w.search_text @@ n.ts
           or lower(w.name) % n.nq)
  ) results
  order by rank desc nulls last
  limit lim;
$$;
