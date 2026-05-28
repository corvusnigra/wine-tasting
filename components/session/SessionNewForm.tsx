"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { EntityAutocomplete } from "@/components/wine/EntityAutocomplete";
import { WineCreateDialog, type CreatedWine } from "@/components/wine/WineCreateDialog";
import type { SearchHit } from "@/lib/search/api";

type WineRef = {
  id: string;
  name: string;
  vintage: number | null;
};

function searchHitToWineRef(hit: SearchHit): WineRef {
  return {
    id: hit.id,
    name: hit.name,
    vintage: typeof hit.meta?.vintage === "number" ? hit.meta.vintage : null,
  };
}

export function SessionNewForm({ groupId }: { groupId: string }) {
  const t = useTranslations("session.create");
  const tActions = useTranslations("actions");
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient()).current;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [wines, setWines] = useState<WineRef[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addWineFromSearch(hit: SearchHit) {
    if (wines.some((w) => w.id === hit.id)) return;
    setWines([...wines, searchHitToWineRef(hit)]);
  }
  function addWineCreated(w: CreatedWine) {
    if (wines.some((x) => x.id === w.id)) return;
    setWines([...wines, { id: w.id, name: w.name, vintage: w.vintage }]);
  }
  function removeWine(id: string) {
    setWines(wines.filter((w) => w.id !== id));
  }
  function moveWine(from: number, to: number) {
    if (to < 0 || to >= wines.length) return;
    const copy = [...wines];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    setWines(copy);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("Войдите снова");
      setSubmitting(false);
      return;
    }

    const { data: sessionRow, error: sessionErr } = await supabase
      .from("tasting_sessions")
      .insert({
        group_id: groupId,
        title: title.trim(),
        session_date: date,
        created_by: userData.user.id,
      })
      .select("id")
      .single();

    if (sessionErr || !sessionRow) {
      setError(sessionErr?.message ?? "Не удалось создать вечер");
      setSubmitting(false);
      return;
    }

    if (wines.length > 0) {
      const rows = wines.map((w, idx) => ({
        session_id: sessionRow.id,
        wine_id: w.id,
        position: idx + 1,
      }));
      const { error: wisErr } = await supabase.from("wines_in_session").insert(rows);
      if (wisErr) {
        setError(wisErr.message);
        setSubmitting(false);
        return;
      }
    }

    router.push(`/sessions/${sessionRow.id}`);
  }

  return (
    <>
      <form
        onSubmit={onSubmit}
        className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-16 w-full wine-vignette"
      >
        <header className="mb-12 sm:mb-14">
          <p className="smallcaps text-xs text-gold mb-3">Новый вечер</p>
          <h1 className="font-display italic text-5xl sm:text-6xl md:text-7xl leading-[0.95]">
            Сегодня
            <br />
            пьём
          </h1>
        </header>

        <div className="flex flex-col gap-12">
          {/* Section i. — title */}
          <section>
            <div className="section-marker">
              <span className="num">i.</span>
              <span className="label">Название вечера</span>
              <span className="rule" />
            </div>
            <div className="field-group with-margin">
              <span className="marg smallcaps text-[10px] text-muted hidden md:block">
                краткое
              </span>
              <input
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="input-underline"
              />
            </div>
          </section>

          {/* Section ii. — date */}
          <section>
            <div className="section-marker">
              <span className="num">ii.</span>
              <span className="label">Дата</span>
              <span className="rule" />
            </div>
            <div className="field-group with-margin">
              <span className="marg smallcaps text-[10px] text-muted hidden md:block">
                когда
              </span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-underline max-w-xs"
              />
            </div>
          </section>

          {/* Section iii. — wines */}
          <section>
            <div className="section-marker">
              <span className="num">iii.</span>
              <span className="label">
                Флайт {wines.length > 0 && `· ${wines.length}`}
              </span>
              <span className="rule" />
            </div>

            {wines.length > 0 && (
              <ol className="flex flex-col mb-6">
                {wines.map((w, idx) => (
                  <li
                    key={w.id}
                    className="grid grid-cols-[2.5rem_1fr_auto] gap-4 items-baseline py-4 border-t border-border first:border-t-0 group"
                  >
                    <span className="editorial-num text-2xl text-gold-soft text-right">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="font-display text-xl">{w.name}</div>
                      {w.vintage && (
                        <div className="text-xs text-muted italic mt-0.5">{w.vintage}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => moveWine(idx, idx - 1)}
                        disabled={idx === 0}
                        className="w-7 h-7 rounded-full hover:text-gold disabled:opacity-30"
                        aria-label="Вверх"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWine(idx, idx + 1)}
                        disabled={idx === wines.length - 1}
                        className="w-7 h-7 rounded-full hover:text-gold disabled:opacity-30"
                        aria-label="Вниз"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWine(w.id)}
                        className="w-7 h-7 rounded-full hover:text-rust text-muted"
                        aria-label="Убрать"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="field-group with-margin">
              <span className="marg smallcaps text-[10px] text-muted hidden md:block">
                добавить
              </span>
              <div className="flex flex-col gap-3">
                <EntityAutocomplete
                  entityType="wine"
                  variant="underline"
                  onSelect={addWineFromSearch}
                  placeholder={t("addWine")}
                  onCreateNew={() => setDialogOpen(true)}
                />
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="smallcaps text-[11px] text-gold hover:text-gold-light text-left transition-colors"
                >
                  + Бутылка, которой нет в базе
                </button>
              </div>
            </div>
          </section>
        </div>

        {error && (
          <p className="mt-8 text-sm text-rust italic">{error}</p>
        )}

        <div className="ornament my-12">
          <span className="text-xs">·</span>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-ghost h-12 px-6 rounded-full smallcaps text-xs"
          >
            {tActions("cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim() || wines.length === 0}
            className="btn-seal h-12 px-8 rounded-full inline-flex items-center gap-2"
          >
                        <span>{t("submit")}</span>
          </button>
        </div>
      </form>
      <WineCreateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(w) => {
          addWineCreated(w);
          setDialogOpen(false);
        }}
      />
    </>
  );
}
