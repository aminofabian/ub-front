import "server-only";

import { cookies } from "next/headers";

import { SESSION_PRESENCE_COOKIE } from "@/lib/config";

/**
 * Server-side read of the `ub.session` presence hint (D8). The cookie is
 * non-secret and may be stale — it only ever drives a label, never
 * authorization (see §10 of the host-homepage scope).
 *
 * Reading one more cookie costs nothing: `StorefrontShell` is already dynamic
 * because tenant resolution reads `headers()`.
 */
export async function hasSessionPresenceCookieServer(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.has(SESSION_PRESENCE_COOKIE);
  } catch {
    // Desktop build / prerender / any environment without request cookies.
    return false;
  }
}
