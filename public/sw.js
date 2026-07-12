// Phase 9 Slice 5: PWA service worker — caches the app shell and serves
// stale-while-revalidate for API calls when offline.

const CACHE_VERSION = "palmart-v4";
const STATIC_CACHE = `palmart-static-${CACHE_VERSION}`;
const API_CACHE = `palmart-api-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/cashier",
  "/manifest.json",
  "/kiosk-mark.svg",
  "/cashier-icon.svg",
];

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
function isCacheable(request) {
  // The Cache API only supports GET requests over http(s).
  if (request.method !== "GET") return false;
  try {
    const url = new URL(request.url);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    // Same-origin only — avoid caching opaque cross-origin/extension responses.
    if (url.origin !== self.location.origin) return false;
    return true;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Bail out early for anything we can't safely cache or proxy.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Skip non-http(s) schemes (chrome-extension://, data:, blob:, etc.)
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Skip cross-origin requests — let the browser handle them directly.
  if (url.origin !== self.location.origin) return;

  // Never intercept API traffic — auth and tenant resolve must always hit the network.
  if (url.pathname.startsWith("/api/")) return;

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

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && isCacheable(request)) {
      try {
        const cache = await caches.open(API_CACHE);
        await cache.put(request, networkResponse.clone());
      } catch {
        // ignore cache write failures (quota, opaque responses, etc.)
      }
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

// ── Web Push (Phase C) ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = { title: "Palmart", body: "", url: "/" };
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch {
    // ignore malformed payload
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Palmart", {
      body: data.body || "",
      icon: "/kiosk-mark.svg",
      badge: "/kiosk-mark.svg",
      data: { url: data.url || "/" },
      tag: "palmart-notification",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    if (isCacheable(request)) {
      // Update cache in background
      fetch(request).then((response) => {
        if (response.ok) {
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, response).catch(() => { /* ignore */ });
          });
        }
      }).catch(() => { /* ignore */ });
    }
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok && isCacheable(request)) {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, networkResponse.clone());
      } catch {
        // ignore cache write failures
      }
    }
    return networkResponse;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

