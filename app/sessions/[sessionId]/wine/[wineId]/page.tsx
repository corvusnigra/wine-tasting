import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SatCard } from "@/components/tasting/SatCard";
import type { WineType } from "@/lib/tasting/sat-vocabulary";

type Params = Promise<{ sessionId: string; wineId: string }>;

export default async function TastePage({ params }: { params: Params }) {
  const { sessionId, wineId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: wis } = await supabase
    .from("wines_in_session")
    .select(
      "id, wines(id, name, vintage, wine_type, producers(name), regions(name_ru))"
    )
    .eq("session_id", sessionId)
    .eq("wine_id", wineId)
    .maybeSingle();

  if (!wis || !wis.wines) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-display italic text-4xl mb-3">Не найдено</h1>
      </div>
    );
  }

  const { data: existing } = await supabase
    .from("tasting_notes")
    .select(
      "appearance, nose, palate, conclusion, overall_scale_raw"
    )
    .eq("wine_in_session_id", wis.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_scale")
    .eq("id", userData.user.id)
    .maybeSingle();

  const initial = existing
    ? {
        appearance: (existing.appearance ?? {}) as never,
        nose: (existing.nose ?? { descriptors: [] }) as never,
        palate: (existing.palate ?? {}) as never,
        conclusion: (existing.conclusion ?? {}) as never,
        overall_scale_raw: existing.overall_scale_raw as never,
      }
    : null;

  // Build wine epigraph string
  const wine = wis.wines as {
    name: string;
    vintage: number | null;
    wine_type: string;
    producers: { name: string } | null;
    regions: { name_ru: string } | null;
  };

  return (
    <SatCard
      wineInSessionId={wis.id}
      wineType={wine.wine_type as WineType}
      wineName={wine.name}
      wineVintage={wine.vintage}
      wineProducer={wine.producers?.name ?? null}
      wineRegion={wine.regions?.name_ru ?? null}
      initial={initial}
      initialScale={(profile?.preferred_scale ?? "5stars") as "5stars" | "20pt"}
      backHref={`/sessions/${sessionId}`}
    />
  );
}
