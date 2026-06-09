import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Logout gate: a participant may only leave once they've rated every wine in
 * each active (in-progress) evening of their group. Returns the first
 * unfinished evening, if any, so the UI can nudge them to finish first.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    // Not signed in → nothing to gate.
    return NextResponse.json({ canLeave: true });
  }
  const userId = userData.user.id;

  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);
  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) return NextResponse.json({ canLeave: true });

  const { data: sessions } = await supabase
    .from("tasting_sessions")
    .select("id, title, status, wines_in_session(id)")
    .in("group_id", groupIds)
    .eq("status", "in_progress");

  type Sess = { id: string; title: string; wines_in_session: { id: string }[] };
  const active = (sessions ?? []) as unknown as Sess[];
  if (active.length === 0) return NextResponse.json({ canLeave: true });

  const allWisIds = active.flatMap((s) => s.wines_in_session.map((w) => w.id));
  if (allWisIds.length === 0) return NextResponse.json({ canLeave: true });

  const { data: notes } = await supabase
    .from("tasting_notes")
    .select("wine_in_session_id")
    .eq("user_id", userId)
    .not("submitted_at", "is", null)
    .in("wine_in_session_id", allWisIds);
  const ratedWis = new Set((notes ?? []).map((n) => n.wine_in_session_id));

  for (const s of active) {
    const total = s.wines_in_session.length;
    if (total === 0) continue;
    const rated = s.wines_in_session.filter((w) => ratedWis.has(w.id)).length;
    // Only block someone who STARTED rating but hasn't finished — don't trap a
    // casual visitor who never began.
    if (rated > 0 && rated < total) {
      return NextResponse.json({
        canLeave: false,
        title: s.title,
        rated,
        total,
      });
    }
  }

  return NextResponse.json({ canLeave: true });
}
