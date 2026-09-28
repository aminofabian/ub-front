/**
 * Session-scoped dismissal for the post-checkout "save your details" nudge.
 * The nudge now opens the shared sign-in form (`ShopCheckoutAccountModal`).
 */

export const CHECKOUT_SIGNUP_DISMISSED_KEY = "ub.checkoutSignup.dismissed.v1";

export function isCheckoutSignupDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(CHECKOUT_SIGNUP_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissCheckoutSignupPrompt(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(CHECKOUT_SIGNUP_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}
