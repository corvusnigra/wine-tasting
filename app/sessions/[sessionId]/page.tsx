import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InviteShare } from "@/components/session/InviteShare";
import { ensureGroupInvite } from "@/lib/groups/ensure-group-invite";
import { RevealButton } from "@/components/session/RevealButton";
import { SessionLiveRefresher } from "@/components/session/SessionLiveRefresher";
import { EditableTitle } from "@/components/session/EditableTitle";
import { SessionHostTools } from "@/components/session/SessionHostTools";
import { Avatar } from "@/components/layout/Avatar";
import { wineTypeRu, wineTypeColor } from "@/lib/tasting/wine-type";
import { formatDateLong } from "@/lib/utils/date";

type Params = Promise<{ sessionId: string }>;

export default async function SessionPage({ params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const userId = userData.user.id;

  const { data: session } = await supabase
    .from("tasting_sessions")
    .select(
      "id, title, session_date, group_id, created_by, status, depth_mode, blind_mode"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display italic text-4xl mb-3">Вечер не найден</h1>
        <p className="text-muted">Возможно, у вас нет доступа.</p>
      </div>
    );
  }

  const isHost = session.created_by === userId;

  const { data: winesInSession } = await supabase
    .from("wines_in_session")
    .select(
      "id, position, revealed, wines(id, name, vintage, wine_type, country_code, producer_id, region_id, photo_url)"
    )
    .eq("session_id", sessionId)
    .order("position", { ascending: true });

  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, role, profiles(display_name)")
    .eq("group_id", session.group_id);

  const wisIds = (winesInSession ?? []).map((w) => w.id);
  const { data: notes } = wisIds.length
    ? await supabase
        .from("tasting_notes")
        .select("wine_in_session_id, user_id, submitted_at")
        .in("wine_in_session_id", wisIds)
    : { data: [] };

  // Any group member can share the invite link — not just the host.
  let code: string | null = null;
  try {
    code = await ensureGroupInvite(supabase, session.group_id, userId);
  } catch {
    code = null;
  }

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  // Session-scoped invite — scanning the QR lands guests straight on this
  // evening to rate, not on the host dashboard.
  const inviteUrl = code
    ? `${protocol}://${host}/invite/${code}?s=${sessionId}`
    : null;

  const progressByWine = new Map<string, number>();
  const participantIds = new Set<string>();
  for (const note of notes ?? []) {
    if (!note.submitted_at) continue;
    progressByWine.set(
      note.wine_in_session_id,
      (progressByWine.get(note.wine_in_session_id) ?? 0) + 1
    );
    participantIds.add(note.user_id);
  }

  // Reveal readiness is based on people who actually tasted this evening —
  // not the whole group roster (a group can have 10 members but only 3 attend,
  // and late joiners shouldn't lock the host out).
  const participantCount = participantIds.size;
  const totalMembers = participantCount;
  const allWinesComplete =
    !!winesInSession &&
    winesInSession.length > 0 &&
    participantCount > 0 &&
    winesInSession.every((w) => (progressByWine.get(w.id) ?? 0) >= participantCount);

  // Track current user's own progress separately for the "вы оценили N из M" line.
  const myCompletedNotes = (notes ?? []).filter(
    (n) => n.user_id === userId && n.submitted_at
  ).length;
  const totalWines = winesInSession?.length ?? 0;
  const myWineIdsCompleted = new Set(
    (notes ?? [])
      .filter((n) => n.user_id === userId && n.submitted_at)
      .map((n) => n.wine_in_session_id)
  );

  // Per-member completion (for named realtime progress in "За столом").
  const completedByUser = new Map<string, number>();
  for (const n of notes ?? []) {
    if (!n.submitted_at) continue;
    completedByUser.set(n.user_id, (completedByUser.get(n.user_id) ?? 0) + 1);
  }

  const anyRevealed = (winesInSession ?? []).some((w) => w.revealed);
  const maxPosition = (winesInSession ?? []).reduce(
    (m, w) => Math.max(m, w.position),
    0
  );
  const sessionDate = new Date(session.session_date);

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full wine-vignette">
      <SessionLiveRefresher
        sessionId={sessionId}
        wineInSessionIds={(winesInSession ?? []).map((w) => w.id)}
      />

      {/* Hero */}
      <header className="mb-8 sm:mb-10 anim-fade-up">
        <p className="smallcaps text-xs text-gold mb-3">
          {formatDateLong(sessionDate)}
        </p>
        <EditableTitle
          sessionId={sessionId}
          initialTitle={session.title}
          canEdit={isHost && !anyRevealed}
        />
      </header>

      {/* Host onboarding — only before anyone has rated */}
      {isHost && !anyRevealed && participantCount === 0 && (
        <div className="card-edge rounded-2xl px-5 py-4 mb-8 sm:mb-10">
          <p className="smallcaps text-[10px] text-gold mb-1">Вы — хозяин вечера</p>
          <p className="text-sm text-muted italic leading-relaxed">
            Покажите QR-код друзьям, чтобы они присоединились со своих телефонов.
            Каждый оценит вина вслепую. Когда все закончат — внизу станет активна
            кнопка «Раскрыть результаты».
          </p>
        </div>
      )}

      {/* Your progress banner */}
      {totalWines > 0 && (
        <div className="card-edge rounded-2xl px-5 py-4 mb-8 sm:mb-10 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="smallcaps text-[10px] text-muted mb-0.5">Ваш прогресс</p>
            <p className="font-display italic text-xl">
              {myCompletedNotes === totalWines
                ? "Все оценки готовы · ждём остальных"
                : myCompletedNotes === 0
                  ? "Начните с первого вина"
                  : `Оценили ${myCompletedNotes} из ${totalWines}`}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {(winesInSession ?? []).map((w) => (
              <span
                key={w.id}
                className={`w-2 h-2 rounded-full ${
                  myWineIdsCompleted.has(w.id) ? "bg-gold" : "bg-border-strong"
                }`}
                title={`Вино #${w.position}`}
              />
            ))}
          </div>
        </div>
      )}

      {inviteUrl && (
        <section className="mb-14">
          <h2 className="smallcaps text-xs text-muted mb-3 rule-left">Пригласить</h2>
          <InviteShare inviteUrl={inviteUrl} />
        </section>
      )}

      {/* Flight */}
      <section className="mb-14">
        <h2 className="smallcaps text-xs text-muted mb-6 rule-left">Флайт</h2>
        <ol className="flex flex-col">
          {winesInSession?.map((w) => {
            const wine = w.wines;
            const completed = progressByWine.get(w.id) ?? 0;
            const youDone = myWineIdsCompleted.has(w.id);
            return (
              <li key={w.id} className="border-t border-border first:border-t-0">
                <Link
                  href={`/sessions/${sessionId}/wine/${wine?.id}`}
                  className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[3rem_1fr_auto] gap-4 sm:gap-6 items-center py-5 sm:py-6 group active:bg-bordeaux/5"
                >
                  <div className="text-right">
                    <div className="editorial-num text-3xl sm:text-4xl text-gold-soft group-hover:text-gold transition-colors">
                      {String(w.position).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="min-w-0 flex items-center gap-3">
                    {wine?.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={wine.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover border border-gold/30 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-display text-xl sm:text-2xl group-hover:text-gold transition-colors break-words">
                        {wine?.name ?? "—"}
                      </h3>
                      <p className="text-sm text-muted italic mt-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full align-middle mr-2"
                          style={{ background: wineTypeColor(wine?.wine_type) }}
                          aria-hidden
                        />
                        {[wine?.vintage, wineTypeRu(wine?.wine_type)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {youDone ? (
                      <span className="smallcaps text-[10px] text-gold inline-flex items-center gap-1">
                        <span>✓</span> вы оценили
                      </span>
                    ) : (
                      <span className="smallcaps text-[10px] text-gold inline-flex items-center gap-1 group-hover:text-gold-light">
                        оценить →
                      </span>
                    )}
                    {totalMembers > 0 && (
                      <span className="smallcaps text-[10px] text-muted">
                        все: {completed}/{totalMembers}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="ornament my-12">
        <span className="text-xs">···</span>
      </div>

      <section>
        <h2 className="smallcaps text-xs text-muted mb-6 rule-left">За столом</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-4 mb-8">
          {members?.map((m) => {
            const done = completedByUser.get(m.user_id) ?? 0;
            return (
              <Avatar
                key={m.user_id}
                name={m.profiles?.display_name ?? null}
                role={m.role}
                done={totalWines > 0 && done >= totalWines}
                subtitle={totalWines > 0 ? `${done}/${totalWines}` : undefined}
              />
            );
          })}
        </div>
        {isHost && <RevealButton sessionId={sessionId} enabled={!!allWinesComplete} />}
        {isHost && !anyRevealed && (
          <SessionHostTools
            sessionId={sessionId}
            maxPosition={maxPosition}
            flight={(winesInSession ?? []).map((w) => ({
              wisId: w.id,
              wineId: w.wines?.id ?? "",
              name: w.wines?.name ?? "—",
            }))}
          />
        )}
      </section>
    </div>
  );
}
