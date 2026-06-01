import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RevealConfetti } from "@/components/session/RevealConfetti";
import { wineTypeRu } from "@/lib/tasting/wine-type";
import { formatDateLong } from "@/lib/utils/date";
import {
  aggregateNotes,
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
      "id, position, revealed, wines(id, name, vintage, wine_type, producers(name), regions(name_ru))"
    )
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  type WineMeta = {
    id: string;
    name: string;
    vintage: number | null;
    wine_type: string;
    producers: { name: string } | null;
    regions: { name_ru: string } | null;
  };
  const wineMeta = (w: { wines: unknown }) => w.wines as WineMeta | null;

  const { data: notesRaw } = await supabase
    .from("tasting_notes")
    .select(
      "wine_in_session_id, user_id, overall_score, nose, palate, conclusion, profiles(display_name)"
    )
    .in(
      "wine_in_session_id",
      (wines ?? []).map((w) => w.id)
    );

  type NoteRow = {
    wine_in_session_id: string;
    user_id: string;
    overall_score: number | null;
    nose: { descriptors?: string[] } | null;
    palate: { flavor_descriptors?: string[] } | null;
    conclusion: { free_text?: string; quality?: string } | null;
    profiles: { display_name: string | null } | null;
  };
  const notes = (notesRaw ?? []) as unknown as NoteRow[];

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
      ],
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
              <h2 className="font-display text-3xl sm:text-5xl mb-2 break-words">
                {wine?.name}
              </h2>
              <p className="text-sm text-muted italic mb-1">
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

            {wineNotes.length > 0 && (
              <details className="mt-2 group max-w-xl mx-auto">
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
                <h2 className="font-display text-xl sm:text-2xl mb-1 break-words">
                  {wine?.name}
                </h2>
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
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="score-mark text-3xl">
                      {Math.round(agg.mean)}
                    </span>
                    <span className="smallcaps text-[10px] text-muted">
                      /100 · место {idx + 2} из {ranked.length}
                    </span>
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
