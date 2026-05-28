import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type EntityType = "grape" | "region" | "producer" | "wine";

export type SearchHit = {
  id: string;
  entity_type: EntityType;
  name: string;
  meta: Record<string, unknown>;
  rank: number;
};

export async function searchEntities(
  sb: SupabaseClient<Database>,
  q: string,
  options: { etype?: EntityType | null; lim?: number } = {}
): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const { data, error } = await sb.rpc("search_entities", {
    q: trimmed,
    etype: options.etype ?? undefined,
    lim: options.lim ?? 10,
  });
  if (error) {
    console.error("searchEntities:", error);
    return [];
  }
  return (data ?? []) as SearchHit[];
}
