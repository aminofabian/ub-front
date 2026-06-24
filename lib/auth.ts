"use client";

import {
  API_ROUTES,
  APP_BASE_URL,
  APP_ROUTES,
  apiUrl,
  isPlatformApexHost,
  SESSION_PRESENCE_COOKIE,
  SESSION_PRESENCE_MAX_AGE_SEC,
  STORAGE_KEYS,
} from "@/lib/config";
import { businessIdFromAccessToken } from "@/lib/jwt-client";
import { stripLeadingWww, tenantHostsMatch } from "@/lib/tenant-host";

export type SessionTokens = {
  accessToken: string;
  /** Present during handoff migration; otherwise stored in httpOnly cookie. */
  refreshToken?: string;
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
  | { type: "tokens"; accessToken: string; refreshToken?: string }
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
  if (typeof window.addEventListener !== "function") return;
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

/** Notifies other tabs to sign out (e.g. after explicit logout in this tab). */
export function broadcastAuthLogout(): void {
  postAuthBroadcast({ type: "logout" });
}

export function getSessionTokens(): SessionTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken =
    window.localStorage.getItem(STORAGE_KEYS.accessToken) ||
    window.sessionStorage.getItem(STORAGE_KEYS.accessToken);
  if (!accessToken) {
    return null;
  }
  const refreshToken =
    window.localStorage.getItem(STORAGE_KEYS.refreshToken)?.trim() ||
    window.sessionStorage.getItem(STORAGE_KEYS.refreshToken)?.trim();
  return {
    accessToken,
    refreshToken: refreshToken || undefined,
  };
}

const SESSION_HINT_API = "/api/auth/session-hint";

function sessionPresenceCookieAttrs(maxAgeSec: number): string {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  // Host-only (no Domain=). Safari iOS 15 often rejects parent-domain JS cookies.
  return `path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

/** Whether the middleware session hint cookie is present (not secret — UX only). */
export function hasSessionPresenceCookie(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith(`${SESSION_PRESENCE_COOKIE}=1`));
}

function setSessionPresenceCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${SESSION_PRESENCE_COOKIE}=1; ${sessionPresenceCookieAttrs(SESSION_PRESENCE_MAX_AGE_SEC)}`;
}

