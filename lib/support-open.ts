"use client";

/** Opens the floating tenant Support chat drawer (does not navigate). */
export const OPEN_SUPPORT_CHAT_EVENT = "ub:open-support-chat";

/** In-app notification CTA that should open the drawer, not a route. */
export const SUPPORT_CHAT_ACTION = "kiosk:support-chat";

export function isSupportChatAction(url: string | null | undefined): boolean {
  const raw = (url ?? "").trim();
  if (!raw) return false;
  return (
    raw === SUPPORT_CHAT_ACTION ||
    raw === "/support" ||
    raw.startsWith("/support?") ||
    raw === "#support" ||
    raw === "#support-chat"
  );
}

export function requestOpenSupportChat(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_SUPPORT_CHAT_EVENT));
}
