import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{ wineId: string }>;

const WINE_TYPE_RU: Record<string, string> = {
  red: "Красное",
  white: "Белое",
  rose: "Розовое",
  sparkling: "Игристое",
};

export default async function WinePage({ params }: { params: Params }) {
  const { wineId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: wine } = await supabase
    .from("wines")
    .select(
      "id, name, vintage, abv, wine_type, country_code, producers(name), regions(name_ru, country_code)"
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 w-full">
      <header className="mb-8">
        <h1 className="font-display text-4xl mb-2">{wine.name}</h1>
        <div className="text-sm text-muted">
          {[
            wine.vintage,
            wine.wine_type ? WINE_TYPE_RU[wine.wine_type] : null,
            wine.producers?.name,
            wine.regions?.name_ru,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </header>

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
                          new Date(row.tasting_sessions.session_date).toLocaleDateString(
                            "ru-RU"
                          )}
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
