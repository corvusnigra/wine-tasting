import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Sign out. The cookie-clearing writes MUST land on the redirect response we
 * return — a server client built from `next/headers` would write them to a
 * jar that a hand-built `NextResponse.redirect` never picks up, so the session
 * cookie survived and the user stayed logged in. Bind the cookie adapter to
 * the response itself, and use `scope: "local"` so we don't depend on a
 * (sometimes flaky) network round-trip to GoTrue to clear the local session.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.signOut({ scope: "local" });

  return response;
}
