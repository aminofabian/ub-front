import { STORAGE_KEYS } from "@/lib/config";

/**
 * Super-admin access lives in localStorage so a new tab, a discarded tab, or
 * a Fast Refresh remount does not look like a logout. sessionStorage is still
 * read once and migrated for older sessions.
 */
export function getSuperAdminAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const fromLocal = window.localStorage.getItem(STORAGE_KEYS.superAdminAccessToken);
  if (fromLocal) {
    return fromLocal;
  }
  const fromSession = window.sessionStorage.getItem(
    STORAGE_KEYS.superAdminAccessToken,
  );
  if (fromSession) {
    window.localStorage.setItem(STORAGE_KEYS.superAdminAccessToken, fromSession);
    window.sessionStorage.removeItem(STORAGE_KEYS.superAdminAccessToken);
    return fromSession;
  }
  return null;
}

export function setSuperAdminAccessToken(token: string): void {
  window.localStorage.setItem(STORAGE_KEYS.superAdminAccessToken, token);
  window.sessionStorage.removeItem(STORAGE_KEYS.superAdminAccessToken);
}

export function clearSuperAdminSession(): void {
  window.localStorage.removeItem(STORAGE_KEYS.superAdminAccessToken);
  window.sessionStorage.removeItem(STORAGE_KEYS.superAdminAccessToken);
}
