"use client";

import { useCallback, useEffect, useState } from "react";

export const DEFAULT_RESEND_COOLDOWN_SECONDS = 45;

/**
 * Client-side cooldown so Resend isn't spam-clicked. Backend has no rate limit
 * on resend-verification for UX polish.
 */
export function useResendCooldown(
  seconds: number = DEFAULT_RESEND_COOLDOWN_SECONDS,
) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRemaining((n) => Math.max(0, n - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remaining]);

  const start = useCallback(() => {
    setRemaining(seconds);
  }, [seconds]);

  const reset = useCallback(() => {
    setRemaining(0);
  }, []);

  return {
    remaining,
    coolingDown: remaining > 0,
    start,
    reset,
  };
}
