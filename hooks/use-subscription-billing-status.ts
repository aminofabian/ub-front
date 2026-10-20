"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchSubscriptionBillingStatus,
  type SubscriptionBillingStatusRecord,
} from "@/lib/api";
import { IS_DESKTOP } from "@/lib/runtime";
import { shareInflight } from "@/lib/share-inflight";
import { SUBSCRIPTION_BLOCKED_EVENT, SUBSCRIPTION_STATUS_CHANGED_EVENT } from "@/lib/subscription-events";

const POLL_MS = 60_000;
const MAX_AGE_MS = 15_000;

let cached: SubscriptionBillingStatusRecord | null = null;
let cachedAt = 0;
let inflight: Promise<void> | null = null;
let pollTimer: number | null = null;
const listeners = new Set<(status: SubscriptionBillingStatusRecord | null) => void>();

function publish(status: SubscriptionBillingStatusRecord | null) {
  cached = status;
  cachedAt = Date.now();
  for (const listener of listeners) listener(status);
}

async function refresh(): Promise<void> {
  if (IS_DESKTOP) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const row = await shareInflight("subscription/billing-status", () =>
        fetchSubscriptionBillingStatus(),
      );
      publish(row);
    } catch {
      // Keep the last known status on transient failures; only clear when we
      // have never successfully loaded one.
      if (!cached) publish(null);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function startPolling() {
  if (IS_DESKTOP || pollTimer != null) return;
  pollTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") void refresh();
  }, POLL_MS);
}

function stopPollingIfIdle() {
  if (listeners.size > 0 || pollTimer == null) return;
  window.clearInterval(pollTimer);
  pollTimer = null;
}

function onWake() {
  if (document.visibilityState === "visible") void refresh();
}

/**
 * Shared subscription status for the banner, plan-fit notice, and renewal wall.
 * Keeps one cached value and one poll/focus refresh, so a Super Admin switch or
 * a successful M-Pesa payment is reflected without a reload.
 */
export function useSubscriptionBillingStatus() {
  const [status, setStatus] = useState<SubscriptionBillingStatusRecord | null>(
    cached,
  );

  useEffect(() => {
    if (IS_DESKTOP) return;
    const listener = (next: SubscriptionBillingStatusRecord | null) =>
      setStatus(next);
    listeners.add(listener);
    startPolling();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener(SUBSCRIPTION_BLOCKED_EVENT, onWake);
    window.addEventListener(SUBSCRIPTION_STATUS_CHANGED_EVENT, onWake);
    if (!cached || Date.now() - cachedAt > MAX_AGE_MS) {
      void refresh();
    } else {
      setStatus(cached);
    }
    return () => {
      listeners.delete(listener);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener(SUBSCRIPTION_BLOCKED_EVENT, onWake);
      window.removeEventListener(SUBSCRIPTION_STATUS_CHANGED_EVENT, onWake);
      stopPollingIfIdle();
    };
  }, []);

  const reload = useCallback(() => refresh(), []);
  return { status, refresh: reload };
}
