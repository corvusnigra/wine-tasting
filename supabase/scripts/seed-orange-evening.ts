/**
 * One-off: add a real upcoming "orange wines" evening (3 bottles, no notes yet)
 * to the group so everyone sees it and can rate it. Idempotent + retries the
 * flaky RU↔Frankfurt transport.
 *
 * Run: node --env-file=.env.prod --import tsx supabase/scripts/seed-orange-evening.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Missing prod env");

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const GROUP_ID = "fa970a99-8ca3-40c2-8e88-b996f845a866"; // "Моя компания"
const OWNER_ID = "b5afe22a-4de6-4180-90a5-027c95e63fdc"; // аня
const TITLE = "Оранж: ароматная тройка";
const DATE = "2026-06-06";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function withRetry<T>(label: string, fn: () => Promise<T>, tries = 8): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      console.warn(`  ↻ ${label} (${i + 1}/${tries}): ${(e as Error)?.message ?? e}`);
      await sleep(700 * (i + 1));
    }
  }
  throw last;
}
async function q<T>(label: string, build: () => PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  return withRetry(label, async () => {
    const { data, error } = await build();
    if (error) throw new Error((error as { message?: string }).message ?? JSON.stringify(error));
    return data as T;
  });
}

async function ensureRegion(nameRu: string, nameEn: string, cc: string): Promise<string> {
  const found = await q<{ id: string }[]>(`region? ${nameRu}`, () =>
    sb.from("regions").select("id").ilike("name_ru", nameRu).limit(1)
  );
  if (found[0]) return found[0].id;
  const row = await q<{ id: string }>(`region+ ${nameRu}`, () =>
    sb.from("regions").insert({ name_ru: nameRu, name_en: nameEn, country_code: cc }).select("id").single()
  );
  return row.id;
}

async function ensureGrape(nameRu: string, nameEn: string, color: string): Promise<string> {
  const found = await q<{ id: string }[]>(`grape? ${nameRu}`, () =>
    sb.from("grapes").select("id").ilike("name_ru", `%${nameRu}%`).limit(1)
  );
  if (found[0]) return found[0].id;
  const row = await q<{ id: string }>(`grape+ ${nameRu}`, () =>
    sb.from("grapes").insert({ name_ru: nameRu, name_en: nameEn, color }).select("id").single()
  );
  return row.id;
}

async function ensureProducer(name: string, regionId: string | null): Promise<string> {
  const found = await q<{ id: string }[]>(`producer? ${name}`, () =>
    sb.from("producers").select("id").ilike("name", name).limit(1)
  );
  if (found[0]) return found[0].id;
  const row = await q<{ id: string }>(`producer+ ${name}`, () =>
    sb.from("producers").insert({ name, region_id: regionId }).select("id").single()
  );
  return row.id;
}

async function ensureWine(def: {
  name: string;
  producerId: string;
  regionId: string;
  vintage: number;
  grapes: string[];
}): Promise<string> {
  const found = await q<{ id: string }[]>(`wine? ${def.name}`, () =>
    sb.from("wines").select("id").eq("created_by_group_id", GROUP_ID).eq("name", def.name).limit(1)
  );
  if (found[0]) return found[0].id;
  const row = await q<{ id: string }>(`wine+ ${def.name}`, () =>
    sb
      .from("wines")
      .insert({
        name: def.name,
        producer_id: def.producerId,
        region_id: def.regionId,
        vintage: def.vintage,
        wine_type: "white", // orange = skin-contact white; schema has no "orange"
        grape_ids: def.grapes,
        country_code: "RU",
        created_by_group_id: GROUP_ID,
      })
      .select("id")
      .single()
  );
  return row.id;
}

async function main() {
  console.log("Adding orange evening → " + url);

  const grp = await q<{ id: string }[]>("group?", () =>
    sb.from("groups").select("id").eq("id", GROUP_ID).limit(1)
  );
  if (!grp[0]) throw new Error(`group ${GROUP_ID} not found`);

  const crimea = await ensureRegion("Крым", "Crimea", "RU");
  const muscat = await ensureGrape("Мускат белый", "Muscat Blanc", "white");
  const traminer = await ensureGrape("Траминер", "Traminer", "white");
  const rkatsiteli = await ensureGrape("Ркацители", "Rkatsiteli", "white");

  const esse = await ensureProducer("Эссе", crimea);
  const winecraft = await ensureProducer("WineCraft", crimea);
  const yaiyla = await ensureProducer("Яйла", crimea);

  const wines = [
    await ensureWine({ name: "Muscat Orange Unplugged", producerId: esse, regionId: crimea, vintage: 2022, grapes: [muscat] }),
    await ensureWine({ name: "Траминер Оранж", producerId: winecraft, regionId: crimea, vintage: 2023, grapes: [traminer] }),
    await ensureWine({ name: "Yaiyla Beach Orange", producerId: yaiyla, regionId: crimea, vintage: 2022, grapes: [muscat, rkatsiteli] }),
  ];
  console.log("  wines:", wines.length);

  // Idempotent: clear any prior run of this evening.
  await q("reset session", () =>
    sb.from("tasting_sessions").delete().eq("group_id", GROUP_ID).eq("title", TITLE).select("id")
  );

  const session = await q<{ id: string }>("session", () =>
    sb
      .from("tasting_sessions")
      .insert({
        group_id: GROUP_ID,
        title: TITLE,
        session_date: DATE,
        created_by: OWNER_ID,
        status: "in_progress",
        depth_mode: "standard",
      })
      .select("id")
      .single()
  );

  await q("wines_in_session", () =>
    sb
      .from("wines_in_session")
      .insert(wines.map((id, i) => ({ session_id: session.id, wine_id: id, position: i + 1, revealed: true })))
      .select("id")
  );

  console.log(`Done. session=${session.id}  date=${DATE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
