import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { writeGuestId } from "./guest-id";

/**
 * Resolve a stable guest user. If a session already exists (returning guest
 * or magic-link user) it is REUSED — we never spawn a fresh anonymous user
 * on top of an existing one, which would orphan the old identity along with
 * its group memberships and ratings. Only signs in anonymously when there is
 * no session at all. Always refreshes the display name.
 */
export async function ensureGuestSession(
  supabase: SupabaseClient<Database>,
  displayName: string
): Promise<{ id: string; isNew: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  let userId = session?.user?.id ?? null;
  let isNew = false;

  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      throw new Error(error?.message ?? "Не удалось войти");
    }
    userId = data.user.id;
    isNew = true;
  }

  writeGuestId(userId);

  const trimmed = displayName.trim();
  if (trimmed) {
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);
  }

  return { id: userId, isNew };
}
