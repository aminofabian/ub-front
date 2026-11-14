/**
 * Everyone on a service shop's team is an account, so they appear in Users, Payroll and every
 * report. Someone added by name only has an account that cannot sign in yet: the server gives
 * it a placeholder address ending in this domain, which is never shown and never mailed.
 */
export const NO_SIGN_IN_EMAIL_DOMAIN = "team.invalid";

export function isNoSignInEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase().endsWith(`@${NO_SIGN_IN_EMAIL_DOMAIN}`);
}

/** What to show where an account's email goes: the address, or that there is no sign-in yet. */
export function accountEmailLabel(email: string | null | undefined): string {
  return isNoSignInEmail(email) ? "No sign-in yet" : (email ?? "").trim();
}

/** How to name an account in a button or a spoken label: by address, or by name when it has none. */
export function accountHandle(user: { name?: string | null; email?: string | null }): string {
  return isNoSignInEmail(user.email) ? (user.name?.trim() || "this person") : (user.email ?? "").trim();
}
