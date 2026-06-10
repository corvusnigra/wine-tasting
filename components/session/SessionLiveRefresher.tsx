"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseBrowser } from "@/lib/supabase/use-browser";

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
  const supabase = useSupabaseBrowser();
  // Stable primitive key — the parent passes a fresh array on every render,
  // which would otherwise tear down and rebuild the channel on each refresh.
  const idsKey = wineInSessionIds.join(",");

  useEffect(() => {
    if (!idsKey) return;

    let opened = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    // Throttle refreshes — with many guests autosaving, raw events would fire a
    // full server re-render per keystroke-ish. Coalesce to at most one per 2s
    // (leading + trailing) so the table stays live without thrashing every phone.
    let lastRefresh = 0;
    let trailing: ReturnType<typeof setTimeout> | null = null;
    const THROTTLE_MS = 2000;
    const refresh = () => {
      const now = Date.now();
      const elapsed = now - lastRefresh;
      if (elapsed >= THROTTLE_MS) {
        lastRefresh = now;
        router.refresh();
      } else if (!trailing) {
        trailing = setTimeout(() => {
          trailing = null;
          lastRefresh = Date.now();
          router.refresh();
        }, THROTTLE_MS - elapsed);
      }
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasting_notes",
          filter: `wine_in_session_id=in.(${idsKey})`,
        },
        refresh
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wines_in_session",
          filter: `session_id=eq.${sessionId}`,
        },
        refresh
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          opened = true;
          // Realtime won the race after the fallback already started — stop the
          // redundant polling so we don't double-refresh.
          stopPolling();
        }
      });

    const fallbackTimer = setTimeout(() => {
      if (!opened) {
        pollTimer = setInterval(refresh, 5000);
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimer);
      if (trailing) clearTimeout(trailing);
      stopPolling();
      void supabase.removeChannel(channel);
    };
  }, [sessionId, idsKey, router, supabase]);

  return null;
}
