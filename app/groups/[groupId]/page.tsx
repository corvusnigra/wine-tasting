import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/layout/Avatar";

type Params = Promise<{ groupId: string }>;

export default async function GroupPage({ params }: { params: Params }) {
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
        <p className="text-muted">Возможно, вы не состоите в этой группе.</p>
      </div>
    );
  }

  const { data: sessions } = await supabase
    .from("tasting_sessions")
    .select(
      "id, title, session_date, status, wines_in_session(id, wines(name, vintage, wine_type))"
    )
    .eq("group_id", groupId)
    .order("session_date", { ascending: false })
    .limit(20);

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, profiles(display_name)")
    .eq("group_id", groupId);

  const memberCount = members?.length ?? 0;
  const sessionCount = sessions?.length ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full wine-vignette">
      {/* Hero */}
      <header className="mb-12 sm:mb-16 anim-fade-up">
        <p className="smallcaps text-xs text-gold mb-3">Дневник дегустаций</p>
        <h1 className="font-display italic text-5xl sm:text-6xl md:text-7xl leading-[0.95] mb-4 break-words">
          {group.name}
        </h1>
        <p className="text-muted italic">
          {memberCount === 1 ? "1 участник" : `${memberCount} участника`}
          {" · "}
          {sessionCount === 0
            ? "ещё ни одного вечера"
            : sessionCount === 1
              ? "1 вечер"
              : `${sessionCount} вечеров`}
        </p>
      </header>

      {/* Members + CTA */}
      <section className="mb-14 sm:mb-16 grid grid-cols-1 md:grid-cols-[1fr_auto] items-end gap-6 md:gap-8">
        <div>
          <h2 className="smallcaps text-xs text-muted mb-4 rule-left">Участники</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {members?.map((m) => (
              <Avatar
                key={m.user_id}
                name={m.profiles?.display_name ?? null}
                role={m.role}
              />
            ))}
          </div>
        </div>
        <Link
          href="/sessions/new"
          className="btn-seal h-12 px-7 rounded-full inline-flex items-center justify-center gap-2 self-start md:self-end w-full md:w-auto"
        >
                    <span>Новый вечер</span>
        </Link>
      </section>

      <div className="ornament my-12">
        <span className="text-xs">···</span>
      </div>

      {/* Sessions */}
      <section>
        {sessions && sessions.length > 0 && (
          <h2 className="smallcaps text-xs text-muted mb-6 rule-left">Вечера</h2>
        )}
        {sessions && sessions.length > 0 ? (
          <ul className="flex flex-col">
            {sessions.map((s, idx) => {
              const winesCount = s.wines_in_session?.length ?? 0;
              const wineNames =
                s.wines_in_session
                  ?.slice(0, 3)
                  .map((w) => w.wines?.name)
                  .filter(Boolean) ?? [];
              const date = new Date(s.session_date);
              return (
                <li key={s.id} className="border-t border-border first:border-t-0">
                  <Link
                    href={`/sessions/${s.id}`}
                    className="grid grid-cols-[3rem_1fr] sm:grid-cols-[3.5rem_1fr_auto] gap-4 sm:gap-6 items-baseline py-5 sm:py-6 group active:bg-bordeaux/5"
                  >
                    <div className="text-right">
                      <div className="editorial-num text-2xl sm:text-3xl text-gold-soft group-hover:text-gold transition-colors">
                        {String(sessions.length - idx).padStart(2, "0")}
                      </div>
                      <div className="smallcaps text-[10px] text-muted mt-1">
                        {date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl sm:text-2xl group-hover:text-gold transition-colors break-words">
                        {s.title}
                      </h3>
                      {wineNames.length > 0 && (
                        <p className="text-sm text-muted italic mt-1 line-clamp-2">
                          {wineNames.join(", ")}
                          {winesCount > 3 && ` и ещё ${winesCount - 3}`}
                        </p>
                      )}
                      <p className="sm:hidden smallcaps text-[10px] text-muted mt-2">
                        {s.status === "completed" ? "завершён" : "идёт"}
                      </p>
                    </div>
                    <div className="hidden sm:block smallcaps text-[10px] text-muted">
                      {s.status === "completed" ? "завершён" : "идёт"}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card-edge rounded-2xl px-6 sm:px-10 py-12 text-center">
            <p className="smallcaps text-[10px] text-gold mb-3">с чего начать</p>
            <p className="font-display italic text-3xl sm:text-4xl mb-3">
              Откройте
              <br />
              первую бутылку.
            </p>
            <p className="text-muted italic mb-7 max-w-md mx-auto leading-relaxed">
              Создайте «вечер», добавьте 1-3 вина и пришлите ссылку друзьям.
              Приложение запомнит впечатления, средние оценки и аутлаеров.
            </p>
            <Link
              href="/sessions/new"
              className="btn-seal h-12 px-7 rounded-full inline-flex items-center gap-2"
            >
                            <span>Создать первый вечер</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
