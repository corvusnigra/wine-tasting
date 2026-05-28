import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_scale")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full wine-vignette">
      <header className="mb-10">
        <p className="smallcaps text-xs text-gold mb-3">Настройки</p>
        <h1 className="font-display italic text-4xl sm:text-5xl leading-[0.95]">
          Профиль
        </h1>
      </header>

      <ProfileForm
        initialDisplayName={profile.display_name ?? ""}
        initialScale={
          (profile.preferred_scale as "5stars" | "20pt") ?? "5stars"
        }
        email={userData.user.email ?? null}
      />
    </div>
  );
}
