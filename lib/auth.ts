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
import {
  claimsFromAccessToken,
  type AuthSessionClaims,
} from "@/lib/auth-session-claims";
import { businessIdFromAccessToken } from "@/lib/jwt-client";
import { loginPathForNext } from "@/lib/login-audience";
import { clearAllSessionBootstrap } from "@/lib/session-bootstrap";
import { clearPersistedTillLock } from "@/lib/till-lock-persist";
import { clearTillUnlockContext } from "@/lib/till-unlock-context";
import { stripLeadingWww, tenantHostsMatch } from "@/lib/tenant-host";

export type SessionTokens = {
  accessToken: string;
  /** Present during handoff migration; otherwise stored in httpOnly cookie. */
  refreshToken?: string;
};

export type { AuthSessionClaims };

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
  | { type: "session"; session: AuthSessionClaims }
  | { type: "logout" };

const AUTH_CHANNEL_NAME = "ub-auth";

type AuthBroadcastListener = (msg: AuthBroadcastMessage) => void;

let authChannel: BroadcastChannel | null = null;
const authListeners = new Set<AuthBroadcastListener>();
let storageListenerInstalled = false;

/**
 * Gap G: access JWT lives in process memory (XSS cannot read localStorage for
 * it). Survives only for the tab lifetime; reload uses httpOnly `ub.access` /
 * restore-session. Cross-tab sync via BroadcastChannel.
 */
let memoryAccessToken: string | null = null;
/** Gap G3: non-secret exp/businessId when the JWT is cookie-only. */
let memorySessionClaims: AuthSessionClaims | null = null;

function applyMemoryAccessToken(accessToken: string | null | undefined): void {
  const trimmed = accessToken?.trim() || "";
  memoryAccessToken = trimmed || null;
}

function applyMemorySessionClaims(
  claims: AuthSessionClaims | null | undefined,
): void {
  if (!claims || (claims.exp == null && !claims.businessId && !claims.sub)) {
    memorySessionClaims = null;
    return;
  }
  memorySessionClaims = {
    exp: claims.exp,
    businessId: claims.businessId,
    sub: claims.sub,
  };
}

function purgeLegacyAccessTokenStorage(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEYS.accessToken);
    window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
    window.sessionStorage.removeItem(STORAGE_KEYS.accessToken);
    window.sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
  } catch {
    /* private mode */
  }
}

function adoptLegacyAccessTokenFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const legacy =
      window.localStorage.getItem(STORAGE_KEYS.accessToken)?.trim() ||
      window.sessionStorage.getItem(STORAGE_KEYS.accessToken)?.trim() ||
      "";
    if (!legacy) {
      return null;
    }
    applyMemoryAccessToken(legacy);
    applyMemorySessionClaims(claimsFromAccessToken(legacy));
    purgeLegacyAccessTokenStorage();
    return legacy;
  } catch {
    return null;
  }
}

function getAuthChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (authChannel) return authChannel;
  const BroadcastChannelCtor = globalThis.BroadcastChannel;
  if (typeof BroadcastChannelCtor !== "function") return null;
  try {
    authChannel = new BroadcastChannelCtor(AUTH_CHANNEL_NAME);
    authChannel.addEventListener("message", (event) => {
      const data = event.data as AuthBroadcastMessage | undefined;
      if (!data || typeof data.type !== "string") return;
      if (data.type === "tokens") {
        applyMemoryAccessToken(data.accessToken);
        applyMemorySessionClaims(claimsFromAccessToken(data.accessToken));
      } else if (data.type === "session") {
        applyMemorySessionClaims(data.session);
      } else if (data.type === "logout") {
        applyMemoryAccessToken(null);
        applyMemorySessionClaims(null);
      }
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
  // Legacy only: adopt if another tab still dual-writes access to localStorage.
  // Clears are ignored (Gap G purge must not look like cross-tab logout).
  window.addEventListener("storage", (event) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== STORAGE_KEYS.accessToken) return;
    const next = event.newValue?.trim();
    if (!next) {
      return;
    }
    applyMemoryAccessToken(next);
    for (const listener of authListeners) {
      try {
        listener({ type: "tokens", accessToken: next });
      } catch {
        /* ignore */
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
  // BroadcastChannel does not echo to the sender in every browser — notify
  // in-tab subscribers here so hooks like useClientHasAccessTokens react
  // immediately after setSessionTokens (e.g. post-login client navigation).
  for (const listener of authListeners) {
    try {
      listener(msg);
    } catch {
      /* listener errors must not break delivery to others */
    }
  }
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
    memoryAccessToken?.trim() || adoptLegacyAccessTokenFromStorage();
  if (!accessToken) {
    return null;
  }
  return {
    accessToken,
    // Refresh is httpOnly (`ub.refresh`); body/localStorage refresh is legacy.
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
  if (hasAccessSession()) {
    setSessionPresenceCookie();
    void ensureSessionPresenceCookie();
  } else {
    clearSessionPresenceCookie();
  }
}

export function setSessionTokens(tokens: SessionTokens): void {
  const access = tokens.accessToken?.trim();
  if (!access) {
    return;
  }
  applyMemoryAccessToken(access);
  applyMemorySessionClaims(claimsFromAccessToken(access));
  purgeLegacyAccessTokenStorage();
  setSessionPresenceCookie();
  void ensureSessionPresenceCookie();
  postAuthBroadcast({
    type: "tokens",
    accessToken: access,
    refreshToken: tokens.refreshToken?.trim() || undefined,
  });
}

/** Gap G3: establish a cookie-only session (no JWT in JS). */
export function setSessionClaims(claims: AuthSessionClaims): void {
  applyMemorySessionClaims(claims);
  applyMemoryAccessToken(null);
  purgeLegacyAccessTokenStorage();
  const next = memorySessionClaims;
  if (!next) {
    return;
  }
  setSessionPresenceCookie();
  void ensureSessionPresenceCookie();
  postAuthBroadcast({ type: "session", session: { ...next } });
}

export function getSessionClaims(): AuthSessionClaims | null {
  return memorySessionClaims;
}

/** True when cookie-only claims or a (legacy/desktop) memory JWT is present. */
export function hasAccessSession(): boolean {
  if (getSessionTokens()?.accessToken) {
    return true;
  }
  const claims = memorySessionClaims;
  return Boolean(claims && (claims.exp != null || claims.businessId || claims.sub));
}

/**
 * Apply login/refresh/restore payloads after Gap G3 redaction.
 * Prefers `session` claims; falls back to raw accessToken (desktop / legacy).
 */
export function applyAuthSessionPayload(payload: {
  accessToken?: string;
  refreshToken?: string;
  session?: AuthSessionClaims;
}): boolean {
  const access = payload.accessToken?.trim();
  if (access) {
    setSessionTokens({
      accessToken: access,
      refreshToken: payload.refreshToken,
    });
    return true;
  }
  if (payload.session) {
    setSessionClaims(payload.session);
    return true;
  }
  return false;
}

export function clearSessionTokens(): void {
  if (typeof window === "undefined") {
    return;
  }
  applyMemoryAccessToken(null);
  applyMemorySessionClaims(null);
  purgeLegacyAccessTokenStorage();
}

/** Test helper — resets in-memory access token between unit tests. */
export function __resetMemoryAccessTokenForTests(): void {
  memoryAccessToken = null;
  memorySessionClaims = null;
}

/** Clears ALL session-related data on logout: tokens, tenant context, branch/item-type selections, caches. */
export function clearAllSessionData(): void {
  if (typeof window === "undefined") {
    return;
  }
  // Auth tokens (localStorage + sessionStorage — getSessionTokens reads either)
  clearSessionTokens();
  // Prefetched /me + business + branches from login / cookie restore
  clearAllSessionBootstrap();
  // Device-local till PIN unlock context (email/branch — never PIN)
  clearTillUnlockContext();
  clearPersistedTillLock();
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
export function signOutClientAndRedirectToLogin(
  reason?: string,
  options?: { nextPath?: string },
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (signOutInProgress) {
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[auth] signOutClientAndRedirectToLogin",
      reason ?? "no reason provided",
    );
  }
  signOutInProgress = true;
  finalizeClientSignOut();
  const next = options?.nextPath?.trim();
  const baseLogin = loginPathForNext(next);
  const loginUrl =
    next && next.startsWith("/")
      ? `${baseLogin}?next=${encodeURIComponent(next)}`
      : baseLogin;
  window.location.assign(loginUrl);
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
  const fromClaims = memorySessionClaims?.businessId?.trim();
  if (fromClaims) {
    persistTenantIdToStorage(fromClaims);
    return fromClaims;
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
