"use client";

import { restoreClientSessionFromCookie } from "@/lib/restore-client-session";

/**
 * Recoverable auth failure: keep cookies and the current page, retry restore.
 * Hard logout (wipe + redirect) is reserved for explicit Sign out and dead
 * accounts — a single 401 must never bounce an owner to the login form.
 */

let reconnecting = false;
const listeners = new Set<(active: boolean) => void>();

export function isSessionReconnecting(): boolean {
  return reconnecting;
}

export function subscribeSessionReconnect(
  listener: (active: boolean) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(active: boolean): void {
  for (const listener of listeners) {
    try {
      listener(active);
    } catch {
      /* ignore */
    }
  }
}

export function clearSessionReconnect(): void {
  if (!reconnecting) {
    return;
  }
  reconnecting = false;
  emit(false);
}

export function beginSessionReconnect(reason?: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("[auth] session reconnect", reason ?? "no reason provided");
  }
  if (!reconnecting) {
    reconnecting = true;
    emit(true);
  }
  void restoreClientSessionFromCookie({ force: true }).then((ok) => {
    if (ok) {
      clearSessionReconnect();
    }
  });
}
