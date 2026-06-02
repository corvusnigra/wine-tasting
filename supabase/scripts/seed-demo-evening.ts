/**
 * One-off: seed a single rich demo evening (3 wines, 3 raters, full SAT notes)
 * into an existing group, so reveal + group memory render with real data.
 *
 * Idempotent: clears its own demo session + wines first, retries flaky calls
 * (RU↔Frankfurt transport drops connections intermittently).
 *
 * Run: node --env-file=.env.prod --import tsx supabase/scripts/seed-demo-evening.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) throw new Error("Missing prod env");

const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const GROUP_ID = "fa970a99-8ca3-40c2-8e88-b996f845a866"; // "Моя компания" (owner: аня)
const OWNER_ID = "b5afe22a-4de6-4180-90a5-027c95e63fdc";
const TITLE = "Слепая тройка · бордо vs пьемонт";
const WINE_NAMES = ["Château Margaux", "Barolo Riserva", "Cloudy Bay Sauvignon Blanc"];

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

// Retrying query that throws on a PostgREST error. `data` is nullable on the
// supabase builder (null on failure), so the helper accepts that and narrows.
async function q<T>(
  label: string,
  build: () => PromiseLike<{ data: T | null; error: unknown }>
): Promise<T> {
  return withRetry(label, async () => {
    const { data, error } = await build();
    if (error) throw new Error((error as { message?: string }).message ?? JSON.stringify(error));
    return data as T;
  });
}

async function ensureRater(email: string, name: string): Promise<string> {
  const list = await withRetry(`listUsers ${email}`, async () => {
    const { data, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    return data;
  });
  let id = list.users.find((u) => u.email === email)?.id;
  if (!id) {
    id = await withRetry(`createUser ${email}`, async () => {
      const { data, error } = await sb.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { display_name: name },
      });
      if (error) throw new Error(error.message);
      return data.user!.id;
    });
  }
  await q(`profile ${name}`, () => sb.from("profiles").update({ display_name: name }).eq("id", id!).select("id"));
  await q(`member ${name}`, () =>
    sb.from("group_members").upsert({ group_id: GROUP_ID, user_id: id!, role: "member" }, { onConflict: "group_id,user_id" }).select("user_id")
  );
  return id;
}

async function pickIds(table: string, col: string, names: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const n of names) {
    const data = await q<{ id: string }[]>(`${table}~${n}`, () =>
      sb.from(table).select("id").ilike(col, `%${n}%`).limit(1)
    );
    if (data?.[0]) out.push(data[0].id);
  }
  return out;
}

// Notes store descriptors as their English canon (label_en) — the app resolves
// those to label_ru on display. Match by RU name, return label_en.
async function pickDescriptors(ruNames: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const n of ruNames) {
    const data = await q<{ label_en: string }[]>(`descriptor~${n}`, () =>
      sb.from("descriptors").select("label_en").ilike("label_ru", `%${n}%`).limit(1)
    );
    if (data?.[0]) out.push(data[0].label_en);
  }
  return out;
}

async function main() {
  console.log("Seeding demo evening → " + url);

  // --- idempotent reset of prior demo data ---
  await q("reset session", () => sb.from("tasting_sessions").delete().eq("group_id", GROUP_ID).eq("title", TITLE).select("id"));
  await q("reset wines", () => sb.from("wines").delete().eq("created_by_group_id", GROUP_ID).in("name", WINE_NAMES).select("id"));

  const masha = await ensureRater("masha.demo@sommelier.local", "Маша");
  const oleg = await ensureRater("oleg.demo@sommelier.local", "Олег");
  const raters = [OWNER_ID, masha, oleg];
  console.log("  raters:", raters.length);

  const cab = await pickIds("grapes", "name_ru", ["Каберне Совиньон"]);
  const neb = await pickIds("grapes", "name_ru", ["Неббиоло"]);
  const sbBlanc = await pickIds("grapes", "name_ru", ["Совиньон Блан"]);
  const bordeaux = await pickIds("regions", "name_ru", ["Марго", "Бордо"]);
  const piedmont = await pickIds("regions", "name_ru", ["Бароло", "Пьемонт"]);
  const marlborough = await pickIds("regions", "name_ru", ["Мальборо", "Марлборо"]);

  const darkFruit = await pickDescriptors(["смородина", "кедр", "табак", "слива"]);
  const tarRose = await pickDescriptors(["роза", "вишня", "дёготь", "кожа"]);
  const citrus = await pickDescriptors(["цитрус", "крыжовник", "трава", "лайм"]);

  const wineDefs = [
    { name: WINE_NAMES[0], vintage: 2015, wine_type: "red", region: bordeaux[0], grapes: cab },
    { name: WINE_NAMES[1], vintage: 2016, wine_type: "red", region: piedmont[0], grapes: neb },
    { name: WINE_NAMES[2], vintage: 2022, wine_type: "white", region: marlborough[0], grapes: sbBlanc },
  ];
  const wineIds: string[] = [];
  for (const w of wineDefs) {
    const row = await q<{ id: string }>(`wine ${w.name}`, () =>
      sb
        .from("wines")
        .insert({
          name: w.name,
          vintage: w.vintage,
          wine_type: w.wine_type,
          region_id: w.region ?? null,
          grape_ids: w.grapes,
          created_by_group_id: GROUP_ID,
        })
        .select("id")
        .single()
    );
    wineIds.push(row.id);
  }
  console.log("  wines:", wineIds.length);

  const today = "2026-06-02";
  const session = await q<{ id: string }>("session", () =>
    sb
      .from("tasting_sessions")
      .insert({
        group_id: GROUP_ID,
        title: TITLE,
        session_date: today,
        created_by: OWNER_ID,
        status: "completed",
        depth_mode: "standard",
      })
      .select("id")
      .single()
  );

  const wis = await q<{ id: string; position: number }[]>("wines_in_session", () =>
    sb
      .from("wines_in_session")
      .insert(wineIds.map((id, i) => ({ session_id: session.id, wine_id: id, position: i + 1, revealed: true })))
      .select("id, position")
  );
  const wisByPos = new Map(wis.map((w) => [w.position, w.id]));

  const score20 = (s: number) => Math.round((12 + (s / 100) * 8) * 2) / 2;
  const note = (
    pos: number,
    r: number,
    s: number,
    palate: Record<string, unknown>,
    desc: string[],
    quality: string,
    readiness: string,
    intensity: string
  ) => ({
    wine_in_session_id: wisByPos.get(pos)!,
    user_id: raters[r],
    appearance: { intensity, color: "" },
    nose: { intensity, descriptors: desc },
    palate,
    conclusion: { quality, readiness, free_text: "" },
    overall_score: s,
    overall_scale_raw: { scale: "20pt", value: score20(s) },
    submitted_at: new Date(`${today}T19:0${r}:00Z`).toISOString(),
  });

  const redFull = { sweetness: "dry", acidity: "medium-plus", tannin: "medium-plus", body: "full", finish: "long" };
  const redBig = { sweetness: "dry", acidity: "high", tannin: "high", body: "full", finish: "long" };
  const whiteCrisp = { sweetness: "off-dry", acidity: "high", body: "medium-minus", finish: "medium" };

  const notes = [
    note(1, 0, 92, redFull, darkFruit, "outstanding", "drink-now", "pronounced"),
    note(1, 1, 90, redFull, darkFruit, "very-good", "potential", "pronounced"),
    note(1, 2, 88, redFull, darkFruit, "very-good", "drink-now", "medium-plus"),
    note(2, 0, 95, redBig, tarRose, "outstanding", "too-young", "pronounced"),
    note(2, 1, 62, redBig, tarRose, "acceptable", "too-young", "medium-plus"),
    note(2, 2, 78, redBig, tarRose, "good", "potential", "pronounced"),
    note(3, 0, 70, whiteCrisp, citrus, "good", "drink-now", "medium-plus"),
    note(3, 1, 74, whiteCrisp, citrus, "good", "drink-now", "medium"),
    note(3, 2, 68, whiteCrisp, citrus, "acceptable", "drink-now", "medium"),
  ];
  await q("notes", () => sb.from("tasting_notes").insert(notes).select("wine_in_session_id"));

  console.log(`  notes: ${notes.length}`);
  console.log(`Done. session=${session.id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
