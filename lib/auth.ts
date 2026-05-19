"use client";

import { APP_BASE_URL, APP_ROUTES, STORAGE_KEYS } from "@/lib/config";

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

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

/** Clears ALL session data, disconnects realtime, and sends the user to login (e.g. unusable access JWT). */
export function signOutClientAndRedirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
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

/** When the app runs on e.g. pal.localhost, persist hostname so API calls send X-Tenant-Host. Skips bare localhost and super-admin routes. */
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
  window.sessionStorage.setItem(STORAGE_KEYS.tenantHost, h);
}
