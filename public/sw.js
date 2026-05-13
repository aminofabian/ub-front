/// <reference lib="webworker" />

// Phase 9 Slice 5: PWA service worker — caches the app shell and serves
// stale-while-revalidate for API calls when offline.

const CACHE_VERSION = "palmart-v1";
const STATIC_CACHE = `palmart-static-${CACHE_VERSION}`;
const API_CACHE = `palmart-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/cashier",
  "/manifest.json",
  "/cashier-icon.svg",
];

declare const self: ServiceWorkerGlobalScope;

// ── Install: pre-cache the app shell ────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean old caches ──────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// ── Fetch: network-first for API, cache-first for static ────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets: cache-first with network update
  if (request.destination === "script" ||
      request.destination === "style" ||
      request.destination === "image" ||
      request.destination === "font" ||
      request.destination === "manifest") {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation requests: network-first
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }
});

async function networkFirst(request: Request): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) {
    // Update cache in background
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, response);
        });
      }
    }).catch(() => { /* ignore */ });
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

export {};
