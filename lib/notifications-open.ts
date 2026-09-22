"use client";

/** Opens the tenant notifications drawer (does not navigate). */
export const OPEN_NOTIFICATIONS_EVENT = "ub:open-notifications";

/** Toggles the tenant notifications drawer. */
export const TOGGLE_NOTIFICATIONS_EVENT = "ub:toggle-notifications";

/** Closes the tenant notifications drawer. */
export const CLOSE_NOTIFICATIONS_EVENT = "ub:close-notifications";

export function requestOpenNotifications(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_NOTIFICATIONS_EVENT));
}

export function requestToggleNotifications(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TOGGLE_NOTIFICATIONS_EVENT));
}

export function requestCloseNotifications(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CLOSE_NOTIFICATIONS_EVENT));
}
