import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Ensure the authenticated user belongs to at least one group.
 *
 * If `DEFAULT_GROUP_ID` is set, newcomers JOIN that shared group as a member
 * (so everyone who signs in lands in the same group and sees its evenings).
 * Otherwise — create a personal «Моя компания» and add them as owner.
 * Idempotent: a no-op when the user is already a member of any group.
 */
export async function ensureDefaultGroup(
  sb: SupabaseClient<Database>,
  userId: string
): Promise<{ groupId: string }> {
  const { data: existing, error: selErr } = await sb
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .limit(1);
  if (selErr) throw new Error(`ensureDefaultGroup select: ${selErr.message}`);
  if (existing && existing.length > 0) {
    return { groupId: existing[0].group_id };
  }

  // Shared default group — everyone joins the same one.
  const sharedGroupId = process.env.DEFAULT_GROUP_ID;
  if (sharedGroupId) {
    const { error: joinErr } = await sb
      .from("group_members")
      .insert({ group_id: sharedGroupId, user_id: userId, role: "member" });
    if (joinErr) throw new Error(`ensureDefaultGroup join: ${joinErr.message}`);
    return { groupId: sharedGroupId };
  }

  const { data: group, error: insGrpErr } = await sb
    .from("groups")
    .insert({ name: "Моя компания", created_by: userId })
    .select("id")
    .single();
  if (insGrpErr || !group) {
    throw new Error(`ensureDefaultGroup group: ${insGrpErr?.message}`);
  }

  const { error: insMemberErr } = await sb
    .from("group_members")
    .insert({ group_id: group.id, user_id: userId, role: "owner" });
  if (insMemberErr) {
    throw new Error(`ensureDefaultGroup member: ${insMemberErr.message}`);
  }

  return { groupId: group.id };
}
