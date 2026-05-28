import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SessionNewForm } from "@/components/session/SessionNewForm";

export default async function NewSessionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: membership } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display text-3xl mb-3">Нет группы</h1>
        <p className="text-muted">Создайте группу или примите приглашение.</p>
      </div>
    );
  }

  return <SessionNewForm groupId={membership.group_id} />;
}
