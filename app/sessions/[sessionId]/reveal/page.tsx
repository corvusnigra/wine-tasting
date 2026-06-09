import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RevealConfetti } from "@/components/session/RevealConfetti";
import { EveningCard } from "@/components/session/EveningCard";
import { wineTypeRu, wineTypeColor } from "@/lib/tasting/wine-type";
import { formatDateLong } from "@/lib/utils/date";
import { OrdinalMeter } from "@/components/tasting/OrdinalMeter";
import {
  INTENSITY_5,
  SWEETNESS,
  LEVEL_5,
  BODY,
  FINISH,
  QUALITY,
  READINESS,
} from "@/lib/tasting/sat-vocabulary";
import {
  aggregateNotes,
  modeOf,
  pickBadges,
  type Badge,
  type SimpleNote,
  type WineAggregate,
} from "@/lib/tasting/aggregate";

type Params = Promise<{ sessionId: string }>;

const BADGE_LABEL: Record<Badge, string> = {
  best: "лучшее по среднему",
  controversial: "самое спорное",
  unanimous: "единогласно лучшее",
};

export default async function RevealPage({ params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: session } = await supabase
    .from("tasting_sessions")
    .select("id, title, session_date, group_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display italic text-4xl mb-3">Не найдено</h1>
      </div>
    );
  }

  const { data: wines } = await supabase
    .from("wines_in_session")
    .select(
      "id, position, revealed, wines(id, name, vintage, wine_type, photo_url, producers(name), regions(name_ru))"
    )
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  // Don't compute a winner before the host has revealed — RLS would only
  // expose the viewer's own notes, producing a misleading partial result.
  const hasWines = (wines ?? []).length > 0;
  const allRevealed = hasWines && (wines ?? []).every((w) => w.revealed);
  if (!allRevealed) {
    redirect(`/sessions/${sessionId}`);
  }

  type WineMeta = {
    id: string;
    name: string;
    vintage: number | null;
    wine_type: string;
    photo_url: string | null;
    producers: { name: string } | null;
    regions: { name_ru: string } | null;
  };
  const wineMeta = (w: { wines: unknown }) => w.wines as WineMeta | null;

  const wineIds = (wines ?? []).map((w) => w.id);
  const { data: notesRaw } = wineIds.length
    ? await supabase
        .from("tasting_notes")
        .select(
          "wine_in_session_id, user_id, overall_score, appearance, nose, palate, conclusion, profiles(display_name)"
        )
        .in("wine_in_session_id", wineIds)
    : { data: [] };

  type NoteRow = {
    wine_in_session_id: string;
    user_id: string;
    overall_score: number | null;
    appearance: { intensity?: string; color?: string } | null;
    nose: { intensity?: string; descriptors?: string[] } | null;
    palate: {
      sweetness?: string;
      acidity?: string;
      tannin?: string;
      body?: string;
      alcohol?: string;
      finish?: string;
      flavor_descriptors?: string[];
    } | null;
    conclusion: { free_text?: string; quality?: string; readiness?: string } | null;
    profiles: { display_name: string | null } | null;
  };
  const notes = (notesRaw ?? []) as unknown as NoteRow[];

  // Descriptor labels are stored as English canon (label_en) — map to RU.
  const { data: descRows } = await supabase
    .from("descriptors")
    .select("label_en, label_ru");
  const descRu = new Map<string, string>(
    (descRows ?? []).map((d) => [d.label_en, d.label_ru])
  );
  const ruDesc = (label: string) => descRu.get(label) ?? label;

  // Translators for the aggregated SAT profile.
  const tIntensity = await getTranslations("sat.intensity");
  const tLevel = await getTranslations("sat.level");
  const tSweet = await getTranslations("sat.sweetness");
  const tBody = await getTranslations("sat.body");
  const tFinish = await getTranslations("sat.finish");
  const tQuality = await getTranslations("sat.quality");
  const tReadiness = await getTranslations("sat.readiness");
  const safe = (fn: (k: string) => string, v: string | null) => {
    if (!v) return null;
    try {
      return fn(v);
    } catch {
      return v;
    }
  };

  type ProfileRow = {
    label: string;
    value: string;
    scale: readonly string[];
    raw: string;
  };
  function buildProfile(rows: NoteRow[], wineType: string | undefined): ProfileRow[] {
    if (rows.length === 0) return [];
    const out: ProfileRow[] = [];
    const push = (
      label: string,
      raw: string | null,
      fn: (k: string) => string,
      scale: readonly string[]
    ) => {
      const t = safe(fn, raw);
      if (t && raw) out.push({ label, value: t, scale, raw });
    };
    push("Цвет", modeOf(rows.map((r) => r.appearance?.intensity)), tIntensity, INTENSITY_5);
    push("Аромат", modeOf(rows.map((r) => r.nose?.intensity)), tIntensity, INTENSITY_5);
    push("Сладость", modeOf(rows.map((r) => r.palate?.sweetness)), tSweet, SWEETNESS);
    push("Кислотность", modeOf(rows.map((r) => r.palate?.acidity)), tLevel, LEVEL_5);
    if (wineType === "red")
      push("Танины", modeOf(rows.map((r) => r.palate?.tannin)), tLevel, LEVEL_5);
    push("Тельность", modeOf(rows.map((r) => r.palate?.body)), tBody, BODY);
    push("Крепость", modeOf(rows.map((r) => r.palate?.alcohol)), tLevel, LEVEL_5);
    push("Послевкусие", modeOf(rows.map((r) => r.palate?.finish)), tFinish, FINISH);
    push("Качество", modeOf(rows.map((r) => r.conclusion?.quality)), tQuality, QUALITY);
    push("Зрелость", modeOf(rows.map((r) => r.conclusion?.readiness)), tReadiness, READINESS);
    return out;
  }

  const notesByWine = new Map<string, SimpleNote[]>();
  const fullNotesByWine = new Map<string, NoteRow[]>();
  for (const n of notes) {
    const arr = notesByWine.get(n.wine_in_session_id) ?? [];
    arr.push({
      user_id: n.user_id,
      display_name: n.profiles?.display_name ?? null,
      overall_score: n.overall_score,
      descriptors: [
        ...(n.nose?.descriptors ?? []),
        ...(n.palate?.flavor_descriptors ?? []),
      ].map(ruDesc),
    });
    notesByWine.set(n.wine_in_session_id, arr);

    const full = fullNotesByWine.get(n.wine_in_session_id) ?? [];
    full.push(n);
    fullNotesByWine.set(n.wine_in_session_id, full);
  }

  const aggByWine = new Map<string, WineAggregate>();
  for (const w of wines ?? []) {
    aggByWine.set(w.id, aggregateNotes(notesByWine.get(w.id) ?? []));
  }
  const badges = pickBadges(
    (wines ?? []).map((w) => ({
      id: w.id,
      mean: aggByWine.get(w.id)?.mean ?? null,
      std: aggByWine.get(w.id)?.std ?? null,
    }))
  );

  // Rank wines by mean score (desc, nulls last)
  const ranked = [...(wines ?? [])].sort((a, b) => {
    const ma = aggByWine.get(a.id)?.mean ?? -1;
    const mb = aggByWine.get(b.id)?.mean ?? -1;
    return mb - ma;
  });
  const winner = ranked[0];
  const others = ranked.slice(1);

  // Shareable "evening card" summary.
  const controversialId = [...badges.entries()].find(([, bs]) =>
    bs.includes("controversial")
  )?.[0];
  const eveningSummary = {
    title: session.title,
    dateLabel: formatDateLong(session.session_date),
    participants: new Set(notes.map((n) => n.user_id)).size,
    winner: winner
      ? {
          name: wineMeta(winner)?.name ?? "—",
          score: aggByWine.get(winner.id)?.mean ?? null,
        }
      : null,
    wines: ranked.map((w) => ({
      position: w.position,
      name: wineMeta(w)?.name ?? "—",
      score: aggByWine.get(w.id)?.mean ?? null,
    })),
    palate: winner
      ? (aggByWine.get(winner.id)?.topDescriptors ?? []).map((d) => d.label)
      : [],
    controversial: controversialId
      ? wineMeta(
          (wines ?? []).find((w) => w.id === controversialId)!
        )?.name ?? null
      : null,
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full wine-vignette">
      {winner && <RevealConfetti />}
      {/* Hero */}
      <header className="mb-10 sm:mb-14 anim-fade-up">
        <Link
          href={`/sessions/${sessionId}`}
          className="smallcaps text-xs text-muted hover:text-gold transition-colors"
        >
          ← к вечеру
        </Link>
        <p className="smallcaps text-xs text-gold mt-6 mb-3">Раскрыто</p>
        <h1 className="font-display italic text-4xl sm:text-5xl md:text-6xl leading-[0.95] mb-2 break-words">
          {session.title}
        </h1>
        <p className="text-muted italic">{formatDateLong(session.session_date)}</p>
        {winner && (
          <div className="mt-6">
            <EveningCard summary={eveningSummary} />
          </div>
        )}
      </header>

      {/* Winner — theatrical */}
      {winner && (() => {
        const wine = wineMeta(winner);
        const agg = aggByWine.get(winner.id);
        const wineBadges = badges.get(winner.id) ?? [];
        const wineNotes = fullNotesByWine.get(winner.id) ?? [];
        const sub = [wine?.producers?.name, wine?.regions?.name_ru]
          .filter(Boolean)
          .join(" · ");
        return (
          <section
            key={winner.id}
            className="anim-fade-up stagger-1 relative mb-14"
          >
            <div
              aria-hidden
              className="absolute -inset-x-6 -inset-y-8 bg-gradient-to-b from-gold/8 via-bordeaux/5 to-transparent rounded-3xl -z-10"
            />
            <div className="text-center mb-6">
              <p className="smallcaps text-[10px] text-gold mb-2">
                Победитель вечера
              </p>
              <div className="ornament max-w-[8rem] mx-auto">
                <span className="text-xs">·</span>
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              {wine?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wine.photo_url}
                  alt="Этикетка"
                  className="w-28 h-36 sm:w-32 sm:h-40 object-cover rounded-2xl border border-gold/40 shadow-[0_10px_36px_-10px_rgba(201,162,76,0.5)] mb-5"
                />
              )}
              <h2 className="font-display text-3xl sm:text-5xl mb-2 break-words">
                {wine?.id ? (
                  <Link href={`/wines/${wine.id}`} className="hover:text-gold transition-colors">
                    {wine.name}
                  </Link>
                ) : (
                  wine?.name
                )}
              </h2>
              <p className="text-sm text-muted italic mb-1">
                <span
                  className="inline-block w-2 h-2 rounded-full align-middle mr-2"
                  style={{ background: wineTypeColor(wine?.wine_type) }}
                  aria-hidden
                />
                {[wine?.vintage, wineTypeRu(wine?.wine_type)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {sub && (
                <p className="font-display italic text-base text-foreground/70 mb-6">
                  {sub}
                </p>
              )}

              {agg?.mean !== null && agg?.mean !== undefined && (
                <div className="medallion mb-3">
                  <span className="num">{Math.round(agg.mean)}</span>
                  <span className="unit">/100</span>
                </div>
              )}
              <p className="smallcaps text-[10px] text-muted mb-6">
                место 1 из {ranked.length}
              </p>

              {wineBadges.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {wineBadges.map((b) => (
                    <span
                      key={b}
                      className="smallcaps text-[10px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold/40 text-gold"
                    >
                      {BADGE_LABEL[b]}
                    </span>
                  ))}
                </div>
              )}

              {agg && agg.topDescriptors.length > 0 && (
                <p className="font-display italic text-xl sm:text-2xl leading-relaxed max-w-md mx-auto mb-6">
                  {agg.topDescriptors.map((d) => d.label).join(" · ")}
                </p>
              )}
            </div>

            {(() => {
              const profile = buildProfile(wineNotes, wine?.wine_type);
              if (profile.length === 0) return null;
              return (
                <dl className="max-w-md mx-auto grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 mt-2 mb-2">
                  {profile.map((row) => (
                    <div key={row.label}>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="smallcaps text-[10px] text-muted">
                          {row.label}
                        </dt>
                        <dd className="font-display italic text-sm text-foreground">
                          {row.value}
                        </dd>
                      </div>
                      <OrdinalMeter scale={row.scale} value={row.raw} />
                    </div>
                  ))}
                </dl>
              );
            })()}

            {wineNotes.length > 0 && (
              <details className="mt-6 group max-w-xl mx-auto">
                <summary className="smallcaps text-xs text-gold hover:text-gold-light cursor-pointer inline-flex items-center gap-2 list-none">
                  <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                  Заметки участников · {wineNotes.length}
                </summary>
                <ul className="mt-4 flex flex-col gap-3 pl-4 border-l border-border">
                  {wineNotes.map((n) => {
                    const isOutlier = agg?.outliers.includes(n.user_id);
                    return (
                      <li key={n.user_id}>
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-sm">
                            {n.profiles?.display_name ?? "—"}
                            {isOutlier && (
                              <span className="ml-2 smallcaps text-[10px] text-gold">
                                · особое мнение
                              </span>
                            )}
                          </span>
                          {n.overall_score !== null && (
                            <span className="score-mark text-lg">
                              {Math.round(n.overall_score)}
                            </span>
                          )}
                        </div>
                        {n.conclusion?.free_text && (
                          <p className="text-sm text-muted italic leading-relaxed">
                            «{n.conclusion.free_text}»
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </section>
        );
      })()}

      {others.length > 0 && (
        <>
          <div className="ornament my-10 sm:my-12">
            <span className="text-xs">···</span>
          </div>
          <p className="smallcaps text-xs text-muted text-center mb-8">
            Остальные вина
          </p>
        </>
      )}

      {/* Others — restrained list */}
      <div className="flex flex-col gap-10">
        {others.map((w, idx) => {
          const wine = wineMeta(w);
          const agg = aggByWine.get(w.id);
          const wineBadges = badges.get(w.id) ?? [];
          const wineNotes = fullNotesByWine.get(w.id) ?? [];
          return (
            <article
              key={w.id}
              className={`grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_1fr] gap-x-4 sm:gap-x-8 gap-y-3 anim-fade-up stagger-${Math.min(idx + 2, 5)}`}
            >
              <div className="text-right">
                <div className="dropcap text-4xl sm:text-6xl leading-none">
                  {String(w.position).padStart(2, "0")}
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  {wine?.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={wine.photo_url}
                      alt=""
                      className="w-11 h-11 rounded-lg object-cover border border-gold/30 shrink-0"
                    />
                  )}
                  <h2 className="font-display text-xl sm:text-2xl break-words">
                    {wine?.id ? (
                      <Link href={`/wines/${wine.id}`} className="hover:text-gold transition-colors">
                        {wine.name}
                      </Link>
                    ) : (
                      wine?.name
                    )}
                  </h2>
                </div>
                <p className="text-sm text-muted italic mb-1">
                  {[wine?.vintage, wineTypeRu(wine?.wine_type)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {(wine?.producers?.name || wine?.regions?.name_ru) && (
                  <p className="font-display italic text-sm text-foreground/65 mb-3">
                    {[wine?.producers?.name, wine?.regions?.name_ru]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}

                {agg?.mean !== null && agg?.mean !== undefined && (
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="score-mark text-3xl">
                        {Math.round(agg.mean)}
                      </span>
                      <span className="smallcaps text-[10px] text-muted">
                        /100 · место {idx + 2} из {ranked.length}
                      </span>
                    </div>
                    <div className="score-bar mt-2 max-w-[14rem]" aria-hidden>
                      <div
                        className="score-bar__fill"
                        style={{ width: `${Math.max(0, Math.min(100, agg.mean))}%` }}
                      />
                    </div>
                  </div>
                )}

                {wineBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {wineBadges.map((b) => (
                      <span
                        key={b}
                        className="smallcaps text-[10px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gold/40 text-gold"
                      >
                        {BADGE_LABEL[b]}
                      </span>
                    ))}
                  </div>
                )}

                {agg && agg.topDescriptors.length > 0 && (
                  <p className="font-display italic text-base text-foreground/80 mb-3">
                    {agg.topDescriptors.map((d) => d.label).join(" · ")}
                  </p>
                )}

                {(() => {
                  const profile = buildProfile(wineNotes, wine?.wine_type);
                  if (profile.length === 0) return null;
                  return (
                    <dl className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3">
                      {profile.map((row) => (
                        <div key={row.label} className="flex items-baseline gap-1.5">
                          <dt className="smallcaps text-[10px] text-muted">
                            {row.label}
                          </dt>
                          <dd className="font-display italic text-sm text-foreground/85">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  );
                })()}

                {wineNotes.length > 0 && (
                  <details className="mt-2 group">
                    <summary className="smallcaps text-[10px] text-gold hover:text-gold-light cursor-pointer inline-flex items-center gap-2 list-none">
                      <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                      Заметки · {wineNotes.length}
                    </summary>
                    <ul className="mt-3 flex flex-col gap-3 pl-4 border-l border-border">
                      {wineNotes.map((n) => {
                        const isOutlier = agg?.outliers.includes(n.user_id);
                        return (
                          <li key={n.user_id}>
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <span className="text-sm">
                                {n.profiles?.display_name ?? "—"}
                                {isOutlier && (
                                  <span className="ml-2 smallcaps text-[10px] text-gold">
                                    · особое мнение
                                  </span>
                                )}
                              </span>
                              {n.overall_score !== null && (
                                <span className="score-mark text-base">
                                  {Math.round(n.overall_score)}
                                </span>
                              )}
                            </div>
                            {n.conclusion?.free_text && (
                              <p className="text-sm text-muted italic leading-relaxed">
                                «{n.conclusion.free_text}»
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
