-- Improve catalogue search: the previous search_entities relied on
-- full-string trigram similarity, which is low for short prefixes
-- ("сапер" against "Саперави Saperavi …" scored below the 0.3 threshold
-- and returned nothing). Add ILIKE substring/prefix matching against a
-- combined searchable blob so partial typing works, and rank prefix hits
-- highest.

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
    -- grapes
    select g.id, 'grape'::text as entity_type, g.name_ru as name,
      jsonb_build_object('name_en', g.name_en, 'color', g.color) as meta,
      greatest(
        ts_rank(g.search_text, n.ts),
        similarity(lower(g.name_ru || ' ' || g.name_en), n.nq),
        case
          when lower(g.name_ru || ' ' || g.name_en || ' ' || array_to_string(g.search_aliases,' ')) like n.nq || '%' then 0.95
          when lower(g.name_ru || ' ' || g.name_en || ' ' || array_to_string(g.search_aliases,' ')) like '%' || n.nq || '%' then 0.6
          else 0
        end
      )::real as rank
    from public.grapes g, norm n
    where (etype is null or etype = 'grape')
      and (
        g.search_text @@ n.ts
        or lower(g.name_ru || ' ' || g.name_en || ' ' || array_to_string(g.search_aliases,' ')) like '%' || n.nq || '%'
        or lower(g.name_ru || ' ' || g.name_en) % n.nq
      )

    union all
    -- regions
    select r.id, 'region', r.name_ru,
      jsonb_build_object('name_en', r.name_en, 'country_code', r.country_code, 'classification', r.classification),
      greatest(
        ts_rank(r.search_text, n.ts),
        similarity(lower(r.name_ru || ' ' || r.name_en), n.nq),
        case
          when lower(r.name_ru || ' ' || r.name_en || ' ' || array_to_string(r.search_aliases,' ')) like n.nq || '%' then 0.95
          when lower(r.name_ru || ' ' || r.name_en || ' ' || array_to_string(r.search_aliases,' ')) like '%' || n.nq || '%' then 0.6
          else 0
        end
      )::real
    from public.regions r, norm n
    where (etype is null or etype = 'region')
      and (
        r.search_text @@ n.ts
        or lower(r.name_ru || ' ' || r.name_en || ' ' || array_to_string(r.search_aliases,' ')) like '%' || n.nq || '%'
        or lower(r.name_ru || ' ' || r.name_en) % n.nq
      )

    union all
    -- producers
    select p.id, 'producer', p.name,
      jsonb_build_object('region_id', p.region_id),
      greatest(
        ts_rank(p.search_text, n.ts),
        similarity(lower(p.name), n.nq),
        case
          when lower(p.name || ' ' || array_to_string(p.search_aliases,' ')) like n.nq || '%' then 0.95
          when lower(p.name || ' ' || array_to_string(p.search_aliases,' ')) like '%' || n.nq || '%' then 0.6
          else 0
        end
      )::real
    from public.producers p, norm n
    where (etype is null or etype = 'producer')
      and (
        p.search_text @@ n.ts
        or lower(p.name || ' ' || array_to_string(p.search_aliases,' ')) like '%' || n.nq || '%'
        or lower(p.name) % n.nq
      )

    union all
    -- wines
    select w.id, 'wine', w.name,
      jsonb_build_object(
        'vintage', w.vintage,
        'producer_id', w.producer_id,
        'region_id', w.region_id,
        'wine_type', w.wine_type
      ),
      greatest(
        ts_rank(w.search_text, n.ts),
        similarity(lower(w.name), n.nq),
        case
          when lower(w.name || ' ' || array_to_string(w.search_aliases,' ')) like n.nq || '%' then 0.95
          when lower(w.name || ' ' || array_to_string(w.search_aliases,' ')) like '%' || n.nq || '%' then 0.6
          else 0
        end
      )::real
    from public.wines w, norm n
    where (etype is null or etype = 'wine')
      and (
        w.search_text @@ n.ts
        or lower(w.name || ' ' || array_to_string(w.search_aliases,' ')) like '%' || n.nq || '%'
        or lower(w.name) % n.nq
      )
  ) results
  order by rank desc nulls last
  limit lim;
$$;
