import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const t = await getTranslations("app");
  const tNav = await getTranslations("nav");

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  let displayName: string | null = null;
  if (userData.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userData.user.id)
      .maybeSingle();
    displayName = profile?.display_name ?? null;
  }

  return (
    <header className="px-5 sm:px-8 lg:px-12 py-4 sm:py-6 border-b border-border">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3 shrink-0 min-w-0">
          <span className="monogram transition-transform group-hover:rotate-[-6deg] shrink-0">
            SN
          </span>
          <span className="font-display text-xl sm:text-2xl tracking-tight leading-none truncate">
            {t("name")}
          </span>
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 text-sm shrink-0">
          <Link
            href="/archive"
            className="smallcaps text-xs text-muted hover:text-foreground transition-colors h-10 inline-flex items-center"
          >
            {tNav("archive")}
          </Link>
          <Link
            href="/search"
            className="text-muted hover:text-foreground transition-colors h-10 w-10 inline-flex items-center justify-center -mx-2"
            aria-label={tNav("search")}
          >
            <Search size={18} />
          </Link>
          {userData.user ? (
            <UserMenu
              displayName={displayName}
              email={userData.user.email ?? null}
            />
          ) : (
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gold text-gold text-[10px] font-display italic shrink-0"
              title="18+"
            >
              18+
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
