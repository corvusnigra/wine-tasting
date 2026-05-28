"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { searchEntities, type SearchHit } from "@/lib/search/api";

const TYPE_LABEL = {
  grape: "Сорт",
  region: "Регион",
  producer: "Производитель",
  wine: "Вино",
} as const;

export function SearchClient() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useRef(createSupabaseBrowserClient()).current;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchEntities(supabase, q, { lim: 30 });
      setHits(results);
      setLoading(false);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, supabase]);

  const grouped = hits.reduce<Record<string, SearchHit[]>>((acc, hit) => {
    (acc[hit.entity_type] ??= []).push(hit);
    return acc;
  }, {});

  const order: Array<keyof typeof TYPE_LABEL> = ["wine", "producer", "region", "grape"];

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

      {loading && <p className="text-sm text-muted">…</p>}

      {!loading && q.trim() && hits.length === 0 && (
        <p className="text-muted">Ничего не найдено.</p>
      )}

      {order.map(
        (type) =>
          grouped[type]?.length > 0 && (
            <section key={type} className="mb-6">
              <h2 className="text-xs uppercase tracking-wider text-muted mb-2">
                {TYPE_LABEL[type]}
              </h2>
              <ul className="flex flex-col gap-1">
                {grouped[type].map((hit) => (
                  <li key={hit.id}>
                    {type === "wine" ? (
                      <Link
                        href={`/wines/${hit.id}`}
                        className="flex items-baseline justify-between p-3 rounded-xl bg-surface border border-border hover:border-gold transition-colors"
                      >
                        <span>{hit.name}</span>
                        {typeof hit.meta?.vintage === "number" && (
                          <span className="text-xs text-muted">{hit.meta.vintage}</span>
                        )}
                      </Link>
                    ) : (
                      <div className="p-3 rounded-xl bg-surface border border-border">
                        {hit.name}
                        {typeof hit.meta?.name_en === "string" &&
                          hit.meta.name_en !== hit.name && (
                            <span className="text-xs text-muted ml-2">
                              {hit.meta.name_en}
                            </span>
                          )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
      )}
    </div>
  );
}
