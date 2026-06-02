import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{ sessionId: string }>;

async function loadHostSession(sessionId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Unauthorized" as const, status: 401, supabase: null };
  const { data: session } = await supabase
    .from("tasting_sessions")
    .select("id, created_by, group_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { error: "Не найдено" as const, status: 404, supabase: null };
  if (session.created_by !== userData.user.id) {
    return { error: "Только хозяин вечера может это сделать" as const, status: 403, supabase: null };
  }
  return { error: null, status: 200, supabase, session };
}

export async function PATCH(request: Request, { params }: { params: Params }) {
  const { sessionId } = await params;
  const ctx = await loadHostSession(sessionId);
  if (ctx.error || !ctx.supabase) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Пустое название" }, { status: 400 });
  }
  const { error } = await ctx.supabase
    .from("tasting_sessions")
    .update({ title: title.slice(0, 120) })
    .eq("id", sessionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { sessionId } = await params;
  const ctx = await loadHostSession(sessionId);
  if (ctx.error || !ctx.supabase) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }
  // Cascades to wines_in_session → tasting_notes via FK on delete cascade.
  const { error } = await ctx.supabase
    .from("tasting_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, groupId: ctx.session.group_id });
}
