"use client";

import { APP_BASE_URL, STORAGE_KEYS } from "@/lib/config";

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

/**
 * After login, map tenant slug to the hostname the API expects ({slug}.{NEXT_PUBLIC_APP_BASE_URL host}).
 * Safe while staying on localhost in the browser — tokens remain on this origin.
 */
export function persistTenantHostFromSlug(slug: string | null | undefined): void {
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
