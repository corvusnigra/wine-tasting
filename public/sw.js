// Sommelier Night — service worker (hand-rolled runtime caching).
// Basic PWA: cache the app shell + reference catalogue so the app boots
// instantly and survives flaky connections. Session data still needs network.

const VERSION = "v1";
const STATIC_CACHE = `sn-static-${VERSION}`;
const CATALOG_CACHE = `sn-catalog-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll([OFFLINE_URL]);
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== CATALOG_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

const CATALOG_RE = /\/rest\/v1\/(descriptors|grapes|regions|producers)/;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSupabase = url.hostname.endsWith(".supabase.co");

  // Never intercept auth or realtime — always go to network.
  if (isSupabase && (url.pathname.includes("/auth/") || url.pathname.includes("/realtime/"))) {
    return;
  }

  // Reference catalogue → stale-while-revalidate (rarely changes, public).
  if (isSupabase && CATALOG_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, CATALOG_CACHE));
    return;
  }

  // Don't touch other Supabase data (sessions/notes) — must be fresh & authed.
  if (isSupabase) return;

  // Same-origin static build assets (JS/CSS/self-hosted fonts) → cache-first.
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static") ||
      url.pathname.startsWith("/icon") ||
      url.pathname === "/manifest.webmanifest" ||
      /\.(?:woff2?|ttf|otf|png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname))
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Page navigations → network-first, fall back to a branded offline page.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return cached ?? Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return cached ?? (await network) ?? Response.error();
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
