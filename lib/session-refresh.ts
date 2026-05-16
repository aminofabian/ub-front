"use client";

import {
  getSessionTokens,
  setSessionTokens,
  signOutClientAndRedirectToLogin,
} from "@/lib/auth";
import { tryRefreshToken } from "@/lib/api";

const REFRESH_MARGIN_MS = 2 * 60 * 1000; // refresh 2 min before expiry
const ACTIVITY_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // refresh on activity if < 5 min left
const ACTIVITY_DEBOUNCE_MS = 30_000; // max one activity-triggered refresh per 30s

let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivityRefresh = 0;

function getAccessTokenExpiry(): number | null {
  const tokens = getSessionTokens();
  if (!tokens?.accessToken) return null;

  try {
    const payload = tokens.accessToken.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const exp = json.exp;
    if (typeof exp === "number") {
      return exp * 1000;
    }
  } catch {
    // ignore parse errors
  }
  return null;
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

async function performRefresh() {
  const tokens = getSessionTokens();
  if (!tokens) return;

  const ok = await tryRefreshToken();
  if (ok) {
    scheduleNextRefresh();
  } else {
    signOutClientAndRedirectToLogin();
  }
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
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
    // Token already expired — try refresh once, otherwise logout happens in performRefresh
    if (now - lastActivityRefresh > ACTIVITY_DEBOUNCE_MS) {
      lastActivityRefresh = now;
      void performRefresh();
    }
  }
}

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "focus"];

export function startSessionRefresh(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  scheduleNextRefresh();

  const handler = () => onActivity();
  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, handler, { passive: true });
  }

  return () => {
    clearRefreshTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, handler);
    }
  };
}
