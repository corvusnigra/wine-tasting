"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/lib/supabase/use-browser";
import { EntityAutocomplete } from "@/components/wine/EntityAutocomplete";
import { WineCreateDialog, type CreatedWine } from "@/components/wine/WineCreateDialog";
import { appendWineToCatalog } from "@/lib/search/catalog";
import type { SearchHit } from "@/lib/search/api";

type FlightWine = { wisId: string; wineId: string; name: string };

export function SessionHostTools({
  sessionId,
  flight,
  maxPosition,
}: {
  sessionId: string;
  flight: FlightWine[];
  maxPosition: number;
}) {
  const router = useRouter();
  const supabase = useSupabaseBrowser();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function addWine(wineId: string) {
    if (flight.some((f) => f.wineId === wineId)) {
      toast.error("Это вино уже в флайте");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("wines_in_session").insert({
      session_id: sessionId,
      wine_id: wineId,
      position: maxPosition + 1,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Вино добавлено в флайт");
    router.refresh();
  }

  async function removeWine(wisId: string) {
    setBusy(true);
    const { error } = await supabase
      .from("wines_in_session")
      .delete()
      .eq("id", wisId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Вино убрано");
    router.refresh();
  }

  async function deleteSession() {
    if (
      !window.confirm(
        "Удалить вечер целиком? Все оценки этого вечера тоже удалятся. Это необратимо."
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Не удалось удалить");
      return;
    }
    const body = (await res.json()) as { groupId?: string };
    toast.success("Вечер удалён");
    router.push(body.groupId ? `/groups/${body.groupId}` : "/");
    router.refresh();
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="smallcaps text-[11px] text-muted hover:text-gold transition-colors"
      >
        {open ? "↑ скрыть управление" : "⚙ управление вечером"}
      </button>

      {open && (
        <div className="anim-fade-up mt-4 card-edge rounded-2xl p-5 flex flex-col gap-5">
          <div>
            <p className="smallcaps text-[10px] text-muted mb-2">Добавить вино в флайт</p>
            <EntityAutocomplete
              entityType="wine"
              variant="underline"
              onSelect={(hit: SearchHit) => addWine(hit.id)}
              onCreateNew={() => setDialogOpen(true)}
              placeholder="Найти или создать вино"
            />
          </div>

          {flight.length > 0 && (
            <div>
              <p className="smallcaps text-[10px] text-muted mb-2">Убрать из флайта</p>
              <ul className="flex flex-wrap gap-2">
                {flight.map((f) => (
                  <li key={f.wisId}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeWine(f.wisId)}
                      className="px-3.5 min-h-9 inline-flex items-center rounded-full text-sm font-display italic bg-bordeaux/15 border border-bordeaux/40 text-foreground hover:bg-rust/20 hover:border-rust transition-colors"
                    >
                      {f.name} <span className="text-muted ml-1">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-3 border-t border-border">
            <button
              type="button"
              disabled={busy}
              onClick={deleteSession}
              className="smallcaps text-[11px] text-rust hover:underline underline-offset-2 disabled:opacity-50"
            >
              Удалить вечер целиком
            </button>
          </div>
        </div>
      )}

      <WineCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(w: CreatedWine) => {
          appendWineToCatalog({
            id: w.id,
            name: w.name,
            vintage: w.vintage,
            wine_type: w.wine_type,
          });
          void addWine(w.id);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
