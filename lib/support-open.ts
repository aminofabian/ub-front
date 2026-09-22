"use client";

/** Opens the floating tenant Support chat drawer (does not navigate). */
export const OPEN_SUPPORT_CHAT_EVENT = "ub:open-support-chat";

/** In-app notification CTA that should open the drawer, not a route. */
export const SUPPORT_CHAT_ACTION = "kiosk:support-chat";

export type OpenSupportChatDetail = {
  /** Which support surface to open. */
  tab?: "platform" | "storefront" | "tickets";
  /** Storefront buyer conversation to select when `tab` is `storefront`. */
  conversationId?: string;
};

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

export function requestOpenSupportChat(detail?: OpenSupportChatDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenSupportChatDetail>(OPEN_SUPPORT_CHAT_EVENT, {
      detail: detail ?? {},
    }),
  );
}

/** Build an in-app support deep link (page + optional buyer thread). */
export function supportPageHref(detail?: OpenSupportChatDetail): string {
  const tab = detail?.tab ?? "platform";
  const params = new URLSearchParams();
  if (tab !== "platform") params.set("tab", tab);
  if (detail?.conversationId?.trim()) {
    params.set("c", detail.conversationId.trim());
  }
  const qs = params.toString();
  return qs ? `/support?${qs}` : "/support";
}
