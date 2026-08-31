"use client";

import { applyAuthSessionPayload } from "@/lib/auth";

/**
 * Session recovery state machine.
 *
 * - `ok`: normal operation.
 * - `reconnecting`: the session *may* be recoverable (transient backend blip).
 *   We verify once against /api/auth/restore-session — if the backend accepts
 *   the access cookie we go straight back to `ok`; if it answers 401 the
 *   session is dead and we go to `ended`; if the backend is unreachable we stay
 *   `reconnecting` and let the scheduled refresh / next interaction retry.
 * - `ended`: the backend explicitly rejected the session (refresh token
 *   revoked / expired / idle timeout / account locked). The shell renders a
 *   calm full-screen "Sign in again" state instead of error toasts.
 *
 * Hard logout (wipe + redirect) is reserved for explicit Sign out and dead
 * accounts — a single 401 must never bounce an owner to the login form.
 */

export type SessionReconnectState = "ok" | "reconnecting" | "ended";

let reconnectState: SessionReconnectState = "ok";
let verifying = false;
const listeners = new Set<(state: SessionReconnectState) => void>();

export function isSessionReconnecting(): boolean {
  return reconnectState === "reconnecting";
}

export function isSessionEnded(): boolean {
  return reconnectState === "ended";
}

export function subscribeSessionReconnect(
  listener: (state: SessionReconnectState) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(state: SessionReconnectState): void {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      /* ignore */
    }
  }
}

function setState(state: SessionReconnectState): void {
  if (reconnectState === state) {
    return;
  }
  reconnectState = state;
  emit(state);
}

export function clearSessionReconnect(): void {
  setState("ok");
}

/** Test helper — resets module state between unit tests. */
export function __resetSessionReconnectForTests(): void {
  reconnectState = "ok";
  verifying = false;
  listeners.clear();
}

/**
 * Enter recovery.
 *
 * Pass `{ definitive: true }` when the backend explicitly rejected the refresh
 * token — that is a dead session, so skip straight to the "session ended"
 * screen. Without it we verify quietly and only surface `ended` when the
 * backend confirms the session row is gone.
 */
export function beginSessionReconnect(
  reason?: string,
  opts?: { definitive?: boolean },
): void {
  if (typeof window === "undefined") {
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("[auth] session reconnect", reason ?? "no reason provided");
  }
  if (opts?.definitive) {
    setState("ended");
    return;
  }
  setState("reconnecting");
  if (verifying) {
    return;
  }
  verifying = true;
  void (async () => {
    try {
      const response = await fetch("/api/auth/restore-session", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        // The backend answered: 401 means the session row is really gone.
        // 5xx means transient — stay reconnecting and let retries handle it.
        if (response.status === 401) {
          setState("ended");
        }
        return;
      }
      const payload = (await response.json()) as {
        session?: { exp?: number; businessId?: string; sub?: string };
      };
      if (applyAuthSessionPayload(payload)) {
        setState("ok");
      } else {
        setState("ended");
      }
    } catch {
      // Network error — transient, keep reconnecting quietly.
    } finally {
      verifying = false;
    }
  })();
}
