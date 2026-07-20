/**
 * Persist till lock across reload so a locked register stays locked after F5.
 * Cleared on unlock / full sign-out. Never stores PIN.
 */

export const TILL_LOCK_STORAGE_KEY = "ub.tillLock";

export type PersistedTillLock = {
  locked: true;
  reason: "manual" | "idle" | "session";
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readPersistedTillLock(): PersistedTillLock | null {
  if (!canUseStorage()) {
    return null;
  }
  try {
    const raw =
      window.sessionStorage.getItem(TILL_LOCK_STORAGE_KEY)?.trim() ||
      window.localStorage.getItem(TILL_LOCK_STORAGE_KEY)?.trim();
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedTillLock>;
    if (parsed?.locked !== true) {
      return null;
    }
    const reason = parsed.reason;
    if (reason !== "manual" && reason !== "idle" && reason !== "session") {
      return { locked: true, reason: "manual" };
    }
    return { locked: true, reason };
  } catch {
    return null;
  }
}

export function writePersistedTillLock(
  reason: PersistedTillLock["reason"],
): void {
  if (!canUseStorage()) {
    return;
  }
  const payload: PersistedTillLock = { locked: true, reason };
  const raw = JSON.stringify(payload);
  try {
    window.localStorage.setItem(TILL_LOCK_STORAGE_KEY, raw);
    window.sessionStorage.setItem(TILL_LOCK_STORAGE_KEY, raw);
  } catch {
    /* private mode */
  }
}

export function clearPersistedTillLock(): void {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(TILL_LOCK_STORAGE_KEY);
    window.sessionStorage.removeItem(TILL_LOCK_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
