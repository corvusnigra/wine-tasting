import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{ sessionId: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("tasting_sessions")
    .select("id, created_by, group_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (session.created_by !== userData.user.id) {
    return NextResponse.json({ error: "Only host can reveal" }, { status: 403 });
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
