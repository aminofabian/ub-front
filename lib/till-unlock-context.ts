/**
 * Device-local context so a locked till can re-mint a session via login-pin
 * without navigating to /login. Never stores PIN or refresh tokens.
 */

export const TILL_UNLOCK_STORAGE_KEYS = {
  email: "ub.tillUnlock.email",
  branchId: "ub.tillUnlock.branchId",
  displayName: "ub.tillUnlock.displayName",
  userId: "ub.tillUnlock.userId",
} as const;

export type TillUnlockContext = {
  email: string;
  branchId: string;
  displayName: string;
  userId: string;
};

function readKey(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return (
      window.localStorage.getItem(key)?.trim() ||
      window.sessionStorage.getItem(key)?.trim() ||
      null
    );
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(key, value);
    window.sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function removeKey(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readTillUnlockContext(): TillUnlockContext | null {
  const email = readKey(TILL_UNLOCK_STORAGE_KEYS.email);
  const branchId = readKey(TILL_UNLOCK_STORAGE_KEYS.branchId);
  const displayName = readKey(TILL_UNLOCK_STORAGE_KEYS.displayName);
  const userId = readKey(TILL_UNLOCK_STORAGE_KEYS.userId);
  if (!email || !branchId || !userId) {
    return null;
  }
  return {
    email,
    branchId,
    displayName: displayName || email,
    userId,
  };
}

export function hasTillUnlockContext(): boolean {
  return readTillUnlockContext() != null;
}

export function writeTillUnlockContext(ctx: TillUnlockContext): void {
  const email = ctx.email.trim().toLowerCase();
  const branchId = ctx.branchId.trim();
  const userId = ctx.userId.trim();
  const displayName = ctx.displayName.trim() || email;
  if (!email || !branchId || !userId) {
    return;
  }
  writeKey(TILL_UNLOCK_STORAGE_KEYS.email, email);
  writeKey(TILL_UNLOCK_STORAGE_KEYS.branchId, branchId);
  writeKey(TILL_UNLOCK_STORAGE_KEYS.displayName, displayName);
  writeKey(TILL_UNLOCK_STORAGE_KEYS.userId, userId);
}

export function updateTillUnlockBranchId(branchId: string): void {
  const trimmed = branchId.trim();
  if (!trimmed || !hasTillUnlockContext()) {
    return;
  }
  writeKey(TILL_UNLOCK_STORAGE_KEYS.branchId, trimmed);
}

export function clearTillUnlockContext(): void {
  removeKey(TILL_UNLOCK_STORAGE_KEYS.email);
  removeKey(TILL_UNLOCK_STORAGE_KEYS.branchId);
  removeKey(TILL_UNLOCK_STORAGE_KEYS.displayName);
  removeKey(TILL_UNLOCK_STORAGE_KEYS.userId);
}
