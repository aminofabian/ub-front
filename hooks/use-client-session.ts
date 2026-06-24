"use client";

import { useSyncExternalStore } from "react";

import { getSessionTokens } from "@/lib/auth";
import {
  readSessionBootstrap,
  SESSION_BOOTSTRAP_KEYS,
} from "@/lib/session-bootstrap";

function hasClientSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (getSessionTokens()) {
    return true;
  }
  return Boolean(readSessionBootstrap(SESSION_BOOTSTRAP_KEYS.me));
}

function subscribeToSession(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key.startsWith("ub.") ||
      event.key.includes("bootstrap")
    ) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

/** True once the client bundle is active (not during SSR). */
export function useClientSessionReady(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Reads tokens/bootstrap synchronously — do not wait for useEffect (iPad-safe). */
export function useClientHasSession(): boolean {
  return useSyncExternalStore(
    subscribeToSession,
    hasClientSession,
    () => false,
  );
}
