"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";
import { useSupabaseBrowser } from "@/lib/supabase/use-browser";
import { normalizeQuery } from "@/lib/search/normalize";
import { cn } from "@/lib/utils/cn";

type Descriptor = {
  id: string;
  label_en: string;
  label_ru: string;
  family: string;
  subfamily: string | null;
  tier: "primary" | "secondary" | "tertiary";
};

export function DescriptorPicker({
  selected,
  onChange,
  label = "Дескрипторы",
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const supabase = useSupabaseBrowser();
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Descriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Load the catalogue when the drawer opens OR when there are already
  // selected descriptors to translate (e.g. restored from a saved draft) —
  // otherwise the chips fall back to their English label_en.
  useEffect(() => {
    if (all.length > 0) return;
    if (!open && selected.length === 0) return;
    setLoading(true);
    setLoadError(null);
    void (async () => {
      const { data, error } = await supabase
        .from("descriptors")
        .select("id, label_en, label_ru, family, subfamily, tier")
        .order("family", { ascending: true });
      if (error) {
        console.error("descriptors load:", error);
        setLoadError(error.message);
      } else if (data) {
        setAll(data as Descriptor[]);
      }
      setLoading(false);
    })();
  }, [open, all.length, selected.length, supabase]);

  const filtered = useMemo(() => {
    if (!query.trim()) return all;
    const nq = normalizeQuery(query);
    return all.filter(
      (d) =>
        normalizeQuery(d.label_ru).includes(nq) ||
        normalizeQuery(d.label_en).includes(nq) ||
        normalizeQuery(d.family).includes(nq)
    );
  }, [all, query]);

  const byFamily = useMemo(() => {
    const map = new Map<string, Descriptor[]>();
    for (const d of filtered) {
      const arr = map.get(d.family) ?? [];
      arr.push(d);
      map.set(d.family, arr);
    }
    return map;
  }, [filtered]);

  function toggle(label_en: string) {
    if (selected.includes(label_en)) onChange(selected.filter((s) => s !== label_en));
    else onChange([...selected, label_en]);
  }

  // Look up labels for selected items even before drawer was opened
  const selectedById = useMemo(() => {
    const map = new Map<string, Descriptor>();
    for (const d of all) map.set(d.label_en, d);
    return map;
  }, [all]);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="smallcaps text-[10px] text-muted">{label}</span>
        <span className="font-display italic text-base text-gold">
          {selected.length > 0 ? selected.length : "—"}
        </span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selected.map((s) => {
            const d = selectedById.get(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="px-3.5 min-h-9 inline-flex items-center rounded-full text-sm font-display italic bg-bordeaux/20 border border-bordeaux/50 text-foreground hover:bg-bordeaux/30 transition-colors active:scale-95"
              >
                {d?.label_ru ?? s} <span className="text-muted ml-1">×</span>
              </button>
            );
          })}
        </div>
      )}

      <Drawer.Root
        open={open}
        onOpenChange={(o) => {
          // Drop focus from the trigger before Vaul aria-hides the background,
          // otherwise the browser warns about aria-hidden on a focused element.
          if (o && typeof document !== "undefined") {
            (document.activeElement as HTMLElement | null)?.blur();
          }
          setOpen(o);
        }}
      >
        <Drawer.Trigger asChild>
          <button
            type="button"
            className="smallcaps text-[11px] text-gold hover:text-gold-light transition-colors"
          >
            ↓ открыть палитру
          </button>
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            className="bg-black/60 backdrop-blur-sm"
          />
          <Drawer.Content
            aria-describedby={undefined}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              maxHeight: "85dvh",
            }}
            className="bg-surface border-t border-border rounded-t-3xl flex flex-col outline-none"
          >
            <div
              aria-hidden
              className="mx-auto mt-3 mb-2 w-14 h-1.5 rounded-full bg-border-strong shrink-0"
            />
            <div className="px-5 sm:px-8 pb-3 shrink-0 flex items-end justify-between gap-3">
              <div>
                <p className="smallcaps text-[10px] text-gold mb-1">палитра ароматов</p>
                <Drawer.Title className="font-display italic text-2xl">
                  {selected.length > 0 ? `Выбрано: ${selected.length}` : "Что улавливаете?"}
                </Drawer.Title>
              </div>
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="smallcaps text-[10px] text-muted hover:text-rust transition-colors shrink-0 pb-1"
                >
                  очистить всё
                </button>
              )}
            </div>
            <div className="px-5 sm:px-8 pb-3 shrink-0">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="яблоко, кожа, ваниль…"
                autoFocus={false}
                className="w-full h-12 px-4 rounded-full bg-background border border-border focus:border-gold focus:outline-none text-base font-display italic placeholder:text-muted/60"
              />
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-8 pb-8">
              {loading && (
                <p className="text-sm text-muted italic text-center py-6">
                  Раскладываем ароматы…
                </p>
              )}
              {!loading && loadError && (
                <p className="text-sm text-rust italic text-center py-6">
                  Не удалось загрузить палитру. Потяните вниз и откройте снова.
                </p>
              )}
              {!loading && !loadError && byFamily.size === 0 && (
                <p className="text-sm text-muted italic text-center py-6">
                  {query.trim() ? "Ничего не найдено." : "Палитра пуста."}
                </p>
              )}
              {Array.from(byFamily.entries()).map(([family, items]) => (
                <div key={family} className="mb-5 last:mb-0">
                  <div className="smallcaps text-[10px] text-muted mb-2 rule-left">
                    {family}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggle(d.label_en)}
                        className={cn(
                          "px-4 min-h-10 inline-flex items-center rounded-full text-sm font-display italic transition-colors active:scale-95",
                          selected.includes(d.label_en)
                            ? "bg-bordeaux text-cream border border-bordeaux"
                            : "bg-background border border-border text-foreground/85 hover:border-gold"
                        )}
                      >
                        {d.label_ru}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 sm:px-8 py-3 border-t border-border shrink-0 pb-safe">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-seal w-full h-12 rounded-full"
              >
                Готово · {selected.length}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
