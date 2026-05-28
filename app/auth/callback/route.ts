import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultGroup } from "@/lib/groups/ensure-default-group";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        try {
          // Use admin client: at this point the session cookie is set but
          // the in-request JWT chain still appears anonymous to RLS, so
          // `created_by = auth.uid()` would reject. Bootstrap is a trusted op.
          const admin = createSupabaseAdminClient();
          await ensureDefaultGroup(admin, userData.user.id);
        } catch (e) {
          console.error("ensureDefaultGroup failed:", e);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
