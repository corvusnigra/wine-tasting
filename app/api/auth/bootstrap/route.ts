import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultGroup } from "@/lib/groups/ensure-default-group";
import { adoptNamesakeGuests } from "@/lib/guest/adopt-namesake";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const admin = createSupabaseAdminClient();
    const { groupId } = await ensureDefaultGroup(admin, userData.user.id);
    // Best-effort: a failed merge must not block the login itself.
    await adoptNamesakeGuests(admin, userData.user.id, groupId).catch(
      () => {}
    );
    return NextResponse.json({ groupId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "bootstrap failed" },
      { status: 500 }
    );
  }
}
