"use client";

import { getBrowserOnline, subscribeOnlineStatus } from "@/lib/browser-network";

/**
 * Connection health, not error reporting.
 *
 * A page left open overnight wakes up to a backend that restarted, a gateway
 * that dropped the keep-alive, or a laptop that just came off sleep. Those
 * failures carry no problem+json body, so every one of them used to surface as
 * a bare "Request failed." toast — a scary, unactionable modal-ish popup for
 * something the next retry fixes on its own.
 *
 * Instead we collapse them all into one quiet, ambient state:
 * - `ok`: nothing to say.
 * - `unstable`: repeated transient failures; show a calm strip, keep retrying.
 * - `offline`: the browser itself says there's no network.
 *
 * The state clears itself the moment any request succeeds, so recovery is
 * silent too — no "back online!" confetti.
 */
export type ConnectionHealth = "ok" | "unstable" | "offline";

/**
 * One blip is normal (a single dropped keep-alive after idle). Only tell the
 * user once failures look like a pattern.
 */
const TROUBLE_THRESHOLD = 2;

/**
 * Stop claiming trouble if nothing has retried in a while — a stale strip is
 * worse than no strip.
 */
const STALE_TROUBLE_MS = 90_000;

let consecutiveTrouble = 0;
let state: ConnectionHealth = "ok";
let lastTroubleAt = 0;
let staleTimer: ReturnType<typeof setTimeout> | null = null;
let onlineUnsubscribe: (() => void) | null = null;

const listeners = new Set<(state: ConnectionHealth) => void>();

export function getConnectionHealth(): ConnectionHealth {
  if (state === "unstable" && Date.now() - lastTroubleAt > STALE_TROUBLE_MS) {
    return "ok";
  }
  return state;
}

export function subscribeConnectionHealth(
  listener: (state: ConnectionHealth) => void,
): () => void {
  listeners.add(listener);
  ensureOnlineWatch();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && onlineUnsubscribe) {
      onlineUnsubscribe();
      onlineUnsubscribe = null;
    }
  };
}

function emit(): void {
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      /* a broken subscriber must not break the others */
    }
  }
}

function setState(next: ConnectionHealth): void {
  if (state === next) {
    return;
  }
  state = next;
  emit();
}

function ensureOnlineWatch(): void {
  if (onlineUnsubscribe || typeof window === "undefined") {
    return;
  }
  onlineUnsubscribe = subscribeOnlineStatus((online) => {
    if (!online) {
      setState("offline");
      return;
    }
    // Back on the network: assume good until a request proves otherwise.
    consecutiveTrouble = 0;
    setState("ok");
  });
}

function armStaleTimer(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (staleTimer) {
    clearTimeout(staleTimer);
  }
  staleTimer = setTimeout(() => {
    staleTimer = null;
    if (state === "unstable") {
      consecutiveTrouble = 0;
      setState("ok");
    }
  }, STALE_TROUBLE_MS);
}

/** A request could not reach the backend, or the backend answered with nothing usable. */
export function markApiTrouble(): void {
  lastTroubleAt = Date.now();
  consecutiveTrouble += 1;
  if (!getBrowserOnline()) {
    setState("offline");
    return;
  }
  if (consecutiveTrouble >= TROUBLE_THRESHOLD) {
    setState("unstable");
    armStaleTimer();
  }
}

/** Any successful round-trip clears the state — recovery needs no announcement. */
export function markApiSuccess(): void {
  consecutiveTrouble = 0;
  if (staleTimer) {
    clearTimeout(staleTimer);
    staleTimer = null;
  }
  setState("ok");
}

/** Test helper — resets module state between unit tests. */
export function __resetConnectionHealthForTests(): void {
  consecutiveTrouble = 0;
  state = "ok";
  lastTroubleAt = 0;
  if (staleTimer) {
    clearTimeout(staleTimer);
    staleTimer = null;
  }
  if (onlineUnsubscribe) {
    onlineUnsubscribe();
    onlineUnsubscribe = null;
  }
  listeners.clear();
}
