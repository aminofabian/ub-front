"use client";

import {
  getSessionClaims,
  getSessionTokens,
  hasAccessSession,
  signOutClientAndRedirectToLogin,
  subscribeToAuthBroadcasts,
  syncSessionPresenceCookie,
} from "@/lib/auth";
import { refreshAccessToken } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/config";
import { parseAccessTokenClaims } from "@/lib/jwt-client";
import {
  isPosSoftAuthActive,
  notifyPosSessionExpired,
} from "@/lib/pos-soft-auth";
import { tryRecoverSessionBeforeSignOut } from "@/lib/session-recovery";

/*
 * Background access-token refresh strategy.
 *
 * Two complementary triggers keep the session alive without ever surprising
 * the user with a "logged out" toast:
 *
 *  1. SCHEDULED: a setTimeout fires REFRESH_MARGIN_MS before the access token
 *     expires. This is the primary mechanism for active tabs.
 *
 *  2. ACTIVITY / VISIBILITY: if the user clicks/types/focuses the tab AND
 *     the token has < ACTIVITY_REFRESH_THRESHOLD_MS left, refresh
 *     opportunistically. This catches the "tab was backgrounded, timer was
 *     throttled by the browser, user comes back and we are nearly expired"
 *     case which is very common on mobile (iOS Safari pauses timers in
 *     background tabs).
 *
 * Both mechanisms route through refreshAccessToken(), which is single-flight:
 * concurrent calls share a single in-flight promise so we never POST the
 * same refresh token twice in parallel.
 *
 * Transient failures (network down, server 5xx) do NOT sign the user out.
 * Only an outright "rejected" outcome (refresh token revoked/expired) does.
 */

const REFRESH_MARGIN_MS = 2 * 60 * 1000; // refresh 2 min before expiry
const ACTIVITY_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh on activity if < 5 min left
const ACTIVITY_DEBOUNCE_MS = 30_000; // max one activity-triggered refresh per 30s
const EAGER_REFRESH_THRESHOLD_MS = 60_000; // on mount: refresh now if <60s left

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivityRefresh = 0;
let consecutiveRefreshRejections = 0;

const MAX_REFRESH_REJECT_BEFORE_LOGOUT = 3;

/** Drop legacy localStorage refresh tokens; httpOnly cookie is authoritative. */
function clearLegacyRefreshTokenFromStorage(): void {
  window.localStorage.removeItem(STORAGE_KEYS.refreshToken);
  window.sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
}

function getAccessTokenExpiry(): number | null {
  const fromClaims = getSessionClaims()?.exp;
  if (typeof fromClaims === "number") {
    return fromClaims * 1000;
  }
  const tokens = getSessionTokens();
  if (!tokens?.accessToken) return null;
  const exp = parseAccessTokenClaims(tokens.accessToken)?.exp;
  return typeof exp === "number" ? exp * 1000 : null;
}

function scheduleNextRefresh() {
  clearRefreshTimer();

  const exp = getAccessTokenExpiry();
  if (!exp) return;

  const now = Date.now();
  const refreshAt = exp - REFRESH_MARGIN_MS;
  const delay = Math.max(0, refreshAt - now);

  refreshTimer = setTimeout(() => {
    void performRefresh();
  }, delay);
}

async function performRefresh(): Promise<void> {
  if (!hasAccessSession()) return;

  const outcome = await refreshAccessToken();
  if (outcome.kind === "ok") {
    consecutiveRefreshRejections = 0;
    scheduleNextRefresh();
    return;
  }
  if (outcome.kind === "rejected") {
    consecutiveRefreshRejections += 1;
    const recovered = await tryRecoverSessionBeforeSignOut(
      getSessionTokens()?.accessToken,
    );
    if (recovered) {
      consecutiveRefreshRejections = 0;
      scheduleNextRefresh();
      return;
    }
    // Idle (and other definitive) rejections: skip the 3× retry buffer.
    const giveUp =
      outcome.definitive === true ||
      consecutiveRefreshRejections >= MAX_REFRESH_REJECT_BEFORE_LOGOUT;
    if (!giveUp) {
      clearRefreshTimer();
      refreshTimer = setTimeout(() => {
        void performRefresh();
      }, 5_000 * consecutiveRefreshRejections);
      return;
    }
    if (isPosSoftAuthActive()) {
      // Stay on the till; shell shows an explicit reauth dialog.
      notifyPosSessionExpired(
        "Your session expired. Sign in again to keep selling — your cart is saved on this device.",
      );
      return;
    }
    signOutClientAndRedirectToLogin(
      outcome.definitive
        ? "background refresh rejected (definitive)"
        : "background refresh rejected after retries",
    );
    return;
  }
  /*
   * Network/transient failure: keep the session, retry shortly. We schedule
   * a short retry rather than aborting so that intermittent connectivity
   * (which is common on mobile) does not turn into a forced logout.
   */
  clearRefreshTimer();
  refreshTimer = setTimeout(() => {
    void performRefresh();
  }, 15_000);
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return target.isContentEditable;
}

