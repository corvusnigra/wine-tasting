import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (userData.user) {
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .maybeSingle();
    if (membership) {
      redirect(`/groups/${membership.group_id}`);
    }
  }

  const t = await getTranslations("app");
  const tNav = await getTranslations("nav");

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center wine-vignette">
      <p className="smallcaps text-xs text-gold mb-6">Дневник дегустаций · est. 2026</p>
      <h1 className="font-display italic text-7xl sm:text-8xl leading-[0.85] mb-2 max-w-2xl">
        Sommelier
        <br />
        Night
      </h1>
      <div className="ornament my-8 max-w-xs">
        <span className="text-xs">·</span>
      </div>
      <p className="text-muted italic text-lg mb-12 max-w-md leading-relaxed">
        {t("tagline")}
      </p>
      <Link
        href="/login"
        className="btn-seal h-12 px-10 rounded-full inline-flex items-center gap-2"
      >
                <span>{tNav("login")}</span>
      </Link>
    </div>
  );
}
