import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeGroupStats, type StatWine } from "@/lib/tasting/group-stats";
import { wineTypeRu } from "@/lib/tasting/wine-type";
import { SWEETNESS, LEVEL_5, BODY } from "@/lib/tasting/sat-vocabulary";
import { plural } from "@/lib/utils/plural";

/** Static, server-rendered ordinal meter — the gold tick-scale used on the
 *  tasting card, echoed here so the group palate reads in the same language. */
function PalateMeter({
  scale,
  value,
}: {
  scale: readonly string[];
  value: string;
}) {
  const idx = scale.indexOf(value);
  const pct = idx < 0 || scale.length < 2 ? 0 : (idx / (scale.length - 1)) * 100;
  return (
    <div className="scale-meter" aria-hidden>
      <div className="scale-meter__fill" style={{ width: `${pct}%` }} />
      <div className="scale-meter__ticks">
        {scale.map((s, i) => (
          <span
            key={s}
            className={[
              "scale-meter__tick",
              idx >= 0 && i <= idx ? "is-on" : "",
              i === idx ? "is-cursor" : "",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

type Params = Promise<{ groupId: string }>;

const SWEET_RU: Record<string, string> = {
  dry: "сухое", "off-dry": "почти сухое", "medium-dry": "полусухое",
  "medium-sweet": "полусладкое", sweet: "сладкое", luscious: "очень сладкое",
};
const LEVEL_RU: Record<string, string> = {
  low: "низкая", "medium-minus": "ниже среднего", medium: "средняя",
  "medium-plus": "выше среднего", high: "высокая",
};
const BODY_RU: Record<string, string> = {
  light: "лёгкое", "medium-minus": "ниже среднего", medium: "среднее",
  "medium-plus": "выше среднего", full: "плотное",
};

export default async function StatsPage({ params }: { params: Params }) {
  const { groupId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display italic text-4xl mb-3">Группа не найдена</h1>
      </div>
    );
  }

  // One nested query: revealed wines in this group's sessions + their notes.
  const { data: rows } = await supabase
    .from("wines_in_session")
    .select(
      "id, wines!inner(id, name, vintage, wine_type, grape_ids, regions(name_ru)), tasting_sessions!inner(id, group_id), tasting_notes(user_id, overall_score, palate)"
    )
    .eq("revealed", true)
    .eq("tasting_sessions.group_id", groupId);

  type Row = {
    id: string;
    wines: {
      id: string;
      name: string;
      vintage: number | null;
      wine_type: string;
      grape_ids: string[];
      regions: { name_ru: string } | null;
    } | null;
    tasting_sessions: { id: string } | null;
    tasting_notes: Array<{
      user_id: string;
      overall_score: number | null;
      palate: StatWine["notes"][number]["palate"];
    }>;
  };
  const typed = (rows ?? []) as unknown as Row[];

  const wines: StatWine[] = typed.map((r) => ({
    wisId: r.id,
    sessionId: r.tasting_sessions?.id ?? "",
    name: r.wines?.name ?? "—",
    vintage: r.wines?.vintage ?? null,
    wineType: r.wines?.wine_type ?? "",
    grapeIds: r.wines?.grape_ids ?? [],
    regionName: r.wines?.regions?.name_ru ?? null,
    notes: r.tasting_notes ?? [],
  }));

  const stats = computeGroupStats(wines);

  // Resolve grape + member names.
  const grapeIds = stats.topGrapes.map((g) => g.id);
  const { data: grapeRows } = grapeIds.length
    ? await supabase.from("grapes").select("id, name_ru").in("id", grapeIds)
    : { data: [] };
  const grapeName = new Map((grapeRows ?? []).map((g) => [g.id, g.name_ru]));

  const memberIds = stats.members.map((m) => m.userId);
  const { data: memberRows } = memberIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
    : { data: [] };
  const memberName = new Map((memberRows ?? []).map((m) => [m.id, m.display_name]));

  const empty = stats.winesCount === 0;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full wine-vignette">
      <header className="mb-10 anim-fade-up">
        <Link
          href={`/groups/${groupId}`}
          className="smallcaps text-xs text-muted hover:text-gold transition-colors"
        >
          ← {group.name}
        </Link>
        <h1 className="font-display italic text-5xl sm:text-6xl leading-[0.95] mt-4">
          Память группы
        </h1>
        {!empty && (
          <div className="flex items-stretch gap-5 sm:gap-7 mt-6">
            <div className="stat-figure">
              <span className="fig">{stats.eveningsCount}</span>
              <span className="cap">
                {plural(stats.eveningsCount, ["вечер", "вечера", "вечеров"])}
              </span>
            </div>
            <span className="stat-rule" />
            <div className="stat-figure">
              <span className="fig">{stats.winesCount}</span>
              <span className="cap">
                {plural(stats.winesCount, ["вино", "вина", "вин"])}
              </span>
            </div>
            <span className="stat-rule" />
            <div className="stat-figure">
              <span className="fig">{stats.ratingsCount}</span>
              <span className="cap">
                {plural(stats.ratingsCount, ["оценка", "оценки", "оценок"])}
              </span>
            </div>
          </div>
        )}
      </header>

      {empty ? (
        <div className="card-edge rounded-2xl px-6 py-12 text-center">
          <p className="font-display italic text-2xl mb-2">Пока нечего считать.</p>
          <p className="text-muted italic">
            Статистика появится после первого раскрытого вечера.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {/* Best wines */}
          {stats.topWines.length > 0 && (
            <section className="anim-fade-up stagger-1">
              <h2 className="smallcaps text-xs text-muted mb-5 rule-left">
                Лучшие вина
              </h2>
              <ol className="flex flex-col gap-1">
                {stats.topWines.map((w, i) => {
                  const top = i === 0;
                  return (
                    <li
                      key={w.wisId}
                      className={
                        top
                          ? "row-laureate grid grid-cols-[2.5rem_1fr_auto] gap-4 items-center px-4 py-5"
                          : "grid grid-cols-[2.5rem_1fr_auto] gap-4 items-baseline py-4 border-t border-border"
                      }
                    >
                      <span
                        className={
                          top
                            ? "editorial-num text-4xl text-gold"
                            : "editorial-num text-3xl text-gold-soft"
                        }
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={
                            top
                              ? "font-display text-2xl break-words block leading-tight"
                              : "font-display text-xl break-words block leading-tight"
                          }
                        >
                          {w.name}
                          {w.vintage && (
                            <span className="text-muted italic text-sm ml-2">
                              {w.vintage}
                            </span>
                          )}
                        </span>
                        {top && (
                          <span className="smallcaps text-[10px] text-gold mt-1 inline-block">
                            фаворит группы
                          </span>
                        )}
                      </span>
                      <span
                        className={top ? "score-mark text-3xl" : "score-mark text-2xl"}
                      >
                        {Math.round(w.avg)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Group palate */}
          <section className="anim-fade-up stagger-2">
            <h2 className="smallcaps text-xs text-muted mb-5 rule-left">
              Вкус группы
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              {[
                { label: "Сладость", v: stats.groupPalate.sweetness, m: SWEET_RU, scale: SWEETNESS },
                { label: "Кислотность", v: stats.groupPalate.acidity, m: LEVEL_RU, scale: LEVEL_5 },
                { label: "Танины", v: stats.groupPalate.tannin, m: LEVEL_RU, scale: LEVEL_5 },
                { label: "Тельность", v: stats.groupPalate.body, m: BODY_RU, scale: BODY },
              ]
                .filter((x) => x.v)
                .map((x) => (
                  <div key={x.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="smallcaps text-[10px] text-muted">
                        {x.label}
                      </span>
                      <span className="font-display italic text-lg text-foreground">
                        {x.m[x.v as string] ?? x.v}
                      </span>
                    </div>
                    <PalateMeter scale={x.scale} value={x.v as string} />
                  </div>
                ))}
            </div>
          </section>

          {/* Top grapes */}
          {stats.topGrapes.length > 0 && (
            <section className="anim-fade-up stagger-3">
              <h2 className="smallcaps text-xs text-muted mb-5 rule-left">
                Любимые сорта
              </h2>
              <div className="flex flex-wrap gap-2">
                {stats.topGrapes.map((g) => (
                  <span
                    key={g.id}
                    className="px-4 min-h-10 inline-flex items-center gap-2 rounded-full text-sm font-display italic bg-surface border border-border"
                  >
                    {grapeName.get(g.id) ?? "—"}
                    <span className="smallcaps text-[10px] text-gold">×{g.count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Top regions */}
          {stats.topRegions.length > 0 && (
            <section className="anim-fade-up stagger-4">
              <h2 className="smallcaps text-xs text-muted mb-5 rule-left">
                Регионы по среднему баллу
              </h2>
              <ul className="flex flex-col">
                {stats.topRegions.map((r) => (
                  <li
                    key={r.name}
                    className="flex items-baseline justify-between gap-3 py-3 border-t border-border first:border-t-0"
                  >
                    <span className="font-display text-lg">{r.name}</span>
                    <span className="score-mark text-xl">{Math.round(r.avg)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Members */}
          {stats.members.length > 0 && (
            <section className="anim-fade-up stagger-5">
              <h2 className="smallcaps text-xs text-muted mb-5 rule-left">
                Участники
              </h2>
              <ul className="flex flex-col">
                {stats.members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-baseline justify-between gap-3 py-3 border-t border-border first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="font-display text-lg">
                        {memberName.get(m.userId) ?? "—"}
                      </span>
                      {m.lean && (
                        <span className="block text-xs text-gold italic">
                          чаще выше оценивает {m.lean}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-muted italic shrink-0 text-right">
                      {m.ratings} оценок
                      {m.avg !== null && (
                        <span className="score-mark text-base ml-2">
                          ср. {Math.round(m.avg)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
