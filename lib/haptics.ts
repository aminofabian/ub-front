"use client";

/**
 * Light tactile feedback for selection taps on mobile web.
 * No-op on devices without a vibration API (e.g. iOS Safari) and when
 * called outside a user gesture.
 */
export function hapticTap(pattern: number | number[] = 8): void {
  if (typeof navigator === "undefined") {
    return;
  }
  const vibrate = navigator.vibrate as
    | ((pattern: number | number[]) => boolean)
    | undefined;
  if (typeof vibrate !== "function") {
    return;
  }
  try {
    vibrate.call(navigator, pattern);
  } catch {
    // Vibration is best-effort; never break a tap over it.
  }
}