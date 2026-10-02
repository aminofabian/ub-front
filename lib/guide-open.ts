"use client";

/** Opens the floating Kiosk Guide panel (does not navigate). */
export const OPEN_GUIDE_CHAT_EVENT = "ub:open-guide-chat";

export function requestOpenGuideChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_GUIDE_CHAT_EVENT));
}
