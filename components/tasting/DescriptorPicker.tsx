"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  const supabase = useRef(createSupabaseBrowserClient()).current;
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState<Descriptor[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || all.length > 0) return;
    void (async () => {
      const { data } = await supabase
        .from("descriptors")
        .select("id, label_en, label_ru, family, subfamily, tier")
        .order("family", { ascending: true });
      if (data) setAll(data as Descriptor[]);
    })();
  }, [open, all.length, supabase]);

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

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="smallcaps text-[10px] text-muted">{label}</span>
        <span className="font-display italic text-base text-gold">
          {selected.length > 0 ? selected.length : "—"}
        </span>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((s) => {
            const d = all.find((x) => x.label_en === s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="px-3 py-1 rounded-full text-xs font-display italic bg-bordeaux/20 border border-bordeaux/50 text-foreground hover:bg-bordeaux/30 transition-colors"
              >
                {d?.label_ru ?? s} <span className="text-muted ml-0.5">×</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="smallcaps text-[11px] text-gold hover:text-gold-light transition-colors"
      >
        {open ? "↑ скрыть палитру" : "↓ открыть палитру"}
      </button>

      {open && (
        <div className="mt-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="яблоко, кожа, ваниль…"
            className="w-full h-10 px-4 mb-4 rounded-full bg-background border border-border focus:border-gold focus:outline-none text-sm font-display italic placeholder:text-muted/60"
          />
          <div className="max-h-80 overflow-y-auto pr-2 -mr-2">
            {byFamily.size === 0 && (
              <p className="text-sm text-muted italic text-center py-6">
                Ничего не найдено.
              </p>
            )}
            {Array.from(byFamily.entries()).map(([family, items]) => (
              <div key={family} className="mb-5 last:mb-0">
                <div className="smallcaps text-[10px] text-muted mb-2 rule-left">
                  {family}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggle(d.label_en)}
                      className={cn(
                        "px-3 min-h-9 rounded-full text-xs font-display italic transition-colors active:scale-95",
                        selected.includes(d.label_en)
                          ? "bg-bordeaux text-cream border border-bordeaux"
                          : "bg-surface border border-border text-muted hover:text-foreground hover:border-gold"
                      )}
                    >
                      {d.label_ru}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
