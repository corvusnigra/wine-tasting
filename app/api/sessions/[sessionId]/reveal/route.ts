import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{ sessionId: string }>;

export async function POST(request: Request, { params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Host may force a reveal even if some participants left without finishing.
  const body = (await request.json().catch(() => null)) as { force?: boolean } | null;
  const force = body?.force === true;

  const { data: session } = await supabase
    .from("tasting_sessions")
    .select("id, created_by, group_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.created_by !== userData.user.id) {
    return NextResponse.json({ error: "Раскрыть может только хозяин вечера" }, { status: 403 });
  }

  // Gate: every participant (anyone who submitted at least one note this
  // evening) must have a submitted note for every wine. The winner is only
  // computed once everyone who took part has finished.
  const { data: wines } = await supabase
    .from("wines_in_session")
    .select("id")
    .eq("session_id", sessionId);
  const wineIds = (wines ?? []).map((w) => w.id);
  if (wineIds.length === 0) {
    return NextResponse.json({ error: "В вечере нет вин" }, { status: 409 });
  }

  const { data: submitted } = await supabase
    .from("tasting_notes")
    .select("wine_in_session_id, user_id, submitted_at")
    .in("wine_in_session_id", wineIds);

  const done = (submitted ?? []).filter((n) => n.submitted_at);
  const participants = new Set(done.map((n) => n.user_id));
  if (participants.size === 0) {
    return NextResponse.json(
      { error: "Пока никто не завершил оценку" },
      { status: 409 }
    );
  }

  // completed[user] = set of wine ids they finished
  const completedByUser = new Map<string, Set<string>>();
  for (const n of done) {
    const set = completedByUser.get(n.user_id) ?? new Set<string>();
    set.add(n.wine_in_session_id);
    completedByUser.set(n.user_id, set);
  }
  const everyoneDone = Array.from(participants).every(
    (uid) => (completedByUser.get(uid)?.size ?? 0) >= wineIds.length
  );
  // The host can override the "everyone finished" gate when someone left mid-way.
  if (!everyoneDone && !force) {
    return NextResponse.json(
      { error: "Не все участники закончили — дождитесь остальных", canForce: true },
      { status: 409 }
    );
  }

  const { error: updErr } = await supabase
    .from("wines_in_session")
    .update({ revealed: true })
    .eq("session_id", sessionId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { error: completeErr } = await supabase
    .from("tasting_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);
  if (completeErr) {
    return NextResponse.json({ error: completeErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
