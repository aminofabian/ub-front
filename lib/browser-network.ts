import { IS_DESKTOP } from "@/lib/runtime";

/**
 * Only `navigator.onLine === false` is a real offline signal. Non-browser
 * runtimes (SSR, tests, some WebViews) leave it undefined, and treating that
 * as offline would gate the whole app on a missing property.
 */
export function getBrowserOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine !== false;
}

/**
 * True when the app's own API is reachable.
 *
 * Desktop SKU: the page is served by the local backend (127.0.0.1), so the API
 * is reachable whenever the page is up. `navigator.onLine` is the *internet*
 * state and WebView2 can report false even on a working LAN — gating the POS
 * on it would block search, aisle browsing, till unlock, and sale completion
 * for no reason.
 */
export function isApiReachable(): boolean {
  return IS_DESKTOP ? true : getBrowserOnline();
}

/** Subscribe to `online` / `offline` events; invokes `cb` immediately with current state. */
export function subscribeOnlineStatus(cb: (online: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const sync = () => cb(getBrowserOnline());
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  sync();
  return () => {
    window.removeEventListener("online", sync);
    window.removeEventListener("offline", sync);
  };
}
