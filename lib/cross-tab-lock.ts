/**
 * Cross-tab exclusive lock for auth refresh / cookie restore.
 *
 * Uses the Web Locks API when available so only one tab POSTs /auth/refresh
 * (or restore-session) at a time. Without it, falls back to running the
 * callback immediately (existing per-tab single-flight + backend grace still apply).
 *
 * Re-entrant in the same tab: nested callers (refresh → restore) do not deadlock.
 */

export const AUTH_REFRESH_LOCK_NAME = "ub.auth.refresh";

let authRefreshLockDepth = 0;

type LockRequest = (
  name: string,
  callback: (lock: Lock | null) => Promise<unknown>,
) => Promise<unknown>;

function getLockRequest(): LockRequest | null {
  if (typeof navigator === "undefined") {
    return null;
  }
  const locks = navigator.locks;
  if (!locks || typeof locks.request !== "function") {
    return null;
  }
  return (name, callback) => locks.request(name, callback);
}

/**
 * Run `fn` while holding the named exclusive lock across tabs.
 * Nested calls in the same tab skip re-acquiring (reentrancy).
 */
export async function withCrossTabLock<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const request = getLockRequest();
  if (!request) {
    return fn();
  }

  return (await request(name, async () => fn())) as T;
}

/** Auth refresh + cookie restore share one lock (same cookie rotation). */
export async function withAuthRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  if (authRefreshLockDepth > 0) {
    return fn();
  }
  authRefreshLockDepth += 1;
  try {
    return await withCrossTabLock(AUTH_REFRESH_LOCK_NAME, fn);
  } finally {
    authRefreshLockDepth -= 1;
  }
}

/** Test helper. */
export function __resetAuthRefreshLockForTests(): void {
  authRefreshLockDepth = 0;
}
