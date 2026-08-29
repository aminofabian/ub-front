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
