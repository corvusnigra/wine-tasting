import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { wineTypeRu, type WineType } from "@/lib/tasting/wine-type";
import { formatDateNumeric } from "@/lib/utils/date";
import { maturityFor } from "@/lib/tasting/maturity";

type Params = Promise<{ wineId: string }>;

export default async function WinePage({ params }: { params: Params }) {
  const { wineId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: wine } = await supabase
    .from("wines")
    .select(
      "id, name, vintage, abv, wine_type, country_code, photo_url, producers(name), regions(name_ru, name_en, country_code)"
    )
    .eq("id", wineId)
    .maybeSingle();

  if (!wine) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-4xl mb-3">Не найдено</h1>
      </div>
    );
  }

  const { data: history } = await supabase
    .from("wines_in_session")
    .select(
      "id, revealed, tasting_sessions!inner(id, title, session_date), tasting_notes(overall_score)"
    )
    .eq("wine_id", wineId)
    .eq("revealed", true)
    .order("tasting_sessions(session_date)", { ascending: false });

  type HistoryEntry = {
    id: string;
    tasting_sessions: { id: string; title: string; session_date: string } | null;
    tasting_notes: Array<{ overall_score: number | null }>;
  };
  const rows = (history ?? []) as unknown as HistoryEntry[];

  const regionEn = (wine.regions as { name_en?: string } | null)?.name_en ?? null;
  const maturity = maturityFor(
    wine.wine_type as WineType,
    wine.vintage,
    regionEn,
    new Date().getFullYear()
  );
  const photoUrl = (wine as { photo_url?: string | null }).photo_url ?? null;

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full wine-vignette">
      <header className="mb-10 anim-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-8">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Этикетка"
              className="w-40 h-52 sm:w-44 sm:h-56 object-cover rounded-2xl border border-gold/40 shadow-[0_14px_44px_-12px_rgba(0,0,0,0.6)] shrink-0 self-center sm:self-end"
            />
          )}
          <div className="min-w-0">
            <p className="smallcaps text-xs text-gold mb-3">
              {wineTypeRu(wine.wine_type) ?? "вино"}
            </p>
            <h1 className="font-display italic text-4xl sm:text-6xl leading-[0.95] mb-3 break-words">
              {wine.name}
            </h1>
            <div className="text-muted italic">
              {[wine.vintage, wine.producers?.name, wine.regions?.name_ru]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        </div>
      </header>

      {maturity && (
        <div className="card-edge rounded-2xl px-5 py-4 mb-10">
          <p className="smallcaps text-[10px] text-gold mb-0.5">
            когда пить · ориентир по возрасту
          </p>
          <p className="font-display italic text-xl">{maturity.label}</p>
          {maturity.note && (
            <p className="text-sm text-muted italic mt-1">{maturity.note}</p>
          )}
        </div>
      )}

      <section>
        <h2 className="smallcaps text-xs text-muted mb-5 rule-left">
          История дегустаций
        </h2>
        {rows.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => {
              const scores = row.tasting_notes
                .map((n) => n.overall_score)
                .filter((s): s is number => s !== null);
              const mean =
                scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length
                  : null;
              return (
                <li key={row.id}>
                  <Link
                    href={`/sessions/${row.tasting_sessions?.id}/reveal`}
                    className="flex items-baseline justify-between p-4 rounded-2xl bg-surface border border-border hover:border-gold transition-colors"
                  >
                    <div>
                      <div className="text-foreground">
                        {row.tasting_sessions?.title}
                      </div>
                      <div className="text-xs text-muted">
                        {row.tasting_sessions?.session_date &&
                          formatDateNumeric(row.tasting_sessions.session_date)}
                      </div>
                    </div>
                    {mean !== null && (
                      <div className="score-mark text-2xl shrink-0">
                        {Math.round(mean)}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted">Пока не пили в группе.</p>
        )}
      </section>
    </div>
  );
}
