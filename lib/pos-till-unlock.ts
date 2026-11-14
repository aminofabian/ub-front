import type { TillUnlockContext } from "@/lib/till-unlock-context";
import { getPosGuidanceKind } from "@/lib/problem";

export type PosTillUnlockMode = "same" | "switch";
export type PosTillUnlockMethod = "pin" | "password";

export type ResolveTillUnlockEmailInput = {
  mode: PosTillUnlockMode;
  context: TillUnlockContext | null;
  /** Required when mode is `switch`. */
  email?: string;
};

/**
 * Resolves which email to send to login-pin / password login.
 * Same-cashier unlock uses stored context; switch requires an explicit email.
 */
export function resolveTillUnlockEmail(
  input: ResolveTillUnlockEmailInput,
): string {
  if (input.mode === "switch") {
    const email = input.email?.trim().toLowerCase() ?? "";
    if (!email || !email.includes("@")) {
      throw new Error("Enter the cashier or manager email.");
    }
    return email;
  }
  const email = input.context?.email?.trim().toLowerCase() ?? "";
  if (!email) {
    throw new Error(
      "Unlock context missing. Use full sign out, then sign in again.",
    );
  }
  return email;
}

/** User-facing copy when PIN/password auth fails on the till overlay. */
export const TILL_WAITING_FOR_OWNER_COPY =
  "This till is not registered for this branch. We asked the shop owner to tap a link and register this computer. Try your PIN again after they do.";

/**
 * At sign-in nobody is signed in yet, so the till cannot be registered on the spot. The way
 * through is the password, which is accepted on any computer; the till then offers to register.
 */
export const TILL_SIGN_IN_WITH_PASSWORD_COPY =
  "Your PIN is right, but this computer is not a registered till yet. Type your password here instead to sign in, and you can register it straight away. No password? The shop owner has been sent a link to approve this computer.";

/** The sign-in page's wording for a refused PIN on an unregistered till; other errors pass through. */
export function formatSignInTillDeniedMessage(raw: string): string {
  return getPosGuidanceKind(raw) === "register-till" ? TILL_SIGN_IN_WITH_PASSWORD_COPY : raw;
}

export function formatTillAccessDeniedMessage(raw: string): string {
  if (getPosGuidanceKind(raw) === "register-till") {
    return TILL_WAITING_FOR_OWNER_COPY;
  }
  return raw;
}

export function formatTillUnlockError(
  raw: string,
  method: PosTillUnlockMethod,
): string {
  const guided = formatTillAccessDeniedMessage(raw);
  if (guided !== raw) {
    return guided;
  }
  const lower = raw.toLowerCase();
  if (
    lower.includes("incorrect email or password") ||
    lower.includes("invalid credentials")
  ) {
    return method === "password"
      ? "Wrong password. Try again, use PIN if this account has one, or Full sign out."
      : "Wrong PIN (or this account has no PIN). Use Password unlock, or Full sign out.";
  }
  return raw;
}

/**
 * After login-pin, same-cashier mode must not adopt a different userId.
 * Switch mode intentionally allows a different user (cart is parked).
 */
export function assertTillUnlockUserAllowed(opts: {
  mode: PosTillUnlockMode;
  previousUserId: string | null;
  nextUserId: string;
}): void {
  if (opts.mode !== "same") {
    return;
  }
  const previous = opts.previousUserId?.trim() ?? "";
  const next = opts.nextUserId.trim();
  if (previous && next && previous !== next) {
    throw new Error(
      "Unlocked as a different user. Use Switch cashier, or sign in from the login page.",
    );
  }
}