function onActivity() {
  const exp = getAccessTokenExpiry();
  if (!exp) return;

  const now = Date.now();
  const timeLeft = exp - now;

  if (timeLeft > 0 && timeLeft < ACTIVITY_REFRESH_THRESHOLD_MS) {
    if (now - lastActivityRefresh > ACTIVITY_DEBOUNCE_MS) {
      lastActivityRefresh = now;
      void performRefresh();
    }
  } else if (timeLeft <= 0) {
    // Token already expired - try refresh once, otherwise logout happens in performRefresh
    if (now - lastActivityRefresh > ACTIVITY_DEBOUNCE_MS) {
      lastActivityRefresh = now;
      void performRefresh();
    }
  }
}

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "focus"] as const;

export function startSessionRefresh(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  syncSessionPresenceCookie();
  clearLegacyRefreshTokenFromStorage();

  /*
   * Eager refresh on mount.
   *
   * If the access token already expired (tab backgrounded for hours, laptop
   * resumed from sleep) or is within EAGER_REFRESH_THRESHOLD_MS of expiry,
   * refresh BEFORE the page fires its usual cascade of authenticated calls.
   * This is what eliminates the "navigate after long idle -> 5 parallel
   * 401s -> race -> logout" path. Without single-flight + this eager step,
   * the very first interaction after a long pause is the riskiest moment.
   */
  const exp = getAccessTokenExpiry();
  if (exp !== null) {
    const timeLeft = exp - Date.now();
    if (timeLeft <= EAGER_REFRESH_THRESHOLD_MS) {
      void performRefresh();
    } else {
      scheduleNextRefresh();
    }
  } else {
    scheduleNextRefresh();
  }

  /*
   * Skip keydown from inputs/textareas so POS product search typing does not
   * race activity-triggered refresh against search 401 recovery.
   * Clicks / touch / focus still count as activity.
   */
  const handler = (event: Event) => {
    if (event.type === "keydown" && isTypingTarget(event.target)) {
      return;
    }
    onActivity();
  };
  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, handler, { passive: true });
  }

  /*
   * Re-evaluate when the tab becomes visible again. Browsers throttle or
   * suspend background timers; the scheduled refresh may have been delayed
   * far past expiry while the user was on another tab. On visibilitychange
   * we re-run onActivity which will refresh immediately if we are inside
   * the activity threshold.
   */
  const visibilityHandler = () => {
    if (document.visibilityState === "visible") {
      onActivity();
    }
  };
  document.addEventListener("visibilitychange", visibilityHandler);

  /*
   * Coming back online: always attempt a refresh (not only when near expiry).
   * Offline periods often leave a still-valid access JWT that is about to die,
   * or a cookie that needs rotation before POS flushes the sale outbox.
   */
  const onlineHandler = () => {
    if (!hasAccessSession()) {
      return;
    }
    void performRefresh();
  };
  window.addEventListener("online", onlineHandler);

  return () => {
    clearRefreshTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, handler);
    }
    document.removeEventListener("visibilitychange", visibilityHandler);
    window.removeEventListener("online", onlineHandler);
  };
}

if (typeof window !== "undefined") {
  subscribeToAuthBroadcasts((msg) => {
    if (msg.type === "tokens") {
      scheduleNextRefresh();
    }
  });
}
