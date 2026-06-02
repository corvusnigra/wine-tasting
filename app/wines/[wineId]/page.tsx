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
      <header className="mb-8 flex items-start gap-5">
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Этикетка"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-gold/40 shrink-0"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-display italic text-4xl sm:text-5xl mb-2 break-words">
            {wine.name}
          </h1>
          <div className="text-sm text-muted italic">
            {[
              wine.vintage,
              wineTypeRu(wine.wine_type),
              wine.producers?.name,
              wine.regions?.name_ru,
            ]
              .filter(Boolean)
              .join(" · ")}
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
        <h2 className="text-sm uppercase tracking-wider text-muted mb-3">
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
                      <div className="font-display text-2xl text-gold">
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
