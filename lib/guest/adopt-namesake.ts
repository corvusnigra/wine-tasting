import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Same-name anonymous guests in one group are the same person who signed in
 * from another browser or device — anonymous auth cannot recognise them, so
 * a namesake duplicate appears in the participant list. Fold older namesakes
 * into the current guest: move their tasting notes over (per wine the newer
 * note wins) and delete the abandoned auth user; the cascade removes its
 * profile and group membership.
 *
 * Trade-off: within a group a guest NAME is the identity — typing an
 * existing name continues that participant, so distinct people must pick
 * distinct names.
 */
export async function adoptNamesakeGuests(
  admin: SupabaseClient<Database>,
  userId: string,
  groupId: string
): Promise<void> {
  const { data: meAuth } = await admin.auth.admin.getUserById(userId);
  if (!meAuth?.user?.is_anonymous) return; // e-mail/owner accounts never merge

  const { data: me } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const name = me?.display_name?.trim().toLowerCase();
  if (!name) return;

  const { data: members } = await admin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId)
    .neq("user_id", userId);
  const memberIds = (members ?? []).map((m) => m.user_id);
  if (memberIds.length === 0) return;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", memberIds);
  const namesakeIds = (profiles ?? [])
    .filter((p) => (p.display_name ?? "").trim().toLowerCase() === name)
    .map((p) => p.id);
  if (namesakeIds.length === 0) return;

  const { data: myNotes } = await admin
    .from("tasting_notes")
    .select("id, wine_in_session_id, updated_at")
    .eq("user_id", userId);
  const mineByWine = new Map(
    (myNotes ?? []).map((n) => [n.wine_in_session_id, n])
  );

  for (const namesakeId of namesakeIds) {
    const { data: other } = await admin.auth.admin.getUserById(namesakeId);
    if (!other?.user?.is_anonymous) continue; // never absorb the owner

    const { data: theirNotes } = await admin
      .from("tasting_notes")
      .select("id, wine_in_session_id, updated_at")
      .eq("user_id", namesakeId);

    for (const note of theirNotes ?? []) {
      const mine = mineByWine.get(note.wine_in_session_id);
      if (mine && new Date(mine.updated_at) >= new Date(note.updated_at)) {
        continue; // keep mine; theirs goes away with the user cascade
      }
      if (mine) {
        await admin.from("tasting_notes").delete().eq("id", mine.id);
      }
      const { error: moveErr } = await admin
        .from("tasting_notes")
        .update({ user_id: userId })
        .eq("id", note.id);
      if (!moveErr) mineByWine.set(note.wine_in_session_id, note);
    }

    await admin.auth.admin.deleteUser(namesakeId);
  }
}
