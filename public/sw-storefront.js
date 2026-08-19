// Shopper PWA worker — network-first so a new deploy is never trapped behind
// a stale cache. The fetch listener exists so Chromium treats the site as
// installable; we do not precache the Next.js shell.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request).catch(() =>
      new Response("You're offline. Reconnect to keep shopping.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    ),
  );
});