function clearSessionPresenceCookie(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${SESSION_PRESENCE_COOKIE}=; ${sessionPresenceCookieAttrs(0)}`;
  void fetch(SESSION_HINT_API, { method: "DELETE", credentials: "include" }).catch(
    () => {},
  );
}

/**
 * Sets the middleware session hint via document.cookie and, when that fails
 * (common on Safari iOS), via {@link SESSION_HINT_API} Set-Cookie.
 */
export async function ensureSessionPresenceCookie(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  setSessionPresenceCookie();
  if (hasSessionPresenceCookie()) {
    return true;
  }
  try {
    const response = await fetch(SESSION_HINT_API, {
      method: "POST",
      credentials: "include",
    });
    if (response.ok) {
      return true;
    }
  } catch {
    /* fall through */
  }
  return hasSessionPresenceCookie();
}

/** Sets the middleware hint when tokens exist (e.g. after deploy or cookie cleared). */
export function syncSessionPresenceCookie(): void {
  if (getSessionTokens()) {
    setSessionPresenceCookie();
    void ensureSessionPresenceCookie();
  } else {
    clearSessionPresenceCookie();
  }
}

export function setSessionTokens(tokens: SessionTokens): void {
  const refresh = tokens.refreshToken?.trim();
  try {
    window.localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
    window.sessionStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
    if (refresh) {
      window.localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
      window.sessionStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
      window.sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
    }
  } catch {
    throw new Error(
      "Could not save your session. Allow site data for this domain (Safari Private Browsing blocks sign-in).",
    );
  }
  setSessionPresenceCookie();
  void ensureSessionPresenceCookie();
  postAuthBroadcast({
    type: "tokens",
    accessToken: tokens.accessToken,
    refreshToken: refresh,
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
  // Tenant context (session + durable copy)
  window.sessionStorage.removeItem(STORAGE_KEYS.tenantHost);
  window.sessionStorage.removeItem(STORAGE_KEYS.tenantId);
  window.localStorage.removeItem(STORAGE_KEYS.tenantHost);
  window.localStorage.removeItem(STORAGE_KEYS.tenantId);
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
  clearSessionPresenceCookie();
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

function disconnectRealtimeClient(): void {
  try {
    const disconnectFn = (window as unknown as Record<string, unknown>)[
      "__ub_disconnectRealtime"
    ] as (() => void) | undefined;
    if (disconnectFn) {
      disconnectFn();
    }
  } catch {
    /* ignore */
  }
}

function clearRefreshSessionCookie(): void {
  void fetch(apiUrl(API_ROUTES.clearSessionCookie), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}

/** Clears session storage and notifies other tabs; does not redirect. */
export function finalizeClientSignOut(): void {
  if (typeof window === "undefined") {
    return;
  }
  disconnectRealtimeClient();
  clearRefreshSessionCookie();
  clearAllSessionData();
  broadcastAuthLogout();
}

/** Clears ALL session data, disconnects realtime, and sends the user to login (e.g. unusable access JWT). */
export function signOutClientAndRedirectToLogin(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (signOutInProgress) {
    return;
  }
  signOutInProgress = true;
  finalizeClientSignOut();
  window.location.assign(APP_ROUTES.login);
}

function readStoredTenantId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const fromSession = window.sessionStorage.getItem(STORAGE_KEYS.tenantId)?.trim();
  if (fromSession) {
    return fromSession;
  }
  const fromLocal = window.localStorage.getItem(STORAGE_KEYS.tenantId)?.trim();
  if (fromLocal) {
    window.sessionStorage.setItem(STORAGE_KEYS.tenantId, fromLocal);
    return fromLocal;
  }
  const fromJwt = businessIdFromAccessToken(getSessionTokens()?.accessToken);
  if (fromJwt) {
    persistTenantIdToStorage(fromJwt);
    return fromJwt;
  }
  return null;
}

function readStoredTenantHost(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const fromSession = window.sessionStorage.getItem(STORAGE_KEYS.tenantHost)?.trim();
  if (fromSession) {
    return fromSession;
  }
  const fromLocal = window.localStorage.getItem(STORAGE_KEYS.tenantHost)?.trim();
  if (fromLocal) {
    window.sessionStorage.setItem(STORAGE_KEYS.tenantHost, fromLocal);
    return fromLocal;
  }
  return null;
}

function persistTenantIdToStorage(id: string): void {
  const trimmed = id.trim();
  if (!trimmed) {
    window.sessionStorage.removeItem(STORAGE_KEYS.tenantId);
    window.localStorage.removeItem(STORAGE_KEYS.tenantId);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEYS.tenantId, trimmed);
  window.localStorage.setItem(STORAGE_KEYS.tenantId, trimmed);
}

function persistTenantHostToStorage(hostname: string): void {
  const n = hostname.trim().toLowerCase();
  if (!n) {
    window.sessionStorage.removeItem(STORAGE_KEYS.tenantHost);
    window.localStorage.removeItem(STORAGE_KEYS.tenantHost);
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEYS.tenantHost, n);
  window.localStorage.setItem(STORAGE_KEYS.tenantHost, n);
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
  persistTenantIdToStorage(id);
}

export function getSessionTenantId(): string | null {
  return readStoredTenantId();
}

export function clearSessionTenantId(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(STORAGE_KEYS.tenantId);
  window.localStorage.removeItem(STORAGE_KEYS.tenantId);
}

/** Hostname sent as `X-Tenant-Host` on API requests (e.g. when the dev server uses bare localhost). */
export function getSessionTenantHost(): string | null {
  if (typeof window === "undefined") {
    return readStoredTenantHost();
  }
  const browserHost = stripLeadingWww(window.location.hostname);
  const bareLocal = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!bareLocal.has(browserHost) && !isPlatformApexHost(browserHost)) {
    // Always honor the hostname the clerk is actually on (custom domains).
    return browserHost;
  }
  return readStoredTenantHost();
}
export function persistSessionTenantHost(hostname: string): void {
  if (typeof window === "undefined") {
    return;
  }
  persistTenantHostToStorage(hostname);
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
    window.localStorage.removeItem(STORAGE_KEYS.tenantHost);
    return;
  }
  const parent = new URL(APP_BASE_URL).hostname.toLowerCase();
  persistTenantHostToStorage(`${s}.${parent}`);
}

/**
 * After auth, persist the hostname the API should use. Prefers the browser host
 * or tenant {@code primaryDomain} (custom domains like {@code palmart.co.ke})
 * over slug-derived kiosk subdomains.
 */
export function persistTenantHostAfterAuth(
  slug: string | null | undefined,
  primaryHost?: string | null,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const browserHost = stripLeadingWww(window.location.hostname);
  const primary = primaryHost?.trim()
    ? stripLeadingWww(primaryHost.trim())
    : null;

  if (primary && tenantHostsMatch(browserHost, primary)) {
    persistTenantHostToStorage(primary);
    return;
  }

  const s = slug?.trim().toLowerCase();
  if (s && browserHost.startsWith(`${s}.`)) {
    persistTenantHostToStorage(browserHost);
    return;
  }

  const bareLocal = new Set(["localhost", "127.0.0.1", "::1"]);
  if (!bareLocal.has(browserHost) && !isPlatformApexHost(browserHost)) {
    persistTenantHostToStorage(browserHost);
    return;
  }

  persistTenantHostFromSlug(slug);
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
  persistTenantHostToStorage(h);
}
