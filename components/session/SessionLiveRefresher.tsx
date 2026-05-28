"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Subscribes to tasting_notes changes for a session and calls
 * router.refresh() so the server component re-renders with new
 * progress. Falls back to polling every 5s if the realtime channel
 * fails to open within 3s.
 */
export function SessionLiveRefresher({
  sessionId,
  wineInSessionIds,
}: {
  sessionId: string;
  wineInSessionIds: string[];
}) {
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient()).current;

  useEffect(() => {
    if (wineInSessionIds.length === 0) return;

    let opened = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasting_notes",
          filter: `wine_in_session_id=in.(${wineInSessionIds.join(",")})`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wines_in_session",
          filter: `session_id=eq.${sessionId}`,
        },
        () => router.refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          opened = true;
        }
      });

    const fallbackTimer = setTimeout(() => {
      if (!opened) {
        pollTimer = setInterval(() => router.refresh(), 5000);
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      if (pollTimer) clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, wineInSessionIds, router, supabase]);

  return null;
}
