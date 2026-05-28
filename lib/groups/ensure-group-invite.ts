import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { generateInviteCode } from "@/lib/utils/invite-code";

/**
 * Return a permanent, multi-use invite code for the group.
 * Creates one on first call; reuses on subsequent calls.
 */
export async function ensureGroupInvite(
  sb: SupabaseClient<Database>,
  groupId: string,
  userId: string
): Promise<string> {
  const { data: existing } = await sb
    .from("group_invites")
    .select("code")
    .eq("group_id", groupId)
    .eq("single_use", false)
    .is("expires_at", null)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.code;

  const code = generateInviteCode(10);
  const { error } = await sb.from("group_invites").insert({
    group_id: groupId,
    code,
    created_by: userId,
    single_use: false,
  });
  if (error) throw new Error(`ensureGroupInvite: ${error.message}`);
  return code;
}
