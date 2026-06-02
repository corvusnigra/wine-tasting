"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => console.error("SW registration failed:", err));
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  // Self-heal stale chunks: if a tab stays open across a deploy, Next.js may
  // try to load a chunk whose hash no longer exists (404 / ChunkLoadError).
  // Reload once to pull the fresh build. Guarded so it can't loop.
  useEffect(() => {
    const KEY = "sn.chunkReloadedAt";
    function isStaleChunkError(msg: string) {
      return (
        /ChunkLoadError/i.test(msg) ||
        /Loading (chunk|CSS chunk) [\w-]+ failed/i.test(msg) ||
        /error loading dynamically imported module/i.test(msg)
      );
    }
    function recover() {
      const last = Number(sessionStorage.getItem(KEY) ?? "0");
      // At most one reload per 30s — never loop on a genuinely broken build.
      if (Date.now() - last < 30_000) return;
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
    function onError(e: ErrorEvent) {
      if (isStaleChunkError(e.message || "")) recover();
    }
    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      const msg = typeof reason === "string" ? reason : (reason?.message ?? "");
      if (isStaleChunkError(msg)) recover();
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
