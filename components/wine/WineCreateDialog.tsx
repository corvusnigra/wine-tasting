"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useSupabaseBrowser } from "@/lib/supabase/use-browser";
import { EntityAutocomplete } from "./EntityAutocomplete";
import { LabelPhotoUpload } from "./LabelPhotoUpload";
import { regionHitFor, appendWineToCatalog } from "@/lib/search/catalog";
import { normalizeQuery } from "@/lib/search/normalize";
import type { SearchHit } from "@/lib/search/api";

type WineType = "red" | "white" | "rose" | "sparkling";

export type CreatedWine = {
  id: string;
  name: string;
  vintage: number | null;
  wine_type: WineType;
};

type ProducerWine = {
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
  const supabase = useSupabaseBrowser();

  const [name, setName] = useState("");
  const [producer, setProducer] = useState<SearchHit | null>(null);
  const [region, setRegion] = useState<SearchHit | null>(null);
  const [grapes, setGrapes] = useState<SearchHit[]>([]);
  const [vintage, setVintage] = useState<string>("");
  const [abv, setAbv] = useState<string>("");
  const [wineType, setWineType] = useState<WineType>("red");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Existing wines of the chosen producer — to suggest in the name field
  // and avoid creating duplicates.
  const [producerWines, setProducerWines] = useState<ProducerWine[]>([]);
  const [nameFocused, setNameFocused] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setProducer(null);
      setRegion(null);
      setGrapes([]);
      setVintage("");
      setAbv("");
      setWineType("red");
      setPhotoUrl(null);
      setProducerWines([]);
    }
  }, [open]);

  // When a producer is picked: auto-fill its region + load its existing wines.
  async function onProducerSelect(hit: SearchHit) {
    setProducer(hit);
    const regionId = hit.meta?.region_id as string | null | undefined;
    const rhit = await regionHitFor(supabase, regionId);
    if (rhit) setRegion(rhit);

    const { data } = await supabase
      .from("wines")
      .select("id, name, vintage, wine_type")
      .eq("producer_id", hit.id)
      .order("name", { ascending: true });
    setProducerWines((data ?? []) as ProducerWine[]);
  }

  const nameSuggestions = useMemo(() => {
    if (producerWines.length === 0) return [];
    const nq = normalizeQuery(name);
    if (!nq) return producerWines.slice(0, 8);
    return producerWines
      .filter((w) => normalizeQuery(w.name).includes(nq))
      .slice(0, 8);
  }, [producerWines, name]);

  function useExisting(w: ProducerWine) {
    toast.success(`«${w.name}» уже в каталоге — добавлено`);
    onCreated(w);
    onClose();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
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
        photo_url: photoUrl,
      })
      .select("id, name, vintage, wine_type")
      .single();
    setSubmitting(false);
    if (error || !data) {
      toast.error(error?.message ?? "Не удалось создать вино");
      return;
    }
    appendWineToCatalog({
      id: data.id,
      name: data.name,
      vintage: data.vintage,
      wine_type: data.wine_type,
      producer_id: producer?.id ?? null,
      region_id: region?.id ?? null,
    });
    toast.success(`«${data.name}» добавлено в каталог`);
    onCreated(data as CreatedWine);
    onClose();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          className="bg-black/60 backdrop-blur-md data-[state=open]:animate-[fade-in_0.2s_ease-out]"
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 50,
          }}
          className="w-[calc(100vw-1.5rem)] max-w-xl max-h-[92dvh] bg-surface text-foreground border border-border rounded-2xl shadow-2xl overflow-hidden data-[state=open]:animate-[fade-in_0.2s_ease-out] focus:outline-none"
        >
          <form
            onSubmit={onSubmit}
            className="p-5 sm:p-8 flex flex-col gap-6 sm:gap-7 max-h-[92dvh] overflow-y-auto"
          >
            <header>
              <p className="smallcaps text-[10px] text-gold mb-2">в коллекцию</p>
              <Dialog.Title asChild>
                <h2 className="font-display italic text-3xl">{t("title")}</h2>
              </Dialog.Title>
            </header>

            <div className="ornament">
              <span className="text-xs">·</span>
            </div>

            {/* Producer first — it drives region + name suggestions */}
            <div>
              <label className="smallcaps text-[10px] text-muted block mb-1.5">
                {t("producer")}
              </label>
              <EntityAutocomplete
                entityType="producer"
                value={producer}
                onSelect={onProducerSelect}
                variant="underline"
                placeholder="Antinori, Абрау-Дюрсо …"
              />
            </div>

            {/* Name — suggests the producer's existing wines */}
            <div className="relative">
              <label className="smallcaps text-[10px] text-muted block mb-1.5">
                {t("name")}
              </label>
              <input
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setTimeout(() => setNameFocused(false), 150)}
                placeholder={
                  producer ? "Название вина этого хозяйства" : "Barolo, Brut Reserve …"
                }
                className="input-underline text-xl"
              />
              {nameFocused && nameSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl py-2">
                  <p className="px-4 py-1 smallcaps text-[10px] text-muted">
                    уже у этого производителя
                  </p>
                  {nameSuggestions.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => useExisting(w)}
                      className="w-full text-left px-4 py-2 hover:bg-bordeaux/10 transition-colors"
                    >
                      <span className="font-display">{w.name}</span>
                      {w.vintage && (
                        <span className="text-xs text-muted italic ml-2">{w.vintage}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Region — auto-filled from producer, still editable */}
            <div>
              <label className="smallcaps text-[10px] text-muted block mb-1.5">
                {t("region")}
                {region && producer && (
                  <span className="text-gold ml-2 normal-case tracking-normal">
                    подставлен автоматически
                  </span>
                )}
              </label>
              <EntityAutocomplete
                key={region?.id ?? "no-region"}
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
                      className="px-3.5 min-h-9 inline-flex items-center rounded-full text-sm font-display italic bg-bordeaux/20 border border-bordeaux/50 text-foreground hover:bg-bordeaux/30 transition-colors active:scale-95"
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

            <div>
              <span className="smallcaps text-[10px] text-muted block mb-3">
                Фото этикетки
              </span>
              <LabelPhotoUpload value={photoUrl} onChange={setPhotoUrl} />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-border">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="btn-ghost h-11 px-5 rounded-full smallcaps text-xs"
                >
                  {tActions("cancel")}
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="btn-seal h-11 px-6 rounded-full inline-flex items-center gap-2"
              >
                <span>{tActions("save")}</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
