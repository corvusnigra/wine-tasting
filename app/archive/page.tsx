import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const WINE_TYPE_RU: Record<string, string> = {
  red: "Красное",
  white: "Белое",
  rose: "Розовое",
  sparkling: "Игристое",
};

export default async function ArchivePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: sessions } = await supabase
    .from("tasting_sessions")
    .select(
      "id, title, session_date, group_id, status, wines_in_session(id, position, wines(name, vintage, wine_type))"
    )
    .order("session_date", { ascending: false })
    .limit(50);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 w-full">
      <h1 className="font-display text-4xl mb-8">Архив</h1>

      {sessions && sessions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/sessions/${s.id}`}
                className="block p-5 rounded-2xl bg-surface border border-border hover:border-gold transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h2 className="font-display text-xl">{s.title}</h2>
                  <span className="text-xs text-muted shrink-0">
                    {new Date(s.session_date).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {s.wines_in_session
                    ?.sort((a, b) => a.position - b.position)
                    .map((w) => (
                      <li
                        key={w.id}
                        className="text-xs px-2 py-1 rounded-full bg-background border border-border"
                      >
                        {w.wines?.name}
                        {w.wines?.vintage && ` · ${w.wines.vintage}`}
                        {w.wines?.wine_type && (
                          <span className="text-muted ml-1">
                            · {WINE_TYPE_RU[w.wines.wine_type]}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Пока ни одного вечера. Создайте первый.</p>
      )}
    </div>
  );
}
