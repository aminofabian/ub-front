"use client";

import type { PosGuidanceKind } from "@/lib/problem";

export const POS_GUIDANCE_EVENT = "ub:pos-guidance";
export const POS_GUIDANCE_RESOLVED_EVENT = "ub:pos-guidance-resolved";
export const OPEN_REGISTER_TILL_EVENT = "ub:open-register-till";
export const OPEN_POS_SHIFT_EVENT = "ub:open-pos-shift";

export type PosGuidanceDetail = {
  kind: PosGuidanceKind;
};

export function notifyPosGuidance(kind: PosGuidanceKind): void {
  if (typeof window === "undefined") {
    return;
  }
  const detail: PosGuidanceDetail = { kind };
  window.dispatchEvent(
    new CustomEvent<PosGuidanceDetail>(POS_GUIDANCE_EVENT, { detail }),
  );
}

export function notifyPosGuidanceResolved(kind: PosGuidanceKind): void {
  if (typeof window === "undefined") {
    return;
  }
  const detail: PosGuidanceDetail = { kind };
  window.dispatchEvent(
    new CustomEvent<PosGuidanceDetail>(POS_GUIDANCE_RESOLVED_EVENT, { detail }),
  );
}

const REGISTER_AFTER_SIGN_IN_KEY = "kiosk.till.register-after-sign-in";

/**
 * A PIN was refused at sign-in because this computer is not a registered till. Remember that
 * for this browser tab, so the till opens its "Register this till" dialog as soon as the person
 * is in (with their password), instead of leaving them to find the button.
 */
export function rememberRegisterTillAfterSignIn(): void {
  try {
    window.sessionStorage.setItem(REGISTER_AFTER_SIGN_IN_KEY, "1");
  } catch {
    // No storage (private browsing): the banner on the till still offers to register it.
  }
}

/** True once, the first time it is asked after {@link rememberRegisterTillAfterSignIn}. */
export function takeRegisterTillAfterSignIn(): boolean {
  try {
    const wanted = window.sessionStorage.getItem(REGISTER_AFTER_SIGN_IN_KEY) === "1";
    if (wanted) window.sessionStorage.removeItem(REGISTER_AFTER_SIGN_IN_KEY);
    return wanted;
  } catch {
    return false;
  }
}

export function requestOpenRegisterTill(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(OPEN_REGISTER_TILL_EVENT));
}

export function requestOpenPosShift(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(OPEN_POS_SHIFT_EVENT));
}
