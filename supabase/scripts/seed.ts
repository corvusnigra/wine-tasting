/**
 * Seed runner for the reference catalogue. Idempotent — re-runs upsert
 * by stable natural keys (`name_en` / `label_en`).
 *
 * Usage: `pnpm seed` (loads .env.local via Node --env-file).
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

type GrapeSeed = {
  name_ru: string;
  name_en: string;
  name_native: string[];
  color: "red" | "white" | "rose" | "gray";
  search_aliases: string[];
};

type RegionSeed = {
  name_ru: string;
  name_en: string;
  country_code: string;
  classification: string | null;
  search_aliases: string[];
};

type ProducerSeed = {
  name: string;
  region_name_en: string;
  search_aliases: string[];
};

type DescriptorSeed = {
  label_en: string;
  label_ru: string;
  family: string;
  subfamily: string | null;
  tier: "primary" | "secondary" | "tertiary";
};

const SOURCES = join(process.cwd(), "supabase/scripts/sources");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function readJson<T>(file: string): Promise<T[]> {
  const raw = await readFile(join(SOURCES, file), "utf8");
  return JSON.parse(raw) as T[];
}

async function main() {
  console.log("Seeding catalogue → " + url);

  // 1. Grapes (no FKs).
  const grapes = await readJson<GrapeSeed>("grapes.json");
  {
    const { error } = await sb
      .from("grapes")
      .upsert(grapes, { onConflict: "name_en" });
    if (error) throw new Error(`grapes: ${error.message}`);
    console.log(`  grapes: ${grapes.length} rows`);
  }

  // 2. Regions (no FKs in MVP — parent_id left null).
  const regions = await readJson<RegionSeed>("regions.json");
  {
    const { error } = await sb
      .from("regions")
      .upsert(regions, { onConflict: "name_en" });
    if (error) throw new Error(`regions: ${error.message}`);
    console.log(`  regions: ${regions.length} rows`);
  }

  // 3. Resolve region_name_en → region_id for producers.
  const { data: regionRows, error: rErr } = await sb
    .from("regions")
    .select("id, name_en");
  if (rErr) throw new Error(`fetch regions: ${rErr.message}`);
  const regionByName = new Map(regionRows!.map((r) => [r.name_en, r.id]));

  const producerSeed = await readJson<ProducerSeed>("producers.json");
  const producers = producerSeed.map((p) => {
    const region_id = regionByName.get(p.region_name_en);
    if (!region_id) {
      throw new Error(`producer ${p.name}: unknown region ${p.region_name_en}`);
    }
    return {
      name: p.name,
      region_id,
      search_aliases: p.search_aliases,
    };
  });
  {
    const { error } = await sb
      .from("producers")
      .upsert(producers, { onConflict: "name,region_id" });
    if (error) throw new Error(`producers: ${error.message}`);
    console.log(`  producers: ${producers.length} rows`);
  }

  // 4. Descriptors (no FKs).
  const descriptors = await readJson<DescriptorSeed>("descriptors.json");
  {
    const { error } = await sb
      .from("descriptors")
      .upsert(descriptors, { onConflict: "label_en" });
    if (error) throw new Error(`descriptors: ${error.message}`);
    console.log(`  descriptors: ${descriptors.length} rows`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
