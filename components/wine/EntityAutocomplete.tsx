"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useSupabaseBrowser } from "@/lib/supabase/use-browser";
import { searchEntities, type EntityType, type SearchHit } from "@/lib/search/api";
import { loadCatalog, filterCatalog } from "@/lib/search/catalog";
import { cn } from "@/lib/utils/cn";

type RichHit = SearchHit & { subtitle?: string | null };

type Props = {
  entityType: EntityType;
  placeholder?: string;
  value?: SearchHit | null;
  onSelect: (hit: SearchHit) => void;
  onCreateNew?: (query: string) => void;
  className?: string;
  variant?: "pill" | "underline";
};

export function EntityAutocomplete({
  entityType,
  placeholder,
  value,
  onSelect,
  onCreateNew,
  className,
  variant = "pill",
}: Props) {
  const t = useTranslations("actions");
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<RichHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = useSupabaseBrowser();

  // Bounded reference tables are searched locally (instant, offline-friendly).
  // Only the unbounded wines table goes through the server RPC.
  const isCatalog = entityType !== "wine";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Warm the catalog cache as soon as a catalog field mounts.
  useEffect(() => {
    if (isCatalog) void loadCatalog(supabase);
  }, [isCatalog, supabase]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      if (isCatalog) {
        const catalog = await loadCatalog(supabase);
        setResults(filterCatalog(catalog, entityType, query));
      } else {
        const hits = await searchEntities(supabase, query, { etype: entityType });
        setResults(hits);
      }
      setLoading(false);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, entityType, isCatalog, supabase]);

  const inputClass =
    variant === "underline"
      ? "input-underline"
      : "w-full h-12 px-4 rounded-full bg-surface border border-border focus:border-gold focus:outline-none transition-colors";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />
      {open && (query.trim() || results.length > 0) && (
        <ul className="absolute z-20 left-0 right-0 top-full mt-2 max-h-72 overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl py-2">
          {loading && <li className="px-4 py-2 text-sm text-muted italic">…</li>}
          {!loading && results.length === 0 && query.trim() && (
            <li className="px-4 py-2 text-sm text-muted italic">Ничего не найдено</li>
          )}
          {results.map((hit) => {
            const subtitle =
              hit.subtitle ??
              (typeof hit.meta?.name_en === "string" && hit.meta.name_en !== hit.name
                ? hit.meta.name_en
                : null);
            return (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(hit);
                    setQuery(hit.name);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-bordeaux/10 focus:bg-bordeaux/10 outline-none transition-colors"
                >
                  <div className="text-foreground font-display">{hit.name}</div>
                  {subtitle && (
                    <div className="text-xs text-muted italic">{subtitle}</div>
                  )}
                </button>
              </li>
            );
          })}
          {onCreateNew && query.trim() && (
            <li>
              <button
                type="button"
                onClick={() => {
                  onCreateNew(query.trim());
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 border-t border-border smallcaps text-xs text-gold hover:bg-bordeaux/10 transition-colors"
              >
                + {t("createNew")}: «{query}»
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
