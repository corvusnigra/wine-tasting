// Sommelier Night — service worker (hand-rolled, conservative).
// Scope is deliberately narrow: cache the app shell + offline page only.
// We DO NOT intercept Supabase requests — data/auth/realtime go straight
// to the network so the SW can never degrade or break data fetching.

const VERSION = "v2";
const STATIC_CACHE = `sn-static-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.add(OFFLINE_URL);
      } catch {
        // ignore — offline page will just fall back to the browser error
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Hands off everything cross-origin (Supabase, fonts CDN, etc.).
  if (url.origin !== self.location.origin) return;

  // Same-origin static build assets → cache-first.
  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:woff2?|ttf|otf|png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Page navigations → network-first, fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      try {
        await cache.put(request, res.clone());
      } catch {
        // body stream may have failed mid-cache — serve the response anyway
      }
    }
    return res;
  } catch {
    return cached ?? Response.error();
  }
}

async function networkFirstPage(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}
