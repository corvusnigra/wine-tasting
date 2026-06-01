import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { EntityType, SearchHit } from "./api";
import { normalizeQuery } from "./normalize";

// Bounded reference tables (grapes/regions/producers) are small and public.
// We load them once (a cacheable GET the service worker can serve offline)
// and filter locally — instant, offline-friendly, and immune to the
// per-keystroke RPC round-trip timing out from poor networks.

type GrapeRow = {
  id: string;
  name_ru: string;
  name_en: string;
  color: string;
  search_aliases: string[];
};
type RegionRow = {
  id: string;
  name_ru: string;
  name_en: string;
  country_code: string;
  classification: string | null;
  search_aliases: string[];
};
type ProducerRow = {
  id: string;
  name: string;
  region_id: string | null;
  search_aliases: string[];
};
type WineRow = {
  id: string;
  name: string;
  vintage: number | null;
  wine_type: string;
  producer_id: string | null;
  region_id: string | null;
  search_aliases: string[];
};

type Catalog = {
  grapes: GrapeRow[];
  regions: RegionRow[];
  producers: ProducerRow[];
  wines: WineRow[];
  regionById: Map<string, RegionRow>;
  producerById: Map<string, ProducerRow>;
};

let cache: Catalog | null = null;
let inflight: Promise<Catalog> | null = null;

const COUNTRY_RU: Record<string, string> = {
  IT: "Италия", FR: "Франция", ES: "Испания", DE: "Германия", PT: "Португалия",
  US: "США", AR: "Аргентина", CL: "Чили", ZA: "ЮАР", AU: "Австралия",
  NZ: "Новая Зеландия", RU: "Россия", GE: "Грузия", AM: "Армения", MD: "Молдова",
};

const GRAPE_COLOR_RU: Record<string, string> = {
  red: "красный", white: "белый", rose: "розовый", gray: "серый",
};

export async function loadCatalog(
  sb: SupabaseClient<Database>
): Promise<Catalog> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const [g, r, p, w] = await Promise.all([
      sb.from("grapes").select("id, name_ru, name_en, color, search_aliases"),
      sb.from("regions").select("id, name_ru, name_en, country_code, classification, search_aliases"),
      sb.from("producers").select("id, name, region_id, search_aliases"),
      sb.from("wines").select("id, name, vintage, wine_type, producer_id, region_id, search_aliases"),
    ]);
    const grapes = (g.data ?? []) as GrapeRow[];
    const regions = (r.data ?? []) as RegionRow[];
    const producers = (p.data ?? []) as ProducerRow[];
    const wines = (w.data ?? []) as WineRow[];
    const regionById = new Map(regions.map((x) => [x.id, x]));
    const producerById = new Map(producers.map((x) => [x.id, x]));
    cache = { grapes, regions, producers, wines, regionById, producerById };
    inflight = null;
    return cache;
  })();
  return inflight;
}

/** Push a freshly-created wine into the cache so later searches find it. */
export function appendWineToCatalog(w: {
  id: string;
  name: string;
  vintage: number | null;
  wine_type: string;
  producer_id?: string | null;
  region_id?: string | null;
}): void {
  if (!cache) return;
  if (cache.wines.some((x) => x.id === w.id)) return;
  cache.wines.unshift({
    id: w.id,
    name: w.name,
    vintage: w.vintage,
    wine_type: w.wine_type,
    producer_id: w.producer_id ?? null,
    region_id: w.region_id ?? null,
    search_aliases: [],
  });
}

function blob(parts: Array<string | null | undefined>): string {
  return normalizeQuery(parts.filter(Boolean).join(" "));
}

/** Build a region SearchHit from a producer's region_id (for auto-fill). */
export async function regionHitFor(
  sb: SupabaseClient<Database>,
  regionId: string | null | undefined
): Promise<SearchHit | null> {
  if (!regionId) return null;
  const catalog = await loadCatalog(sb);
  const r = catalog.regionById.get(regionId);
  if (!r) return null;
  return {
    id: r.id,
    entity_type: "region",
    name: r.name_ru,
    meta: {
      name_en: r.name_en,
      country_code: r.country_code,
      classification: r.classification,
    },
    rank: 1,
  };
}

/** Rank: prefix 3, word-boundary 2, substring 1, none 0. */
function score(haystack: string, nq: string): number {
  if (!haystack.includes(nq)) return 0;
  if (haystack.startsWith(nq)) return 3;
  if (haystack.includes(" " + nq)) return 2;
  return 1;
}

export function filterCatalog(
  catalog: Catalog,
  etype: EntityType,
  query: string,
  lim = 8
): Array<SearchHit & { subtitle: string | null }> {
  const nq = normalizeQuery(query);
  if (!nq) return [];

  if (etype === "grape") {
    return catalog.grapes
      .map((x) => ({
        x,
        s: score(blob([x.name_ru, x.name_en, ...x.search_aliases]), nq),
      }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, lim)
      .map(({ x }) => ({
        id: x.id,
        entity_type: "grape" as const,
        name: x.name_ru,
        meta: { name_en: x.name_en, color: x.color },
        rank: 1,
        subtitle: [GRAPE_COLOR_RU[x.color], x.name_en].filter(Boolean).join(" · "),
      }));
  }

  if (etype === "region") {
    return catalog.regions
      .map((x) => ({
        x,
        s: score(blob([x.name_ru, x.name_en, ...x.search_aliases]), nq),
      }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, lim)
      .map(({ x }) => ({
        id: x.id,
        entity_type: "region" as const,
        name: x.name_ru,
        meta: {
          name_en: x.name_en,
          country_code: x.country_code,
          classification: x.classification,
        },
        rank: 1,
        subtitle: [COUNTRY_RU[x.country_code] ?? x.country_code, x.classification]
          .filter(Boolean)
          .join(" · "),
      }));
  }

  if (etype === "producer") {
    return catalog.producers
      .map((x) => ({
        x,
        s: score(blob([x.name, ...x.search_aliases]), nq),
      }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, lim)
      .map(({ x }) => {
        const region = x.region_id ? catalog.regionById.get(x.region_id) : null;
        return {
          id: x.id,
          entity_type: "producer" as const,
          name: x.name,
          meta: { region_id: x.region_id },
          rank: 1,
          subtitle: region
            ? [region.name_ru, COUNTRY_RU[region.country_code]].filter(Boolean).join(" · ")
            : null,
        };
      });
  }

  // wine
  return catalog.wines
    .map((x) => ({
      x,
      s: score(blob([x.name, ...x.search_aliases]), nq),
    }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, lim)
    .map(({ x }) => {
      const producer = x.producer_id ? catalog.producerById.get(x.producer_id) : null;
      return {
        id: x.id,
        entity_type: "wine" as const,
        name: x.name,
        meta: {
          vintage: x.vintage,
          producer_id: x.producer_id,
          region_id: x.region_id,
          wine_type: x.wine_type,
        },
        rank: 1,
        subtitle: [producer?.name, x.vintage].filter(Boolean).join(" · ") || null,
      };
    });
}
