"use client";

import {
  APP_BASE_URL,
  APP_ROUTES,
  isPlatformApexHost,
  STORAGE_KEYS,
} from "@/lib/config";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

/*
 * Cross-tab auth synchronization.
 *
 * Without coordination, two open tabs run independent refresh timers; both
 * detect "access token about to expire" at almost the same wall-clock instant
 * and both POST /auth/refresh with the same refresh token. The second one
 * loses the race and, prior to the backend grace window, would trigger the
 * RFC 6819 reuse cascade and revoke every active session for the user.
 *
 * BroadcastChannel ("ub-auth") is the primary transport: instant, in-process,
 * and not subject to the same-tab quirks of the "storage" event (which only
 * fires in OTHER tabs and not the one that wrote). We also subscribe to the
 * "storage" event as a fallback for environments where BroadcastChannel is
 * unavailable (older Safari, locked-down WebViews).
 */
type AuthBroadcastMessage =
  | { type: "tokens"; accessToken: string; refreshToken: string }
  | { type: "logout" };

const AUTH_CHANNEL_NAME = "ub-auth";

type AuthBroadcastListener = (msg: AuthBroadcastMessage) => void;

let authChannel: BroadcastChannel | null = null;
const authListeners = new Set<AuthBroadcastListener>();
let storageListenerInstalled = false;

function getAuthChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (authChannel) return authChannel;
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    authChannel.addEventListener("message", (event) => {
      const data = event.data as AuthBroadcastMessage | undefined;
      if (!data || typeof data.type !== "string") return;
      for (const listener of authListeners) {
        try {
          listener(data);
        } catch {
          /* listener errors must not break delivery to others */
        }
      }
    });
  } catch {
    authChannel = null;
  }
  return authChannel;
}

function installStorageFallback(): void {
  if (storageListenerInstalled) return;
  if (typeof window === "undefined") return;
  storageListenerInstalled = true;
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key === STORAGE_KEYS.accessToken) {
      const tokens = getSessionTokens();
      if (tokens) {
        for (const listener of authListeners) {
          try {
            listener({ type: "tokens", ...tokens });
          } catch {
            /* ignore */
          }
        }
      } else if (event.newValue === null) {
        for (const listener of authListeners) {
          try {
            listener({ type: "logout" });
          } catch {
            /* ignore */
          }
        }
      }
    }
  });
}

/**
 * Subscribe to auth events broadcast from other tabs. Returns an unsubscribe
 * function. Safe to call on the server (returns a no-op).
 */
export function subscribeToAuthBroadcasts(
  listener: AuthBroadcastListener,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  getAuthChannel();
  installStorageFallback();
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

function postAuthBroadcast(msg: AuthBroadcastMessage): void {
  const channel = getAuthChannel();
  if (channel) {
    try {
      channel.postMessage(msg);
    } catch {
      /* channel closed; ignore */
    }
  }
}

export function getSessionTokens(): SessionTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = window.localStorage.getItem(STORAGE_KEYS.accessToken);
  const refreshToken = window.localStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function setSessionTokens(tokens: SessionTokens): void {
  window.localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
  window.localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
  postAuthBroadcast({
    type: "tokens",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

export function clearSessionTokens(): void {
  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
}

/** Clears ALL session-related data on logout: tokens, tenant context, branch/item-type selections, caches. */
export function clearAllSessionData(): void {
  if (typeof window === "undefined") {
    return;
  }
  // Auth tokens
  window.localStorage.removeItem(STORAGE_KEYS.accessToken);
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  // Tenant context
  window.sessionStorage.removeItem(STORAGE_KEYS.tenantHost);
  window.sessionStorage.removeItem(STORAGE_KEYS.tenantId);
  // Branch / item-type selections (all business IDs)
  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (
      key &&
      (key.startsWith("palmart:selectedBranch:") ||
        key.startsWith("palmart:selectedItemType:") ||
        key.startsWith("palmart:topProducts:v1:"))
    ) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
  // Catalog search cache
  window.localStorage.removeItem("ub_catalog_item_search_v1");
  // Web cart handle (guest storefront)
  window.localStorage.removeItem("ub.webCart.v1");
}

/*
 * Idempotency guard: signOutClientAndRedirectToLogin can be invoked from many
 * places in the same tick (the catch arm of a request, a refresh failure, a
 * "session is no longer active" 401 returned to a parallel request, etc.).
 * Without this guard the second call clobbers the navigation that the first
 * one already initiated and we end up issuing redundant work / extra storage
 * mutations / extra broadcasts.
 */
let signOutInProgress = false;

/** Clears ALL session data, disconnects realtime, and sends the user to login (e.g. unusable access JWT). */
export function signOutClientAndRedirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (signOutInProgress) {
    return;
  }
  signOutInProgress = true;
  // Tear down realtime WebSocket before clearing tokens
  try {
    // Dynamic import to avoid circular dependency at module-load time
    const disconnectFn = (window as unknown as Record<string, unknown>)[
      "__ub_disconnectRealtime"
    ] as (() => void) | undefined;
    if (disconnectFn) {
      disconnectFn();
    }
  } catch {
    /* ignore */
  }
  clearAllSessionData();
  postAuthBroadcast({ type: "logout" });
  window.location.assign(APP_ROUTES.login);
}

/** Registers a global reference to disconnectRealtimeClient so signOutClientAndRedirectToLogin can call it without a circular import. */
export function registerRealtimeDisconnect(fn: () => void): void {
  if (typeof window === "undefined") {
    return;
  }
  (window as unknown as Record<string, unknown>)["__ub_disconnectRealtime"] =
    fn;
}

export function setSessionTenantId(id: string): void {
  window.sessionStorage.setItem(STORAGE_KEYS.tenantId, id);
}

export function getSessionTenantId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(STORAGE_KEYS.tenantId);
}

export function clearSessionTenantId(): void {
  window.sessionStorage.removeItem(STORAGE_KEYS.tenantId);
}

/** Hostname sent as `X-Tenant-Host` on API requests (e.g. when the dev server uses bare localhost). */
export function persistSessionTenantHost(hostname: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const n = hostname.trim().toLowerCase();
  if (!n) {
    window.sessionStorage.removeItem(STORAGE_KEYS.tenantHost);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEYS.tenantHost, n);
}

/**
 * After login, map tenant slug to the hostname the API expects ({slug}.{NEXT_PUBLIC_APP_BASE_URL host}).
 * Safe while staying on localhost in the browser — tokens remain on this origin.
 */
export function persistTenantHostFromSlug(
  slug: string | null | undefined,
): void {
  if (typeof window === "undefined") {
    return;
  }
  const s = slug?.trim().toLowerCase();
  if (!s) {
    window.sessionStorage.removeItem(STORAGE_KEYS.tenantHost);
    return;
  }
  const parent = new URL(APP_BASE_URL).hostname.toLowerCase();
  window.sessionStorage.setItem(STORAGE_KEYS.tenantHost, `${s}.${parent}`);
}

/**
 * When the app runs on a mapped tenant host (e.g. {@code slug.palmart.co.ke}),
 * persist it as {@code X-Tenant-Host}. Skips bare localhost, super-admin routes,
 * and the platform apex ({@code palmart.co.ke}) so login slug hosts are not overwritten.
 */
export function syncTenantHostFromBrowserHostname(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (window.location.pathname.startsWith("/super-admin")) {
    return;
  }
  const bareLocal = new Set(["localhost", "127.0.0.1", "::1"]);
  const h = window.location.hostname.toLowerCase();
  if (bareLocal.has(h)) {
    return;
  }
  if (isPlatformApexHost(h)) {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEYS.tenantHost, h);
}
