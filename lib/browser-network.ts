export function getBrowserOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine;
}

/** Subscribe to `online` / `offline` events; invokes `cb` immediately with current state. */
export function subscribeOnlineStatus(cb: (online: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const sync = () => cb(navigator.onLine);
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  sync();
  return () => {
    window.removeEventListener("online", sync);
    window.removeEventListener("offline", sync);
  };
}
