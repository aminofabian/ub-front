"use client";

import { useSyncExternalStore } from "react";

/**
 * Outcome of the most recent cookie-only session restore, published by
 * `restoreClientSessionFromCookie`. Lets account labels downgrade from a
 * server-rendered "Account" (presence hint) back to "Sign in" when the
 * hint turns out to be stale — without an error state (D8, §10).
 */

type RestoreStatus = "ok" | "failed" | null;

let status: RestoreStatus = null;
const listeners = new Set<() => void>();

export function setSessionRestoreStatus(next: RestoreStatus): void {
  if (status === next) {
    return;
  }
  status = next;
  for (const listener of listeners) {
    listener();
  }
}

export function getSessionRestoreStatus(): RestoreStatus {
  return status;
}

export function subscribeSessionRestoreStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * True once a restore attempt has explicitly failed. The server snapshot is
 * always `false` (a restore cannot have run during SSR), so the
 * server-rendered hint label survives hydration untouched.
 */
export function useSessionRestoreFailed(): boolean {
  return useSyncExternalStore(
    subscribeSessionRestoreStatus,
    () => getSessionRestoreStatus() === "failed",
    () => false,
  );
}
