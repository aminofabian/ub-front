import type { TillUnlockContext } from "@/lib/till-unlock-context";

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
export function formatTillUnlockError(
  raw: string,
  method: PosTillUnlockMethod,
): string {
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
