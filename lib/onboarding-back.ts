"use client";

/**
 * A single "back" can arrive through two channels at once on mobile: the
 * hardware back button / system edge gesture (popstate) and the in-page
 * swipe-right gesture. Whichever fires first claims the event; the other
 * becomes a no-op so one gesture never steps back twice.
 */
const BACK_DEDUPE_MS = 700;
let lastClaimedAt = 0;

export function claimBackNavigation(): boolean {
  const now = Date.now();
  if (now - lastClaimedAt < BACK_DEDUPE_MS) {
    return false;
  }
  lastClaimedAt = now;
  return true;
}