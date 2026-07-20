/**
 * While a POS shell is mounted, authenticated API failures that would normally
 * hard-redirect to /login stay on the till instead. UI listens for
 * {@link POS_SESSION_EXPIRED_EVENT} and shows an explicit reauth dialog.
 */

import { hasTillUnlockContext } from "@/lib/till-unlock-context";

export const POS_SESSION_EXPIRED_EVENT = "ub:pos-session-expired";

export type PosSessionExpiredDetail = {
  message: string;
};

let softAuthDepth = 0;
let lastNotifyAt = 0;

const NOTIFY_DEBOUNCE_MS = 1_500;

export function enterPosSoftAuth(): void {
  softAuthDepth += 1;
}

export function leavePosSoftAuth(): void {
  softAuthDepth = Math.max(0, softAuthDepth - 1);
}

export function isPosSoftAuthActive(): boolean {
  return softAuthDepth > 0;
}

/**
 * Soft-auth is on when the caller opted in (`explicit === true`) or a POS shell
 * is mounted. Pass nothing to inherit POS scope only.
 *
 * Dead-account / force-hard paths should NOT use this — call sign-out directly
 * (or pass `forceHard` into the API helper).
 */
export function effectiveSoftAuth(explicit?: boolean): boolean {
  return explicit === true || isPosSoftAuthActive();
}

export function notifyPosSessionExpired(message?: string): void {
  if (typeof window === "undefined" || !isPosSoftAuthActive()) {
    return;
  }
  const now = Date.now();
  if (now - lastNotifyAt < NOTIFY_DEBOUNCE_MS) {
    return;
  }
  lastNotifyAt = now;
  const detail: PosSessionExpiredDetail = {
    message:
      message?.trim() ||
      "Your session expired. Sign in again to keep selling — your cart is saved on this device.",
  };
  window.dispatchEvent(
    new CustomEvent(POS_SESSION_EXPIRED_EVENT, { detail }),
  );
}

/**
 * When till unlock context exists, the PIN overlay handles reauth — hide the
 * generic Session expired modal to avoid dual dialogs.
 */
export function shouldShowPosSessionExpiredModal(): boolean {
  return !hasTillUnlockContext();
}

/** Test helper — resets module state between unit tests. */
export function __resetPosSoftAuthForTests(): void {
  softAuthDepth = 0;
  lastNotifyAt = 0;
}
