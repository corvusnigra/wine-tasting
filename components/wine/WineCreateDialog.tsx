"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { EntityAutocomplete } from "./EntityAutocomplete";
import type { SearchHit } from "@/lib/search/api";

type WineType = "red" | "white" | "rose" | "sparkling";

export type CreatedWine = {
  id: string;
  name: string;
  vintage: number | null;
  wine_type: WineType;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (w: CreatedWine) => void;
};

export function WineCreateDialog({ open, onClose, onCreated }: Props) {
  const t = useTranslations("wine.create");
  const tType = useTranslations("wine.type");
  const tActions = useTranslations("actions");
  const supabase = useRef(createSupabaseBrowserClient()).current;
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState("");
  const [producer, setProducer] = useState<SearchHit | null>(null);
  const [region, setRegion] = useState<SearchHit | null>(null);
  const [grapes, setGrapes] = useState<SearchHit[]>([]);
  const [vintage, setVintage] = useState<string>("");
  const [abv, setAbv] = useState<string>("");
  const [wineType, setWineType] = useState<WineType>("red");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      setName("");
      setProducer(null);
      setRegion(null);
      setGrapes([]);
      setVintage("");
      setAbv("");
      setWineType("red");
      setError(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { data, error } = await supabase
      .from("wines")
      .insert({
        name: name.trim(),
        producer_id: producer?.id ?? null,
        region_id: region?.id ?? null,
        country_code: (region?.meta?.country_code as string | undefined) ?? null,
        vintage: vintage ? Number(vintage) : null,
        abv: abv ? Number(abv) : null,
        wine_type: wineType,
        grape_ids: grapes.map((g) => g.id),
      })
      .select("id, name, vintage, wine_type")
      .single();
    setSubmitting(false);
    if (error || !data) {
      setError(error?.message ?? "Не удалось создать вино");
      return;
    }
    onCreated(data as CreatedWine);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-xl p-0 rounded-2xl bg-surface text-foreground border border-border backdrop:bg-black/60 backdrop:backdrop-blur-md max-h-[92dvh]"
    >
      <form
        onSubmit={onSubmit}
        className="p-5 sm:p-8 flex flex-col gap-6 sm:gap-7 max-h-[92dvh] overflow-y-auto"
      >
        <header>
          <p className="smallcaps text-[10px] text-gold mb-2">в коллекцию</p>
          <h2 className="font-display italic text-3xl">{t("title")}</h2>
        </header>

        <div className="ornament">
          <span className="text-xs">·</span>
        </div>

        <div>
          <label className="smallcaps text-[10px] text-muted block mb-1.5">
            {t("name")}
          </label>
          <input
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Barolo, Saperavi Khareba …"
            className="input-underline text-xl"
          />
        </div>

        <div>
          <label className="smallcaps text-[10px] text-muted block mb-1.5">
            {t("producer")}
          </label>
          <EntityAutocomplete
            entityType="producer"
            value={producer}
            onSelect={setProducer}
            variant="underline"
            placeholder="Antinori, Абрау-Дюрсо …"
          />
        </div>

        <div>
          <label className="smallcaps text-[10px] text-muted block mb-1.5">
            {t("region")}
          </label>
          <EntityAutocomplete
            entityType="region"
            value={region}
            onSelect={setRegion}
            variant="underline"
            placeholder="Тоскана, Кахетия, …"
          />
        </div>

        <div>
          <label className="smallcaps text-[10px] text-muted block mb-1.5">
            {t("grapes")}
          </label>
          <EntityAutocomplete
            entityType="grape"
            variant="underline"
            onSelect={(g) => {
              if (!grapes.some((x) => x.id === g.id)) setGrapes([...grapes, g]);
            }}
            placeholder="Каберне, Мерло, Саперави …"
          />
          {grapes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {grapes.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrapes(grapes.filter((x) => x.id !== g.id))}
                  className="px-3 py-1 rounded-full text-xs font-display italic bg-bordeaux/20 border border-bordeaux/50 text-foreground hover:bg-bordeaux/30 transition-colors"
                >
                  {g.name} <span className="text-muted ml-0.5">×</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="smallcaps text-[10px] text-muted block mb-1.5">
              {t("vintage")}
            </label>
            <input
              type="number"
              min={1900}
              max={2100}
              value={vintage}
              onChange={(e) => setVintage(e.target.value)}
              placeholder="2020"
              className="input-underline text-xl"
            />
          </div>
          <div>
            <label className="smallcaps text-[10px] text-muted block mb-1.5">
              {t("abv")}
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={25}
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder="13.5"
              className="input-underline text-xl"
            />
          </div>
        </div>

        <div>
          <span className="smallcaps text-[10px] text-muted block mb-3">
            {t("type")}
          </span>
          <div className="flex gap-1.5 flex-wrap">
            {(["red", "white", "rose", "sparkling"] as const).map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setWineType(tp)}
                className={`px-4 h-10 rounded-full text-sm font-display italic transition-colors ${
                  wineType === tp
                    ? "bg-bordeaux text-cream border border-bordeaux"
                    : "bg-background border border-border text-muted hover:border-gold"
                }`}
              >
                {tType(tp)}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rust italic">{error}</p>}

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-11 px-5 rounded-full smallcaps text-xs mt-4"
          >
            {tActions("cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="btn-seal h-11 px-6 rounded-full inline-flex items-center gap-2 mt-4"
          >
                        <span>{tActions("save")}</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
