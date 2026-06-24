/** Short-lived session data prefetched server-side during login (iPad fallback). */
export const SESSION_BOOTSTRAP_KEYS = {
  me: "ub.bootstrap.me",
  business: "ub.bootstrap.business",
  branches: "ub.bootstrap.branches",
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
    let parsed: unknown = JSON.parse(raw);
    // Login handoff double-stringifies bootstrap payloads in inline HTML scripts.
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return null;
      }
    }
    return parsed as T;
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
