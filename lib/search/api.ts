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
  options: { etype?: EntityType | null; lim?: number; timeoutMs?: number } = {}
): Promise<SearchHit[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  // Fail fast on a stalled connection (the RPC round-trips to Supabase and
  // can hang ~30s from poor networks) so the UI can fall back to "create new".
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 6000);
  try {
    const { data, error } = await sb
      .rpc("search_entities", {
        q: trimmed,
        etype: options.etype ?? undefined,
        lim: options.lim ?? 10,
      })
      .abortSignal(controller.signal);
    if (error) {
      console.error("searchEntities:", error);
      return [];
    }
    return (data ?? []) as SearchHit[];
  } catch (e) {
    console.error("searchEntities:", e);
    return [];
  } finally {
    clearTimeout(timer);
  }
}
