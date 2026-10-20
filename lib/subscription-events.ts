/**
 * Fired whenever an authenticated request is rejected because the shop's
 * subscription is blocked. The renewal wall listens for it so a session that
 * was suspended mid-flight immediately surfaces the payment surface instead of
 * a blank dashboard or a toast storm.
 */
export const SUBSCRIPTION_BLOCKED_EVENT = "ub:subscription-blocked";
export const SUBSCRIPTION_STATUS_CHANGED_EVENT = "ub:subscription-status-changed";

export function notifySubscriptionBlocked(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SUBSCRIPTION_BLOCKED_EVENT));
}

/** Nudge the shared billing-status hook after a payment attempt settles. */
export function notifySubscriptionStatusChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SUBSCRIPTION_STATUS_CHANGED_EVENT));
}
