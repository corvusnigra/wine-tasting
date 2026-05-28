import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Params = Promise<{ code: string }>;

export default async function InvitePage({ params }: { params: Params }) {
  const { code } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: invite } = await supabase
    .from("group_invites")
    .select("id, group_id, expires_at, single_use, used_at")
    .eq("code", code)
    .maybeSingle();

  if (!invite) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-4xl mb-3">Приглашение не найдено</h1>
        <p className="text-muted max-w-md">
          Ссылка устарела или была отозвана. Попросите хозяина вечера выслать новую.
        </p>
      </div>
    );
  }
  if (
    (invite.single_use && invite.used_at) ||
    (invite.expires_at && new Date(invite.expires_at) < new Date())
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-4xl mb-3">Приглашение истекло</h1>
        <p className="text-muted max-w-md">Попросите хозяина вечера выслать новую ссылку.</p>
      </div>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/invite/${code}/join`);
  }

  const userId = userData.user.id;
  const { data: existing } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("group_id", invite.group_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: invite.group_id, user_id: userId, role: "member" });
    if (error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <h1 className="font-display text-4xl mb-3">Не удалось присоединиться</h1>
          <p className="text-muted max-w-md">{error.message}</p>
        </div>
      );
    }
    if (invite.single_use) {
      await supabase
        .from("group_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id);
    }
  }

  redirect(`/groups/${invite.group_id}`);
}
