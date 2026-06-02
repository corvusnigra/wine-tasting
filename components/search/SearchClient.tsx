"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSupabaseBrowser } from "@/lib/supabase/use-browser";
import { loadCatalog, filterCatalog } from "@/lib/search/catalog";
import type { EntityType, SearchHit } from "@/lib/search/api";

type Hit = SearchHit & { subtitle?: string | null };

const TYPE_LABEL: Record<EntityType, string> = {
  grape: "Сорта",
  region: "Регионы",
  producer: "Производители",
  wine: "Вина",
};
const ORDER: EntityType[] = ["wine", "producer", "region", "grape"];

export function SearchClient() {
  const [q, setQ] = useState("");
  const [grouped, setGrouped] = useState<Record<string, Hit[]>>({});
  const [loading, setLoading] = useState(false);
  const supabase = useSupabaseBrowser();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadCatalog(supabase);
  }, [supabase]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setGrouped({});
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      // All searched locally over the cached catalogue — instant, no RPC.
      const catalog = await loadCatalog(supabase);
      const next: Record<string, Hit[]> = {};
      for (const etype of ORDER) {
        const hits = filterCatalog(catalog, etype, q, 12);
        if (hits.length) next[etype] = hits;
      }
      setGrouped(next);
      setLoading(false);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, supabase]);

  const hasResults = ORDER.some((t) => grouped[t]?.length);

  return (
    <div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
        placeholder="Бароло, саперави, абрау-дюрсо…"
        className="w-full h-12 px-4 rounded-full bg-surface border border-border focus:border-gold focus:outline-none mb-6"
      />

      {loading && <p className="text-sm text-muted italic">…</p>}

      {!loading && q.trim() && !hasResults && (
        <p className="text-muted italic">Ничего не найдено.</p>
      )}

      {ORDER.map(
        (type) =>
          grouped[type]?.length > 0 && (
            <section key={type} className="mb-6">
              <h2 className="smallcaps text-[10px] text-muted mb-2 rule-left">
                {TYPE_LABEL[type]}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {grouped[type].map((hit) => {
                  const inner = (
                    <>
                      <div>
                        <span className="font-display">{hit.name}</span>
                        {hit.subtitle && (
                          <span className="text-xs text-muted italic ml-2">
                            {hit.subtitle}
                          </span>
                        )}
                      </div>
                    </>
                  );
                  return (
                    <li key={hit.id}>
                      {type === "wine" ? (
                        <Link
                          href={`/wines/${hit.id}`}
                          className="block p-3 rounded-xl bg-surface border border-border hover:border-gold transition-colors"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="p-3 rounded-xl bg-surface border border-border">
                          {inner}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )
      )}
    </div>
  );
}
