/**
 * One-off: wipe the group's old evening + non-owner members (and their anon
 * accounts), then add a fresh "white ports" evening for tomorrow. Keeps the
 * owner (admin). Idempotent-ish + retries the flaky RU↔Frankfurt transport.
 *
 * Run: node --env-file=.env.prod --import tsx supabase/scripts/seed-port-evening.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Missing prod env");

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const GROUP_ID = "fa970a99-8ca3-40c2-8e88-b996f845a866"; // "Моя компания"
const OWNER_ID = "b5afe22a-4de6-4180-90a5-027c95e63fdc"; // аня (keep)
const TITLE = "Белые портвейны · 100 г/л";
const DATE = "2026-06-10";

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

// Upsert by natural key — idempotent and safe to retry even when a lost
// network response left the row committed on a previous attempt.
async function ensureRegion(nameRu: string, nameEn: string, cc: string): Promise<string> {
  const row = await q<{ id: string }>(`region ${nameEn}`, () =>
    sb.from("regions").upsert({ name_ru: nameRu, name_en: nameEn, country_code: cc }, { onConflict: "name_en" }).select("id").single()
  );
  return row.id;
}
async function ensureGrape(nameRu: string, nameEn: string, color: string): Promise<string> {
  const row = await q<{ id: string }>(`grape ${nameEn}`, () =>
    sb.from("grapes").upsert({ name_ru: nameRu, name_en: nameEn, color }, { onConflict: "name_en" }).select("id").single()
  );
  return row.id;
}
async function ensureProducer(name: string, regionId: string | null): Promise<string> {
  const row = await q<{ id: string }>(`producer ${name}`, () =>
    sb.from("producers").upsert({ name, region_id: regionId }, { onConflict: "name,region_id" }).select("id").single()
  );
  return row.id;
}
async function ensureWine(def: {
  name: string;
  producerId: string;
  regionId: string;
  vintage: number | null;
  wineType: string;
  grapes: string[];
  cc: string;
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
        wine_type: def.wineType,
        grape_ids: def.grapes,
        country_code: def.cc,
        created_by_group_id: GROUP_ID,
      })
      .select("id")
      .single()
  );
  return row.id;
}

async function main() {
  console.log("Port evening + cleanup → " + url);

  // --- 1. delete all evenings in the group (cascades wines_in_session + notes) ---
  const delSessions = await q<{ id: string }[]>("del sessions", () =>
    sb.from("tasting_sessions").delete().eq("group_id", GROUP_ID).select("id")
  );
  console.log(`  deleted sessions: ${delSessions.length}`);

  // --- 2. remove non-owner members and delete their (anon) accounts ---
  const members = await q<{ user_id: string; role: string }[]>("members", () =>
    sb.from("group_members").select("user_id, role").eq("group_id", GROUP_ID)
  );
  const toRemove = members.filter((m) => m.user_id !== OWNER_ID && m.role !== "owner");
  for (const m of toRemove) {
    await q(`unmember ${m.user_id}`, () =>
      sb.from("group_members").delete().eq("group_id", GROUP_ID).eq("user_id", m.user_id).select("user_id")
    );
    await withRetry(`deleteUser ${m.user_id}`, async () => {
      const { error } = await sb.auth.admin.deleteUser(m.user_id);
      // Ignore "not found" — the account may already be gone.
      if (error && !/not found/i.test(error.message)) throw new Error(error.message);
    });
  }
  console.log(`  removed members/users: ${toRemove.length} (owner kept)`);

  // --- 3. catalogue: regions / grapes / producers ---
  const sevastopol = await ensureRegion("Севастополь", "Sevastopol", "RU");
  const crimea = await ensureRegion("Крым", "Crimea", "RU");
  const porto = await ensureRegion("Порту", "Porto", "PT");

  const kokur = await ensureGrape("Кокур", "Kokur", "white");
  const rkatsiteli = await ensureGrape("Ркацители", "Rkatsiteli", "white");
  const aligote = await ensureGrape("Алиготе", "Aligoté", "white");
  const shabash = await ensureGrape("Шабаш", "Shabash", "white");
  const tourigaN = await ensureGrape("Турига Насьональ", "Touriga Nacional", "red");
  const tourigaF = await ensureGrape("Турига Франка", "Touriga Franca", "red");
  const tintaR = await ensureGrape("Тинта Рориш", "Tinta Roriz", "red");

  const inkerman = await ensureProducer("Инкерман", sevastopol);
  const koktebel = await ensureProducer("Коктебель", crimea);
  const kopke = await ensureProducer("Копке", porto);

  // --- 4. wines (white-port flight; Kopke is a tawny from red grapes) ---
  const wines = [
    await ensureWine({ name: "Портвейн «Севастополь» (5+ лет в бочке)", producerId: inkerman, regionId: sevastopol, vintage: null, wineType: "white", grapes: [kokur, rkatsiteli, aligote], cc: "RU" }),
    await ensureWine({ name: "Портвейн белый «Коктебель» ординарный", producerId: koktebel, regionId: crimea, vintage: 2021, wineType: "white", grapes: [rkatsiteli, aligote, shabash], cc: "RU" }),
    await ensureWine({ name: "Kopke Reserve Tawny Porto", producerId: kopke, regionId: porto, vintage: 2018, wineType: "white", grapes: [tourigaN, tourigaF, tintaR], cc: "PT" }),
  ];
  console.log("  wines:", wines.length);

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
