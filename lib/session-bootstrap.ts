/** Short-lived session data prefetched server-side during login (iPad fallback). */
export const SESSION_BOOTSTRAP_KEYS = {
  me: "ub.bootstrap.me",
  business: "ub.bootstrap.business",
} as const;

export function readSessionBootstrap<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSessionBootstrap(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function clearSessionBootstrap(key: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
