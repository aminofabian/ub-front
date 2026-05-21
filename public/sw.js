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
  const request = event.request;
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

async function networkFirst(request) {
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
      icon: "/cashier-icon.svg",
      badge: "/cashier-icon.svg",
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

